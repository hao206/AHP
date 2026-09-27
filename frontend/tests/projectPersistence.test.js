import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIVE_PROJECT_ID_KEY, copyAsNewProject, createProjectSaveQueue, draftKey,
  hasUnsyncedChanges, markProjectSynced, readActiveProject,
  serverProjectIsNewer, writeLocalProject,
} from '../src/utils/projectPersistence.js';
import { getProjectAPI, saveProjectAPI, setProjectAccessToken } from '../src/utils/ahpClient.js';

function memoryStorage() {
  const entries = new Map();
  return {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  };
}

test('active project draft survives refresh with unanswered and TOPSIS data', () => {
  const storage = memoryStorage();
  const project = {
    id: 'active-1', title: 'Decision', goal: 'Choose', criteria: ['C1', 'C2'], alternatives: ['A', 'B'],
    criteria_matrix: [[1, null], [null, 1]],
    alt_matrices: { C1: [[1, null], [null, 1]], C2: [[1, null], [null, 1]] },
    data_matrix: [[0, 12], [8, 3]], criterion_types: ['cost', 'benefit'],
    updated_at: '2026-09-27T10:00:00.000Z',
  };
  writeLocalProject(project, storage);
  assert.equal(storage.getItem(ACTIVE_PROJECT_ID_KEY), 'active-1');
  assert.deepEqual(readActiveProject(storage), project);
  assert.equal(hasUnsyncedChanges(project, storage), true);
  markProjectSynced(project, storage);
  assert.equal(hasUnsyncedChanges(project, storage), false);
  assert.equal(hasUnsyncedChanges({ ...project, updated_at: '2026-09-27T10:00:01.000Z' }, storage), true);
  assert.equal(serverProjectIsNewer({ ...project, updated_at: '2026-09-27T11:00:00.000Z' }, project), true);
  assert.equal(serverProjectIsNewer({ ...project, updated_at: '2026-09-27T09:00:00.000Z' }, project), false);
  assert.notEqual(copyAsNewProject(project).id, project.id);
  storage.setItem(draftKey(project.id), '{broken');
  assert.equal(readActiveProject(storage), null);
});

test('save queue serializes writes and keeps the newest edit for each project', async () => {
  const writes = [];
  let releaseFirst;
  const firstBlocked = new Promise(resolve => { releaseFirst = resolve; });
  const queue = createProjectSaveQueue(async project => {
    writes.push(`${project.id}:${project.goal}`);
    if (writes.length === 1) await firstBlocked;
    return project;
  }, () => {});
  const complete = queue.enqueue({ id: 'A', goal: 'old' });
  queue.enqueue({ id: 'A', goal: 'new' });
  queue.enqueue({ id: 'B', goal: 'other' });
  releaseFirst();
  await complete;
  assert.deepEqual(writes, ['A:old', 'A:new', 'B:other']);
});

test('a failed save does not block a later edit', async () => {
  const outcomes = [];
  let attempts = 0;
  const queue = createProjectSaveQueue(async project => {
    attempts += 1;
    if (attempts === 1) throw new Error('offline');
    return project;
  }, (snapshot, _saved, error) => outcomes.push([snapshot.goal, Boolean(error)]));
  await queue.enqueue({ id: 'A', goal: 'first' });
  await queue.enqueue({ id: 'A', goal: 'second' });
  assert.deepEqual(outcomes, [['first', true], ['second', false]]);
});

test('queued old edits can be cancelled after a version conflict', async () => {
  const writes = [];
  let releaseFirst;
  const firstBlocked = new Promise(resolve => { releaseFirst = resolve; });
  const queue = createProjectSaveQueue(async project => {
    writes.push(project.goal);
    if (project.goal === 'old') await firstBlocked;
    return project;
  }, () => {});
  const complete = queue.enqueue({ id: 'A', goal: 'old' });
  queue.enqueue({ id: 'A', goal: 'new' });
  queue.cancel('A');
  releaseFirst();
  await complete;
  assert.deepEqual(writes, ['old']);
});

test('project API verifies backend identity before writing and restores by ID', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  const project = {
    id: 'active-1', title: 'Decision', goal: 'Choose',
    criteria: ['C1', 'C2'], alternatives: ['A', 'B'],
    criteria_matrix: [[1, null], [null, 1]],
    alt_matrices: { C1: [[1, 1], [1, 1]], C2: [[1, 1], [1, 1]] },
    data_matrix: [[0, 12], [8, 3]], criterion_types: ['cost', 'benefit'],
  };
  globalThis.fetch = async (url, options) => {
    calls.push([url, options?.method || 'GET', options?.body]);
    if (url.endsWith('/health')) return { ok: true, json: async () => ({ service: 'AHP Decision Studio Enterprise API' }) };
    return { ok: true, json: async () => project };
  };
  try {
    assert.deepEqual(await saveProjectAPI(project), project);
    assert.deepEqual(await getProjectAPI(project.id), project);
    assert.deepEqual(calls.map(([, method]) => method), ['GET', 'POST', 'GET', 'GET']);
    assert.deepEqual(JSON.parse(calls[1][2]), project);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('project API does not write to a different service on the selected port', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async url => {
    calls.push(url);
    return { ok: true, json: async () => ({ service: 'Different API' }) };
  };
  try {
    await assert.rejects(saveProjectAPI({ id: 'active-1' }), /không chạy máy chủ AHP/);
    assert.equal(calls.length, 1);
    assert.match(calls[0], /\/health$/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('project API exposes a version conflict so the editor can preserve both drafts', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => url.endsWith('/health')
    ? { ok: true, json: async () => ({ service: 'AHP Decision Studio Enterprise API' }) }
    : { ok: false, status: 409, json: async () => ({ detail: 'newer version' }) };
  try {
    await assert.rejects(saveProjectAPI({ id: 'active-1' }), error => error.status === 409);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('project access token is sent only to project endpoints and kept in tab storage', async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.sessionStorage;
  const entries = new Map();
  const calls = [];
  globalThis.sessionStorage = {
    setItem: (key, value) => entries.set(key, value),
    getItem: key => entries.get(key) ?? null,
  };
  globalThis.fetch = async (url, options) => {
    calls.push({ url, headers: options?.headers || {} });
    if (url.endsWith('/health')) return { ok: true, json: async () => ({ service: 'AHP Decision Studio Enterprise API' }) };
    return { ok: true, json: async () => ({ id: 'active-1' }) };
  };
  try {
    setProjectAccessToken('  secret-token  ');
    await saveProjectAPI({ id: 'active-1' });
    await getProjectAPI('active-1');
    assert.equal(entries.get('ahp_project_access_token_v1'), 'secret-token');
    assert.equal(calls[0].headers.Authorization, undefined);
    assert.equal(calls[1].headers.Authorization, 'Bearer secret-token');
    assert.equal(calls[2].headers.Authorization, undefined);
    assert.equal(calls[3].headers.Authorization, 'Bearer secret-token');
  } finally {
    setProjectAccessToken('');
    globalThis.fetch = originalFetch;
    globalThis.sessionStorage = originalStorage;
  }
});
