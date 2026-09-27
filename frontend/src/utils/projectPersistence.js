export const ACTIVE_PROJECT_ID_KEY = 'ahp_active_project_id_v1';
export const ACTIVE_STEP_KEY = 'ahp_active_step_v1';
const DRAFT_PREFIX = 'ahp_project_draft_v1:';
const SYNC_PREFIX = 'ahp_project_synced_v1:';

export function draftKey(id) {
  return `${DRAFT_PREFIX}${id}`;
}

export function readActiveProjectId(storage = globalThis.localStorage) {
  try {
    return storage.getItem(ACTIVE_PROJECT_ID_KEY);
  } catch {
    return null;
  }
}

export function readActiveProject(storage = globalThis.localStorage) {
  try {
    const id = readActiveProjectId(storage);
    const draft = id && storage.getItem(draftKey(id));
    if (!draft) return null;
    const project = JSON.parse(draft);
    if (project?.id !== id || typeof project.title !== 'string' || typeof project.goal !== 'string' ||
        !Array.isArray(project.criteria) ||
        !Array.isArray(project.alternatives) || !Array.isArray(project.criteria_matrix) ||
        !project.alt_matrices || typeof project.alt_matrices !== 'object') return null;
    return project;
  } catch {
    return null;
  }
}

export function writeLocalProject(project, storage = globalThis.localStorage) {
  storage.setItem(draftKey(project.id), JSON.stringify(project));
  storage.setItem(ACTIVE_PROJECT_ID_KEY, project.id);
}

export function markProjectSynced(project, storage = globalThis.localStorage) {
  storage.setItem(`${SYNC_PREFIX}${project.id}`, project.updated_at || '');
}

export function hasUnsyncedChanges(project, storage = globalThis.localStorage) {
  try {
    return storage.getItem(`${SYNC_PREFIX}${project.id}`) !== (project.updated_at || '');
  } catch {
    return true;
  }
}

export function readActiveStep(storage = globalThis.localStorage) {
  try {
    const step = Number(storage.getItem(ACTIVE_STEP_KEY));
    return Number.isInteger(step) && step >= 1 && step <= 5 ? step : 1;
  } catch {
    return 1;
  }
}

export function nextUpdatedAt(previous) {
  const previousTime = Date.parse(previous?.updated_at || '') || 0;
  return new Date(Math.max(Date.now(), previousTime + 1)).toISOString();
}

export function copyAsNewProject(source) {
  const copy = JSON.parse(JSON.stringify(source));
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { ...copy, id: `project-${random}`, updated_at: nextUpdatedAt() };
}

export function serverProjectIsNewer(server, local) {
  if (!server || server.id !== local?.id) return false;
  return (Date.parse(server.updated_at || '') || 0) > (Date.parse(local.updated_at || '') || 0);
}

export function createProjectSaveQueue(save, onResult) {
  const pending = new Map();
  let running = null;

  async function drain() {
    while (pending.size) {
      const [id, snapshot] = pending.entries().next().value;
      pending.delete(id);
      try {
        onResult(snapshot, await save(snapshot), null);
      } catch (error) {
        onResult(snapshot, null, error);
      }
    }
  }

  return {
    cancel(id) {
      pending.delete(id);
    },
    enqueue(project) {
      const snapshot = JSON.parse(JSON.stringify(project));
      pending.set(snapshot.id, snapshot);
      if (!running) {
        running = drain().finally(() => { running = null; });
      }
      return running;
    },
  };
}
