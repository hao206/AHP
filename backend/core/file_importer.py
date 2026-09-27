"""
File Importer & Smart Data Parser Engine - AHP Decision Studio
Supports: Excel (.xlsx, .xls), CSV (.csv), JSON (.json)
Capabilities:
- Auto-detection of Tabular Performance Data vs Pairwise Comparison Matrices
- Smart inference of Benefit vs Cost criteria
- Automatic generation of AHP hierarchy and Hybrid TOPSIS matrices
- Downloadable sample template generator
"""

import io
import json
import uuid
import re
import math
from typing import Dict, Any, List, Tuple
import numpy as np
import pandas as pd
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from core.matrix_validation import validate_pairwise_matrix

COST_KEYWORDS = [
    'cost', 'chi phí', 'giá', 'price', 'lỗi', 'error', 'defect',
    'risk', 'rủi ro', 'latency', 'độ trễ', 'downtime', 'tco', 'khấu hao', 'thời gian chờ'
]

def infer_criterion_type(name: str) -> str:
    """Infers if criterion is 'cost' or 'benefit' based on name keywords."""
    lower = name.lower()
    if any(k in lower for k in COST_KEYWORDS):
        return 'cost'
    return 'benefit'

def clean_element_name(name: Any) -> str:
    """Cleans criteria or alternative names from headers."""
    s = str(name).strip()
    s = re.sub(r'\[(benefit|cost|lợi ích|chi phí)\]', '', s, flags=re.IGNORECASE).strip()
    return s if s else "Element"


def unanswered_matrix(size: int) -> List[List[float | None]]:
    """Keep unentered judgments distinct from an explicit equal-importance vote."""
    return [[1.0 if i == j else None for j in range(size)] for i in range(size)]


def parse_ahpos_hierarchy(text: str) -> tuple[str, List[str]]:
    """Read the flat root branch supported by this application's hierarchy."""
    branches = [branch.strip() for branch in text.split(';') if branch.strip()]
    if len(branches) != 1 or ':' not in branches[0]:
        raise ValueError("AHP-OS import supports one flat criteria branch; nested hierarchies cannot be represented.")
    root, children = branches[0].split(':', 1)
    root = root.strip()
    criteria = [child.split('=', 1)[0].strip() for child in children.split(',')]
    if not root or root in criteria or len(criteria) < 2 or any(not name for name in criteria) or len(set(criteria)) != len(criteria):
        raise ValueError("AHP-OS hierarchy must contain a root and at least two unique criteria.")
    return root, criteria


def parse_ahpos_pwc(records: list, node: str, elements: List[str]) -> List[List[float | None]]:
    """Decode AHP-OS's upper-triangle direction and intensity strings."""
    pairs = [(i, j) for i in range(len(elements)) for j in range(i + 1, len(elements))]
    judgments = [[] for _ in pairs]
    for record in records:
        if not isinstance(record, dict):
            raise ValueError("AHP-OS pairwise comparison entry must be an object.")
        directions, intensities = record.get('pwc_ab'), record.get('pwc_intense')
        if (not isinstance(directions, str) or not isinstance(intensities, str)
                or len(directions) != len(pairs) or len(intensities) != len(pairs)):
            raise ValueError(f"AHP-OS node '{node}' has malformed comparison strings.")
        for index, (direction, intensity) in enumerate(zip(directions, intensities)):
            if direction not in '01' or intensity not in '0123456789':
                raise ValueError(f"AHP-OS node '{node}' contains an invalid comparison code.")
            if intensity == '0':
                continue
            value = float(intensity)
            judgments[index].append(value if direction == '0' else 1.0 / value)

    matrix = unanswered_matrix(len(elements))
    for (i, j), values in zip(pairs, judgments):
        if values:
            # AHP-OS may export several participants; aggregate their signed
            # ratios by the geometric mean, as its group workflow does.
            ratio = values[0] if len(values) == 1 else math.exp(sum(math.log(value) for value in values) / len(values))
            matrix[i][j], matrix[j][i] = ratio, 1.0 / ratio
    return validate_pairwise_matrix(elements, matrix, allow_missing=True, label=f"AHP-OS {node}")

