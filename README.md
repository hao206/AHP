# BÁO CÁO NGHIÊN CỨU VÀ TÀI LIỆU KỸ THUẬT HỆ THỐNG
## HỆ THỐNG HỖ TRỢ RA QUYẾT ĐỊNH ĐA TIÊU CHÍ TOÀN DIỆN DỰA TRÊN TIẾN TRÌNH PHÂN TÍCH THỨ BẬC (AHP DECISION STUDIO ENTERPRISE)

---

### TÓM TẮT TỔNG QUAN (ABSTRACT)

Trong quản trị hiện đại và kỹ thuật hệ thống, bài toán Ra quyết định đa tiêu chí (Multi-Criteria Decision Making - MCDM) đóng vai trò then chốt trong việc lựa chọn, phân loại và xếp hạng các phương án tối ưu khi đối mặt với nhiều mục tiêu mâu thuẫn nhau. Kế thừa nền tảng lý thuyết kinh điển của Tiến trình Phân tích Thứ bậc (Analytic Hierarchy Process - AHP) do Giáo sư Thomas L. Saaty sáng lập và nguồn cảm hứng phương pháp luận từ phần mềm tiên phong **Expert Choice**, công trình này thiết kế và phát triển hệ thống **AHP Decision Studio Enterprise** — một nền tảng hỗ trợ ra quyết định toàn diện thế hệ mới.

Hệ thống cung cấp giải pháp trọn vẹn từ cấu trúc hóa mô hình thứ bậc, thu thập và xử lý ma trận so sánh cặp, kiểm định và tối ưu hóa tính nhất quán logic, cho đến phân tích độ nhạy động học đa chiều, mô phỏng rủi ro ngẫu nhiên Monte Carlo, đo lường mức độ đồng thuận nhóm theo lý thuyết Entropy thông tin, và mô hình lai ghép AHP – TOPSIS. Báo cáo này trình bày chi tiết cơ sở toán học, quy trình thuật toán, tác dụng đóng góp đối với việc ứng dụng AHP trong thực tiễn, cùng những phân tích so sánh đối chiếu làm nổi bật các điểm cải tiến vượt trội của hệ thống so với phần mềm Expert Choice truyền thống.

---

## MỤC LỤC

