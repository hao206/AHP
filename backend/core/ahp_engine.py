"""
AHP Core Engine - Advanced Enterprise MCDM Suite
Synthesized from:
- AHPy (Philip Griffith): Power iteration, hierarchy synthesis, incomplete matrix completion.
- Voracious-AHP: Inconsistency Doctor, deviation finder, and multi-method benchmark (EVM, GMM, Arithmetic).
- pyDecision: Fuzzy AHP (Chang's extent analysis) and Hybrid AHP-TOPSIS integration.
"""

from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from scipy.optimize import minimize

# Saaty's Random Index (RI) table for matrix sizes 1 to 15
SAATY_RI = {
    1: 0.00,
    2: 0.00,
    3: 0.58,
    4: 0.90,
    5: 1.12,
    6: 1.24,
    7: 1.32,
    8: 1.41,
    9: 1.45,
    10: 1.49,
    11: 1.51,
    12: 1.48,
    13: 1.56,
    14: 1.57,
    15: 1.59
}

SAATY_SCALE = [
    1/9, 1/8, 1/7, 1/6, 1/5, 1/4, 1/3, 1/2,
    1.0,
    2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0
]

def snap_to_saaty_scale(val: float) -> float:
    if val <= 0:
        return 1.0
    return min(SAATY_SCALE, key=lambda x: abs(x - val))

def format_saaty_label(val: float) -> str:
    if abs(val - 1.0) < 1e-4:
        return "1"
    if val > 1.0:
        return f"{int(round(val))}" if abs(val - round(val)) < 1e-3 else f"{val:.2f}"
    reciprocal = 1.0 / val
    return f"1/{int(round(reciprocal))}" if abs(reciprocal - round(reciprocal)) < 1e-3 else f"{val:.2f}"