def parse_uploaded_file(content: bytes, filename: str) -> Dict[str, Any]:
    """
    Intelligently parses uploaded files (.json, .xlsx, .csv) into an AHP Decision Studio Project.
    """
    lower_fname = filename.lower()
    
    if lower_fname.endswith('.json'):
        return parse_json_file(content)
    elif lower_fname.endswith(('.xlsx', '.xls')):
        return parse_excel_file(content, filename)
    elif lower_fname.endswith('.csv'):
        return parse_csv_file(content, filename)
    else:
        raise ValueError(f"Định dạng tệp không được hỗ trợ: '{filename}'. Vui lòng tải lên file .xlsx, .xls, .csv hoặc .json.")

def parse_json_file(content: bytes) -> Dict[str, Any]:
    """
    Parses AHP projects from multiple JSON specifications:
    1. AHP Decision Studio native JSON format
    2. pyAHP format (name, criteria, alternatives, preferenceMatrices)
    3. AHP-OS format (pj, alt, pwc, project_hText by Klaus Goepel)
    4. AHPy / generic MCDM JSON format
    """
    try:
        data = json.loads(content.decode('utf-8'))
    except Exception as e:
        raise ValueError(f"Tệp JSON không hợp lệ: {str(e)}")

    if not isinstance(data, dict):
        raise ValueError("Tệp JSON phải chứa một đối tượng cấu trúc dữ liệu.")

    # 1. Check for pyAHP format
    if "preferenceMatrices" in data and "criteria" in data:
        p_name = data.get("name", "Dự Án pyAHP")
        criteria = [str(c).strip() for c in data.get("criteria", [])]
        alternatives = [str(a).strip() for a in data.get("alternatives", [])]
        pref = data.get("preferenceMatrices", {})
        if not isinstance(pref, dict):
            raise ValueError("pyAHP preferenceMatrices must be an object.")
        
        crit_matrix = pref.get("criteria", pref.get("criterion"))
        crit_matrix = validate_pairwise_matrix(
            criteria, crit_matrix if crit_matrix is not None else unanswered_matrix(len(criteria)),
            allow_missing=True, label="criteria_matrix"
        )
        alt_matrices = {}
        for c in criteria:
            sub = pref.get(f"alternatives:{c}", pref.get(c))
            alt_matrices[c] = validate_pairwise_matrix(
                alternatives, sub if sub is not None else unanswered_matrix(len(alternatives)),
                allow_missing=True, label=f"alt_matrices.{c}"
            )

        return {
            "id": f"pyahp-{uuid.uuid4().hex[:8]}",
            "title": p_name,
            "goal": f"Mục Tiêu Đánh Giá: {p_name}",
            "criteria": criteria,
            "alternatives": alternatives,
            "criteria_matrix": crit_matrix,
            "alt_matrices": alt_matrices,
            "imported_format": "pyAHP Project JSON",
            "criterion_types": [infer_criterion_type(c) for c in criteria]
        }

    # 2. Check for AHP-OS format (Klaus Goepel)
    if "pj" in data and isinstance(data["pj"], list) and len(data["pj"]) > 0:
        pj_meta = data["pj"][0]
        if not isinstance(pj_meta, dict):
            raise ValueError("AHP-OS project metadata is invalid.")
        title = pj_meta.get("project_name", "Dự Án AHP-OS")
        root, criteria = parse_ahpos_hierarchy(pj_meta.get("project_hText", ""))
        goal = root
        
        # Parse alternatives
        alts_raw = data.get("alt", [])
        alternatives = []
        if isinstance(alts_raw, list):
            for a in alts_raw:
                if isinstance(a, dict):
                    alternatives.append(str(a.get("alt", a.get("alt_name", ""))).strip())
                elif isinstance(a, str):
                    alternatives.append(a.strip())
        if len(alternatives) < 2 or any(not name for name in alternatives) or len(set(alternatives)) != len(alternatives):
            raise ValueError("AHP-OS project must contain at least two unique alternatives.")

        pwc = data.get("pwc", [])
        if not isinstance(pwc, list):
            raise ValueError("AHP-OS pairwise comparisons must be a list.")
        by_node = {node: [] for node in [root, *criteria]}
        for record in pwc:
            if not isinstance(record, dict) or record.get("pwc_node") not in by_node:
                raise ValueError("AHP-OS comparison references an unknown hierarchy node.")
            by_node[record["pwc_node"]].append(record)
        crit_matrix = parse_ahpos_pwc(by_node[root], root, criteria)
        alt_matrices = {c: parse_ahpos_pwc(by_node[c], c, alternatives) for c in criteria}

        return {
            "id": f"ahpos-{uuid.uuid4().hex[:8]}",
            "title": title,
            "goal": goal,
            "description": pj_meta.get("project_description", ""),
            "criteria": criteria,
            "alternatives": alternatives,
            "criteria_matrix": crit_matrix,
            "alt_matrices": alt_matrices,
            "imported_format": "AHP-OS (Klaus Goepel) Project JSON",
            "criterion_types": [infer_criterion_type(c) for c in criteria]
        }

    # 3. Standard AHP Decision Studio JSON format
    p_id = data.get("id", f"imported-{uuid.uuid4().hex[:8]}")
    title = data.get("title", "Dự Án Cá Nhân Hóa Đã Nhập")
    goal = data.get("goal", "Mục Tiêu Đánh Giá Đa Tiêu Chí")
    criteria = [str(c).strip() for c in data.get("criteria", [])]
    alternatives = [str(a).strip() for a in data.get("alternatives", [])]

    if len(criteria) < 2:
        raise ValueError("Mô hình cần tối thiểu 2 tiêu chí đánh giá.")
    if len(alternatives) < 2:
        raise ValueError("Mô hình cần tối thiểu 2 phương án lựa chọn.")

    n_crit = len(criteria)
    n_alt = len(alternatives)

    # Validate or initialize criteria_matrix
    crit_matrix = data.get("criteria_matrix")
    if crit_matrix is None:
        crit_matrix = unanswered_matrix(n_crit)
    crit_matrix = validate_pairwise_matrix(criteria, crit_matrix, allow_missing=True, label="criteria_matrix")

    # Validate or initialize alt_matrices
    alt_matrices = data.get("alt_matrices", {})
    if not isinstance(alt_matrices, dict):
        raise ValueError("alt_matrices must be an object keyed by criterion.")
    clean_alt_matrices = {}
    for c in criteria:
        source = alt_matrices[c] if c in alt_matrices else unanswered_matrix(n_alt)
        clean_alt_matrices[c] = validate_pairwise_matrix(
            alternatives, source, allow_missing=True, label=f"alt_matrices.{c}"
        )

    data_matrix = data.get("data_matrix", data.get("topsis_matrix"))
    if data_matrix is not None and (
        not isinstance(data_matrix, list)
        or len(data_matrix) != n_alt
        or any(not isinstance(row, list) or len(row) != n_crit for row in data_matrix)
    ):
        raise ValueError("Ma trận dữ liệu TOPSIS không khớp số phương án và tiêu chí.")

    return {
        "id": p_id,
        "title": title,
        "goal": goal,
        "criteria": criteria,
        "alternatives": alternatives,
        "criteria_matrix": crit_matrix,
        "alt_matrices": clean_alt_matrices,
        "data_matrix": data_matrix,
        "imported_format": "AHP Decision Studio JSON",
        "raw_matrix": data.get("raw_matrix", None),
        "criterion_types": data.get("criterion_types", [infer_criterion_type(c) for c in criteria])
    }

