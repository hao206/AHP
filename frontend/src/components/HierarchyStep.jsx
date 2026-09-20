import React, { useState } from 'react';
import { 
  Target, Layers, Award, Plus, Trash2, ArrowRight, GitBranch, 
  Edit2, Check, X, BookmarkPlus, FileText, ListPlus, RefreshCw, Info
} from 'lucide-react';

export default function HierarchyStep({ 
  project, 
  setProject, 
  onProceed, 
  onSaveCustomTemplate,
  onBlankProject 
}) {
  const [newCrit, setNewCrit] = useState('');
  const [newAlt, setNewAlt] = useState('');

  // Inline editing state
  const [editingCritIdx, setEditingCritIdx] = useState(null);
  const [editingCritText, setEditingCritText] = useState('');
  const [editingAltIdx, setEditingAltIdx] = useState(null);
  const [editingAltText, setEditingAltText] = useState('');

  // Bulk input state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkGoal, setBulkGoal] = useState(project.goal || '');
  const [bulkCritText, setBulkCritText] = useState(project.criteria.join('\n'));
  const [bulkAltText, setBulkAltText] = useState(project.alternatives.join('\n'));

  // Save template state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [customTemplateName, setCustomTemplateName] = useState(project.title || '');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Add Criterion
  const handleAddCriterion = (e) => {
    e?.preventDefault();
    if (!newCrit.trim() || project.criteria.includes(newCrit.trim())) return;
    const name = newCrit.trim();
    const updatedCrit = [...project.criteria, name];
    const n = updatedCrit.length;
    
    const newCritMatrix = Array(n).fill(0).map((_, i) => 
      Array(n).fill(0).map((_, j) => {
        if (i === j) return 1.0;
        if (i < n - 1 && j < n - 1) return project.criteria_matrix[i][j];
        return 1.0;
      })
    );

    const altN = project.alternatives.length;
    const newAltMatrix = Array(altN).fill(0).map((_, i) => 
      Array(altN).fill(0).map((_, j) => (i === j ? 1.0 : 1.0))
    );

    setProject({
      ...project,
      criteria: updatedCrit,
      criteria_matrix: newCritMatrix,
      alt_matrices: {
        ...project.alt_matrices,
        [name]: newAltMatrix
      }
    });
    setNewCrit('');
  };

  // Remove Criterion
  const handleRemoveCriterion = (index) => {
    if (project.criteria.length <= 2) {
      alert('Mô hình AHP yêu cầu tối thiểu 2 tiêu chí để so sánh cặp.');
      return;
    }
    const removedName = project.criteria[index];
    const updatedCrit = project.criteria.filter((_, i) => i !== index);
    
    const newCritMatrix = project.criteria_matrix
      .filter((_, i) => i !== index)
      .map(row => row.filter((_, j) => j !== index));

    const newAltMatrices = { ...project.alt_matrices };
    delete newAltMatrices[removedName];

    setProject({
      ...project,
      criteria: updatedCrit,
      criteria_matrix: newCritMatrix,
      alt_matrices: newAltMatrices
    });
  };

  // Rename Criterion In-Place
  const handleSaveRenameCrit = (index) => {
    const trimmed = editingCritText.trim();
    if (!trimmed || (trimmed !== project.criteria[index] && project.criteria.includes(trimmed))) {
      setEditingCritIdx(null);
      return;
    }
    const oldName = project.criteria[index];
    const updatedCrit = [...project.criteria];
    updatedCrit[index] = trimmed;

    const newAltMatrices = {};
    for (const c of project.criteria) {
      if (c === oldName) {
        newAltMatrices[trimmed] = project.alt_matrices[oldName] || [];
      } else {
        newAltMatrices[c] = project.alt_matrices[c] || [];
      }
    }

    setProject({
      ...project,
      criteria: updatedCrit,
      alt_matrices: newAltMatrices
    });
    setEditingCritIdx(null);
  };

  // Add Alternative
  const handleAddAlternative = (e) => {
    e?.preventDefault();
    if (!newAlt.trim() || project.alternatives.includes(newAlt.trim())) return;
    const name = newAlt.trim();
    const updatedAlt = [...project.alternatives, name];
    const n = updatedAlt.length;

    const newAltMatrices = {};
    for (const c of project.criteria) {
      const oldMat = project.alt_matrices[c] || [];
      newAltMatrices[c] = Array(n).fill(0).map((_, i) => 
        Array(n).fill(0).map((_, j) => {
          if (i === j) return 1.0;
          if (i < n - 1 && j < n - 1 && oldMat[i] && oldMat[i][j]) return oldMat[i][j];
          return 1.0;
        })
      );
    }

    setProject({
      ...project,
      alternatives: updatedAlt,
      alt_matrices: newAltMatrices
    });
    setNewAlt('');
  };

  // Remove Alternative
  const handleRemoveAlternative = (index) => {
    if (project.alternatives.length <= 2) {
      alert('Mô hình AHP yêu cầu tối thiểu 2 phương án lựa chọn.');
      return;
    }
    const updatedAlt = project.alternatives.filter((_, i) => i !== index);
    const newAltMatrices = {};
    for (const c of project.criteria) {
      newAltMatrices[c] = (project.alt_matrices[c] || [])
        .filter((_, i) => i !== index)
        .map(row => row.filter((_, j) => j !== index));
    }

    setProject({
      ...project,
      alternatives: updatedAlt,
      alt_matrices: newAltMatrices
    });
  };

  // Rename Alternative In-Place
  const handleSaveRenameAlt = (index) => {
    const trimmed = editingAltText.trim();
    if (!trimmed || (trimmed !== project.alternatives[index] && project.alternatives.includes(trimmed))) {
      setEditingAltIdx(null);
      return;
    }
    const updatedAlt = [...project.alternatives];
    updatedAlt[index] = trimmed;
    setProject({
      ...project,
      alternatives: updatedAlt
    });
    setEditingAltIdx(null);
  };

  // Apply Bulk Setup
  const handleApplyBulk = () => {
    const rawCrit = bulkCritText
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    const uniqueCrit = Array.from(new Set(rawCrit));

    const rawAlt = bulkAltText
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    const uniqueAlt = Array.from(new Set(rawAlt));

    if (uniqueCrit.length < 2) {
      alert('Vui lòng nhập tối thiểu 2 tiêu chí.');
      return;
    }
    if (uniqueAlt.length < 2) {
      alert('Vui lòng nhập tối thiểu 2 phương án.');
      return;
    }

    const nCrit = uniqueCrit.length;
    const nAlt = uniqueAlt.length;

    const critMatrix = Array(nCrit).fill(0).map((_, i) => 
      Array(nCrit).fill(0).map((_, j) => (i === j ? 1.0 : 1.0))
    );

    const altMatrices = {};
    for (const c of uniqueCrit) {
      altMatrices[c] = Array(nAlt).fill(0).map((_, i) => 
        Array(nAlt).fill(0).map((_, j) => (i === j ? 1.0 : 1.0))
      );
    }

    setProject({
      ...project,
      title: bulkGoal ? `Dự án: ${bulkGoal}` : project.title,
      goal: bulkGoal || project.goal,
      criteria: uniqueCrit,
      alternatives: uniqueAlt,
      criteria_matrix: critMatrix,
      alt_matrices: altMatrices
    });

    setShowBulkModal(false);
  };

  // Handle Save Template
  const handleConfirmSaveTemplate = () => {
    if (!onSaveCustomTemplate) return;
    const name = customTemplateName.trim() || project.title || 'Mẫu Cá Nhân Mới';
    onSaveCustomTemplate(name);
    setSaveSuccessMsg(`✓ Đã lưu thành công mẫu "${name}" vào bộ nhớ của bạn!`);
    setTimeout(() => {
      setSaveSuccessMsg('');
      setShowSaveModal(false);
    }, 2000);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '0 1.5rem 2rem 1.5rem' }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Header Intro & Action Toolbar */}
        <div className="glass-panel" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(30, 41, 63, 0.5) 0%, rgba(15, 23, 42, 0.7) 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <span style={{ 
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(59, 130, 246, 0.25) 100%)',
                border: '1px solid rgba(6, 182, 212, 0.4)',
                color: 'var(--accent-cyan)',
                fontSize: '0.75rem',
                fontWeight: '800',
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                letterSpacing: '0.05em'
              }}>
                BƯỚC 01 / 05
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cấu Trúc Cây Thứ Bậc Quyết Định</span>
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: '800', color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
              Bước 1: Thiết Lập Mô Hình Thứ Bậc Quyết Định
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.35rem 0 0 0' }}>
              Tự do cá nhân hóa toàn bộ mô hình: <strong>Mục tiêu (Goal)</strong> → <strong>Tiêu chí (Criteria)</strong> → <strong>Phương án (Alternatives)</strong>.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setBulkGoal(project.goal);
                setBulkCritText(project.criteria.join('\n'));
                setBulkAltText(project.alternatives.join('\n'));
                setShowBulkModal(true);
              }}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
              title="Dán nhanh danh sách tiêu chí và phương án hàng loạt"
            >
              <ListPlus size={15} color="var(--accent-cyan)" /> Nhập Danh Sách Hàng Loạt
            </button>

            <button
              onClick={() => {
                setCustomTemplateName(project.title || '');
                setShowSaveModal(true);
              }}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
              title="Lưu cấu trúc hiện tại thành mẫu cá nhân của bạn"
            >
              <BookmarkPlus size={15} /> Lưu Mẫu Cá Nhân
            </button>

            <button
              onClick={onBlankProject}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}
              title="Tạo mô hình trống để thiết lập từ đầu"
            >
              <RefreshCw size={14} /> Tạo Mẫu Trống
            </button>
          </div>
        </div>

        {/* Step 1 Introduction & Guidance Card */}
        <div className="glass-panel" style={{ padding: '1rem 1.4rem', background: 'rgba(15, 23, 42, 0.55)', border: '1px solid rgba(6, 182, 212, 0.25)', display: 'flex', gap: '0.9rem', alignItems: 'flex-start' }}>
          <Info size={18} color="var(--accent-cyan)" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
          <div style={{ fontSize: '0.82rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
            <strong style={{ color: '#ffffff' }}>Giới thiệu Bước 1 (Mô hình Thứ bậc AHP):</strong> Phương pháp Phân tích Thứ bậc (AHP) phân rã bài toán quyết định phức tạp thành cấu trúc 3 tầng: 
            <span style={{ color: 'var(--accent-cyan)', fontWeight: '600' }}> Mục tiêu tối thượng (Goal)</span> → 
            <span style={{ color: '#38bdf8', fontWeight: '600' }}> Tiêu chí đánh giá (Criteria)</span> → 
            <span style={{ color: '#a78bfa', fontWeight: '600' }}> Các phương án khả thi (Alternatives)</span>. 
            Tại đây, bạn hãy xác định rõ bài toán, thêm/bớt các tiêu chí then chốt và danh sách các phương án đang cân nhắc (có thể nhập trực tiếp hoặc dán hàng loạt).
          </div>
        </div>

        {/* Modal: Save Custom Template */}
        {showSaveModal && (
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--accent-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookmarkPlus size={18} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Lưu Mô Hình Thành Mẫu Cá Nhân</h3>
              </div>
              <button onClick={() => setShowSaveModal(false)} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem' }}>
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Mẫu này sẽ được lưu trữ trực tiếp vào trình duyệt của bạn và xuất hiện trong mục <strong>"Mẫu cá nhân đã lưu"</strong> trên thanh điều hướng để tái sử dụng bất cứ lúc nào.
            </p>
            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={customTemplateName}
                onChange={(e) => setCustomTemplateName(e.target.value)}
                placeholder="Đặt tên cho mẫu của bạn (ví dụ: Tuyển dụng lập trình viên)..."
                style={{
                  flex: 1,
                  minWidth: '280px',
                  padding: '0.65rem 1rem',
                  borderRadius: '8px',
                  background: '#0f172a',
                  border: '1px solid var(--border-medium)',
                  color: '#fff',
                  fontSize: '0.9rem'
                }}
              />
              <button onClick={handleConfirmSaveTemplate} className="btn btn-primary" style={{ padding: '0.65rem 1.4rem' }}>
                Xác Nhận Lưu
              </button>
            </div>
            {saveSuccessMsg && (
              <div style={{ marginTop: '0.75rem', color: 'var(--success)', fontWeight: '600', fontSize: '0.85rem' }}>
                {saveSuccessMsg}
              </div>
            )}
          </div>
        )}

        {/* Modal: Bulk Fast Input */}
        {showBulkModal && (
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--accent-cyan)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={20} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Nhập Nhanh Danh Sách Tiêu Chí & Phương Án (Hàng Loạt)</h3>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem' }}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Dán trực tiếp danh sách các tiêu chí và phương án của bạn (mỗi dòng một mục hoặc phân cách bằng dấu phẩy). Hệ thống sẽ tự động cấu trúc hóa toàn bộ mô hình!
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.3rem', display: 'block' }}>
                  Mục tiêu quyết định (Goal):
                </label>
                <input
                  type="text"
                  value={bulkGoal}
                  onChange={(e) => setBulkGoal(e.target.value)}
                  placeholder="Nhập mục tiêu quyết định..."
                  style={{ width: '100%', padding: '0.6rem 0.9rem', borderRadius: '7px', background: '#0f172a', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#818cf8', marginBottom: '0.3rem', display: 'block' }}>
                    Danh sách Tiêu chí (mỗi dòng 1 tiêu chí):
                  </label>
                  <textarea
                    rows={6}
                    value={bulkCritText}
                    onChange={(e) => setBulkCritText(e.target.value)}
                    placeholder="Chi phí&#10;Chất lượng&#10;Thời gian giao hàng&#10;Uy tín nhà cung cấp"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: '#0f172a', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--accent-cyan)', marginBottom: '0.3rem', display: 'block' }}>
                    Danh sách Phương án (mỗi dòng 1 phương án):
                  </label>
                  <textarea
                    rows={6}
                    value={bulkAltText}
                    onChange={(e) => setBulkAltText(e.target.value)}
                    placeholder="Nhà cung cấp A&#10;Nhà cung cấp B&#10;Nhà cung cấp C"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: '#0f172a', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
                <button onClick={() => setShowBulkModal(false)} className="btn btn-secondary">
                  Hủy Bỏ
                </button>
                <button onClick={handleApplyBulk} className="btn btn-primary" style={{ padding: '0.6rem 1.4rem' }}>
                  <Check size={15} /> Áp Dụng Cấu Trúc
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Goal Input Card */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: '700', color: 'var(--accent-cyan)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Target size={18} /> Mục Tiêu Quyết Định Chính (Goal)
          </label>
          <input
            type="text"
            value={project.goal}
            onChange={(e) => setProject({ ...project, goal: e.target.value })}
            placeholder="Ví dụ: Chọn Nền tảng ERP Doanh nghiệp Tối ưu..."
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--border-color)',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: '600',
              outline: 'none'
            }}
          />
        </div>

        {/* Grid 2 Columns: Criteria vs Alternatives */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
          
          {/* Criteria Box */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={20} color="#818cf8" />
                <h3 style={{ fontSize: '1.1rem' }}>Tiêu Chí Đánh Giá ({project.criteria.length})</h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tối thiểu 2 tiêu chí</span>
            </div>

            <form onSubmit={handleAddCriterion} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="text"
                value={newCrit}
                onChange={(e) => setNewCrit(e.target.value)}
                placeholder="Nhập tên tiêu chí mới..."
                style={{
                  flex: 1,
                  padding: '0.55rem 0.85rem',
                  borderRadius: '7px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0.55rem 0.9rem' }}>
                <Plus size={16} /> Thêm
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
              {project.criteria.map((crit, idx) => {
                const isEditing = editingCritIdx === idx;

                return (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '8px',
                      background: isEditing ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: isEditing ? '1px solid var(--accent-primary)' : '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, marginRight: '0.5rem' }}>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
                        C{idx + 1}
                      </span>
                      
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingCritText}
                          onChange={(e) => setEditingCritText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRenameCrit(idx);
                            if (e.key === 'Escape') setEditingCritIdx(null);
                          }}
                          autoFocus
                          style={{
                            flex: 1,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '5px',
                            background: '#0f172a',
                            border: '1px solid var(--accent-cyan)',
                            color: '#ffffff',
                            fontSize: '0.85rem'
                          }}
                        />
                      ) : (
                        <span 
                          onDoubleClick={() => {
                            setEditingCritIdx(idx);
                            setEditingCritText(crit);
                          }}
                          title="Nhấp đúp để chỉnh sửa tên trực tiếp"
                          style={{ fontWeight: '500', fontSize: '0.9rem', cursor: 'pointer' }}
                        >
                          {crit}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSaveRenameCrit(idx)}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--success)' }}
                            title="Lưu tên mới"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setEditingCritIdx(null)}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            title="Hủy"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => {
                              setEditingCritIdx(idx);
                              setEditingCritText(crit);
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.45rem', borderRadius: '6px' }}
                            title="Đổi tên tiêu chí"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            onClick={() => handleRemoveCriterion(idx)}
                            className="btn btn-danger-ghost"
                            style={{ padding: '0.25rem 0.45rem', borderRadius: '6px' }}
                            title="Xóa tiêu chí"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alternatives Box */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={20} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '1.1rem' }}>Phương Án Lựa Chọn ({project.alternatives.length})</h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tối thiểu 2 phương án</span>
            </div>

            <form onSubmit={handleAddAlternative} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="text"
                value={newAlt}
                onChange={(e) => setNewAlt(e.target.value)}
                placeholder="Nhập tên phương án mới..."
                style={{
                  flex: 1,
                  padding: '0.55rem 0.85rem',
                  borderRadius: '7px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0.55rem 0.9rem' }}>
                <Plus size={16} /> Thêm
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
              {project.alternatives.map((alt, idx) => {
                const isEditing = editingAltIdx === idx;

                return (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '8px',
                      background: isEditing ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: isEditing ? '1px solid var(--accent-cyan)' : '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, marginRight: '0.5rem' }}>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-cyan)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
                        A{idx + 1}
                      </span>

                      {isEditing ? (
                        <input
                          type="text"
                          value={editingAltText}
                          onChange={(e) => setEditingAltText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRenameAlt(idx);
                            if (e.key === 'Escape') setEditingAltIdx(null);
                          }}
                          autoFocus
                          style={{
                            flex: 1,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '5px',
                            background: '#0f172a',
                            border: '1px solid var(--accent-cyan)',
                            color: '#ffffff',
                            fontSize: '0.85rem'
                          }}
                        />
                      ) : (
                        <span 
                          onDoubleClick={() => {
                            setEditingAltIdx(idx);
                            setEditingAltText(alt);
                          }}
                          title="Nhấp đúp để chỉnh sửa tên trực tiếp"
                          style={{ fontWeight: '500', fontSize: '0.9rem', cursor: 'pointer' }}
                        >
                          {alt}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSaveRenameAlt(idx)}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--success)' }}
                            title="Lưu tên mới"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setEditingAltIdx(null)}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            title="Hủy"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => {
                              setEditingAltIdx(idx);
                              setEditingAltText(alt);
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.45rem', borderRadius: '6px' }}
                            title="Đổi tên phương án"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            onClick={() => handleRemoveAlternative(idx)}
                            className="btn btn-danger-ghost"
                            style={{ padding: '0.25rem 0.45rem', borderRadius: '6px' }}
                            title="Xóa phương án"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Visual Hierarchy Tree Diagram */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <GitBranch size={17} color="var(--accent-cyan)" />
              SƠ ĐỒ PHÂN CẤP QUYẾT ĐỊNH THỨ BẬC (AHP HIERARCHY TREE)
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {project.criteria.length} Tiêu chí • {project.alternatives.length} Phương án
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', overflowX: 'auto', padding: '1rem 0' }}>
            
            {/* Level 1: Goal Box */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.4) 0%, rgba(79, 70, 229, 0.3) 100%)',
              border: '2px solid rgba(99, 102, 241, 0.6)',
              padding: '0.85rem 1.8rem',
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 8px 25px rgba(99, 102, 241, 0.3)',
              maxWidth: '520px',
              width: '90%',
              position: 'relative'
            }}>
              <div style={{ fontSize: '0.7rem', color: '#a5b4fc', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                TẦNG 1: MỤC TIÊU TỔNG QUÁT (GOAL)
              </div>
              <div style={{ fontWeight: '700', fontSize: '1.05rem', color: '#ffffff', marginTop: '0.3rem' }}>
                {project.goal || 'Chưa thiết lập mục tiêu'}
              </div>
            </div>

            {/* Tree Branch Connector 1: Goal to Criteria */}
            <div style={{ width: '100%', maxWidth: '850px', height: '36px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              <div style={{ width: '2px', height: '14px', background: 'rgba(99, 102, 241, 0.6)' }} />
              <div style={{ width: '85%', height: '2px', background: 'linear-gradient(90deg, transparent 0%, rgba(99, 102, 241, 0.6) 15%, rgba(99, 102, 241, 0.6) 85%, transparent 100%)' }} />
              <div style={{ width: '2px', height: '20px', background: 'rgba(99, 102, 241, 0.6)' }} />
            </div>

            {/* Level 2: Criteria Cluster */}
            <div style={{ width: '100%', maxWidth: '960px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: '#818cf8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '0.05em' }}>
                TẦNG 2: CÁC TIÊU CHÍ ĐÁNH GIÁ (CRITERIA)
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.8rem', width: '100%' }}>
                {project.criteria.map((crit, idx) => (
                  <div key={idx} style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(99, 102, 241, 0.35)',
                    padding: '0.65rem 1.1rem',
                    borderRadius: '9px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                  }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.15)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                      C{idx + 1}
                    </span>
                    <span>{crit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tree Branch Connector 2: Criteria to Alternatives */}
            <div style={{ width: '100%', maxWidth: '850px', height: '36px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              <div style={{ width: '2px', height: '14px', background: 'rgba(6, 182, 212, 0.5)' }} />
              <div style={{ width: '85%', height: '2px', background: 'linear-gradient(90deg, transparent 0%, rgba(6, 182, 212, 0.5) 15%, rgba(6, 182, 212, 0.5) 85%, transparent 100%)' }} />
              <div style={{ width: '2px', height: '20px', background: 'rgba(6, 182, 212, 0.5)' }} />
            </div>

            {/* Level 3: Alternatives Cluster */}
            <div style={{ width: '100%', maxWidth: '960px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '0.05em' }}>
                TẦNG 3: CÁC PHƯƠNG ÁN LỰA CHỌN (ALTERNATIVES)
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.8rem', width: '100%' }}>
                {project.alternatives.map((alt, idx) => (
                  <div key={idx} style={{
                    background: 'rgba(6, 182, 212, 0.12)',
                    border: '1px solid rgba(6, 182, 212, 0.45)',
                    padding: '0.65rem 1.15rem',
                    borderRadius: '9px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 15px rgba(6, 182, 212, 0.15)'
                  }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#fff', background: 'rgba(6, 182, 212, 0.5)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                      A{idx + 1}
                    </span>
                    <span>{alt}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Proceed Action */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={onProceed}
            className="btn btn-primary"
            style={{ padding: '0.75rem 1.8rem', fontSize: '0.95rem' }}
          >
            Chuyển sang Bước 2: Đánh Giá So Sánh Cặp <ArrowRight size={18} />
          </button>
        </div>

      </div>
    </div>
  );
}