class AHPMatrix:
    """
    Pairwise Comparison Matrix Engine.
    Computes priority vectors, consistency index, inconsistency doctor, and method benchmarks.
    """
    def __init__(self, elements: List[str], matrix: Optional[np.ndarray] = None):
        self.elements = elements
        self.n = len(elements)
        if matrix is not None:
            self.matrix = np.array(matrix, dtype=float)
            # Sanitize matrix: replace NaNs, Infs, or non-positive values with 1.0
            self.matrix = np.where(np.isnan(self.matrix) | np.isinf(self.matrix) | (self.matrix <= 0), 1.0, self.matrix)
            for i in range(self.n):
                self.matrix[i, i] = 1.0
        else:
            self.matrix = np.ones((self.n, self.n), dtype=float)

    def set_comparison(self, i: int, j: int, value: float):
        if value <= 0:
            raise ValueError("Comparison value must be positive")
        self.matrix[i, j] = float(value)
        self.matrix[j, i] = 1.0 / float(value)
        self.matrix[i, i] = 1.0

    def compute_eigenvector(self, max_iterations: int = 200, tolerance: float = 1e-7) -> Tuple[np.ndarray, float]:
        """Principal Eigenvector via Power Iteration Method."""
        if self.n == 1:
            return np.array([1.0]), 1.0
        if self.n == 2:
            val = self.matrix[0, 1] if self.matrix[0, 1] > 0 else 1.0
            w = np.array([val / (1.0 + val), 1.0 / (1.0 + val)])
            return w, 2.0

        w = np.ones(self.n) / self.n
        for _ in range(max_iterations):
            w_next = self.matrix @ w
            norm = np.sum(w_next)
            if norm == 0 or np.isnan(norm):
                break
            w_next = w_next / norm
            if np.max(np.abs(w_next - w)) < tolerance:
                w = w_next
                break
            w = w_next

        Aw = self.matrix @ w
        lambda_max = float(np.mean(Aw / np.where(w == 0, 1e-6, w)))
        if np.isnan(lambda_max) or np.isinf(lambda_max):
            lambda_max = float(self.n)
        return w, lambda_max

    def compute_geometric_mean(self) -> np.ndarray:
        """Geometric Mean Method (GMM / Logarithmic Least Squares)."""
        if self.n == 1:
            return np.array([1.0])
        clean_mat = np.where((self.matrix <= 0) | np.isnan(self.matrix), 1.0, self.matrix)
        geom_means = np.prod(clean_mat, axis=1) ** (1.0 / self.n)
        geom_means = np.nan_to_num(geom_means, nan=1.0)
        s = np.sum(geom_means)
        return geom_means / s if s > 0 and not np.isnan(s) else np.ones(self.n) / self.n

    def compute_mean_normalization(self) -> np.ndarray:
        """Arithmetic Column Mean Normalization."""
        col_sums = self.matrix.sum(axis=0)
        col_sums = np.where((col_sums == 0) | np.isnan(col_sums), 1.0, col_sums)
        norm_matrix = self.matrix / col_sums
        norm_matrix = np.nan_to_num(norm_matrix, nan=1.0 / self.n)
        return norm_matrix.mean(axis=1)

    def benchmark_methods(self) -> Dict[str, Any]:
        """
        Multi-Method Benchmarking (from Voracious-AHP):
        Compares Eigenvector Method (EVM), Geometric Mean (GMM), and Arithmetic Normalization.
        """
        w_evm, _ = self.compute_eigenvector()
        w_gmm = self.compute_geometric_mean()
        w_arith = self.compute_mean_normalization()

        # Sanitize NaNs
        w_evm = np.nan_to_num(w_evm, nan=1.0 / self.n)
        w_gmm = np.nan_to_num(w_gmm, nan=1.0 / self.n)
        w_arith = np.nan_to_num(w_arith, nan=1.0 / self.n)

        mad_evm_gmm = float(np.max(np.abs(w_evm - w_gmm)))
        if np.isnan(mad_evm_gmm):
            mad_evm_gmm = 0.0

        rows = []
        for idx, el in enumerate(self.elements):
            evm_v = float(w_evm[idx]) if not np.isnan(w_evm[idx]) else 1.0 / self.n
            gmm_v = float(w_gmm[idx]) if not np.isnan(w_gmm[idx]) else 1.0 / self.n
            arith_v = float(w_arith[idx]) if not np.isnan(w_arith[idx]) else 1.0 / self.n

            rows.append({
                "element": el,
                "evm_weight": round(evm_v, 4),
                "evm_pct": round(evm_v * 100, 2),
                "gmm_weight": round(gmm_v, 4),
                "gmm_pct": round(gmm_v * 100, 2),
                "arith_weight": round(arith_v, 4),
                "arith_pct": round(arith_v * 100, 2),
            })

        return {
            "comparison": rows,
            "max_discrepancy": round(mad_evm_gmm, 4),
            "robustness": "High Robustness" if mad_evm_gmm < 0.03 else "Noticeable Discrepancy"
        }

    def complete_missing_comparisons(self) -> np.ndarray:
        """
        Incomplete Pairwise Comparison Completion (inspired by AHPy):
        Optimizes missing/unspecified entries (marked as 0 or <= 0) to minimize log consistency discrepancy.
        """
        comp_mat = self.matrix.copy()
        missing_indices = []
        for i in range(self.n):
            for j in range(i + 1, self.n):
                if comp_mat[i, j] <= 0:
                    missing_indices.append((i, j))

        if not missing_indices:
            return comp_mat

        # If any missing, use spanning tree or log optimization
        def objective(x):
            for idx, (i, j) in enumerate(missing_indices):
                val = np.exp(x[idx])
                comp_mat[i, j] = val
                comp_mat[j, i] = 1.0 / val
            # approximate CR or variance of transitive log differences
            geom = np.prod(comp_mat, axis=1) ** (1.0 / self.n)
            geom_norm = geom / np.sum(geom)
            loss = 0.0
            for i in range(self.n):
                for j in range(self.n):
                    ideal = geom_norm[i] / (geom_norm[j] + 1e-9)
                    loss += (np.log(comp_mat[i, j]) - np.log(ideal)) ** 2
            return loss

        init_x = np.zeros(len(missing_indices))
        res = minimize(objective, init_x, method="BFGS")
        for idx, (i, j) in enumerate(missing_indices):
            val = snap_to_saaty_scale(float(np.exp(res.x[idx])))
            comp_mat[i, j] = val
            comp_mat[j, i] = 1.0 / val
            comp_mat[i, i] = 1.0

        self.matrix = comp_mat
        return comp_mat

    def evaluate(self, method: str = "eigenvector") -> Dict[str, Any]:
        if method == "geometric_mean":
            weights = self.compute_geometric_mean()
            Aw = self.matrix @ weights
            lambda_max = float(np.mean(Aw / weights)) if self.n > 1 else 1.0
        elif method == "mean_normalization":
            weights = self.compute_mean_normalization()
            Aw = self.matrix @ weights
            lambda_max = float(np.mean(Aw / weights)) if self.n > 1 else 1.0
        else:
            weights, lambda_max = self.compute_eigenvector()

        ci = (lambda_max - self.n) / (self.n - 1) if self.n > 1 else 0.0
        ci = max(0.0, ci)
        ri = SAATY_RI.get(self.n, 1.59)
        cr = (ci / ri) if (ri > 0 and self.n > 2) else 0.0

        # Alonso & Lamata (2006) Consistency Ratio (from AHP-OS AhpCalc.php)
        if self.n > 2:
            alonso_ri = (2.7699 * self.n - 4.3513) - self.n
            cr_alonso = (lambda_max - self.n) / alonso_ri if alonso_ri != 0 else cr
        else:
            cr_alonso = 0.0

        # Goepel standard error of weights (evm_err) & tolerance intervals (from AHP-OS AhpCalc.php)
        nlm = self.n / lambda_max if lambda_max > 0 else 1.0
        sqs = np.zeros(self.n)
        for i in range(self.n):
            for k in range(self.n):
                diff = self.matrix[i, k] * weights[k] * nlm - weights[i]
                sqs[i] += diff * diff
        evm_err = np.sqrt(sqs / (self.n - 1)) if self.n > 1 else np.zeros(self.n)
        weight_uncertainties = [round(float(e), 4) for e in evm_err]
        tolerance_intervals = [
            {"min": round(max(0.0, float(w - e)), 4), "max": round(float(w + e), 4)}
            for w, e in zip(weights, evm_err)
        ]

        is_consistent = cr < 0.10
        inconsistency_details = self._diagnose_inconsistency(weights)

        return {
            "elements": self.elements,
            "weights": {elem: float(w) for elem, w in zip(self.elements, weights)},
            "weights_list": [float(w) for w in weights],
            "weight_uncertainties": weight_uncertainties,
            "tolerance_intervals": tolerance_intervals,
            "lambda_max": round(lambda_max, 4),
            "consistency_index": round(ci, 4),
            "random_index": ri,
            "consistency_ratio": round(cr, 4),
            "cr_alonso": round(float(cr_alonso), 4),
            "is_consistent": is_consistent,
            "status": "Consistent (CR < 0.10)" if is_consistent else "Inconsistent (CR >= 0.10)",
            "matrix": self.matrix.tolist(),
            "inconsistency_diagnosis": inconsistency_details,
            "benchmark": self.benchmark_methods()
        }

    def auto_reduce_inconsistency(self, target_cr: float = 0.10, max_iterations: int = 6) -> Dict[str, Any]:
        """
        Inconsistency Reduction & Auto-Tuning Engine (from Voracious-AHP):
        Iteratively identifies the pairwise comparison with maximum deviation from transitivity
        and adjusts it towards the optimal ratio on Saaty scale until CR <= target_cr.
        """
        current_mat = self.matrix.copy()
        initial_w, initial_lambda = self.compute_eigenvector()
        ci_init = (initial_lambda - self.n) / (self.n - 1) if self.n > 1 else 0.0
        ri = SAATY_RI.get(self.n, 1.59)
        initial_cr = (ci_init / ri) if (ri > 0 and self.n > 2) else 0.0

        if initial_cr <= target_cr or self.n <= 2:
            return {
                "initial_cr": round(float(initial_cr), 4),
                "optimized_cr": round(float(initial_cr), 4),
                "is_improved": False,
                "target_achieved": True,
                "adjusted_pairs": [],
                "optimized_matrix": current_mat.tolist()
            }

        adjustments = []
        for step in range(max_iterations):
            w, l_max = AHPMatrix(self.elements, current_mat).compute_eigenvector()
            ci = (l_max - self.n) / (self.n - 1) if self.n > 1 else 0.0
            cr = (ci / ri) if (ri > 0 and self.n > 2) else 0.0
            if cr <= target_cr:
                break

            # Find pair with maximum deviation
            best_pair = None
            max_dev = -1.0
            for i in range(self.n):
                for j in range(i + 1, self.n):
                    ideal = w[i] / w[j] if w[j] > 0 else 1.0
                    dev = abs(current_mat[i, j] - ideal)
                    if dev > max_dev:
                        max_dev = dev
                        best_pair = (i, j, ideal)

            if not best_pair or max_dev < 1e-4:
                break

            i, j, ideal = best_pair
            old_val = current_mat[i, j]
            snapped_val = snap_to_saaty_scale(ideal)

            # If snapped is identical to old, nudge slightly towards ideal
            if abs(snapped_val - old_val) < 1e-3:
                snapped_val = (old_val + ideal) / 2.0

            current_mat[i, j] = snapped_val
            current_mat[j, i] = 1.0 / snapped_val
            current_mat[i, i] = 1.0

            adjustments.append({
                "step": step + 1,
                "element_a": self.elements[i],
                "element_b": self.elements[j],
                "old_value": round(float(old_val), 3),
                "old_label": format_saaty_label(old_val),
                "new_value": round(float(snapped_val), 3),
                "new_label": format_saaty_label(snapped_val),
                "ideal_ratio": round(float(ideal), 3)
            })

        w_opt, l_opt = AHPMatrix(self.elements, current_mat).compute_eigenvector()
        ci_opt = (l_opt - self.n) / (self.n - 1) if self.n > 1 else 0.0
        final_cr = (ci_opt / ri) if (ri > 0 and self.n > 2) else 0.0

        return {
            "initial_cr": round(float(initial_cr), 4),
            "optimized_cr": round(float(final_cr), 4),
            "is_improved": final_cr < initial_cr,
            "target_achieved": final_cr <= target_cr,
            "adjusted_pairs": adjustments,
            "optimized_matrix": current_mat.tolist()
        }

    def _diagnose_inconsistency(self, weights: np.ndarray) -> List[Dict[str, Any]]:
        if self.n <= 2:
            return []
        deviations = []
        for i in range(self.n):
            for j in range(i + 1, self.n):
                actual_val = self.matrix[i, j]
                ideal_ratio = weights[i] / weights[j] if weights[j] > 0 else 1.0
                deviation = abs(actual_val - ideal_ratio) / max(actual_val, ideal_ratio)
                suggested_val = snap_to_saaty_scale(ideal_ratio)

                deviations.append({
                    "i": int(i),
                    "j": int(j),
                    "element_a": self.elements[i],
                    "element_b": self.elements[j],
                    "current_value": float(actual_val),
                    "current_label": format_saaty_label(actual_val),
                    "ideal_ratio": round(float(ideal_ratio), 3),
                    "suggested_value": float(suggested_val),
                    "suggested_label": format_saaty_label(suggested_val),
                    "deviation": round(float(deviation), 4)
                })
        deviations.sort(key=lambda x: x["deviation"], reverse=True)
        return deviations