def parse_tabular_dataframe(df: pd.DataFrame, source_name: str) -> Dict[str, Any]:
    """
    Parses a tabular dataset (rows = alternatives, cols = criteria).
    Automatically generates pairwise ratio matrices and Hybrid TOPSIS matrix.
    """
    if df.empty or df.shape[0] < 2 or df.shape[1] < 2:
        raise ValueError("Bảng dữ liệu phải có tối thiểu 2 hàng (phương án) và 2 cột (tiêu chí).")

    # The first column is considered Alternative names if text-based
    first_col = df.columns[0]
    alternatives = [str(val).strip() for val in df[first_col].tolist()]
    
    # Remaining columns are Criteria
    criteria_cols = df.columns[1:].tolist()
    criteria = [clean_element_name(c) for c in criteria_cols]
    
    criterion_types = [infer_criterion_type(str(c)) for c in criteria_cols]

    # Missing measurements stay unanswered; never invent a value of 1.
    data_matrix = []
    for _, row in df.iterrows():
        row_vals = []
        for c in criteria_cols:
            val = row[c]
            if pd.isna(val) or val is None or val == '':
                row_vals.append(None)
                continue
            try:
                if isinstance(val, str):
                    val_clean = val.replace(',', '').replace('%', '').strip()
                    parsed_num = float(val_clean)
                else:
                    parsed_num = float(val)
                if np.isnan(parsed_num) or np.isinf(parsed_num):
                    parsed_num = None
                row_vals.append(round(parsed_num, 4) if parsed_num is not None else None)
            except Exception:
                row_vals.append(None)
        data_matrix.append(row_vals)

    n_alt = len(alternatives)
    n_crit = len(criteria)

    # Criteria importance requires explicit judgments from the user.
    crit_matrix = unanswered_matrix(n_crit)

    # 2. Alternative pairwise matrices auto-derived from quantitative ratios
    alt_matrices = {}

    for c_idx, c_name in enumerate(criteria):
        mat = unanswered_matrix(n_alt)
        col_vals = [row[c_idx] for row in data_matrix]
        c_type = criterion_types[c_idx]

        for i in range(n_alt):
            for j in range(i + 1, n_alt):
                if col_vals[i] is None or col_vals[j] is None or col_vals[i] <= 0 or col_vals[j] <= 0:
                    continue
                vi, vj = col_vals[i], col_vals[j]
                ratio = vi / vj if c_type == 'benefit' else vj / vi
                bounded = max(1/9.0, min(9.0, ratio))
                mat[i][j], mat[j][i] = float(bounded), 1.0 / float(bounded)

        alt_matrices[c_name] = mat

    clean_title = re.sub(r'\.(xlsx|xls|csv)$', '', source_name, flags=re.IGNORECASE)
    clean_title = clean_title.replace('_', ' ').replace('-', ' ').title()

    return {
        "id": f"project-{uuid.uuid4().hex[:8]}",
        "title": f"{clean_title} (Dữ Liệu Cá Nhân Hóa)",
        "goal": f"Lựa Chọn Phương Án Tối Ưu Cho {clean_title}",
        "criteria": criteria,
        "alternatives": alternatives,
        "criteria_matrix": crit_matrix,
        "alt_matrices": alt_matrices,
        "data_matrix": data_matrix,
        "criterion_types": criterion_types,
        "imported_format": "Bảng Dữ Liệu Hiệu Suất Định Lượng"
    }

