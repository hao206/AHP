import test from 'node:test';
import assert from 'node:assert/strict';
import { missingMatrixPairs, missingProjectComparisons, invalidMatrixComparisons, invalidProjectComparisons } from '../src/utils/projectCompleteness.js';
import { evaluateMatrixAPI, synthesizeHierarchyAPI, exportExcelAPI, runMonteCarloAPI } from '../src/utils/ahpClient.js';

test('null is unanswered, while an explicit value of 1 is complete', () => {
  const elements = ['A', 'B'];
  assert.equal(missingMatrixPairs(elements, [[1, null], [null, 1]], 'criteria').length, 1);
  assert.equal(missingMatrixPairs(elements, [[1, 1], [1, 1]], 'criteria').length, 0);
});

test('no calculation request is made while a project is unanswered', async () => {
  const project = {
    goal: 'Test', criteria: ['C1', 'C2'], alternatives: ['A', 'B'],
    criteria_matrix: [[1, null], [null, 1]],
    alt_matrices: { C1: [[1, 1], [1, 1]], C2: [[1, 1], [1, 1]] },
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('incomplete project reached the API'); };
  try {
    assert.equal(missingProjectComparisons(project).length, 1);
    assert.equal(await evaluateMatrixAPI(project.criteria, project.criteria_matrix), null);
    assert.equal(await synthesizeHierarchyAPI(project), null);
    assert.equal(await runMonteCarloAPI(project), null);
    assert.equal(await exportExcelAPI(project), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('non-reciprocal and out-of-scale matrices cannot reach the API or offline fallback', async () => {
  const project = {
    goal: 'Test', criteria: ['C1', 'C2'], alternatives: ['A', 'B'],
    criteria_matrix: [[1, 1], [1, 1]],
    alt_matrices: { C1: [[1, 9], [9, 1]], C2: [[1, 1], [1, 1]] },
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('invalid matrix reached the API'); };
  try {
    assert.match(invalidProjectComparisons(project)[0].message, /nghịch đảo/);
    assert.equal(await synthesizeHierarchyAPI(project), null);
    assert.equal(await exportExcelAPI(project), false);
    assert.equal(await evaluateMatrixAPI(project.alternatives, project.alt_matrices.C1), null);
    assert.match(invalidMatrixComparisons(['A', 'B'], [[1, 10], [0.1, 1]], 'matrix')[0].message, /1\/9–9/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('backend validation errors do not trigger local calculation', async () => {
  const project = {
    goal: 'Test', criteria: ['C1', 'C2'], alternatives: ['A', 'B'],
    criteria_matrix: [[1, 1], [1, 1]],
    alt_matrices: { C1: [[1, 1], [1, 1]], C2: [[1, 1], [1, 1]] },
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 400 });
  try {
    assert.equal(await synthesizeHierarchyAPI(project), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