class AHPHierarchy:
    """Manages complete AHP Decision Hierarchy."""
    def __init__(self, goal: str, criteria: List[str], alternatives: List[str]):
        self.goal = goal
        self.criteria = criteria
        self.alternatives = alternatives
        self.criteria_matrix = AHPMatrix(criteria)
        self.alt_matrices: Dict[str, AHPMatrix] = {
            c: AHPMatrix(alternatives) for c in criteria
        }

    def synthesize(self, method: str = "eigenvector") -> Dict[str, Any]:
        crit_eval = self.criteria_matrix.evaluate(method)
        crit_weights = np.array(crit_eval["weights_list"])

        alt_evals = {}
        alt_local_matrix = np.zeros((len(self.alternatives), len(self.criteria)))

        for c_idx, c in enumerate(self.criteria):
            alt_res = self.alt_matrices[c].evaluate(method)
            alt_evals[c] = alt_res
            alt_local_matrix[:, c_idx] = alt_res["weights_list"]

        global_scores = alt_local_matrix @ crit_weights

        breakdown = []
        for a_idx, alt in enumerate(self.alternatives):
            contributions = {}
            for c_idx, crit in enumerate(self.criteria):
                contributions[crit] = round(float(alt_local_matrix[a_idx, c_idx] * crit_weights[c_idx]), 4)
            
            breakdown.append({
                "alternative": alt,
                "score": round(float(global_scores[a_idx]), 4),
                "percentage": round(float(global_scores[a_idx] * 100), 2),
                "contributions": contributions,
                "local_scores": {crit: round(float(alt_local_matrix[a_idx, c_idx]), 4) for c_idx, crit in enumerate(self.criteria)}
            })

        ranked = sorted(breakdown, key=lambda x: x["score"], reverse=True)
        for rank, item in enumerate(ranked, 1):
            item["rank"] = rank

        oir = self._compute_overall_cr(crit_eval, alt_evals)

        return {
            "goal": self.goal,
            "criteria": self.criteria,
            "alternatives": self.alternatives,
            "criteria_evaluation": crit_eval,
            "alternatives_evaluation": alt_evals,
            "rankings": ranked,
            "breakdown": breakdown,
            "overall_consistency_ratio": round(oir, 4),
            "is_overall_consistent": oir < 0.10
        }

    def _compute_overall_cr(self, crit_eval: Dict[str, Any], alt_evals: Dict[str, Any]) -> float:
        crit_weights = crit_eval["weights_list"]
        total_ci = crit_eval["consistency_index"]
        total_ri = crit_eval["random_index"]

        for idx, crit in enumerate(self.criteria):
            w = crit_weights[idx]
            alt_res = alt_evals[crit]
            total_ci += w * alt_res["consistency_index"]
            total_ri += w * alt_res["random_index"]

        if total_ri <= 0:
            return 0.0
        return total_ci / total_ri

    def compute_gradient_sensitivity(self, selected_criterion: str) -> Dict[str, Any]:
        """
        Expert Choice Gradient Sensitivity:
        Varies selected criterion weight w from 0.0 to 1.0 (step 0.02),
        proportionally adjusts other criteria, and calculates alternative lines + crossover points.
        """
        if selected_criterion not in self.criteria:
            raise ValueError(f"Criterion {selected_criterion} not found")

        crit_idx = self.criteria.index(selected_criterion)
        crit_eval = self.criteria_matrix.evaluate("eigenvector")
        base_weights = np.array(crit_eval["weights_list"])

        # Local alternative matrix
        alt_local = np.zeros((len(self.alternatives), len(self.criteria)))
        for c_i, c in enumerate(self.criteria):
            alt_local[:, c_i] = self.alt_matrices[c].evaluate("eigenvector")["weights_list"]

        w_steps = np.linspace(0.0, 1.0, 51)
        curve_data = {alt: [] for alt in self.alternatives}

        other_sum_base = np.sum([base_weights[i] for i in range(len(self.criteria)) if i != crit_idx])

        for w_target in w_steps:
            weights_k = np.zeros(len(self.criteria))
            weights_k[crit_idx] = w_target
            remaining = 1.0 - w_target
            for i in range(len(self.criteria)):
                if i != crit_idx:
                    if other_sum_base > 0:
                        weights_k[i] = (base_weights[i] / other_sum_base) * remaining
                    else:
                        weights_k[i] = remaining / (len(self.criteria) - 1)
            
            scores = alt_local @ weights_k
            for a_i, alt in enumerate(self.alternatives):
                curve_data[alt].append({
                    "criterion_weight": round(float(w_target * 100), 1),
                    "score": round(float(scores[a_i] * 100), 2)
                })

        # Detect crossover points (intersections where leader changes)
        crossovers = []
        for step_idx in range(len(w_steps) - 1):
            w1 = w_steps[step_idx]
            w2 = w_steps[step_idx + 1]
            for i in range(len(self.alternatives)):
                for j in range(i + 1, len(self.alternatives)):
                    alt_i = self.alternatives[i]
                    alt_j = self.alternatives[j]
                    diff1 = curve_data[alt_i][step_idx]["score"] - curve_data[alt_j][step_idx]["score"]
                    diff2 = curve_data[alt_i][step_idx + 1]["score"] - curve_data[alt_j][step_idx + 1]["score"]
                    if diff1 * diff2 < 0: # sign change -> intersection
                        crossover_w = round(float((w1 + w2) / 2 * 100), 1)
                        crossovers.append({
                            "criterion_weight": crossover_w,
                            "alt_a": alt_i,
                            "alt_b": alt_j,
                            "description": f"Phương án \"{alt_i}\" cắt \"{alt_j}\" tại mức trọng số {crossover_w}% của tiêu chí \"{selected_criterion}\" (đảo chiều thứ hạng)."
                        })

        return {
            "criterion": selected_criterion,
            "baseline_weight_pct": round(float(base_weights[crit_idx] * 100), 1),
            "curves": curve_data,
            "crossovers": crossovers
        }


