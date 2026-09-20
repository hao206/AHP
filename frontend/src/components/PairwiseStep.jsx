import React, { useState, useEffect } from 'react';
import { 
  Sliders, Grid, AlertTriangle, CheckCircle2, ArrowRight, 
  ArrowLeft, BarChart2, Scale, Info, Check, RefreshCw
} from 'lucide-react';
import { 
  evaluateMatrixAPI, benchmarkMethodsAPI, completeMissingAPI, 
  autoTuneConsistencyAPI, SAATY_SCALE_LABELS 
} from '../utils/ahpClient';

export default function PairwiseStep({ project, setProject, onProceed, onBack }) {
  const [activeScope, setActiveScope] = useState('criteria');
  const [viewMode, setViewMode] = useState('sliders'); // 'sliders' | 'matrix'
  const [evalResult, setEvalResult] = useState(null);
  const [benchmarkResult, setBenchmarkResult] = useState(null);
  const [showBenchmarkModal, setShowBenchmarkModal] = useState(false);
  const [isAutoTuning, setIsAutoTuning] = useState(false);
  const [tuneMessage, setTuneMessage] = useState(null);

  const isCriteria = activeScope === 'criteria';
  const elements = isCriteria ? project.criteria : project.alternatives;
  const currentMatrix = isCriteria 
    ? project.criteria_matrix 
    : (project.alt_matrices[activeScope] || []);

  useEffect(() => {
    if (elements.length > 0 && currentMatrix.length === elements.length) {
      evaluateMatrixAPI(elements, currentMatrix).then(res => {
        setEvalResult(res);
      });
      benchmarkMethodsAPI(elements, currentMatrix).then(bench => {
        setBenchmarkResult(bench);
      });
    }
  }, [activeScope, currentMatrix, elements]);

  const setComparison = (i, j, value) => {
    const newMatrix = currentMatrix.map((row, rIdx) => 
      row.map((cell, cIdx) => {
        if (rIdx === i && cIdx === j) return value;
        if (rIdx === j && cIdx === i) return 1.0 / value;
        if (rIdx === cIdx) return 1.0;
        return cell;
      })
    );

    if (isCriteria) {
      setProject({ ...project, criteria_matrix: newMatrix });
    } else {
      setProject({
        ...project,
        alt_matrices: {
          ...project.alt_matrices,
          [activeScope]: newMatrix
        }
      });
    }
  };

  const valueToSliderStep = (val) => {
    if (Math.abs(val - 1.0) < 1e-3) return 0;
    if (val > 1.0) {
      return -(Math.round(val) - 1);
    } else {
      const recip = Math.round(1.0 / val);
      return recip - 1;
    }
  };

  const sliderStepToValue = (step) => {
    const numStep = parseInt(step, 10);
    if (numStep === 0) return 1.0;
    if (numStep < 0) {
      return Math.abs(numStep) + 1.0;
    } else {
      return 1.0 / (numStep + 1.0);
    }
  };

  const applyDoctorSuggestion = (diag) => {
    setComparison(diag.i, diag.j, diag.suggested_value);
  };

  const handleAutoCompleteMissing = async () => {
    const res = await completeMissingAPI(elements, currentMatrix);
    if (res?.completed_matrix) {
      if (isCriteria) {
        setProject({ ...project, criteria_matrix: res.completed_matrix });
      } else {
        setProject({
          ...project,
          alt_matrices: {
            ...project.alt_matrices,
            [activeScope]: res.completed_matrix
          }
        });
      }
    }
  };

  const handleAutoTune = async () => {
    setIsAutoTuning(true);
    setTuneMessage(null);
    try {
      const res = await autoTuneConsistencyAPI(elements, currentMatrix, 0.10);
      if (res?.optimized_matrix) {
        if (isCriteria) {
          setProject({ ...project, criteria_matrix: res.optimized_matrix });
        } else {
          setProject({
            ...project,
            alt_matrices: {
              ...project.alt_matrices,
              [activeScope]: res.optimized_matrix
            }
          });
        }
        if (res.is_improved) {
          setTuneMessage(`Đã tối ưu hóa tính nhất quán từ CR ${(res.initial_cr * 100).toFixed(1)}% xuống ${(res.optimized_cr * 100).toFixed(1)}% (${res.adjusted_pairs.length} điều chỉnh)!`);
        } else {
          setTuneMessage(`Ma trận đã đạt mức tối ưu nhất quán (CR = ${(res.optimized_cr * 100).toFixed(1)}%).`);
        }
        setTimeout(() => setTuneMessage(null), 6000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAutoTuning(false);
    }
  };

  const pairs = [];
  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      pairs.push({ i, j, a: elements[i], b: elements[j] });
    }
  }

  const cr = evalResult ? evalResult.consistency_ratio : 0;
  const isConsistent = evalResult ? evalResult.is_consistent : true;

  return (
    <div className="animate-fade-in" style={{ padding: '0 1.5rem 2rem 1.5rem' }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Scope Selector & Control Bar */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Top Row: Title + View Mode & Analytical Tools */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.8rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.85rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
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
                  BƯỚC 02 / 05
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ma Trận Tương Hỗ & Thước Đo Tỷ Số Nhất Quán (CR)</span>
              </div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: '800', color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
                Bước 2: Đánh Giá So Sánh Cặp
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowBenchmarkModal(!showBenchmarkModal)}
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
                title="Đối sánh EVM, GMM và Chuẩn hóa số học (Thuật toán Voracious)"
              >
                <BarChart2 size={13} /> Đối Sánh Phương Pháp
              </button>

              <button
                onClick={handleAutoCompleteMissing}
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
                title="Ước lượng ô khuyết bằng tối ưu hóa Log-Least Squares (AHPy)"
              >
                <Sliders size={13} color="var(--accent-cyan)" /> Tự Động Điền Khuyết
              </button>

              <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.4)', padding: '0.2rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <button
                  onClick={() => setViewMode('sliders')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    border: 'none',
                    cursor: 'pointer',
                    background: viewMode === 'sliders' ? 'var(--accent-primary)' : 'transparent',
                    color: viewMode === 'sliders' ? '#ffffff' : 'var(--text-muted)'
                  }}
                >
                  <Sliders size={13} /> Thanh Trượt 9-1-9
                </button>
                <button
                  onClick={() => setViewMode('matrix')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    border: 'none',
                    cursor: 'pointer',
                    background: viewMode === 'matrix' ? 'var(--accent-primary)' : 'transparent',
                    color: viewMode === 'matrix' ? '#ffffff' : 'var(--text-muted)'
                  }}
                >
                  <Grid size={13} /> Ma Trận Tương Hỗ
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Row: Scope Switcher (Criteria vs Alternatives by Criterion) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
              Đối tượng đánh giá:
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', flex: 1 }}>
              <button
                onClick={() => setActiveScope('criteria')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  border: '1px solid ' + (isCriteria ? 'var(--accent-primary)' : 'var(--border-subtle)'),
                  background: isCriteria ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.35) 0%, rgba(99, 102, 241, 0.2) 100%)' : 'rgba(255, 255, 255, 0.03)',
                  color: isCriteria ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: isCriteria ? '0 2px 8px rgba(79, 70, 229, 0.25)' : 'none'
                }}
              >
                <Scale size={15} color={isCriteria ? 'var(--accent-cyan)' : 'currentColor'} />
                So Sánh Các Tiêu Chí (với Mục tiêu)
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: !isCriteria ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255, 255, 255, 0.02)', padding: '0.35rem 0.6rem', borderRadius: '8px', border: '1px solid ' + (!isCriteria ? 'var(--accent-cyan)' : 'var(--border-subtle)') }}>
                <span style={{ color: !isCriteria ? 'var(--accent-cyan)' : 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600' }}>
                  So Sánh Phương Án theo:
                </span>
                <select
                  value={isCriteria ? '' : activeScope}
                  onChange={(e) => setActiveScope(e.target.value)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    background: '#0f172a',
                    border: '1px solid var(--border-medium)',
                    color: '#ffffff',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {isCriteria && <option value="" disabled>-- Chọn một tiêu chí cụ thể --</option>}
                  {project.criteria.map((c, idx) => (
                    <option key={idx} value={c}>
                      Tiêu chí: {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

        </div>

        {/* Step 2 Introduction & Guidance Card */}
        <div className="glass-panel" style={{ padding: '1rem 1.4rem', background: 'rgba(15, 23, 42, 0.55)', border: '1px solid rgba(6, 182, 212, 0.25)', display: 'flex', gap: '0.9rem', alignItems: 'flex-start' }}>
          <Info size={18} color="var(--accent-cyan)" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
          <div style={{ fontSize: '0.82rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
            <strong style={{ color: '#ffffff' }}>Giới thiệu Bước 2 (So sánh cặp & Kiểm định tính nhất quán):</strong> Bạn sử dụng thang điểm chuẩn Saaty từ 
            <span style={{ color: 'var(--accent-cyan)', fontWeight: '600' }}> 1 (Quan trọng như nhau)</span> đến 
            <span style={{ color: '#f59e0b', fontWeight: '600' }}> 9 (Cực kỳ quan trọng / Tuyệt đối)</span> để đánh giá từng cặp yếu tố.
            Hệ thống tự động tính toán <strong style={{ color: '#10b981' }}>Tỷ số Nhất quán (CR)</strong>. 
            Kết quả đạt chuẩn khoa học khi <span style={{ color: '#10b981', fontWeight: '700' }}>CR ≤ 10% (0.10)</span>. Nếu vượt ngưỡng, bạn có thể dùng công cụ <em>"Bác sĩ Nhất quán"</em> hoặc <em>"Tự động điền khuyết"</em> để tinh chỉnh các phán đoán mâu thuẫn.
          </div>
        </div>

        {/* Method Benchmark Drawer */}
        {showBenchmarkModal && benchmarkResult && (
          <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart2 size={18} color="var(--accent-cyan)" />
                <h4 style={{ fontSize: '1rem', fontWeight: '700' }}>Đối Sánh Đa Phương Pháp (Voracious-AHP Engine)</h4>
              </div>
              <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', fontWeight: '700' }}>
                Độ vững chắc: {benchmarkResult.robustness === 'High Robustness' ? 'Độ Tin Cậy Cao' : benchmarkResult.robustness} (Sai lệch lớn nhất: {benchmarkResult.max_discrepancy})
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Kiểm tra đối sánh chéo giữa Phương pháp Véc-tơ riêng (EVM), Trung bình nhân (GMM) và Chuẩn hóa Cột số học.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table className="matrix-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Yếu tố</th>
                    <th>Véc-tơ riêng (EVM)</th>
                    <th>Trung bình nhân (GMM)</th>
                    <th>Chuẩn hóa Số học</th>
                    <th>Sai lệch (|EVM - GMM|)</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarkResult.comparison.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: 'left', fontWeight: '600', color: '#fff' }}>{row.element}</td>
                      <td style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>{row.evm_pct}% ({row.evm_weight})</td>
                      <td style={{ color: '#a78bfa' }}>{row.gmm_pct}% ({row.gmm_weight})</td>
                      <td style={{ color: '#94a3b8' }}>{row.arith_pct}% ({row.arith_weight})</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {Math.abs(row.evm_weight - row.gmm_weight).toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Consistency Ratio (CR) Banner & Inconsistency Doctor */}
        <div className="glass-panel" style={{ 
          padding: '1.25rem 1.5rem',
          borderLeft: `5px solid ${isConsistent ? 'var(--success)' : 'var(--danger)'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: isConsistent ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {isConsistent ? (
              <CheckCircle2 size={32} color="var(--success)" />
            ) : (
              <AlertTriangle size={32} color="var(--danger)" />
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: '700', fontSize: '1.05rem' }}>
                  Tỷ Số Nhất Quán (CR Saaty): {(cr * 100).toFixed(1)}% ({cr})
                </span>
                {evalResult?.cr_alonso !== undefined && (
                  <span style={{ 
                    fontSize: '0.8rem', 
                    color: 'var(--text-muted)', 
                    background: 'rgba(255,255,255,0.06)', 
                    padding: '0.15rem 0.5rem', 
                    borderRadius: '4px' 
                  }} title="Chỉ số nhất quán xấp xỉ tuyến tính Alonso & Lamata (2006) từ AHP-OS">
                    CR Alonso: {(evalResult.cr_alonso * 100).toFixed(1)}%
                  </span>
                )}
                <span style={{
                  padding: '0.15rem 0.55rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  background: isConsistent ? 'var(--success-bg)' : 'var(--danger-bg)',
                  color: isConsistent ? 'var(--success)' : 'var(--danger)',
                  border: `1px solid ${isConsistent ? 'var(--success-border)' : 'var(--danger-border)'}`
                }}>
                  {isConsistent ? 'HỢP LỆ (CR < 10%)' : 'MÂU THUẪN (CR ≥ 10%)'}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem', marginBottom: 0 }}>
                {isConsistent 
                  ? 'Các đánh giá thỏa mãn tính bắc cầu logic và giới hạn nhất quán kinh điển của GS. Thomas Saaty.'
                  : 'Phát hiện mâu thuẫn đánh giá. Bấm "Tối Ưu Hóa (Voracious-AHP)" hoặc áp dụng gợi ý của Bác sĩ Nhất quán.'
                }
              </p>
              {tuneMessage && (
                <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--accent-cyan)', fontWeight: '600' }}>
                  ✓ {tuneMessage}
                </div>
              )}
            </div>
          </div>

          {/* Quick Doctor & Auto-Tune Tools */}
          {!isConsistent && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.8rem'
            }}>
              {evalResult?.inconsistency_diagnosis?.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Info size={13} /> GỢI Ý HIỆU CHỈNH TÍNH NHẤT QUÁN
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#ffffff', marginTop: '0.1rem' }}>
                    Cặp so sánh lệch nhất: <strong>[{evalResult.inconsistency_diagnosis[0].element_a}]</strong> vs <strong>[{evalResult.inconsistency_diagnosis[0].element_b}]</strong>
                  </div>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {evalResult?.inconsistency_diagnosis?.length > 0 && (
                  <button
                    onClick={() => applyDoctorSuggestion(evalResult.inconsistency_diagnosis[0])}
                    className="btn btn-secondary"
                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                    title="Hiệu chỉnh giá trị của cặp này về mức tối ưu"
                  >
                    Sửa cặp này ({evalResult.inconsistency_diagnosis[0].suggested_value >= 1 ? evalResult.inconsistency_diagnosis[0].suggested_value : `1/${Math.round(1/evalResult.inconsistency_diagnosis[0].suggested_value)}`})
                  </button>
                )}

                <button
                  onClick={handleAutoTune}
                  disabled={isAutoTuning}
                  className="btn btn-primary"
                  style={{
                    padding: '0.45rem 0.9rem',
                    fontSize: '0.78rem',
                    whiteSpace: 'nowrap',
                    background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                  title="Tự động tìm kiếm và tối ưu hóa ma trận đưa CR về <= 10% (Thuật toán Voracious-AHP)"
                >
                  <RefreshCw size={13} className={isAutoTuning ? 'spinning' : ''} />
                  Tối Ưu Hóa Nhất Quán (CR ≤ 10%)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sliders View Mode with 1-Click Quick Scale Buttons */}
        {viewMode === 'sliders' && (
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sliders size={18} color="var(--accent-cyan)" />
                Thanh Trượt Đánh Giá So Sánh Cặp (Thang Đo Saaty 9-1-9)
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Mẹo: Kéo thanh trượt hoặc bấm chọn trực tiếp các nút thang đo nhanh bên dưới
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
              {pairs.map((pair, pIdx) => {
                const val = currentMatrix[pair.i][pair.j];
                const sliderVal = valueToSliderStep(val);
                const isLeftPreferred = sliderVal < 0;
                const isRightPreferred = sliderVal > 0;
                const isEqual = sliderVal === 0;

                let verbalText = '';
                const absScale = Math.abs(sliderVal) + 1;
                if (isEqual) verbalText = 'Quan trọng như nhau (1 : 1)';
                else if (isLeftPreferred) verbalText = `"${pair.a}" ${SAATY_SCALE_LABELS[absScale]} so với "${pair.b}"`;
                else verbalText = `"${pair.b}" ${SAATY_SCALE_LABELS[absScale]} so với "${pair.a}"`;

                return (
                  <div 
                    key={pIdx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '12px',
                      padding: '1.2rem 1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                  >
                    {/* Header between Element A and Element B */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ 
                          fontWeight: '700', 
                          fontSize: '0.95rem',
                          color: isLeftPreferred ? 'var(--accent-cyan)' : 'var(--text-primary)',
                          transition: 'color 0.2s'
                        }}>
                          {pair.a}
                        </span>
                        {isLeftPreferred && (
                          <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-cyan)', fontWeight: '700', border: '1px solid var(--accent-cyan)' }}>
                            Ưu thế ×{absScale}
                          </span>
                        )}
                      </div>
                      
                      <span style={{ 
                        fontSize: '0.8rem', 
                        padding: '0.25rem 0.85rem', 
                        borderRadius: '20px', 
                        background: isEqual ? 'rgba(255, 255, 255, 0.05)' : (isLeftPreferred ? 'rgba(6, 182, 212, 0.15)' : 'rgba(99, 102, 241, 0.15)'),
                        color: isEqual ? 'var(--text-muted)' : (isLeftPreferred ? '#67e8f9' : '#a5b4fc'),
                        fontWeight: '600',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                      }}>
                        {verbalText}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isRightPreferred && (
                          <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', fontWeight: '700', border: '1px solid rgba(99, 102, 241, 0.5)' }}>
                            Ưu thế ×{absScale}
                          </span>
                        )}
                        <span style={{ 
                          fontWeight: '700', 
                          fontSize: '0.95rem',
                          color: isRightPreferred ? 'var(--accent-cyan)' : 'var(--text-primary)',
                          transition: 'color 0.2s'
                        }}>
                          {pair.b}
                        </span>
                      </div>
                    </div>

                    {/* Visual Slider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.4rem 0' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: '700', 
                        color: isLeftPreferred ? 'var(--accent-cyan)' : '#64748b',
                        background: isLeftPreferred ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '6px',
                        border: isLeftPreferred ? '1px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.06)',
                        whiteSpace: 'nowrap'
                      }}>
                        ← Cực đại 9
                      </span>

                      <input
                        type="range"
                        min="-8"
                        max="8"
                        step="1"
                        value={sliderVal}
                        onChange={(e) => {
                          const newVal = sliderStepToValue(e.target.value);
                          setComparison(pair.i, pair.j, newVal);
                        }}
                        className="slider-expert"
                      />

                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: '700', 
                        color: isRightPreferred ? 'var(--accent-cyan)' : '#64748b',
                        background: isRightPreferred ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '6px',
                        border: isRightPreferred ? '1px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.06)',
                        whiteSpace: 'nowrap'
                      }}>
                        Cực đại 9 →
                      </span>
                    </div>

                    {/* 1-Click Quick Scale Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem', paddingTop: '0.2rem' }}>
                      {/* Left element buttons */}
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button onClick={() => setComparison(pair.i, pair.j, 9)} className={`scale-pill ${sliderVal === -8 ? 'active' : ''}`} title={`Ưu tiên Tuyệt đối (9) cho "${pair.a}"`}>
                          ← 9
                        </button>
                        <button onClick={() => setComparison(pair.i, pair.j, 7)} className={`scale-pill ${sliderVal === -6 ? 'active' : ''}`} title={`Rất quan trọng (7) cho "${pair.a}"`}>
                          7
                        </button>
                        <button onClick={() => setComparison(pair.i, pair.j, 5)} className={`scale-pill ${sliderVal === -4 ? 'active' : ''}`} title={`Quan trọng nhiều (5) cho "${pair.a}"`}>
                          5
                        </button>
                        <button onClick={() => setComparison(pair.i, pair.j, 3)} className={`scale-pill ${sliderVal === -2 ? 'active' : ''}`} title={`Hơi quan trọng (3) cho "${pair.a}"`}>
                          3
                        </button>
                      </div>

                      {/* Center Equal button */}
                      <button onClick={() => setComparison(pair.i, pair.j, 1)} className={`scale-pill ${sliderVal === 0 ? 'active' : ''}`} style={{ padding: '0.25rem 0.85rem', fontWeight: '700' }} title="Ngang nhau (1 : 1)">
                        Ngang nhau (1)
                      </button>

                      {/* Right element buttons */}
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button onClick={() => setComparison(pair.i, pair.j, 1/3)} className={`scale-pill ${sliderVal === 2 ? 'active' : ''}`} title={`Hơi quan trọng (3) cho "${pair.b}"`}>
                          3
                        </button>
                        <button onClick={() => setComparison(pair.i, pair.j, 1/5)} className={`scale-pill ${sliderVal === 4 ? 'active' : ''}`} title={`Quan trọng nhiều (5) cho "${pair.b}"`}>
                          5
                        </button>
                        <button onClick={() => setComparison(pair.i, pair.j, 1/7)} className={`scale-pill ${sliderVal === 6 ? 'active' : ''}`} title={`Rất quan trọng (7) cho "${pair.b}"`}>
                          7
                        </button>
                        <button onClick={() => setComparison(pair.i, pair.j, 1/9)} className={`scale-pill ${sliderVal === 8 ? 'active' : ''}`} title={`Ưu tiên Tuyệt đối (9) cho "${pair.b}"`}>
                          9 →
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Matrix View Mode */}
        {viewMode === 'matrix' && (
          <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Grid size={18} color="var(--accent-cyan)" />
              Ma Trận Tương Hỗ Saaty (A_ij * A_ji = 1)
            </h3>

            <table className="matrix-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Tiêu chí / Phương án</th>
                  {elements.map((el, idx) => (
                    <th key={idx}>{el}</th>
                  ))}
                  <th style={{ background: 'rgba(79, 70, 229, 0.25)', color: '#a5b4fc' }}>Trọng số (w)</th>
                </tr>
              </thead>
              <tbody>
                {elements.map((rowEl, i) => (
                  <tr key={i}>
                    <td style={{ textAlign: 'left', fontWeight: '600', color: '#ffffff', background: 'rgba(15, 23, 42, 0.6)' }}>
                      {rowEl}
                    </td>
                    {elements.map((colEl, j) => {
                      const val = currentMatrix[i][j];
                      const isDiagonal = i === j;
                      const isUpper = i < j;

                      if (isDiagonal) return <td key={j} className="diagonal">1</td>;

                      if (isUpper) {
                        return (
                          <td key={j} className="upper-cell">
                            <select
                              value={
                                Math.abs(val - 1) < 1e-3 ? '1' :
                                val >= 1 ? (Math.abs(val - Math.round(val)) < 1e-3 ? `${Math.round(val)}` : `${val.toFixed(2)}`) :
                                (Math.abs(1/val - Math.round(1/val)) < 1e-3 ? `1/${Math.round(1/val)}` : `${val.toFixed(2)}`)
                              }
                              onChange={(e) => {
                                const raw = e.target.value;
                                let num = 1.0;
                                if (raw.startsWith('1/')) {
                                  num = 1.0 / parseFloat(raw.replace('1/', ''));
                                } else {
                                  num = parseFloat(raw);
                                }
                                setComparison(i, j, num);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ffffff',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: '600',
                                outline: 'none',
                                cursor: 'pointer',
                                width: '100%',
                                textAlign: 'center'
                              }}
                            >
                              <option value="9" style={{ background: '#111827' }}>9</option>
                              <option value="8" style={{ background: '#111827' }}>8</option>
                              <option value="7" style={{ background: '#111827' }}>7</option>
                              <option value="6" style={{ background: '#111827' }}>6</option>
                              <option value="5" style={{ background: '#111827' }}>5</option>
                              <option value="4" style={{ background: '#111827' }}>4</option>
                              <option value="3" style={{ background: '#111827' }}>3</option>
                              <option value="2" style={{ background: '#111827' }}>2</option>
                              <option value="1" style={{ background: '#111827' }}>1</option>
                              <option value="1/2" style={{ background: '#111827' }}>1/2</option>
                              <option value="1/3" style={{ background: '#111827' }}>1/3</option>
                              <option value="1/4" style={{ background: '#111827' }}>1/4</option>
                              <option value="1/5" style={{ background: '#111827' }}>1/5</option>
                              <option value="1/6" style={{ background: '#111827' }}>1/6</option>
                              <option value="1/7" style={{ background: '#111827' }}>1/7</option>
                              <option value="1/8" style={{ background: '#111827' }}>1/8</option>
                              <option value="1/9" style={{ background: '#111827' }}>1/9</option>
                              {val && !['9','8','7','6','5','4','3','2','1','1/2','1/3','1/4','1/5','1/6','1/7','1/8','1/9'].includes(val >= 1 ? `${Math.round(val)}` : `1/${Math.round(1/val)}`) && (
                                <option value={val.toFixed(2)} style={{ background: '#111827' }}>{val.toFixed(2)}</option>
                              )}
                            </select>
                          </td>
                        );
                      }

                      return (
                        <td key={j} className="lower-cell">
                          {val >= 1 ? (Math.abs(val - Math.round(val)) < 1e-3 ? Math.round(val) : val.toFixed(2)) : `1/${Math.round(1/val)}`}
                        </td>
                      );
                    })}
                    <td style={{ fontWeight: '700', color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.1)' }}>
                      <div>
                        {evalResult?.weights_list?.[i] ? (evalResult.weights_list[i] * 100).toFixed(1) + '%' : '-'}
                      </div>
                      {evalResult?.weight_uncertainties?.[i] > 0 && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'normal', marginTop: '0.15rem' }} title="Khoảng tin cậy sai số trọng số theo công thức Klaus Goepel (AHP-OS)">
                          ±{(evalResult.weight_uncertainties[i] * 100).toFixed(1)}% (σ)
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Navigation Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            onClick={onBack}
            className="btn btn-secondary"
            style={{ padding: '0.75rem 1.4rem' }}
          >
            <ArrowLeft size={16} /> Quay lại Bước 1
          </button>

          <button 
            onClick={onProceed}
            className="btn btn-primary"
            style={{ padding: '0.75rem 1.8rem', fontSize: '0.95rem' }}
          >
            Chuyển sang Bước 3: Tổng Hợp & Biểu Đồ Radar <ArrowRight size={18} />
          </button>
        </div>

      </div>
    </div>
  );
}
