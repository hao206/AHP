import test from 'node:test';
import assert from 'node:assert/strict';
import { synthesizeHierarchyAPI } from '../src/utils/ahpClient.js';

const equal3 = [
  [1, 1, 1],
  [1, 1, 1],
  [1, 1, 1],
];

const cyclic3 = [
  [1, 9, 1 / 9],
  [1 / 9, 1, 9],
  [9, 1 / 9, 1],
];

test('offline synthesis includes an inconsistent alternatives matrix in overall CR', async () => {
  const project = {
    goal: 'Test',
    criteria: ['C1', 'C2'],
    alternatives: ['A', 'B', 'C'],
    criteria_matrix: [[1, 1], [1, 1]],
    alt_matrices: { C1: cyclic3, C2: equal3 },
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('backend unavailable'); };
  try {
    const result = await synthesizeHierarchyAPI(project);
    const criteria = result.criteria_evaluation;
    const alternatives = result.alternatives_evaluation;
    const weightedCi = criteria.consistency_index
      + criteria.weights_list[0] * alternatives.C1.consistency_index
      + criteria.weights_list[1] * alternatives.C2.consistency_index;
    const weightedRi = criteria.random_index
      + criteria.weights_list[0] * alternatives.C1.random_index
      + criteria.weights_list[1] * alternatives.C2.random_index;

    assert.equal(alternatives.C1.consistency_ratio, 6.1303);
    assert.equal(result.overall_consistency_ratio, Math.round(weightedCi / weightedRi * 10000) / 10000);
    assert.equal(result.overall_consistency_ratio, 3.0652);
    assert.equal(result.is_overall_consistent, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('offline synthesis reports consistent when every relevant matrix is consistent', async () => {
  const project = {
    goal: 'Test',
    criteria: ['C1', 'C2'],
    alternatives: ['A', 'B', 'C'],
    criteria_matrix: [[1, 1], [1, 1]],
    alt_matrices: { C1: equal3, C2: equal3 },
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('backend unavailable'); };
  try {
    const result = await synthesizeHierarchyAPI(project);
    assert.equal(result.overall_consistency_ratio, 0);
    assert.equal(result.is_overall_consistent, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