def run_hybrid_ahp_topsis(
    decision_matrix: List[List[float]],
    weights: List[float],
    criterion_types: List[str], # 'benefit' or 'cost'
    alternatives: List[str],
    criteria: List[str]
) -> Dict[str, Any]:
    """
    Hybrid AHP-TOPSIS Engine (from pyDecision):
    Evaluates alternatives based on quantitative data matrix X using weights derived from AHP.
    """
    X = np.array(decision_matrix, dtype=float)
    m, n = X.shape
    w = np.array(weights, dtype=float)
    w = w / np.sum(w)

    # 1. Vector normalization: r_ij = x_ij / sqrt(sum(x_kj^2))
    norm_factors = np.sqrt(np.sum(X**2, axis=0))
    norm_factors = np.where(norm_factors == 0, 1e-9, norm_factors)
    R = X / norm_factors

    # 2. Weighted normalized decision matrix: V = R * w
    V = R * w

    # 3. Determine positive ideal (A+) and negative ideal (A-)
    A_plus = np.zeros(n)
    A_minus = np.zeros(n)
    for j in range(n):
        c_type = criterion_types[j].lower() if j < len(criterion_types) else 'benefit'
        if c_type == 'benefit':
            A_plus[j] = np.max(V[:, j])
            A_minus[j] = np.min(V[:, j])
        else: # cost criterion
            A_plus[j] = np.min(V[:, j])
            A_minus[j] = np.max(V[:, j])

    # 4. Euclidean distance to ideal solutions
    D_plus = np.sqrt(np.sum((V - A_plus)**2, axis=1))
    D_minus = np.sqrt(np.sum((V - A_minus)**2, axis=1))

    # 5. Closeness coefficient: C_i = D_minus / (D_plus + D_minus)
    total_dist = D_plus + D_minus
    C = np.where(total_dist == 0, 0.5, D_minus / total_dist)

    results = []
    for idx, alt in enumerate(alternatives):
        results.append({
            "alternative": alt,
            "closeness": round(float(C[idx]), 4),
            "percentage": round(float(C[idx] * 100), 2),
            "distance_ideal": round(float(D_plus[idx]), 4),
            "distance_anti_ideal": round(float(D_minus[idx]), 4)
        })

    ranked = sorted(results, key=lambda x: x["closeness"], reverse=True)
    for rank, item in enumerate(ranked, 1):
        item["rank"] = rank

    return {
        "rankings": ranked,
        "normalized_matrix": R.tolist(),
        "weighted_matrix": V.tolist(),
        "ideal_solution": A_plus.tolist(),
        "anti_ideal_solution": A_minus.tolist()
    }