1. [Cơ Sở Lý Thuyết & Nguồn Cảm Hứng Phương Pháp Luận](#1-cơ-sở-lý-thuyết--nguồn-cảm-hứng-phương-pháp-luận)
   - 1.1. Bài toán Ra quyết định đa tiêu chí (MCDM)
   - 1.2. Tiến trình Phân tích Thứ bậc (AHP)
   - 1.3. Nguồn cảm hứng từ Expert Choice và nhu cầu hiện đại hóa công cụ ra quyết định
2. [Cơ Chế Hoạt Động & Nền Tảng Toán Học Chi Tiết](#2-cơ-chế-hoạt-động--nền-tảng-toán-học-chi-tiết)
   - 2.1. Cấu trúc mô hình phân tầng thứ bậc (Decision Hierarchy)
   - 2.2. Thang đo tỷ lệ Saaty & Ma trận so sánh cặp tương hỗ phản đối xứng
   - 2.3. Các phương pháp xác định Vector trọng số ưu tiên (Priority Vectors)
   - 2.4. Kiểm định tính nhất quán logic (Consistency Verification) & Khoảng dung sai trọng số
   - 2.5. Thuật toán Chẩn đoán sai lệch & Tự động hiệu chỉnh nhất quán (Inconsistency Doctor)
   - 2.6. Thuật toán Điền khuyết ma trận so sánh cặp chưa hoàn chỉnh (Incomplete Matrix Completion)
   - 2.7. Tổng hợp thứ bậc toàn cục (Hierarchical Synthesis)
   - 2.8. Phân tích độ nhạy đa chiều (Multi-Dimensional Sensitivity Analysis)
   - 2.9. Đánh giá rủi ro & Độ vững chắc quyết định bằng Mô phỏng Monte Carlo
   - 2.10. Ra quyết định nhóm (Group Decision Making) & Đo lường đồng thuận Shannon Entropy
   - 2.11. Mô hình Phân tích Thứ bậc Mờ (Fuzzy AHP)
   - 2.12. Mô hình Lai ghép AHP – TOPSIS (Hybrid AHP-TOPSIS Integration)
3. [Tác Dụng & Giá Trị Đóng Góp Của Hệ Thống Đối Với Phương Pháp AHP](#3-tác-dụng--giá-trị-đóng-góp-của-hệ-thống-đối-với-phương-pháp-ahp)
4. [Phân Tích So Sánh Đối Chiếu & Điểm Khác Biệt Vượt Trội So Với Expert Choice](#4-phân-tích-so-sánh-đối-chiếu--điểm-khác-biệt-vượt-trội-so-với-expert-choice)
5. [Kiến Trúc Kỹ Thuật & Hướng Dẫn Vận Hành](#5-kiến-trúc-kỹ-thuật--hướng-dẫn-vận-hành)
6. [Tài Liệu Tham Khảo (Academic References)](#6-tài-liệu-tham-khảo-academic-references)

---

## 1. CƠ SỞ LÝ THUYẾT & NGUỒN CẢM HỨNG PHƯƠNG PHÁP LUẬN

### 1.1. Bài toán Ra quyết định đa tiêu chí (MCDM)

Trong thực tiễn quản lý, các nhà lãnh đạo thường xuyên phải đưa ra các quyết định chiến lược (như lựa chọn giải pháp phần mềm doanh nghiệp, tuyển dụng nhân sự cấp cao, đầu tư cơ sở hạ tầng, lựa chọn nhà cung cấp chuỗi cung ứng). Những bài toán này có các đặc trưng phức tạp:
- Tồn tại đồng thời nhiều tiêu chí định tính (chất lượng dịch vụ, uy tín, độ tin cậy) và định lượng (chi phí, thời gian hoàn vốn, thông số kỹ thuật).
- Các tiêu chí thường xuyên mâu thuẫn và đánh đổi lẫn nhau (Trade-off).
- Nhận định của các chuyên gia mang tính chủ quan và có thể phát sinh mâu thuẫn nội tại trong quá trình đánh giá.

### 1.2. Tiến trình Phân tích Thứ bậc (AHP)

Được phát triển bởi Giáo sư Thomas L. Saaty vào cuối thập niên 1970, AHP là phương pháp luận kinh điển giúp phân rã một vấn đề quyết định phức tạp thành một cấu trúc thứ bậc có tính hệ thống. Điểm cốt lõi của AHP là chuyển đổi các đánh giá so sánh cặp định tính của con người thành các giá trị số trên thang đo tỷ lệ, từ đó tính toán vector trọng số ưu tiên thông qua lý thuyết giá trị riêng và véc-tơ riêng của ma trận.

### 1.3. Nguồn cảm hứng từ Expert Choice và nhu cầu hiện đại hóa công cụ ra quyết định

Vào thập niên 1980, Giáo sư Thomas L. Saaty cùng Giáo sư Ernest Forman đã phát triển phần mềm **Expert Choice**, trở thành công cụ thương mại tiên phong hiện thực hóa phương pháp AHP trên máy tính cá nhân. Expert Choice đã đặt nền móng cho việc ứng dụng ma trận so sánh cặp, hiển thị cấu trúc cây thứ bậc và phân tích độ nhạy (Dynamic, Gradient, Performance Sensitivity).

Tuy nhiên, trước sự phát triển vượt bậc của khoa học máy tính hiện đại, các hạn chế mang tính lịch sử của Expert Choice ngày càng bộc lộ rõ:
1. **Kiến trúc phần mềm khép kín, phụ thuộc môi trường desktop truyền thống**: Hạn chế khả năng truy cập đa nền tảng, khó tích hợp vào các đường ống xử lý dữ liệu và hệ thống thông tin doanh nghiệp hiện đại.
2. **Thiếu khả năng tự động xử lý và tối ưu hóa ma trận mâu thuẫn**: Khi tỷ số nhất quán ($CR \ge 10\%$), Expert Choice chỉ đưa ra cảnh báo mà không chỉ ra cụ thể vị trí sai lệch lớn nhất hay cung cấp thuật toán tự động cân chỉnh ma trận.
3. **Phân tích độ nhạy mang tính tất định (Deterministic)**: Chưa tích hợp các phương pháp mô phỏng ngẫu nhiên (Stochastic/Monte Carlo) để đánh giá độ vững chắc của quyết định trước những biến động bất định của môi trường.
4. **Hạn chế trong xử lý dữ liệu định lượng thực tế và dữ liệu mờ**: AHP truyền thống phụ thuộc hoàn toàn vào đánh giá so sánh cặp chủ quan, gặp khó khăn khi kết hợp trực tiếp các bảng số liệu đo lường định lượng thực tế hoặc các phán đoán mờ thiếu chắc chắn.

Xuất phát từ nguồn cảm hứng phương pháp luận của Expert Choice cùng mong muốn giải quyết triệt để các hạn chế trên, hệ thống **AHP Decision Studio Enterprise** được nghiên cứu và xây dựng như một bước tiến hóa toàn diện về cả chiều sâu thuật toán lẫn công nghệ nền tảng.

---

## 2. CƠ CHẾ HOẠT ĐỘNG & NỀN TẢNG TOÁN HỌC CHI TIẾT

```
                                  [ MỤC TIÊU QUYẾT ĐỊNH (GOAL) ]
                                                │
                 ┌──────────────────────────────┼──────────────────────────────┐
                 ▼                              ▼                              ▼
        [ Tiêu chí 1 (C1) ]            [ Tiêu chí 2 (C2) ]            [ Tiêu chí n (Cn) ]
                 │                              │                              │
        ┌────────┴────────┐            ┌────────┴────────┐            ┌────────┴────────┐
        ▼        ▼        ▼            ▼        ▼        ▼            ▼        ▼        ▼
      [ A1 ]   [ A2 ]   [ Am ]       [ A1 ]   [ A2 ]   [ Am ]       [ A1 ]   [ A2 ]   [ Am ]
```

### 2.1. Cấu trúc mô hình phân tầng thứ bậc (Decision Hierarchy)

Mô hình quyết định được tổ chức thành đồ thị phân cấp $3$ tầng:
- **Tầng đỉnh (Top Level)**: Mục tiêu tổng quát của bài toán quyết định ($G$).
- **Tầng trung gian (Intermediate Level)**: Tập hợp các tiêu chí đánh giá $C = \{C_1, C_2, \dots, C_n\}$.
- **Tầng đáy (Bottom Level)**: Tập hợp các phương án hành động $A = \{A_1, A_2, \dots, A_m\}$.

### 2.2. Thang đo tỷ lệ Saaty & Ma trận so sánh cặp tương hỗ phản đối xứng

Để đánh giá tầm quan trọng tương đối giữa $n$ phần tử trong cùng một tầng đối với phần tử cha ở tầng trên, người ra quyết định sử dụng Thang đo cơ bản Saaty $1$–$9$:

| Mức độ quan trọng ($a_{ij}$) | Định nghĩa ngôn ngữ | Giải thích ý nghĩa |
| :---: | :--- | :--- |
| $1$ | Quan trọng ngang nhau (Equal) | Hai yếu tố đóng góp ngang nhau vào mục tiêu |
| $3$ | Quan trọng hơn vừa phải (Moderate) | Kinh nghiệm/đánh giá nghiêng nhẹ về một yếu tố |
| $5$ | Quan trọng hơn nhiều (Strong) | Kinh nghiệm/đánh giá ủng hộ mạnh mẽ một yếu tố |
| $7$ | Rất quan trọng (Very Strong) | Một yếu tố thể hiện sự vượt trội rõ rệt |
| $9$ | Cực kỳ quan trọng (Extreme) | Bằng chứng ủng hộ tuyệt đối ở mức cao nhất |
| $2, 4, 6, 8$ | Giá trị trung gian | Dùng khi cần sự thỏa hiệp giữa hai mức đánh giá liền kề |
| Nghịch đảo ($1/a_{ij}$) | Đánh giá đối ứng | Nếu $i$ so với $j$ có mức $a_{ij}$, thì $j$ so với $i$ có mức $1/a_{ij}$ |

Ma trận so sánh cặp $A = [a_{ij}]_{n \times n}$ thỏa mãn các điều kiện tiên đề:
$$a_{ij} > 0, \quad a_{ji} = \frac{1}{a_{ij}}, \quad a_{ii} = 1 \quad (\forall i, j = 1, \dots, n)$$

Số lượng phép so sánh độc lập cần thực hiện là:
$$N_{\text{comparisons}} = \frac{n(n - 1)}{2}$$

---

### 2.3. Các phương pháp xác định Vector trọng số ưu tiên (Priority Vectors)

Hệ thống tích hợp và cho phép đối chuẩn song song 3 phương pháp toán học để trích xuất vector trọng số $w = [w_1, w_2, \dots, w_n]^T$ thỏa mãn $\sum_{i=1}^n w_i = 1$:

#### a. Phương pháp Véc-tơ riêng chính (Principal Eigenvector Method - EVM qua Power Iteration)
Đây là phương pháp chuẩn xác do Thomas L. Saaty đề xuất dựa trên phương trình đặc trưng:
$$A w = \lambda_{\max} w$$
Trong đó $\lambda_{\max}$ là giá trị riêng thực lớn nhất của ma trận $A$.

Hệ thống tính toán $w$ bằng giải thuật lặp lũy thừa (Power Iteration):
1. Khởi tạo $w^{(0)} = \left[\frac{1}{n}, \frac{1}{n}, \dots, \frac{1}{n}\right]^T$.
2. Tại bước lặp $k + 1$:
   $$y^{(k+1)} = A w^{(k)}$$
   $$w^{(k+1)} = \frac{y^{(k+1)}}{\sum_{i=1}^n y_i^{(k+1)}}$$
3. Dừng lặp khi $\|w^{(k+1)} - w^{(k)}\|_\infty < \epsilon$ (với $\epsilon = 10^{-7}$).
4. Ước lượng giá trị riêng cực đại:
   $$\lambda_{\max} = \frac{1}{n} \sum_{i=1}^n \frac{(A w)_i}{w_i}$$

#### b. Phương pháp Trung bình nhân (Geometric Mean Method - GMM / Logarithmic Least Squares)
Trọng số được tính trực tiếp từ trung bình nhân từng hàng của ma trận:
$$r_i = \left( \prod_{j=1}^n a_{ij} \right)^{\frac{1}{n}}, \quad w_i = \frac{r_i}{\sum_{k=1}^n r_k}$$
Phương pháp này giảm thiểu tổng bình phương sai lệch logarit $\sum_{i,j} (\ln a_{ij} - \ln(w_i/w_j))^2$ và hoàn toàn loại bỏ hiện tượng đảo ngược thứ bậc khi thêm/bớt phần tử trong ma trận.

#### c. Phương pháp Chuẩn hóa trung bình số học (Arithmetic Column Normalization)
Chuẩn hóa từng cột theo tổng cột và lấy giá trị trung bình cộng theo hàng:
$$w_i = \frac{1}{n} \sum_{j=1}^n \frac{a_{ij}}{\sum_{k=1}^n a_{kj}}$$

#### d. Đối chuẩn sai lệch đa phương pháp (Multi-Method Benchmark)
Hệ thống tính toán độ lệch tuyệt đối tối đa giữa các phương pháp:
$$\text{MAD}_{\text{EVM-GMM}} = \max_{1 \le i \le n} |w_i^{\text{EVM}} - w_i^{\text{GMM}}|$$
Nếu $\text{MAD} < 0.03$, ma trận đạt độ vững chắc cao (High Robustness); nếu $\text{MAD} \ge 0.03$, hệ thống đưa ra khuyến nghị kiểm tra lại tính nhất quán.

---

### 2.4. Kiểm định tính nhất quán logic (Consistency Verification) & Khoảng dung sai trọng số

Do phán đoán của con người không thể đạt tính bắc cầu tuyệt đối ($a_{ik} = a_{ij} \cdot a_{jk}$), hệ thống thực hiện kiểm định tính nhất quán toán học nghiêm ngặt:

#### a. Chỉ số nhất quán (Consistency Index - CI)
$$CI = \frac{\lambda_{\max} - n}{n - 1} \quad (n > 1)$$
(Khi ma trận nhất quán hoàn hảo, $\lambda_{\max} = n \Rightarrow CI = 0$).

#### b. Tỷ số nhất quán (Consistency Ratio - CR)
$$CR = \frac{CI}{RI(n)}$$
Trong đó $RI(n)$ là Chỉ số Ngẫu nhiên (Random Index) được xác định từ trung bình $CI$ của hàng ngàn ma trận ngẫu nhiên cùng kích thước do Saaty công bố:

| $n$ | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **RI** | 0.00 | 0.00 | 0.58 | 0.90 | 1.12 | 1.24 | 1.32 | 1.41 | 1.45 | 1.49 | 1.51 | 1.48 | 1.56 | 1.57 | 1.59 |

- **Điều kiện chấp nhận**: $CR < 0.10$ ($10\%$). Nếu $CR \ge 0.10$, ma trận bị xem là mâu thuẫn và cần điều chỉnh lại đánh giá.

#### c. Kiểm định mở rộng Alonso & Lamata (2006)
Để bổ trợ cho bảng tra ngẫu nhiên cổ điển, hệ thống tích hợp công thức xấp xỉ liên tục của Alonso & Lamata:
$$RI_{\text{Alonso}}(n) = \frac{2.7699 \cdot n - 4.3513 - n}{n - 1}$$
$$CR_{\text{Alonso}} = \frac{\lambda_{\max} - n}{(2.7699 \cdot n - 4.3513) - n}$$

#### d. Sai số ước lượng trọng số Goepel và Khoảng dung sai tin cậy (Tolerance Intervals)
Hệ thống tính sai số tiêu chuẩn $\sigma_{w_i}$ của từng trọng số:
$$\sigma_{w_i} = \sqrt{\frac{1}{n - 1} \sum_{k=1}^n \left( a_{ik} w_k \frac{n}{\lambda_{\max}} - w_i \right)^2}$$
Khoảng dung sai tin cậy tương ứng là:
$$w_i \in \left[ \max(0, w_i - \sigma_{w_i}), \; w_i + \sigma_{w_i} \right]$$

---

### 2.5. Thuật toán Chẩn đoán sai lệch & Tự động hiệu chỉnh nhất quán (Inconsistency Doctor)

Khi $CR \ge 0.10$, việc tự tìm ô phán đoán gây mâu thuẫn là bài toán rất khó đối với người dùng. Hệ thống phát triển công cụ **Inconsistency Doctor** với cơ chế 2 bước:

#### a. Định vị sai lệch chuyển tiếp cực đại
Hệ thống tính tỷ số lý tưởng $r_{ij}^* = \frac{w_i}{w_j}$ và đo lường độ lệch tương đối của từng ô so sánh:
$$\text{Dev}_{ij} = \frac{|a_{ij} - r_{ij}^*|}{\max(a_{ij}, r_{ij}^*)}$$
Cặp phần tử $(i, j)$ có $\text{Dev}_{ij}$ lớn nhất được xác định là nguyên nhân chính dẫn đến mâu thuẫn. Giá trị đề xuất tối ưu $a_{ij}^{\text{suggest}}$ được làm tròn về mức gần nhất trên thang Saaty:
$$a_{ij}^{\text{suggest}} = \operatorname{arg\,min}_{s \in \text{Saaty Scale}} |s - r_{ij}^*|$$

#### b. Thuật toán Tự động điều chỉnh ma trận tiệm cận (Auto-Tuning Engine)
Thuật toán lặp tự động hiệu chỉnh từng bước ma trận theo hàm tối ưu:
```
Thuật toán: Tự động giảm bất nhất quán ma trận
Đầu vào: Ma trận so sánh cặp A, ngưỡng CR mục tiêu (0.10), số bước lặp tối đa K = 6
Đầu ra: Ma trận tối ưu A*, danh sách điều chỉnh

1. Tính CR hiện tại. Nếu CR <= 0.10, Dừng.
2. Lặp k từ 1 đến K:
   a. Tính vector trọng số w và lambda_max.
   b. Tìm cặp (i, j) có độ lệch |a_ij - w_i/w_j| đạt cực đại.
   c. Gán giá trị mới: a_ij_new = SnapToSaatyScale(w_i / w_j).
   d. Cập nhật: a_ij = a_ij_new, a_ji = 1 / a_ij_new.
   e. Tính lại CR_moi.
   f. Ghi nhận nhật ký điều chỉnh bước k.
   g. Nếu CR_moi <= 0.10, Thoát vòng lặp.
3. Trả về ma trận đã cân chỉnh và báo cáo kết quả.
```

---

### 2.6. Thuật toán Điền khuyết ma trận so sánh cặp chưa hoàn chỉnh (Incomplete Matrix Completion)

Khi chuyên gia không thể đánh giá toàn bộ $n(n - 1)/2$ ô so sánh (ma trận khuyết thiếu, các ô chưa đánh giá có giá trị $a_{ij} = 0$), hệ thống giải bài toán tối ưu hóa phi tuyến phi tham số Log-Least Squares thông qua thuật toán BFGS:

$$\min_{x} \sum_{(i, j) \in \Omega_{\text{missing}}} \sum_{k=1}^n \left( \ln a_{ik}(x) - \ln \frac{w_i(x)}{w_k(x)} \right)^2$$
Trong đó biến tối ưu $x_{ij} = \ln a_{ij}$, sau đó các giá trị giải ra được ánh xạ ngược về thang đo Saaty:
$$a_{ij}^* = \operatorname{SnapToSaatyScale}(\exp(x_{ij}^*))$$
Cơ chế này cho phép trích xuất trọng số chuẩn xác ngay cả khi ma trận bị khuyết tới $40\% - 50\%$ số cặp so sánh.

---

### 2.7. Tổng hợp thứ bậc toàn cục (Hierarchical Synthesis)

Sau khi tính toán xong vector trọng số tiêu chí $w_{\text{crit}} = [w_1, w_2, \dots, w_n]^T$ và ma trận điểm cục bộ của các phương án theo từng tiêu chí $V_{\text{alt}} = [v_{ij}]_{m \times n}$ (trong đó $v_{ij}$ là trọng số của phương án $A_i$ dưới tiêu chí $C_j$), điểm tổng hợp toàn cục $S = [S_1, S_2, \dots, S_m]^T$ được tổng hợp theo phép nhân ma trận:

$$S = V_{\text{alt}} \times w_{\text{crit}} \iff S_i = \sum_{j=1}^n v_{ij} \cdot w_j \quad (i = 1, \dots, m)$$

#### Tỷ số nhất quán toàn hệ thống (Overall Hierarchy Inconsistency - $CR_{\text{global}}$)
Để kiểm định tính nhất quán của toàn bộ cấu trúc phân cấp:
$$CI_{\text{global}} = CI_{\text{crit}} + \sum_{j=1}^n w_j \cdot CI_{\text{alt}, j}$$
$$RI_{\text{global}} = RI_{\text{crit}} + \sum_{j=1}^n w_j \cdot RI_{\text{alt}, j}$$
$$CR_{\text{global}} = \frac{CI_{\text{global}}}{RI_{\text{global}}}$$
Hệ thống xác nhận mô hình đạt độ tin cậy tổng thể khi $CR_{\text{global}} < 0.10$.

---

### 2.8. Phân tích độ nhạy đa chiều (Multi-Dimensional Sensitivity Analysis)

#### a. Phân tích độ nhạy động học (Dynamic Sensitivity)
Cho phép người dùng tương tác kéo thanh trượt điều chỉnh trọng số của tiêu chí bất kỳ $C_k$ từ $0\%$ đến $100\%$. Để đảm bảo tiên đề $\sum_{j=1}^n w_j = 1$, trọng số của tất cả các tiêu chí còn lại được tự động tái phân bổ tỷ lệ:

$$w_j(w_k) = (1 - w_k) \cdot \frac{w_j^0}{\sum_{p \ne k} w_p^0} \quad (\forall j \ne k)$$

Điểm số và thứ hạng của các phương án được tái tính toán và cập nhật theo thời gian thực (Real-time).

#### b. Phân tích độ nhạy độ dốc 2D (Gradient Sensitivity) & Điểm giao cắt (Crossover Points)
Khảo sát liên tục biến thiên của trọng số tiêu chí được chọn $w_k \in [0, 1]$ với bước nhảy $\Delta w = 0.02$ ($51$ điểm mẫu). Đường hàm số điểm của phương án $A_i$ theo $w_k$ có dạng tuyến tính:
$$S_i(w_k) = v_{ik} \cdot w_k + \sum_{j \ne k} v_{ij} \cdot \left[ (1 - w_k) \frac{w_j^0}{\sum_{p \ne k} w_p^0} \right]$$

Hệ thống tự động giải hệ phương trình $S_i(w_k) = S_j(w_k)$ để tìm tất cả các **Điểm giao cắt (Crossover Points)** làm đảo chiều vị trí xếp hạng số 1 giữa các phương án:
$$w_k^* = \frac{\sum_{p \ne k} (v_{jp} - v_{ip}) \frac{w_p^0}{\sum_{m \ne k} w_m^0}}{(v_{ik} - v_{jk}) - \sum_{p \ne k} (v_{ip} - v_{jp}) \frac{w_p^0}{\sum_{m \ne k} w_m^0}}$$

---

### 2.9. Đánh giá rủi ro & Độ vững chắc quyết định bằng Mô phỏng Monte Carlo

Để khắc phục nhược điểm của phân tích độ nhạy tất định, hệ thống phát triển **Monte Carlo Robustness Engine**:
1. Khởi tạo $N$ kịch bản giả định ngẫu nhiên ($N = 1.000 - 5.000$).
2. Trong mỗi kịch bản $t$, áp dụng phân phối nhiễu chuẩn Gauss đa chiều với độ lệch chuẩn $\sigma = 10\% - 40\%$:
   $$\tilde{w}_j^{(t)} = \max\left(\epsilon, \; w_j^0 \cdot \left(1 + \mathcal{N}(0, \sigma^2)\right)\right)$$
   Chuẩn hóa vector ngẫu nhiên:
   $$\hat{w}^{(t)} = \frac{\tilde{w}^{(t)}}{\sum_{j=1}^n \tilde{w}_j^{(t)}}$$
3. Tính toán vector điểm tổng hợp: $S^{(t)} = V_{\text{alt}} \times \hat{w}^{(t)}$.
4. Xác định phương án chiến thắng (Rank 1) tại mỗi kịch bản.
5. Thống kê **Xác suất Chiến thắng (Win Probability)** và các tham số thống kê mô tả:
   $$P_{\text{win}}(A_i) = \frac{\sum_{t=1}^N \mathbb{I}(\text{Rank}(A_i, S^{(t)}) = 1)}{N} \times 100\%$$
   $$\mu_i = \frac{1}{N} \sum_{t=1}^N S_i^{(t)}, \quad \sigma_i = \sqrt{\frac{1}{N} \sum_{t=1}^N (S_i^{(t)} - \mu_i)^2}$$
6. **Chỉ số Độ vững chắc (Robustness Index)**: Nếu $P_{\text{win}}(A_{\text{winner}}) \ge 70\%$, quyết định được phân loại là **Độ vững chắc rất cao (High Robustness)**; nếu $P_{\text{win}} < 70\%$, hệ thống phát cảnh báo cạnh tranh gay gắt và khuyến nghị bổ sung dữ liệu đánh giá.

---

### 2.10. Ra quyết định nhóm (Group Decision Making) & Đo lường đồng thuận Shannon Entropy

#### a. Tổng hợp ma trận phán đoán cá nhân (Aggregation of Individual Judgments - AIJ)
Khi có $K$ chuyên gia đánh giá độc lập với các ma trận $A^{(1)}, A^{(2)}, \dots, A^{(K)}$, ma trận tổng hợp nhóm $A^{(\text{group})}$ được xác định bằng phương pháp Trung bình nhân hình học từng phần tử:
$$a_{ij}^{(\text{group})} = \left( \prod_{k=1}^K a_{ij}^{(k)} \right)^{\frac{1}{K}}, \quad a_{ji}^{(\text{group})} = \frac{1}{a_{ij}^{(\text{group})}}$$

#### b. Đo lường mức độ đồng thuận nhóm theo Shannon Entropy (Goepel Consensus Indicator $S^*$)
Dựa trên lý thuyết phân rã đa dạng Entropy:
- Vector trọng số trung bình gộp (Pooled Weights): $\bar{w}_i = \frac{(\prod_{k=1}^K w_i^{(k)})^{1/K}}{\sum_{j=1}^n (\prod_{k=1}^K w_j^{(k)})^{1/K}}$.
- $\alpha$-Entropy (Mức độ đa dạng trung bình trong nội bộ từng chuyên gia):
  $$H_\alpha = \frac{1}{K} \sum_{k=1}^K \left( -\sum_{i=1}^n w_i^{(k)} \ln w_i^{(k)} \right)$$
- $\gamma$-Entropy (Mức độ đa dạng của vector trọng số gộp toàn nhóm):
  $$H_\gamma = -\sum_{i=1}^n \bar{w}_i \ln \bar{w}_i$$
- $\beta$-Entropy (Mức độ bất đồng thuận giữa các chuyên gia):
  $$H_\beta = \max(0, \; H_\gamma - H_\alpha)$$
- **Chỉ số Đồng thuận Nhóm ($S^*$)**:
  $$S^* = \left( 1 - \frac{H_\beta}{\ln n} \right) \times 100\%$$

Thang đánh giá mức độ đồng thuận:
- $S^* > 87.5\%$: Rất cao (Very High Consensus).
- $75.0\% < S^* \le 87.5\%$: Cao (High Consensus).
- $62.5\% < S^* \le 75.0\%$: Trung bình (Moderate Consensus).
- $S^* \le 62.5\%$: Thấp / Bất đồng chính kiến (Low Consensus).

---

### 2.11. Mô hình Phân tích Thứ bậc Mờ (Fuzzy AHP)

Để giải quyết tính không chắc chắn và mơ hồ trong nhận thức của chuyên gia, hệ thống tích hợp mô hình Fuzzy AHP sử dụng Số Mờ Tam Giác (Triangular Fuzzy Number - TFN) $\tilde{a} = (l, m, u)$ với $l \le m \le u$:
- $l$: Giá trị cận dưới khả dĩ (Lower bound).
- $m$: Giá trị tin cậy cao nhất (Modal value).
- $u$: Giá trị cận trên khả dĩ (Upper bound).

Quy trình tính toán theo Buckley Geometric Mean:
1. Tính giá trị mờ mở rộng theo hàng:
   $$\tilde{r}_i = \left( \prod_{j=1}^n \tilde{a}_{ij} \right)^{\frac{1}{n}} = \left( \left(\prod_{j=1}^n l_{ij}\right)^{\frac{1}{n}}, \; \left(\prod_{j=1}^n m_{ij}\right)^{\frac{1}{n}}, \; \left(\prod_{j=1}^n u_{ij}\right)^{\frac{1}{n}} \right)$$
2. Tính tổng vector mờ:
   $$\sum_{i=1}^n \tilde{r}_i = \left( \sum_{i=1}^n \tilde{r}_{i, l}, \; \sum_{i=1}^n \tilde{r}_{i, m}, \; \sum_{i=1}^n \tilde{r}_{i, u} \right)$$
3. Trọng số mờ của phần tử $i$:
   $$\tilde{w}_i = \tilde{r}_i \otimes \left( \sum_{i=1}^n \tilde{r}_i \right)^{-1} = \left( \frac{\tilde{r}_{i, l}}{\sum \tilde{r}_{i, u}}, \; \frac{\tilde{r}_{i, m}}{\sum \tilde{r}_{i, m}}, \; \frac{\tilde{r}_{i, u}}{\sum \tilde{r}_{i, l}} \right)$$
4. Giải mờ (Defuzzification) theo phương pháp trọng tâm diện tích (Centroid) và chuẩn hóa:
   $$w_i^{\text{crisp}} = \frac{w_{i, l} + w_{i, m} + w_{i, u}}{3}, \quad w_i^* = \frac{w_i^{\text{crisp}}}{\sum_{k=1}^n w_k^{\text{crisp}}}$$

---

### 2.12. Mô hình Lai ghép AHP – TOPSIS (Hybrid AHP-TOPSIS Integration)

Mô hình này kết hợp vector trọng số $w$ thu được từ AHP với ma trận dữ liệu định lượng thực tế $X = [x_{ij}]_{m \times n}$ ($m$ phương án, $n$ tiêu chí):

```
[ AHP Pairwise Comparisons ] ───► [ Priority Weights (w) ]
                                              │
[ Real Quantitative Matrix (X) ] ─────────────┼───► [ Weighted Matrix (V) ]
                                              │               │
                                              ▼               ▼
                                 [ TOPSIS Distance to PIS / NIS ]
                                              │
                                              ▼
                                  [ Closeness Ranking (C_i) ]
```

1. **Chuẩn hóa vector**:
   $$r_{ij} = \frac{x_{ij}}{\sqrt{\sum_{k=1}^m x_{kj}^2}} \quad (i = 1, \dots, m; \; j = 1, \dots, n)$$
2. **Xây dựng ma trận trọng số chuẩn hóa**:
   $$v_{ij} = w_j \cdot r_{ij}$$
3. **Xác định Nghiệm lý tưởng dương ($A^+$ - PIS) và Nghiệm lý tưởng âm ($A^-$ - NIS)**:
   $$A^+ = \{v_1^+, v_2^+, \dots, v_n^+\}, \quad v_j^+ = \begin{cases} \max_i v_{ij}, & \text{nếu } C_j \text{ là tiêu chí Lợi ích (Benefit)} \\ \min_i v_{ij}, & \text{nếu } C_j \text{ là tiêu chí Chi phí (Cost)} \end{cases}$$
   $$A^- = \{v_1^-, v_2^-, \dots, v_n^-\}, \quad v_j^- = \begin{cases} \min_i v_{ij}, & \text{nếu } C_j \text{ là tiêu chí Lợi ích (Benefit)} \\ \max_i v_{ij}, & \text{nếu } C_j \text{ là tiêu chí Chi phí (Cost)} \end{cases}$$
4. **Tính khoảng cách Euclid**:
   $$D_i^+ = \sqrt{\sum_{j=1}^n (v_{ij} - v_j^+)^2}, \quad D_i^- = \sqrt{\sum_{j=1}^n (v_{ij} - v_j^-)^2}$$
5. **Tính Hệ số tiệm cận tương đối ($C_i$)**:
   $$C_i = \frac{D_i^-}{D_i^+ + D_i^-} \quad (0 \le C_i \le 1)$$
   Phương án có $C_i$ càng gần $1$ thì càng tối ưu.

---

## 3. TÁC DỤNG & GIÁ TRỊ ĐÓNG GÓP CỦA HỆ THỐNG ĐỐI VỚI PHƯƠNG PHÁP AHP

Việc xây dựng hệ thống mang lại nhiều đóng góp lý thuyết và thực tiễn sâu sắc cho phương pháp AHP:

1. **Tự động hóa toàn diện và loại trừ triệt để sai số tính toán thủ công**:
   Trong các bài toán quy mô lớn ($n > 5$), việc giải vector riêng và tính tỷ số $CR$ thủ công hoặc bằng bảng tính Excel rời rạc cực kỳ phức tạp và dễ phát sinh sai số. Hệ thống cung cấp động cơ tính toán ma trận với độ chính xác số học kép ($10^{-7}$).

2. **Chuyển đổi AHP từ trạng thái tĩnh sang hệ động thái tương tác (Dynamic Interactive Paradigm)**:
   Thay vì chỉ tạo ra một bảng xếp hạng cố định một lần, hệ thống cho phép người điều hành tương tác trực tiếp với các thanh trượt trọng số, quan sát sự chuyển dịch thứ hạng theo thời gian thực và xác định chính xác các điểm ngưỡng (Crossover Thresholds) mà tại đó quyết định bị đảo chiều.

3. **Tăng cường khả năng giải trình và tính minh bạch (Explainable Decision Support)**:
   Mọi phán đoán đều được minh bạch hóa thông qua ma trận tương hỗ, biểu đồ radar đa chiều, sai số ước lượng trọng số Goepel và các bảng đóng góp tỷ trọng thành phần của từng tiêu chí vào điểm số cuối cùng.

4. **Giải quyết bài toán mâu thuẫn nhận thức một cách khoa học**:
   Thay vì bắt người dùng phải làm lại từ đầu khi $CR \ge 10\%$, công cụ **Inconsistency Doctor** cung cấp chỉ dẫn tường minh về ô đánh giá có độ lệch chuyển tiếp cao nhất và thuật toán tự động cân chỉnh ma trận về vùng nhất quán mà vẫn bảo toàn tối đa ý đồ đánh giá ban đầu.

5. **Giảm áp lực thu thập dữ liệu chuyên gia**:
   Với thuật toán điền khuyết ma trận dựa trên tối ưu hóa Log-Least Squares, chuyên gia không nhất thiết phải trả lời đầy đủ tất cả các câu hỏi so sánh cặp, tiết kiệm đáng kể thời gian và chi phí khảo sát thực địa.

6. **Tích hợp đánh giá rủi ro ngẫu nhiên vào quá trình ra quyết định**:
   Mô phỏng Monte Carlo đưa ra cái nhìn xác suất về độ vững chắc của quyết định, giúp lãnh đạo hiểu rõ phương án được chọn có thực sự vượt trội bền vững hay chỉ chiến thắng nhờ sự thiên lệch mong manh của một vài tiêu chí nhạy cảm.

7. **Cầu nối chuẩn xác giữa định tính và định lượng**:
   Sự kết hợp AHP – TOPSIS giúp khai thác triệt để sức mạnh phân bổ trọng số của AHP trên các tiêu chí chiến lược và khả năng xếp hạng khách quan của TOPSIS trên ma trận số liệu thực nghiệm.

---

## 4. PHÂN TÍCH SO SÁNH ĐỐI CHIẾU & ĐIỂM KHÁC BIỆT VƯỢT TRỘI SO VỚI EXPERT CHOICE

Bảng đối chuẩn chi tiết dưới đây làm nổi bật những bước tiến hóa công nghệ và phương pháp luận của hệ thống so với phần mềm Expert Choice:

| Tiêu chí So sánh | Phần mềm Cổ điển Expert Choice | Hệ Thống AHP Decision Studio Enterprise | Ý nghĩa & Bước tiến Cải tiến |
| :--- | :--- | :--- | :--- |
| **Nền tảng kiến trúc** | Ứng dụng Desktop Windows truyền thống, giao diện đóng, cần cài đặt cục bộ | Ứng dụng Web hiện đại (SPA React + RESTful API FastAPI), truy cập mọi lúc mọi nơi trên trình duyệt | Tính linh hoạt, khả năng triển khai tức thì trên máy chủ đám mây hoặc mạng nội bộ doanh nghiệp |
| **Phương pháp tính trọng số** | Duy nhất phương pháp Vector riêng (EVM) | Tích hợp song song 3 phương pháp: EVM, GMM (Trung bình nhân) và Arithmetic Mean; kèm đối chuẩn MAD | Cho phép kiểm tra chéo độ ổn định thuật toán và triệt tiêu hiện tượng đảo hạng (Rank Reversal) |
| **Xử lý ma trận mâu thuẫn ($CR \ge 10\%$)** | Chỉ hiển thị cảnh báo đỏ và gợi ý một số ô mâu thuẫn cơ bản | **Inconsistency Doctor**: Định vị chính xác sai lệch chuyển tiếp cực đại + **Auto-Tuning Engine** tự động tối ưu hóa ma trận đạt $CR \le 10\%$ | Tiết kiệm thời gian cân chỉnh cho chuyên gia, tối ưu hóa quá trình thu thập ý kiến |
| **Xử lý ma trận khuyết thiếu** | Bắt buộc người dùng nhập đầy đủ toàn bộ các ô so sánh cặp | **Incomplete Matrix Completion**: Tự động giải tối ưu hóa phi tuyến BFGS Log-Least Squares để điền khuyết | Giảm số lượng câu hỏi khảo sát chuyên gia lên đến $40\% - 50\%$ |
| **Đánh giá rủi ro ngẫu nhiên** | Không hỗ trợ (Chỉ dừng ở phân tích độ nhạy tất định) | **Monte Carlo Simulation Lab**: Chạy $1.000 - 5.000$ kịch bản nhiễu Gaussian, đo lường Xác suất chiến thắng và Chỉ số độ vững chắc | Đưa ra góc nhìn xác suất rủi ro, nâng cao độ an toàn cho các quyết định triệu đô |
| **Phân tích độ dốc (Gradient Sensitivity)** | Có biểu đồ 2D cơ bản | Biểu đồ tương tác thời gian thực + **Tự động nhận diện và tính toán tọa độ chính xác các Điểm giao cắt (Crossover Points)** | Người ra quyết định biết ngay ngưỡng biến động chính xác làm thay đổi ngôi vị quán quân |
| **Đo lường đồng thuận nhóm (GDM)** | Ghép trung bình hình học cơ bản, thiếu thước đo đồng thuận định lượng | **Goepel Shannon Entropy Indicator**: Tính toán chi tiết $\alpha, \beta, \gamma$-Entropy và chỉ số đồng thuận $S^* \in [0, 100\%]$ | Đo lường khoa học mức độ phân hóa quan điểm giữa các thành viên hội đồng |
| **Mở rộng dữ liệu mờ (Fuzzy Logic)** | Không hỗ trợ Fuzzy AHP | Tích hợp đầy đủ mô hình **Fuzzy AHP** với Số mờ tam giác (TFN) và giải mờ Buckley | Xử lý hoàn hảo các phán đoán có độ mơ hồ, bất định cao |
| **Kết hợp dữ liệu định lượng thực tế** | Hạn chế, thuần túy phụ thuộc so sánh cặp chủ quan | Tích hợp mô hình lai **AHP – TOPSIS**: Chuẩn hóa vector, khoảng cách nghiệm lý tưởng $A^+ / A^-$ | Kết hợp hài hòa giữa phán đoán chiến lược và số liệu đo lường thực nghiệm |
| **Xuất nhập dữ liệu & Báo cáo** | Định dạng tệp tin nhị phân riêng (.ahp), xuất báo cáo hạn chế | Xuất bảng tính Excel đa tầng định dạng Executive Spreadsheet, tải/lưu JSON tiêu chuẩn, nhập dữ liệu từ Excel/CSV | Khả năng tích hợp mở, dễ dàng chia sẻ và lưu trữ hồ sơ kiểm toán quyết định |
| **Mô hình bản quyền & Tùy biến** | Giấy phép thương mại độc quyền, chi phí đắt đỏ, không thể tùy biến | Mã nguồn mở học thuật, kiến trúc module hóa cao, dễ dàng mở rộng và tùy biến thuật toán | Tự do nghiên cứu khoa học, làm chủ hoàn toàn công nghệ lõi |

---

## 5. KIẾN TRÚC KỸ THUẬT & HƯỚNG DẪN VẬN HÀNH

### 5.1. Sơ đồ Kiến trúc Phân lớp

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           TẦNG GIAO DIỆN (FRONTEND)                     │
│   React 18  │  Vite  │  CSS Glassmorphism Design System  │  HTML5 Canvas │
│   - Step 1: Hierarchy Tree Builder & Template Manager                   │
│   - Step 2: Interactive Pairwise Comparison & Inconsistency Doctor      │
│   - Step 3: Priority Synthesis & Multi-Dimensional Radar View           │
│   - Step 4: Dynamic & Gradient Sensitivity Lab + Monte Carlo Engine     │
│   - Step 5: Hybrid AHP-TOPSIS Data Matrix Evaluation                    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ RESTful API (JSON / HTTP)
┌────────────────────────────────────▼────────────────────────────────────┐
│                        TẦNG DỊCH VỤ & XỬ LÝ (BACKEND)                    │
│   Python 3.10+  │  FastAPI  │  Uvicorn  │  Pydantic Data Models         │
│   - Engine Endpoint Routers & Project Persistence Store                 │
│   - Multi-tab Executive Excel Generator (OpenPyXL Engine)               │
│   - CSV / Excel File Importer & Format Normalizer                       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Vectorized Mathematical Computations
┌────────────────────────────────────▼────────────────────────────────────┐
│                           TẦNG ĐỘNG CƠ TOÁN HỌC LÕI                     │
│   NumPy  │  SciPy Optimization (BFGS, Power Iteration, Linear Algebra)  │
│   - Power Iteration Eigenvector & GMM Matrix Solvers                    │
│   - Saaty / Alonso-Lamata Consistency Calculators                       │
│   - Inconsistency Doctor Deviation Finder & Auto-Tuning Engine          │
│   - Missing Comparison Log-Least Squares Optimizer                      │
│   - Gradient Crossover Detection & Real-time Rebalancer                 │
│   - Gaussian Noise Monte Carlo Simulator (1,000 - 5,000 runs)           │
│   - Shannon Entropy Group Consensus Engine (Goepel Model)               │
│   - Buckley Triangular Fuzzy AHP Engine                                 │
│   - Vector Normalization & Euclidean Distance TOPSIS Engine             │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2. Hướng Dẫn Cài Đặt & Vận Hành Hệ Thống

#### Bước 1: Thiết lập môi trường Backend
```bash
cd backend
python -m venv .venv

# Kích hoạt môi trường ảo
# Trên Windows:
.venv\Scripts\activate
# Trên Linux/macOS:
source .venv/bin/activate

# Cài đặt các gói thư viện tính toán khoa học
pip install fastapi uvicorn numpy scipy openpyxl python-multipart
```

#### Bước 2: Thiết lập môi trường Frontend
```bash
cd ../frontend
npm install
npm run build
```

#### Bước 3: Khởi chạy Hệ thống
```bash
cd ../backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
Truy cập giao diện hệ thống qua trình duyệt: **`http://127.0.0.1:8000`**

---

## 6. TÀI LIỆU THAM KHẢO (ACADEMIC REFERENCES)

1. **Saaty, T. L. (1980).** *The Analytic Hierarchy Process: Planning, Priority Setting, Resource Allocation.* McGraw-Hill, New York.
2. **Saaty, T. L. (1990).** *How to make a decision: The Analytic Hierarchy Process.* European Journal of Operational Research, 48(1), 9-26.
3. **Saaty, T. L. (2003).** *Decision-making with the AHP: Why is the principal eigenvector necessary.* European Journal of Operational Research, 145(1), 85-91.
4. **Forman, E. H., & Gass, S. I. (2001).** *The Analytic Hierarchy Process—An Exposition.* Operations Research, 49(4), 469-486.
5. **Alonso, J. A., & Lamata, M. T. (2006).** *Consistency in the Analytic Hierarchy Process: a new approach.* International Journal of Uncertainty, Fuzziness and Knowledge-Based Systems, 14(04), 445-459.
6. **Goepel, K. D. (2013).** *Implementing the Analytic Hierarchy Process as a Standard Method for Multi-Criteria Decision Making in Corporate Enterprises–A New AHP Excel Template with Multiple Inputs.* Proceedings of the International Symposium on the Analytic Hierarchy Process, 1-10.
7. **Buckley, J. J. (1985).** *Fuzzy hierarchical analysis.* Fuzzy Sets and Systems, 17(3), 233-247.
8. **Hwang, C. L., & Yoon, K. (1981).** *Multiple Attribute Decision Making: Methods and Applications.* Springer-Verlag, Berlin/Heidelberg.
9. **Harker, P. T. (1987).** *Incomplete pairwise comparisons in the analytic hierarchy process.* Mathematical Modelling, 9(11), 837-848.
10. **Shannon, C. E. (1948).** *A Mathematical Theory of Communication.* Bell System Technical Journal, 27(3), 379-423.

---

*Tác giả & Nhà phát triển hệ thống: Đội ngũ Nghiên cứu & Phát triển AHP Decision Studio Enterprise.*
