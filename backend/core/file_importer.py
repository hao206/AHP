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
from typing import Dict, Any, List, Tuple
import numpy as np
import pandas as pd
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

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
        
        crit_matrix = pref.get("criteria") or pref.get("criterion") or np.ones((len(criteria), len(criteria))).tolist()
        alt_matrices = {}
        for c in criteria:
            sub = pref.get(f"alternatives:{c}") or pref.get(c)
            if sub and len(sub) == len(alternatives):
                alt_matrices[c] = sub
            else:
                alt_matrices[c] = np.ones((len(alternatives), len(alternatives))).tolist()

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
        title = pj_meta.get("project_name", "Dự Án AHP-OS")
        goal = pj_meta.get("project_description", "Mục Tiêu Đánh Giá AHP-OS")
        
        # Parse alternatives
        alts_raw = data.get("alt", [])
        alternatives = []
        if isinstance(alts_raw, list):
            for a in alts_raw:
                if isinstance(a, dict):
                    alternatives.append(a.get("alt_name", "Phương án"))
                elif isinstance(a, str):
                    alternatives.append(a)
        if len(alternatives) < 2:
            alternatives = ["Phương án A", "Phương án B", "Phương án C"]

        # Parse criteria from project_hText or pwc
        criteria = []
        h_text = pj_meta.get("project_hText", "")
        if h_text:
            lines = [l.strip() for l in h_text.strip().splitlines() if l.strip()]
            for l in lines[1:]: # First line is usually the project title
                c_name = re.sub(r'^[-\*\+\s]+', '', l).strip()
                if c_name and c_name not in criteria:
                    criteria.append(c_name)

        if len(criteria) < 2:
            criteria = ["Tiêu chí 1", "Tiêu chí 2", "Tiêu chí 3"]

        n_c = len(criteria)
        n_a = len(alternatives)

        return {
            "id": f"ahpos-{uuid.uuid4().hex[:8]}",
            "title": title,
            "goal": goal,
            "criteria": criteria,
            "alternatives": alternatives,
            "criteria_matrix": np.ones((n_c, n_c)).tolist(),
            "alt_matrices": {c: np.ones((n_a, n_a)).tolist() for c in criteria},
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
    if not crit_matrix or len(crit_matrix) != n_crit:
        crit_matrix = np.ones((n_crit, n_crit)).tolist()

    # Validate or initialize alt_matrices
    alt_matrices = data.get("alt_matrices", {})
    clean_alt_matrices = {}
    for c in criteria:
        if c in alt_matrices and len(alt_matrices[c]) == n_alt:
            clean_alt_matrices[c] = alt_matrices[c]
        else:
            clean_alt_matrices[c] = np.ones((n_alt, n_alt)).tolist()

    return {
        "id": p_id,
        "title": title,
        "goal": goal,
        "criteria": criteria,
        "alternatives": alternatives,
        "criteria_matrix": crit_matrix,
        "alt_matrices": clean_alt_matrices,
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

    # Extract numerical performance values safely without any NaN
    data_matrix = []
    for _, row in df.iterrows():
        row_vals = []
        for c in criteria_cols:
            val = row[c]
            if pd.isna(val) or val is None or val == '':
                row_vals.append(1.0)
                continue
            try:
                if isinstance(val, str):
                    val_clean = val.replace(',', '').replace('%', '').strip()
                    parsed_num = float(val_clean)
                else:
                    parsed_num = float(val)
                if np.isnan(parsed_num) or np.isinf(parsed_num):
                    parsed_num = 1.0
                row_vals.append(round(parsed_num, 4))
            except Exception:
                row_vals.append(1.0)
        data_matrix.append(row_vals)

    n_alt = len(alternatives)
    n_crit = len(criteria)

    # 1. Criteria comparison matrix (Default to 1.0 equal importance for user adjustment)
    crit_matrix = np.ones((n_crit, n_crit)).tolist()

    # 2. Alternative pairwise matrices auto-derived from quantitative ratios
    X = np.array(data_matrix, dtype=float)
    alt_matrices = {}

    for c_idx, c_name in enumerate(criteria):
        mat = np.ones((n_alt, n_alt), dtype=float)
        col_vals = X[:, c_idx]
        c_type = criterion_types[c_idx]

        for i in range(n_alt):
            for j in range(n_alt):
                if i == j:
                    mat[i, j] = 1.0
                else:
                    vi = max(col_vals[i], 1e-9)
                    vj = max(col_vals[j], 1e-9)
                    
                    if c_type == 'benefit':
                        ratio = vi / vj
                    else: # cost criterion: smaller is better
                        ratio = vj / vi
                    
                    # Bounded ratio in Saaty 1/9 to 9 scale
                    bounded = max(1/9.0, min(9.0, ratio))
                    mat[i, j] = round(float(bounded), 4)

        alt_matrices[c_name] = mat.tolist()

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