def run_monte_carlo_simulation(
    hierarchy: AHPHierarchy,
    num_simulations: int = 1000,
    perturbation_pct: float = 0.20
) -> Dict[str, Any]:
    """
    Enterprise Monte Carlo Robustness & Risk Engine:
    Simulates stochastic noise/perturbation on criteria weights across 1,000+ iterations
    to measure the empirical probability of each alternative being Rank 1 (Winner Probability).
    """
    criteria = hierarchy.criteria
    alternatives = hierarchy.alternatives
    n_crit = len(criteria)
    n_alt = len(alternatives)

    # 1. Base weights from Eigenvector Method
    base_w, _ = hierarchy.criteria_matrix.compute_eigenvector()
    
    # 2. Local alternative scores for each criterion
    alt_local_matrix = np.zeros((n_alt, n_crit))
    for c_idx, c in enumerate(criteria):
        if c in hierarchy.alt_matrices:
            w_alt, _ = hierarchy.alt_matrices[c].compute_eigenvector()
            alt_local_matrix[:, c_idx] = w_alt

    # 3. Perform Monte Carlo Trials
    rank_1_counts = np.zeros(n_alt)
    rank_history = {alt: [] for alt in alternatives}
    score_history = {alt: [] for alt in alternatives}

    np.random.seed(42) # Reproducible baseline
    sigma = perturbation_pct

    for _ in range(num_simulations):
        # Generate random multiplicative Gaussian perturbation around base weights
        noise = np.random.normal(loc=1.0, scale=sigma, size=n_crit)
        w_sim = np.maximum(base_w * noise, 1e-4)
        w_sim = w_sim / np.sum(w_sim) # Renormalize

        # Composite score
        scores = alt_local_matrix @ w_sim
        
        # Rank ordering (descending)
        ranked_indices = np.argsort(-scores)
        winner_idx = ranked_indices[0]
        rank_1_counts[winner_idx] += 1

        for pos, alt_idx in enumerate(ranked_indices, 1):
            alt_name = alternatives[alt_idx]
            rank_history[alt_name].append(pos)
            score_history[alt_name].append(scores[alt_idx])

    # 4. Synthesize Monte Carlo Statistics
    stats = []
    for idx, alt in enumerate(alternatives):
        win_rate = (rank_1_counts[idx] / num_simulations) * 100
        scores = np.array(score_history[alt])
        ranks = np.array(rank_history[alt])

        stats.append({
            "alternative": alt,
            "win_probability": round(float(win_rate), 1),
            "mean_score": round(float(np.mean(scores)), 4),
            "std_dev": round(float(np.std(scores)), 4),
            "min_score": round(float(np.min(scores)), 4),
            "max_score": round(float(np.max(scores)), 4),
            "mean_rank": round(float(np.mean(ranks)), 2),
            "rank_1_count": int(rank_1_counts[idx])
        })

    # Sort by win probability descending
    stats = sorted(stats, key=lambda x: x["win_probability"], reverse=True)

    win_probabilities = {s["alternative"]: s["win_probability"] for s in stats}
    rank_dist = {}
    score_stats = {}
    for alt in alternatives:
        rh = rank_history[alt]
        rank_dist[alt] = {
            "1": rh.count(1),
            "2": rh.count(2),
            "3": sum(1 for r in rh if r >= 3)
        }
        sc = np.array(score_history[alt])
        score_stats[alt] = {
            "mean": round(float(np.mean(sc)), 4),
            "std": round(float(np.std(sc)), 4),
            "min": round(float(np.min(sc)), 4),
            "max": round(float(np.max(sc)), 4)
        }

    dominant_winner = stats[0]["alternative"]
    dominant_win_rate = stats[0]["win_probability"]
    is_highly_robust = dominant_win_rate >= 70.0
    rec_text = (
        f"Phương án '{dominant_winner}' áp đảo với xác suất chiến thắng {dominant_win_rate}% qua {num_simulations:,} kịch bản biến động trọng số ±{int(perturbation_pct * 100)}%. "
        f"Quyết định có độ tin cậy rất cao và vững vàng trước các dao động chủ quan."
        if is_highly_robust else
        f"Phương án '{dominant_winner}' dẫn đầu ({dominant_win_rate}%), tuy nhiên độ cạnh tranh gay gắt. Khuyến nghị kiểm tra kỹ các tiêu chí có độ nhạy cao."
    )

    return {
        "num_simulations": num_simulations,
        "iterations": num_simulations,
        "perturbation_range": f"±{int(perturbation_pct * 100)}%",
        "noise_std": perturbation_pct,
        "alternatives": alternatives,
        "robustness_summary": stats,
        "recommended_winner": dominant_winner,
        "dominant_alternative": dominant_winner,
        "dominant_win_rate": dominant_win_rate,
        "is_highly_robust": is_highly_robust,
        "recommendation": rec_text,
        "confidence_level": "Rất Cao (High Confidence)" if is_highly_robust else "Trung Bình (Moderate)",
        "win_probabilities": win_probabilities,
        "rank_distributions": rank_dist,
        "score_stats": score_stats
    }


