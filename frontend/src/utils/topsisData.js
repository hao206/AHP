export function getDecisionMatrix(project, alternatives, criteria) {
  const source = project?.data_matrix ?? project?.topsis_matrix;
  if (source?.length === alternatives.length &&
      source.every(row => Array.isArray(row) && row.length === criteria.length)) {
    return source;
  }
  return alternatives.map(() => criteria.map(() => null));
}

export function getCriterionTypes(project, criteria) {
  if (project?.criterion_types?.length === criteria.length) return project.criterion_types;
  return criteria.map(criterion =>
    /cost|chi phí|giá|rủi ro/i.test(criterion) ? 'cost' : 'benefit'
  );
}

export function missingDecisionCells(matrix, alternatives, criteria) {
  const missing = [];
  alternatives.forEach((alternative, row) => {
    criteria.forEach((criterion, column) => {
      if (!Number.isFinite(matrix?.[row]?.[column])) {
        missing.push({ alternative, criterion, row, column });
      }
    });
  });
  return missing;
}
