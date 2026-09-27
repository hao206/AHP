"""Validation shared by AHP calculation and project import."""

import math


def validate_pairwise_matrix(elements, matrix, *, allow_missing=False, label="matrix"):
    """Return a numeric matrix, rejecting malformed or non-reciprocal judgments.

    Incomplete projects may contain a *pair* of null cells. Calculation requires
    every pair to be answered. Small reciprocal error accommodates imported
    decimal values rounded to four places.
    """
    n = len(elements)
    if n < 1 or any(not isinstance(name, str) or not name.strip() for name in elements) or len(set(elements)) != n:
        raise ValueError(f"{label}: element names must be nonempty and unique")
    if not isinstance(matrix, (list, tuple)) or len(matrix) != n:
        raise ValueError(f"{label}: expected a {n}x{n} matrix")

    clean = []
    for i, row in enumerate(matrix):
        if not isinstance(row, (list, tuple)) or len(row) != n:
            raise ValueError(f"{label}: row {i + 1} must contain {n} values")
        clean_row = []
        for j, raw in enumerate(row):
            if raw is None:
                if not allow_missing or i == j:
                    raise ValueError(f"{label}: missing value at ({i + 1}, {j + 1})")
                clean_row.append(None)
                continue
            if isinstance(raw, bool) or not isinstance(raw, (int, float)):
                raise ValueError(f"{label}: value at ({i + 1}, {j + 1}) must be numeric")
            value = float(raw)
            if not math.isfinite(value):
                raise ValueError(f"{label}: non-finite value at ({i + 1}, {j + 1})")
            if i == j:
                if not math.isclose(value, 1.0, abs_tol=1e-6):
                    raise ValueError(f"{label}: diagonal value at ({i + 1}, {j + 1}) must be 1")
            # Legacy templates store 1/9 as 0.1111; accept four-place rounding.
            elif value < 1 / 9 - 5e-5 or value > 9 + 5e-5:
                raise ValueError(f"{label}: value at ({i + 1}, {j + 1}) is outside the 1/9–9 scale")
            clean_row.append(value)
        clean.append(clean_row)

    for i in range(n):
        for j in range(i + 1, n):
            left, right = clean[i][j], clean[j][i]
            if left is None or right is None:
                if left is not None or right is not None:
                    raise ValueError(f"{label}: pair ({i + 1}, {j + 1}) has only one missing side")
            elif not math.isclose(left * right, 1.0, rel_tol=1e-3, abs_tol=1e-3):
                raise ValueError(f"{label}: pair ({i + 1}, {j + 1}) is not reciprocal")
    return clean