def aggregate_expert_matrices(matrices: List[List[List[float]]]) -> List[List[float]]:
    """
    Group Decision Making (GDM):
    Aggregates individual expert pairwise judgment matrices (AIJ)
    using the element-wise Geometric Mean Method.
    """
    if not matrices:
        raise ValueError("Danh sách ma trận chuyên gia không được để trống.")
    
    k = len(matrices)
    np_matrices = [np.array(m, dtype=float) for m in matrices]
    n = np_matrices[0].shape[0]

    # Element-wise geometric mean
    aggregated = np.ones((n, n), dtype=float)
    for i in range(n):
        for j in range(n):
            if i == j:
                aggregated[i, j] = 1.0
            elif i < j:
                vals = [m[i, j] for m in np_matrices]
                geom = np.prod(vals) ** (1.0 / k)
                aggregated[i, j] = geom
                aggregated[j, i] = 1.0 / geom

    return aggregated.tolist()


def compute_group_consensus(expert_matrices: List[List[List[float]]], elements: List[str]) -> Dict[str, Any]:
    """
    Goepel's AHP Group Consensus Index (AHP-OS / Goepel 2013):
    Calculates Shannon Entropy-based consensus indicator S* among K decision makers.
    """
    k = len(expert_matrices)
    if k < 2:
        return {"consensus_index": 100.0, "rating": "Rất cao (Đồng thuận tuyệt đối)", "code": "very_high"}

    vectors = []
    for mat in expert_matrices:
        w, _ = AHPMatrix(elements, mat).compute_eigenvector()
        vectors.append(w)

    geom = np.prod(vectors, axis=0) ** (1.0 / k)
    pooled_w = geom / np.sum(geom)

    alpha_entropies = []
    for w in vectors:
        h = -np.sum([p * np.log(p) for p in w if p > 0])
        alpha_entropies.append(h)
    alpha_h = float(np.mean(alpha_entropies))

    gamma_h = float(-np.sum([p * np.log(p) for p in pooled_w if p > 0]))
    beta_h = max(0.0, gamma_h - alpha_h)

    n = len(elements)
    max_entropy = np.log(n) if n > 1 else 1.0
    consensus_pct = max(0.0, min(100.0, (1.0 - (beta_h / max_entropy)) * 100.0))

    if consensus_pct <= 50.0:
        rating = "Rất thấp (Very Low)"
        status = "low"
    elif consensus_pct <= 62.5:
        rating = "Thấp (Low)"
        status = "low"
    elif consensus_pct <= 75.0:
        rating = "Trung bình (Moderate)"
        status = "medium"
    elif consensus_pct <= 87.5:
        rating = "Cao (High)"
        status = "high"
    else:
        rating = "Rất cao (Very High)"
        status = "very_high"

    return {
        "expert_count": k,
        "consensus_pct": round(float(consensus_pct), 1),
        "rating": rating,
        "status": status,
        "pooled_weights": {el: round(float(w), 4) for el, w in zip(elements, pooled_w)},
        "alpha_entropy": round(float(alpha_h), 4),
        "gamma_entropy": round(float(gamma_h), 4),
        "beta_entropy": round(float(beta_h), 4)
    }


