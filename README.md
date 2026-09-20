# AHP Decision Studio Enterprise

> **Hệ Thống Hỗ Trợ Ra Quyết Định Đa Tiêu Chí Doanh Nghiệp Toàn Diện**  
> Tích hợp phương pháp **AHP (Analytic Hierarchy Process)** của GS. Thomas L. Saaty, **Phân tích Độ nhạy Động học**, **Mô phỏng Rủi ro Monte Carlo** và mô hình lai **AHP – TOPSIS**.

---

## 🌟 Các Tính Năng Cốt Lõi

1. **Bước 1: Thiết Lập Mô Hình Thứ Bậc Quyết Định**
   - Tự do thiết lập cấu trúc phân tầng 3 cấp: Mục tiêu (Goal) → Tiêu chí (Criteria) → Phương án (Alternatives).
   - Hỗ trợ tạo mẫu cá nhân, lưu vào bộ nhớ trình duyệt hoặc nhập dữ liệu nhanh hàng loạt.
   - Đi kèm các bộ mẫu chuẩn: *Lựa chọn ERP doanh nghiệp, Tuyển dụng nhân sự cấp cao, Mua sắm thiết bị phần cứng, Lựa chọn địa điểm chi nhánh...*

2. **Bước 2: Đánh Giá So Sánh Cặp (Pairwise Comparisons)**
   - Thang đo Saaty 1–9 trực quan với thanh trượt hoặc ma trận tương hỗ.
   - Tự động tính toán vector trọng số bằng phương pháp **Véc-tơ riêng (Eigenvector Method - EVM)** và **Trung bình nhân (GMM)**.
   - Kiểm định nghiêm ngặt **Tỷ số nhất quán (Consistency Ratio - CR ≤ 10%)**.
   - Tích hợp công cụ **Bác sĩ Nhất quán (Consistency Doctor)** phát hiện ô mâu thuẫn lớn nhất và **Tự động điền khuyết ma trận** bằng tối ưu hóa Log-Least Squares.

3. **Bước 3: Tổng Hợp Kết Quả & Biểu Đồ Radar**
   - Tổng hợp vector trọng số toàn cục và phân hạng thứ bậc phương án.
   - Đồ thị mạng nhện đa chiều (Radar/Spider Chart) so sánh tương quan năng lực từng phương án.
   - Bảng tổng kết KPI điều hành cấp quản trị.

4. **Bước 4: Phân Tích Độ Nhạy & Mô Phỏng (Sensitivity & Risk Lab)**
   - **Độ nhạy Động học (Dynamic Sensitivity)**: Kéo thanh trượt trọng số thời gian thực, tự động cân bằng tổng 100% và cập nhật thứ hạng tức thì.
   - **Độ nhạy Độ dốc 2D (Gradient Sensitivity)**: Vẽ đường biến thiên từ 0% đến 100%, tự động nhận diện các **Điểm giao cắt (Crossover Points)** làm đảo chiều vị trí số 1.
   - **Mô phỏng Monte Carlo**: Áp dụng phân phối nhiễu Gauss ($\sigma = 5\% - 40\%$) với $500 - 5.000$ kịch bản giả định để đo lường xác suất chiến thắng và Chỉ số độ vững chắc quyết định (**Robustness Index**).

5. **Bước 5: Mô Hình Quyết Định Lai Ghép AHP – TOPSIS**
   - Kết hợp bộ trọng số ưu tiên AHP với ma trận số liệu định lượng đo lường thực tế.
   - Chuẩn hóa vector, phân loại tiêu chí Lợi ích (Benefit - Max) và Chi phí (Cost - Min).
   - Tính toán khoảng cách Euclid đến Nghiệm lý tưởng ($D^+$) và Nghiệm phản lý tưởng ($D^-$) để tìm hệ số tiệm cận tối ưu ($C_i$).

6. **Xuất Báo Cáo & Nhập Tệp Tin**
   - Xuất bảng tính Excel đa tab định dạng chuẩn điều hành (Executive Spreadsheet).
   - Lưu trữ và tải dự án dưới định dạng JSON tiêu chuẩn.
   - Nhập tệp Excel / CSV ma trận so sánh cặp.

---

## 🛠️ Kiến Trúc Công Nghệ

- **Frontend**: React 18, Vite, Lucide Icons, Canvas API, CSS Variables Glassmorphism Design System.
- **Backend API**: Python 3.10+, FastAPI, NumPy, SciPy, OpenPyXL, Uvicorn.
- **Single-Port Serving**: Backend FastAPI phục vụ đồng thời cả RESTful API và Single Page Application (SPA) trên cùng một cổng.

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Cài đặt Môi trường Backend
```bash
cd backend
python -m venv .venv
# Trên Windows:
.venv\Scripts\activate
# Trên Linux/macOS:
source .venv/bin/activate

pip install fastapi uvicorn numpy scipy openpyxl python-multipart
```

### 2. Cài đặt Môi trường Frontend
```bash
cd ../frontend
npm install
npm run build
```

### 3. Khởi chạy Ứng dụng
```bash
# Khởi động Backend (tự động phục vụ cả giao diện tại http://127.0.0.1:8000)
cd ../backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
Mở trình duyệt truy cập: **`http://127.0.0.1:8000`**

---

## 📄 Bản quyền
Phát triển bởi đội ngũ AHP Decision Studio. Mã nguồn mở phục vụ nghiên cứu khoa học và ứng dụng quản trị ra quyết định đa tiêu chí (MCDM).