def parse_excel_file(content: bytes, filename: str) -> Dict[str, Any]:
    """Parses uploaded Excel file with smart header and table detection."""
    try:
        excel_file = io.BytesIO(content)
        raw_df = pd.read_excel(excel_file, sheet_name=0, header=None)
    except Exception as e:
        raise ValueError(f"Không thể đọc file Excel: {str(e)}")

    if raw_df.empty:
        raise ValueError("File Excel không có dữ liệu.")

    # Find the row index that best represents the header (has the most non-null entries >= 2)
    best_header_row = 0
    max_cols = 0
    for idx, row in raw_df.iterrows():
        non_null = int(row.dropna().count())
        if non_null > max_cols and non_null >= 2:
            max_cols = non_null
            best_header_row = idx

    excel_file.seek(0)
    df = pd.read_excel(excel_file, sheet_name=0, header=best_header_row)
    df = df.dropna(how='all').dropna(axis=1, how='all')
    return parse_tabular_dataframe(df, filename)

def parse_csv_file(content: bytes, filename: str) -> Dict[str, Any]:
    """Parses uploaded CSV file with encoding auto-fallback."""
    for enc in ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252', 'cp1258']:
        try:
            csv_file = io.StringIO(content.decode(enc))
            df = pd.read_csv(csv_file)
            df = df.dropna(how='all').dropna(axis=1, how='all')
            return parse_tabular_dataframe(df, filename)
        except Exception:
            continue
    raise ValueError("Không thể đọc tệp CSV. Vui lòng kiểm tra mã hóa ký tự (hỗ trợ UTF-8).")