def compute_fuzzy_ahp(fuzzy_matrix: List[List[List[float]]], elements: List[str]) -> Dict[str, Any]:
    """
    Fuzzy AHP (Buckley's Geometric Mean Method) from pyDecision:
    Evaluates Triangular Fuzzy Number (TFN: l, m, u) pairwise comparisons.
    """
    n = len(elements)
    dataset = np.array(fuzzy_matrix, dtype=float)

    s_row = []
    for i in range(n):
        prod_l = np.prod([dataset[i, j, 0] for j in range(n)]) ** (1.0 / n)
        prod_m = np.prod([dataset[i, j, 1] for j in range(n)]) ** (1.0 / n)
        prod_u = np.prod([dataset[i, j, 2] for j in range(n)]) ** (1.0 / n)
        s_row.append((prod_l, prod_m, prod_u))

    sum_l = sum(r[0] for r in s_row)
    sum_m = sum(r[1] for r in s_row)
    sum_u = sum(r[2] for r in s_row)

    fuzzy_weights = []
    defuzzified = []
    for i in range(n):
        w_l = s_row[i][0] / sum_u if sum_u > 0 else 0
        w_m = s_row[i][1] / sum_m if sum_m > 0 else 0
        w_u = s_row[i][2] / sum_l if sum_l > 0 else 0
        fuzzy_weights.append({
            "element": elements[i],
            "l": round(float(w_l), 4),
            "m": round(float(w_m), 4),
            "u": round(float(w_u), 4)
        })
        crisp = (w_l + w_m + w_u) / 3.0
        defuzzified.append(crisp)

    total_crisp = sum(defuzzified) if sum(defuzzified) > 0 else 1.0
    norm_weights = [round(float(c / total_crisp), 4) for c in defuzzified]

    return {
        "elements": elements,
        "fuzzy_weights": fuzzy_weights,
        "crisp_weights": {el: w for el, w in zip(elements, norm_weights)},
        "weights_list": norm_weights
    }


