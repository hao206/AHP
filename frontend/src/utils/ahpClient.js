/**
 * AHP Client Utility - Comprehensive API Client & Local Fallback Engine
 */

const API_BASE = typeof window !== 'undefined' && window.location.port === '5173'
  ? "http://127.0.0.1:8000/api"
  : "/api";

export const SAATY_SCALE_LABELS = {
  1: "Quan trọng như nhau (1)",
  2: "Giữa Tương đương & Hơi quan trọng hơn (2)",
  3: "Hơi quan trọng hơn (3)",
  4: "Giữa Hơi quan trọng & Quan trọng hơn (4)",
  5: "Quan trọng hơn nhiều (5)",
  6: "Giữa Quan trọng hơn & Rất quan trọng (6)",
  7: "Rất quan trọng / Vượt trội (7)",
  8: "Giữa Rất quan trọng & Cực kỳ quan trọng (8)",
  9: "Cực kỳ quan trọng / Tuyệt đối (9)",
};

export const SAATY_RI = {
  1: 0.0,
  2: 0.0,
  3: 0.58,
  4: 0.90,
  5: 1.12,
  6: 1.24,
  7: 1.32,
  8: 1.41,
  9: 1.45,
  10: 1.49,
};

export async function evaluateMatrixAPI(elements, matrix) {
  try {
    const res = await fetch(`${API_BASE}/ahp/evaluate-matrix`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ elements, matrix, method: "eigenvector" }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Backend API unavailable, using local calculation", err);
  }
  return evaluateMatrixLocal(elements, matrix);
}

export async function benchmarkMethodsAPI(elements, matrix) {
  try {
    const res = await fetch(`${API_BASE}/ahp/benchmark-methods`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ elements, matrix }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Benchmark API error", err);
  }
  return null;
}

export async function completeMissingAPI(elements, matrix) {
  try {
    const res = await fetch(`${API_BASE}/ahp/incomplete-complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ elements, matrix }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Complete missing API error", err);
  }
  return null;
}

export async function synthesizeHierarchyAPI(project) {
  try {
    const res = await fetch(`${API_BASE}/ahp/synthesize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal: project.goal,
        criteria: project.criteria,
        alternatives: project.alternatives,
        criteria_matrix: project.criteria_matrix,
        alt_matrices: project.alt_matrices,
        method: "eigenvector",
      }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Synthesis API error, using local calculation", err);
  }
  return evaluateLocalSynthesis(project);
}

