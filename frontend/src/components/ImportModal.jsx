import React, { useState, useRef } from 'react';
import { 
  UploadCloud, FileSpreadsheet, FileText, CheckCircle2, 
  AlertCircle, Download, X, ArrowRight, Table, Layers, Target, ShieldCheck
} from 'lucide-react';
import { importFileAPI, SAMPLE_EXCEL_URL, SAMPLE_CSV_URL } from '../utils/ahpClient';

export default function ImportModal({ isOpen, onClose, onImportSuccess }) {
  const [dragOver, setDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFile = async (file) => {
    if (!file) return;
    setError(null);
    setIsLoading(true);

    try {
      const result = await importFileAPI(file);
      setParsedData(result);
    } catch (err) {
      setError(err.message || 'Không thể đọc hoặc phân tích tệp tin.');
      setParsedData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleConfirm = () => {
    if (parsedData) {
      onImportSuccess(parsedData);
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(5, 8, 15, 0.85)',
      backdropFilter: 'blur(8px)',
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '720px',
        maxHeight: '90vh',
        overflowY: 'auto',
        borderRadius: '16px',
        border: '1px solid var(--border-medium)',
        background: 'linear-gradient(135deg, rgba(20, 27, 45, 0.98) 0%, rgba(10, 15, 28, 0.98) 100%)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(79, 70, 229, 0.2)',
        padding: '1.8rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.4rem'
      }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UploadCloud size={20} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                Nhập Dữ Liệu Cá Nhân Hóa (Import File)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Hỗ trợ tải lên Excel (.xlsx, .xls), CSV (.csv) hoặc tệp mô hình JSON (.json)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.35rem', borderRadius: '50%', border: 'none' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Template Download Shortcuts */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.8rem',
          padding: '0.85rem 1rem',
          borderRadius: '10px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FileSpreadsheet size={15} color="var(--accent-cyan)" />
            Chưa có file mẫu? Tải xuống biểu mẫu chuẩn doanh nghiệp:
          </span>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <a
              href={SAMPLE_EXCEL_URL}
              download="AHP_Mau_Nhap_Lieu.xlsx"
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--success)' }}
            >
              <Download size={13} /> Mẫu Excel (.xlsx)
            </a>
            <a
              href={SAMPLE_CSV_URL}
              download="AHP_Mau_Nhap_Lieu.csv"
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#38bdf8' }}
            >
              <Download size={13} /> Mẫu CSV
            </a>
          </div>
        </div>

        {/* Drag and Drop Zone */}
        {!parsedData && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--accent-cyan)' : 'rgba(99, 102, 241, 0.4)'}`,
              borderRadius: '12px',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragOver ? 'rgba(6, 182, 212, 0.08)' : 'rgba(0, 0, 0, 0.25)',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.8rem'
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              accept=".xlsx,.xls,.csv,.json"
              style={{ display: 'none' }}
            />

            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.15)',
              color: 'var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UploadCloud size={30} />
            </div>

            <div>
              <div style={{ fontWeight: '700', fontSize: '1rem', color: '#ffffff' }}>
                {isLoading ? 'Đang phân tích cấu trúc tệp tin...' : 'Kéo & thả file vào đây hoặc bấm để chọn'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                Tự động nhận diện: Tên phương án, Tiêu chí đánh giá, Chiều Lợi ích / Chi phí và Ma trận số liệu
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.8rem 1rem',
            borderRadius: '8px',
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Parsed Preview Card */}
        {parsedData && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            padding: '1.2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={20} color="var(--success)" />
                <span style={{ fontWeight: '800', color: 'var(--success)', fontSize: '0.95rem' }}>
                  Phân Tích Cấu Trúc Thành Công!
                </span>
                <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                  {parsedData.imported_format}
                </span>
              </div>

              <button
                onClick={() => setParsedData(null)}
                style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Chọn file khác
              </button>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Tên Mô Hình & Mục Tiêu</div>
              <div style={{ fontWeight: '700', fontSize: '1rem', color: '#ffffff', marginTop: '0.1rem' }}>
                {parsedData.title}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {parsedData.goal}
              </div>
            </div>

            {/* Criteria Badges */}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '0.4rem' }}>
                Tiêu Chí Nhận Diện ({parsedData.criteria.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {parsedData.criteria.map((c, idx) => {
                  const isCost = parsedData.criterion_types?.[idx] === 'cost';
                  return (
                    <span
                      key={idx}
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        background: isCost ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        border: `1px solid ${isCost ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                        color: isCost ? '#f87171' : '#34d399',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <span>{c}</span>
                      <small style={{ opacity: 0.8, fontSize: '0.65rem' }}>
                        {isCost ? '(Chi phí)' : '(Lợi ích)'}
                      </small>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Alternatives Badges */}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '0.4rem' }}>
                Phương Án Lựa Chọn ({parsedData.alternatives.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {parsedData.alternatives.map((alt, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '6px',
                      background: 'rgba(99, 102, 241, 0.15)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      color: '#a5b4fc'
                    }}
                  >
                    {alt}
                  </span>
                ))}
              </div>
            </div>

            {/* Data matrix sample preview */}
            {parsedData.data_matrix && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.3)', padding: '0.6rem', borderRadius: '6px' }}>
                ✓ Đã nhập bảng hiệu suất {parsedData.alternatives.length} phương án × {parsedData.criteria.length} tiêu chí. Sẵn sàng cho cả Mô hình Thứ bậc AHP và Mô hình Lai TOPSIS.
              </div>
            )}
          </div>
        )}

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.55rem 1.2rem', fontSize: '0.85rem' }}
          >
            Hủy Bỏ
          </button>

          <button
            onClick={handleConfirm}
            disabled={!parsedData}
            className="btn btn-primary"
            style={{
              padding: '0.55rem 1.4rem',
              fontSize: '0.85rem',
              opacity: parsedData ? 1 : 0.4,
              cursor: parsedData ? 'pointer' : 'not-allowed'
            }}
          >
            Áp Dụng Vào Mô Hình <ArrowRight size={15} />
          </button>
        </div>

      </div>
    </div>
  );
}