def run_monte_carlo_ahp(
    criteria: List[str],
    alternatives: List[str],
    criteria_matrix: List[List[float]],
    alt_matrices: Dict[str, List[List[float]]],
    num_simulations: int = 1000,
    perturbation_pct: float = 0.20
) -> Dict[str, Any]:
    """
    Monte Carlo Robustness Simulation for AHP decisions.
    Applies Gaussian noise to criteria weights and evaluates stability across thousands of iterations.
    """
    n_crit = len(criteria)
    n_alt = len(alternatives)

    # 1. Compute baseline criteria weights
    crit_mat = AHPMatrix(criteria, np.array(criteria_matrix, dtype=float))
    crit_eval = crit_mat.evaluate("eigenvector")
    base_w = np.array(crit_eval["weights_list"], dtype=float)

    # 2. Compute local alternative weights for each criterion
    alt_local = np.zeros((n_crit, n_alt))
    for c_idx, c in enumerate(criteria):
        if c in alt_matrices:
            a_mat = AHPMatrix(alternatives, np.array(alt_matrices[c], dtype=float))
            a_eval = a_mat.evaluate("eigenvector")
            alt_local[c_idx, :] = a_eval["weights_list"]
        else:
            alt_local[c_idx, :] = 1.0 / n_alt

    # 3. Run Monte Carlo simulation runs
    rank1_counts = {alt: 0 for alt in alternatives}
    rank_history = {alt: [] for alt in alternatives}
    score_history = {alt: [] for alt in alternatives}

    np.random.seed(42)

    for _ in range(num_simulations):
        # Apply Gaussian noise to weights
        noise = np.random.normal(1.0, perturbation_pct, n_crit)
        sim_w = np.maximum(1e-4, base_w * noise)
        sim_w_norm = sim_w / np.sum(sim_w)

        # Calculate final alternative scores: alt_local.T @ sim_w_norm
        scores = alt_local.T @ sim_w_norm

        # Rank alternatives
        indexed_scores = [(scores[a_idx], alternatives[a_idx]) for a_idx in range(n_alt)]
        indexed_scores.sort(key=lambda x: x[0], reverse=True)

        winner = indexed_scores[0][1]
        rank1_counts[winner] += 1

        for rank, (score_val, alt) in enumerate(indexed_scores, 1):
            rank_history[alt].append(rank)
            score_history[alt].append(float(score_val))

    # 4. Synthesize statistical metrics
    win_probabilities = {}
    rank_distributions = {}
    score_stats = {}
    robustness_summary = []

    for alt in alternatives:
        win_rate = round((rank1_counts[alt] / num_simulations) * 100, 1)
        win_probabilities[alt] = win_rate

        scores = score_history[alt]
        mean_val = float(np.mean(scores))
        std_val = float(np.std(scores))
        min_val = float(np.min(scores))
        max_val = float(np.max(scores))

        score_stats[alt] = {
            "mean": round(mean_val, 4),
            "std": round(std_val, 4),
            "min": round(min_val, 4),
            "max": round(max_val, 4)
        }

        rh = rank_history[alt]
        rank_distributions[alt] = {
            "1": sum(1 for r in rh if r == 1),
            "2": sum(1 for r in rh if r == 2),
            "3": sum(1 for r in rh if r >= 3)
        }

        robustness_summary.append({
            "alternative": alt,
            "win_probability": win_rate
        })

    robustness_summary.sort(key=lambda x: x["win_probability"], reverse=True)
    dominant_alt = robustness_summary[0]["alternative"]
    dominant_rate = robustness_summary[0]["win_probability"]
    is_highly_robust = dominant_rate >= 70.0

    return {
        "num_simulations": num_simulations,
        "iterations": num_simulations,
        "perturbation_range": f"±{int(round(perturbation_pct * 100))}%",
        "noise_std": perturbation_pct,
        "alternatives": alternatives,
        "robustness_summary": robustness_summary,
        "recommended_winner": dominant_alt,
        "dominant_alternative": dominant_alt,
        "dominant_win_rate": dominant_rate,
        "is_highly_robust": is_highly_robust,
        "recommendation": (
            f"Phương án '{dominant_alt}' áp đảo với xác suất chiến thắng {dominant_rate}% "
            f"qua {num_simulations:,} kịch bản biến động trọng số ±{int(round(perturbation_pct * 100))}%. "
            "Quyết định có độ tin cậy rất cao và vững vàng trước các dao động chủ quan."
            if is_highly_robust else
            f"Phương án '{dominant_alt}' dẫn đầu ({dominant_rate}%), tuy nhiên mức độ cạnh tranh gay gắt. "
            "Khuyến nghị xem xét kỹ các tiêu chí nhạy cảm hoặc bổ sung dữ liệu đánh giá."
        ),
        "confidence_level": "Rất Cao (High Confidence)" if is_highly_robust else "Trung Bình (Moderate)",
        "win_probabilities": win_probabilities,
        "rank_distributions": rank_distributions,
        "score_stats": score_stats
    }