export async function getGradientSensitivityAPI(project, selectedCriterion) {
  try {
    const res = await fetch(`${API_BASE}/ahp/gradient-sensitivity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal: project.goal,
        criteria: project.criteria,
        alternatives: project.alternatives,
        criteria_matrix: project.criteria_matrix,
        alt_matrices: project.alt_matrices,
        selected_criterion: selectedCriterion,
      }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Gradient sensitivity API error", err);
  }
  return null;
}

export async function runHybridTopsisAPI(payload) {
  try {
    const res = await fetch(`${API_BASE}/ahp/hybrid-topsis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Hybrid TOPSIS API error", err);
  }
  return null;
}

export async function exportExcelAPI(project) {
  try {
    const res = await fetch(`${API_BASE}/export/excel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project),
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.title.replace(/\s+/g, "_")}_Report.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return true;
    }
  } catch (err) {
    console.error("Excel export error", err);
  }
  return false;
}

export async function importFileAPI(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/import/file`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Lỗi tải tệp tin" }));
    throw new Error(err.detail || "Không thể phân tích tệp tin.");
  }
  return await res.json();
}

export async function runMonteCarloAPI(project, numSimulations = 1000, perturbationPct = 0.20) {
  try {
    const res = await fetch(`${API_BASE}/ahp/monte-carlo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal: project.goal,
        criteria: project.criteria,
        alternatives: project.alternatives,
        criteria_matrix: project.criteria_matrix,
        alt_matrices: project.alt_matrices,
        num_simulations: numSimulations,
        perturbation_pct: perturbationPct,
      }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Monte Carlo API error, using local simulation fallback", err);
  }
  return evaluateLocalMonteCarlo(project, numSimulations, perturbationPct);
}

export async function autoTuneConsistencyAPI(elements, matrix, targetCr = 0.10) {
  try {
    const res = await fetch(`${API_BASE}/ahp/auto-tune-consistency`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        elements,
        matrix,
        target_cr: targetCr
      }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Auto-tune consistency API error", err);
  }
  return null;
}

export async function getGroupConsensusAPI(elements, expertMatrices) {
  try {
    const res = await fetch(`${API_BASE}/ahp/group-consensus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        elements,
        expert_matrices: expertMatrices
      }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Group consensus API error", err);
  }
  return null;
}

export async function evaluateFuzzyAHPAPI(elements, fuzzyMatrix) {
  try {
    const res = await fetch(`${API_BASE}/ahp/fuzzy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        elements,
        fuzzy_matrix: fuzzyMatrix
      }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("Fuzzy AHP API error", err);
  }
  return null;
}

export const SAMPLE_EXCEL_URL = `${API_BASE}/templates/download-sample-excel`;
export const SAMPLE_CSV_URL = `${API_BASE}/templates/download-sample-csv`;


// Fallback local functions
function evaluateMatrixLocal(elements, matrix) {
  const n = elements.length;
  if (n === 1) {
    return {
      elements,
      weights: { [elements[0]]: 1.0 },
      weights_list: [1.0],
      lambda_max: 1.0,
      consistency_index: 0.0,
      random_index: 0.0,
      consistency_ratio: 0.0,
      is_consistent: true,
      inconsistency_diagnosis: [],
    };
  }

  let w = new Array(n).fill(1 / n);
  for (let iter = 0; iter < 100; iter++) {
    const wNext = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) wNext[i] += matrix[i][j] * w[j];
    }
    const sum = wNext.reduce((a, b) => a + b, 0);
    if (sum === 0) break;
    for (let i = 0; i < n; i++) wNext[i] /= sum;
    let diff = 0;
    for (let i = 0; i < n; i++) diff = Math.max(diff, Math.abs(wNext[i] - w[i]));
    w = wNext;
    if (diff < 1e-6) break;
  }

  let lambdaSum = 0;
  for (let i = 0; i < n; i++) {
    let aw_i = 0;
    for (let j = 0; j < n; j++) aw_i += matrix[i][j] * w[j];
    lambdaSum += aw_i / w[i];
  }
  const lambda_max = lambdaSum / n;
  const ci = n > 1 ? Math.max(0, (lambda_max - n) / (n - 1)) : 0;
  const ri = SAATY_RI[n] || 1.49;
  const cr = ri > 0 ? ci / ri : 0;

  const deviations = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const actual = matrix[i][j];
      const ideal = w[i] / (w[j] || 1e-6);
      const dev = Math.abs(actual - ideal) / Math.max(actual, ideal);
      const saatyVals = [1/9, 1/8, 1/7, 1/6, 1/5, 1/4, 1/3, 1/2, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      const suggested = saatyVals.reduce((prev, curr) => Math.abs(curr - ideal) < Math.abs(prev - ideal) ? curr : prev);
      deviations.push({
        i, j,
        element_a: elements[i],
        element_b: elements[j],
        current_value: actual,
        ideal_ratio: Math.round(ideal * 1000) / 1000,
        suggested_value: suggested,
        deviation: Math.round(dev * 1000) / 1000
      });
    }
  }
  deviations.sort((a, b) => b.deviation - a.deviation);

  const weightsDict = {};
  elements.forEach((el, idx) => { weightsDict[el] = w[idx]; });

  return {
    elements,
    weights: weightsDict,
    weights_list: w,
    lambda_max: Math.round(lambda_max * 1000) / 1000,
    consistency_index: Math.round(ci * 1000) / 1000,
    random_index: ri,
    consistency_ratio: Math.round(cr * 1000) / 1000,
    is_consistent: cr < 0.1,
    inconsistency_diagnosis: deviations,
  };
}

function evaluateLocalSynthesis(project) {
  const critEval = evaluateMatrixLocal(project.criteria, project.criteria_matrix);
  const altEvals = {};
  const altScores = new Array(project.alternatives.length).fill(0);
  const breakdown = project.alternatives.map((alt) => ({
    alternative: alt,
    score: 0,
    percentage: 0,
    contributions: {},
    local_scores: {},
  }));

  project.criteria.forEach((c, cIdx) => {
    const altEval = evaluateMatrixLocal(project.alternatives, project.alt_matrices[c]);
    altEvals[c] = altEval;
    const cWeight = critEval.weights_list[cIdx];

    project.alternatives.forEach((alt, aIdx) => {
      const localAltScore = altEval.weights_list[aIdx];
      breakdown[aIdx].local_scores[c] = Math.round(localAltScore * 1000) / 1000;
      const contrib = localAltScore * cWeight;
      breakdown[aIdx].contributions[c] = Math.round(contrib * 1000) / 1000;
      altScores[aIdx] += contrib;
    });
  });

  breakdown.forEach((item, idx) => {
    item.score = Math.round(altScores[idx] * 1000) / 1000;
    item.percentage = Math.round(altScores[idx] * 10000) / 100;
  });

  const ranked = [...breakdown].sort((a, b) => b.score - a.score);
  ranked.forEach((item, idx) => { item.rank = idx + 1; });

  return {
    goal: project.goal,
    criteria: project.criteria,
    alternatives: project.alternatives,
    criteria_evaluation: critEval,
    alternatives_evaluation: altEvals,
    rankings: ranked,
    breakdown,
    overall_consistency_ratio: critEval.consistency_ratio,
    is_overall_consistent: critEval.is_consistent,
  };
}

function evaluateLocalMonteCarlo(project, numSimulations = 1000, perturbationPct = 0.20) {
  const critEval = evaluateMatrixLocal(project.criteria, project.criteria_matrix);
  const baseW = critEval.weights_list;
  const nCrit = project.criteria.length;
  const nAlt = project.alternatives.length;

  const altLocalMatrix = [];
  project.criteria.forEach((c) => {
    const altEval = evaluateMatrixLocal(project.alternatives, project.alt_matrices[c]);
    altLocalMatrix.push(altEval.weights_list);
  });

  const rank1Counts = new Array(nAlt).fill(0);
  const scoreHistory = {};
  const rankHistory = {};
  project.alternatives.forEach((alt) => {
    scoreHistory[alt] = [];
    rankHistory[alt] = [];
  });

  for (let s = 0; s < numSimulations; s++) {
    const wSim = [];
    let sumW = 0;
    for (let c = 0; c < nCrit; c++) {
      const u1 = Math.random() || 1e-6;
      const u2 = Math.random() || 1e-6;
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      const noise = 1.0 + z0 * perturbationPct;
      const w = Math.max(1e-4, baseW[c] * noise);
      wSim.push(w);
      sumW += w;
    }
    const normW = wSim.map((w) => w / sumW);

    const scores = [];
    for (let a = 0; a < nAlt; a++) {
      let score = 0;
      for (let c = 0; c < nCrit; c++) {
        score += altLocalMatrix[c][a] * normW[c];
      }
      scores.push({ aIdx: a, alt: project.alternatives[a], score });
    }
    scores.sort((x, y) => y.score - x.score);
    rank1Counts[scores[0].aIdx]++;
    scores.forEach((item, rank) => {
      rankHistory[item.alt].push(rank + 1);
      scoreHistory[item.alt].push(item.score);
    });
  }

  const winProbabilities = {};
  const rankDist = {};
  const scoreStats = {};
  const stats = [];

  project.alternatives.forEach((alt, aIdx) => {
    const winRate = Math.round((rank1Counts[aIdx] / numSimulations) * 1000) / 10;
    winProbabilities[alt] = winRate;

    const scores = scoreHistory[alt];
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
    const std = Math.sqrt(variance);
    const min = Math.min(...scores);
    const max = Math.max(...scores);

    scoreStats[alt] = {
      mean: Math.round(mean * 1000) / 1000,
      std: Math.round(std * 1000) / 1000,
      min: Math.round(min * 1000) / 1000,
      max: Math.round(max * 1000) / 1000,
    };

    const rh = rankHistory[alt];
    rankDist[alt] = {
      "1": rh.filter((r) => r === 1).length,
      "2": rh.filter((r) => r === 2).length,
      "3": rh.filter((r) => r >= 3).length,
    };

    stats.push({ alternative: alt, win_probability: winRate });
  });

  stats.sort((x, y) => y.win_probability - x.win_probability);
  const dominantWinner = stats[0].alternative;
  const dominantWinRate = stats[0].win_probability;
  const isHighlyRobust = dominantWinRate >= 70.0;

  return {
    num_simulations: numSimulations,
    iterations: numSimulations,
    perturbation_range: `±${Math.round(perturbationPct * 100)}%`,
    noise_std: perturbationPct,
    alternatives: project.alternatives,
    robustness_summary: stats,
    recommended_winner: dominantWinner,
    dominant_alternative: dominantWinner,
    dominant_win_rate: dominantWinRate,
    is_highly_robust: isHighlyRobust,
    recommendation: isHighlyRobust
      ? `Phương án '${dominantWinner}' áp đảo với xác suất chiến thắng ${dominantWinRate}% qua ${numSimulations.toLocaleString()} kịch bản biến động trọng số ±${Math.round(perturbationPct * 100)}%. Quyết định có độ tin cậy rất cao và vững vàng trước các dao động chủ quan.`
      : `Phương án '${dominantWinner}' dẫn đầu (${dominantWinRate}%), tuy nhiên độ cạnh tranh gay gắt. Khuyến nghị kiểm tra kỹ các tiêu chí có độ nhạy cao.`,
    confidence_level: isHighlyRobust ? "Rất Cao (High Confidence)" : "Trung Bình (Moderate)",
    win_probabilities: winProbabilities,
    rank_distributions: rankDist,
    score_stats: scoreStats,
  };
}
