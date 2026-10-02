"""
Guardrails Engine for MCDM / AHP Multi-Agent Consensus.
Implements Input Rails, Dialogue Rails, and Saaty Scale Output Rails
following NeMo Guardrails concepts.
"""

from typing import List, Tuple, Dict, Any
import re
from core.ahp_engine import SAATY_SCALE, snap_to_saaty_scale

FORBIDDEN_PROMPTS = [
    r"ignore previous instructions",
    r"system prompt",
    r"drop database",
    r"bypass security",
    r"eval\(",
]

class AHPGuardrails:
    """Multi-tiered Guardrails for AHP Multi-Agent deliberations."""

    @staticmethod
    def validate_input(goal: str, elements: List[str]) -> Tuple[bool, List[str]]:
        """Input Rail: Checks goal and elements for sanity, length, and injections."""
        warnings = []
        if not goal or len(goal.strip()) < 3:
            warnings.append("Mục tiêu quyết định quá ngắn hoặc không hợp lệ.")

        if len(elements) < 2:
            warnings.append("Danh sách phần tử cần so sánh phải có ít nhất 2 mục.")

        if len(elements) > 12:
            warnings.append("Số lượng phần tử vượt quá giới hạn khuyến nghị của AHP (tối đa 12 mục).")

        # Injection check
        for pattern in FORBIDDEN_PROMPTS:
            if re.search(pattern, goal, re.IGNORECASE):
                warnings.append("Phát hiện ký tự hoặc mẫu lệnh không được phép trong mục tiêu.")
                return False, warnings

        return len(warnings) == 0, warnings

    @staticmethod
    def enforce_saaty_scale(raw_value: float) -> float:
        """Output Rail: Clamps and snaps values strictly onto Saaty's 1-9 reciprocal scale."""
        if not isinstance(raw_value, (int, float)) or raw_value <= 0:
            return 1.0
        return snap_to_saaty_scale(float(raw_value))

    @staticmethod
    def validate_and_repair_matrix(matrix: List[List[float]], n: int) -> Tuple[List[List[float]], List[str]]:
        """
        Output Rail: Ensures matrix reciprocity, diagonal unity, and numeric boundedness.
        a[i][i] = 1.0, a[j][i] = 1 / a[i][j].
        """
        warnings = []
        repaired = [[1.0 for _ in range(n)] for _ in range(n)]

        for i in range(n):
            for j in range(i + 1, n):
                val = 1.0
                if i < len(matrix) and j < len(matrix[i]) and matrix[i][j] is not None:
                    val = AHPGuardrails.enforce_saaty_scale(matrix[i][j])
                else:
                    warnings.append(f"Giá trị so sánh thiếu giữa cặp ({i}, {j}), tự động chuẩn hóa về 1.0.")
                    val = 1.0

                repaired[i][j] = val
                repaired[j][i] = round(1.0 / val, 4) if val > 0 else 1.0

        for i in range(n):
            repaired[i][i] = 1.0

        return repaired, warnings