def generate_sample_excel_template() -> bytes:
    """
    Creates a professionally styled downloadable Excel template for users to customize.
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Du_Lieu_Hieu_Suat"
    ws.views.sheetView[0].showGridLines = True

    # Styling palette
    title_font = Font(name="Segoe UI", size=14, bold=True, color="1E293B")
    subtitle_font = Font(name="Segoe UI", size=9, italic=True, color="64748B")
    header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    header_font = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
    benefit_fill = PatternFill(start_color="ECFDF5", end_color="ECFDF5", fill_type="solid")
    cost_fill = PatternFill(start_color="FEF2F2", end_color="FEF2F2", fill_type="solid")
    regular_font = Font(name="Segoe UI", size=10)
    bold_font = Font(name="Segoe UI", size=10, bold=True)
    
    thin_border = Border(
        left=Side(style='thin', color='E2E8F0'),
        right=Side(style='thin', color='E2E8F0'),
        top=Side(style='thin', color='E2E8F0'),
        bottom=Side(style='thin', color='E2E8F0')
    )

    # Title section
    ws.append(["BẢNG MẪU NHẬP DỮ LIỆU ĐÁNH GIÁ - AHP DECISION STUDIO"])
    ws["A1"].font = title_font
    ws.append(["Hướng dẫn: Thay đổi tên tiêu chí ở hàng 4 (thêm [Cost] nếu là chi phí/rủi ro) và tên phương án ở cột A."])
    ws["A2"].font = subtitle_font
    ws.append([])

    # Table Header (Row 4)
    headers = [
        "Phương Án Đánh Giá",
        "Chi Phí Mua Sắm [Cost]",
        "Độ An Toàn & Bảo Mật",
        "Hiệu Năng & Tốc Độ",
        "Tiết Kiệm Nhiên Liệu",
        "Chất Lượng Dịch Vụ"
    ]
    ws.append(headers)
    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=4, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    # Sample rows
    sample_rows = [
        ["Phương Án A (Tiêu Chuẩn)", 45000, 92, 88.5, 7.2, 85],
        ["Phương Án B (Cao Cấp)", 62000, 96, 95.0, 8.5, 94],
        ["Phương Án C (Tiết Kiệm)", 32000, 84, 78.0, 5.8, 76],
        ["Phương Án D (Cân Bằng)", 50000, 90, 85.0, 6.9, 88]
    ]

    for row_data in sample_rows:
        ws.append(row_data)
        curr_row = ws.max_row
        for col_idx in range(1, len(headers) + 1):
            cell = ws.cell(row=curr_row, column=col_idx)
            cell.font = regular_font
            cell.border = thin_border
            if col_idx == 1:
                cell.font = bold_font
            elif col_idx == 2:
                cell.fill = cost_fill
                cell.alignment = Alignment(horizontal="right")
            else:
                cell.fill = benefit_fill
                cell.alignment = Alignment(horizontal="right")

    # Column Widths
    ws.column_dimensions['A'].width = 28
    ws.column_dimensions['B'].width = 22
    ws.column_dimensions['C'].width = 22
    ws.column_dimensions['D'].width = 20
    ws.column_dimensions['E'].width = 22
    ws.column_dimensions['F'].width = 20

    out = io.BytesIO()
    wb.save(out)
    out.seek(0)
    return out.getvalue()

def generate_sample_csv_template() -> str:
    """Generates clean sample CSV template."""
    lines = [
        "Phuong_An,Chi_Phi_Trien_Khai [Cost],Tinh_Nang_Nghiep_Vu,Uy_Tin_Nha_Cung_Cap,Kha_Nang_Mo_Rong",
        "Giai Phap A (Doanh Nghiep),55000,95,90,88",
        "Giai Phap B (Dam May),42000,88,85,92",
        "Giai Phap C (Nguon Mo),25000,80,75,80",
        "Giai Phap D (Hon Hop),48000,92,86,85"
    ]
    return "\n".join(lines)
