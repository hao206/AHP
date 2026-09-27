import test from 'node:test';
import assert from 'node:assert/strict';
import { getDecisionMatrix, getCriterionTypes, missingDecisionCells } from '../src/utils/topsisData.js';
import { ahpSignature } from '../src/utils/projectCompleteness.js';

test('imported data_matrix is the TOPSIS source, including zero measurements', () => {
  const project = {
    data_matrix: [[0, 42], [3, 7]],
    topsis_matrix: [[99, 99], [99, 99]],
    criterion_types: ['cost', 'benefit'],
  };
  const alternatives = ['A', 'B'];
  const criteria = ['Cost', 'Quality'];
  assert.deepEqual(getDecisionMatrix(project, alternatives, criteria), project.data_matrix);
  assert.deepEqual(getCriterionTypes(project, criteria), project.criterion_types);
  assert.equal(missingDecisionCells(project.data_matrix, alternatives, criteria).length, 0);
});

test('a project without measurements starts blank, not with sample values', () => {
  const alternatives = ['A', 'B'];
  const criteria = ['C1', 'C2'];
  const matrix = getDecisionMatrix({}, alternatives, criteria);
  assert.deepEqual(matrix, [[null, null], [null, null]]);
  assert.equal(missingDecisionCells(matrix, alternatives, criteria).length, 4);
});

test('editing TOPSIS data does not invalidate an unchanged AHP synthesis', () => {
  const project = {
    goal: 'Test', criteria: ['C1', 'C2'], alternatives: ['A', 'B'],
    criteria_matrix: [[1, 1], [1, 1]],
    alt_matrices: { C1: [[1, 1], [1, 1]], C2: [[1, 1], [1, 1]] },
    data_matrix: [[1, 2], [3, 4]],
  };
  assert.equal(ahpSignature(project), ahpSignature({ ...project, data_matrix: [[9, 8], [7, 6]] }));
});
