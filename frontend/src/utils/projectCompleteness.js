export function missingMatrixPairs(elements = [], matrix, scope) {
  const missing = [];
  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      if (matrix?.[i]?.[j] == null || matrix?.[j]?.[i] == null) {
        missing.push({ scope, i, j, left: elements[i], right: elements[j] });
      }
    }
  }
  return missing;
}

export function missingProjectComparisons(project) {
  if (!project) return [];
  return [
    ...missingMatrixPairs(project.criteria, project.criteria_matrix, 'criteria'),
    ...project.criteria.flatMap(criterion =>
      missingMatrixPairs(project.alternatives, project.alt_matrices?.[criterion], criterion)
    ),
  ];
}

export function invalidMatrixComparisons(elements = [], matrix, scope) {
  const invalid = [];
  const n = elements.length;
  if (n < 1 || elements.some(name => typeof name !== 'string' || !name.trim()) || new Set(elements).size !== n) {
    invalid.push({ scope, message: 'Tên phần tử phải có nội dung và không trùng nhau.' });
  }
  if (!Array.isArray(matrix) || matrix.length !== n || matrix.some(row => !Array.isArray(row) || row.length !== n)) {
    return [{ scope, message: 'Kích thước ma trận không khớp số phần tử.' }];
  }
  for (let i = 0; i < n; i++) {
    const diagonal = matrix[i][i];
    if (typeof diagonal !== 'number' || !Number.isFinite(diagonal) || Math.abs(diagonal - 1) > 1e-6) {
      invalid.push({ scope, message: `Ô đường chéo ${elements[i]} phải bằng 1.` });
    }
    for (let j = i + 1; j < n; j++) {
      const left = matrix[i][j];
      const right = matrix[j][i];
      if (left == null && right == null) continue;
      const pair = `${elements[i]} ↔ ${elements[j]}`;
      if (left == null || right == null) {
        invalid.push({ scope, message: `${pair}: thiếu một phía của cặp so sánh.` });
      } else if (![left, right].every(value => typeof value === 'number' && Number.isFinite(value) && value >= 1 / 9 - 5e-5 && value <= 9 + 5e-5)) {
        invalid.push({ scope, message: `${pair}: giá trị phải nằm trong thang 1/9–9.` });
      } else if (Math.abs(left * right - 1) > 1e-3 * Math.max(1, Math.abs(left * right))) {
        invalid.push({ scope, message: `${pair}: hai giá trị không nghịch đảo nhau.` });
      }
    }
  }
  return invalid;
}

export function invalidProjectComparisons(project) {
  if (!project) return [];
  return [
    ...invalidMatrixComparisons(project.criteria, project.criteria_matrix, 'criteria'),
    ...project.criteria.flatMap(criterion =>
      invalidMatrixComparisons(project.alternatives, project.alt_matrices?.[criterion], criterion)
    ),
  ];
}

export function ahpSignature(project) {
  return JSON.stringify({
    goal: project.goal,
    criteria: project.criteria,
    alternatives: project.alternatives,
    criteria_matrix: project.criteria_matrix,
    alt_matrices: project.alt_matrices,
  });
}
