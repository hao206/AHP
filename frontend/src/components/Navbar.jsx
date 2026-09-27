import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDownload, faArrowsRotate, faFileExcel,
  faCircleCheck, faCloudArrowUp, faFloppyDisk
} from '@fortawesome/free-solid-svg-icons';

export default function Navbar({
  currentStep,
  setCurrentStep,
  builtInTemplates = {},
  customTemplates = {},
  onLoadTemplate,
  onNewProject,
  onBlankProject,
  onDeleteCustomTemplate,
  onOpenImport,
  onExportJSON,
  onExportExcel,
  isExportingExcel,
  saveStatus = 'pending',
  onSaveProject,
  onConnectProject,
  missingComparisonCount = 0,
  invalidComparisonCount = 0
}) {
  const [accessToken, setAccessToken] = useState('');
  const steps = [
    { id: 1, label: 'Mô hình Thứ bậc', stepNum: '01' },
    { id: 2, label: 'So sánh Cặp', stepNum: '02' },
    { id: 3, label: 'Tổng hợp & Radar', stepNum: '03' },
    { id: 4, label: 'Độ nhạy & Mô phỏng', stepNum: '04' },
    { id: 5, label: 'Mô hình Lai TOPSIS', stepNum: '05' },
  ];

  const customKeys = Object.keys(customTemplates);
  const builtInKeys = Object.keys(builtInTemplates);
  const saveStatusText = {
    restoring: 'Đang khôi phục dự án…',
    pending: 'Có thay đổi chưa đồng bộ',
    saving: 'Đang lưu dự án…',
    saved: 'Đã lưu trên máy chủ',
    local: 'Đã giữ bản nháp trên máy; máy chủ chưa kết nối',
    auth: 'Cần mã truy cập để lưu dự án',
  }[saveStatus];

  return (
    <header className="glass-panel" style={{ margin: '1rem 1.5rem', padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
      {/* Brand Identity */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <h1 style={{ 
          fontSize: '1.25rem', 
          fontWeight: '700', 
          letterSpacing: '-0.02em', 
          color: '#ffffff',
          margin: 0,
          whiteSpace: 'nowrap'
        }}>
          AHP <span style={{ color: 'var(--accent-cyan)' }}>Decision Studio</span>
        </h1>
      </div>

      {/* Stepper Navigation Pills with Fixed, Non-shifting Layout */}
      <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(11, 17, 32, 0.8)', padding: '0.3rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
        {steps.map(step => {
          const isActive = currentStep === step.id;
          const isDone = currentStep > step.id;

          return (
            <button
              key={step.id}
              disabled={step.id >= 3 && (missingComparisonCount > 0 || invalidComparisonCount > 0)}
              title={step.id >= 3 && (missingComparisonCount > 0 || invalidComparisonCount > 0) ? `Cần hoàn thành ${missingComparisonCount} cặp còn thiếu và sửa ${invalidComparisonCount} lỗi ma trận trước khi xem kết quả.` : undefined}
              onClick={() => setCurrentStep(step.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: step.id >= 3 && (missingComparisonCount > 0 || invalidComparisonCount > 0) ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                userSelect: 'none',
                transition: 'background 0.2s, border-color 0.2s, color 0.2s, box-shadow 0.2s',
                border: isActive 
                  ? '1px solid rgba(6, 182, 212, 0.6)' 
                  : isDone 
                  ? '1px solid rgba(16, 185, 129, 0.25)' 
                  : '1px solid transparent',
                background: isActive 
                  ? 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)' 
                  : isDone 
                  ? 'rgba(255, 255, 255, 0.04)' 
                  : 'transparent',
                color: isActive 
                  ? '#ffffff' 
                  : isDone 
                  ? '#e2e8f0' 
                  : 'var(--text-muted)',
                boxShadow: isActive ? '0 0 14px rgba(6, 182, 212, 0.35)' : 'none'
              }}
            >
              {/* Fixed Size Badge: Shows Step Number or Checkmark in the SAME fixed slot */}
              <span style={{
                width: '22px',
                height: '22px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '5px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                fontWeight: '700',
                flexShrink: 0,
                background: isActive 
                  ? 'rgba(255, 255, 255, 0.22)' 
                  : isDone 
                  ? 'rgba(16, 185, 129, 0.18)' 
                  : 'rgba(255, 255, 255, 0.06)',
                color: isActive 
                  ? '#ffffff' 
                  : isDone 
                  ? 'var(--success)' 
                  : 'var(--text-muted)'
              }}>
                {isDone ? <FontAwesomeIcon icon={faCircleCheck} style={{ fontSize: '12px', color: 'var(--success)' }} /> : step.stepNum}
              </span>
              <span>{step.label}</span>
            </button>
          );
        })}
      </div>

      {/* Action Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span role="status" style={{ fontSize: '0.72rem', color: saveStatus === 'local' ? '#fbbf24' : 'var(--text-muted)', maxWidth: '190px' }}>
          {saveStatusText}
        </span>
        <button
          onClick={onSaveProject}
          disabled={saveStatus === 'restoring'}
          className="btn btn-secondary"
          style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
          title="Lưu ngay dự án đang chỉnh sửa"
        >
          <FontAwesomeIcon icon={faFloppyDisk} style={{ fontSize: '12px' }} /> Lưu dự án
        </button>
        {saveStatus === 'auth' && (
          <form onSubmit={event => {
            event.preventDefault();
            if (!accessToken.trim()) return;
            onConnectProject(accessToken);
            setAccessToken('');
          }} style={{ display: 'flex', gap: '0.35rem' }}>
            <input
              type="password"
              autoComplete="off"
              aria-label="Mã truy cập dự án"
              placeholder="Mã truy cập dự án"
              value={accessToken}
              onChange={event => setAccessToken(event.target.value)}
              style={{ maxWidth: '150px' }}
            />
            <button type="submit" className="btn btn-secondary" disabled={!accessToken.trim()}>Kết nối</button>
          </form>
        )}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <select 
            onChange={(e) => {
              if (e.target.value === '__blank__') {
                onBlankProject && onBlankProject();
              } else if (e.target.value) {
                onLoadTemplate(e.target.value);
              }
              e.target.value = '';
            }}
            defaultValue=""
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-medium)',
              borderRadius: '8px',
              padding: '0.45rem 0.8rem',
              fontSize: '0.8rem',
              outline: 'none',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            <option value="" disabled style={{ background: '#111827' }}>Chọn mẫu dự án...</option>
            <option value="__blank__" style={{ background: '#1e293b', fontWeight: '600', color: 'var(--accent-cyan)' }}>
              Tạo mô hình mới (Trống)
            </option>

            {customKeys.length > 0 && (
              <optgroup label="Mẫu cá nhân đã lưu" style={{ background: '#0f172a' }}>
                {customKeys.map(k => (
                  <option key={k} value={k} style={{ background: '#1e293b' }}>
                    {customTemplates[k].title}
                  </option>
                ))}
              </optgroup>
            )}

            <optgroup label="Mẫu tham khảo chuẩn" style={{ background: '#0f172a' }}>
              {builtInKeys.map(k => (
                <option key={k} value={k} style={{ background: '#1e293b' }}>
                  {builtInTemplates[k].title}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <button 
          onClick={onOpenImport}
          className="btn btn-secondary"
          style={{ 
            padding: '0.45rem 0.85rem', 
            fontSize: '0.8rem',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-medium)',
            color: '#ffffff'
          }}
          title="Tải lên tệp Excel, CSV hoặc JSON để phân tích cá nhân hóa"
        >
          <FontAwesomeIcon icon={faCloudArrowUp} style={{ fontSize: '13px', color: 'var(--accent-cyan)' }} /> Nhập Tệp
        </button>

        <button 
          onClick={onNewProject}
          className="btn btn-secondary"
          style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
          title="Khởi tạo lại dự án mẫu mặc định"
        >
          <FontAwesomeIcon icon={faArrowsRotate} style={{ fontSize: '12px' }} /> Khởi Tạo Lại
        </button>

        <button 
          onClick={onExportExcel}
          disabled={isExportingExcel || missingComparisonCount > 0 || invalidComparisonCount > 0}
          className="btn btn-primary"
          style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)' }}
          title={missingComparisonCount > 0 || invalidComparisonCount > 0 ? `Còn ${missingComparisonCount} cặp chưa trả lời và ${invalidComparisonCount} lỗi ma trận.` : 'Tải xuống báo cáo Excel đầy đủ'}
        >
          <FontAwesomeIcon icon={faFileExcel} style={{ fontSize: '13px' }} /> {isExportingExcel ? 'Đang xuất...' : 'Xuất Excel'}
        </button>

        <button 
          onClick={onExportJSON}
          className="btn btn-secondary"
          style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}
          title="Sao lưu dữ liệu dự án JSON, kể cả khi chưa hoàn thành các cặp so sánh"
        >
          <FontAwesomeIcon icon={faDownload} style={{ fontSize: '12px' }} /> Sao lưu JSON
        </button>
      </div>
    </header>
  );
}
