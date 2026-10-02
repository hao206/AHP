import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faComments, faScaleBalanced, faXmark, 
  faArrowsRotate, faUsers, faBolt, faBrain,
  faTriangleExclamation, faCircleCheck
} from '@fortawesome/free-solid-svg-icons';
import { suggestPersonasAPI, deliberateAIAPI } from '../utils/ahpClient';

export default function AIExpertPanelModal({ isOpen, onClose, goal, scope, elements, onApplyMatrix }) {
  const [personas, setPersonas] = useState([]);
  const [isDeliberating, setIsDeliberating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [numRounds, setNumRounds] = useState(2);
  const [activeTab, setActiveTab] = useState('dialogue'); // 'dialogue' | 'assessments' | 'matrix'

  useEffect(() => {
    if (isOpen && elements && elements.length >= 2) {
      setLoadingPersonas(true);
      setError(null);
      setResult(null);
      suggestPersonasAPI(goal, elements).then(suggested => {
        setPersonas(suggested.length > 0 ? suggested : [
          { id: 'cto', name: 'Giám đốc Công nghệ (CTO)', role: 'Technology & Architecture', perspective: 'Ưu tiên tính năng, độ ổn định và bảo mật.', avatar_color: '#3b82f6' },
          { id: 'cfo', name: 'Giám đốc Tài chính (CFO)', role: 'Financial ROI', perspective: 'Ưu tiên chi phí và thời gian hoàn vốn.', avatar_color: '#10b981' },
          { id: 'cro', name: 'Giám đốc Rủi ro (CRO)', role: 'Risk & Compliance', perspective: 'Ưu tiên SLA và giảm thiểu rủi ro gián đoạn.', avatar_color: '#f59e0b' }
        ]);
        setLoadingPersonas(false);
      }).catch(() => {
        setLoadingPersonas(false);
      });
    }
  }, [isOpen, goal, elements]);

  if (!isOpen) return null;

  const handleStartDeliberation = async () => {
    setIsDeliberating(true);
    setError(null);
    try {
      const res = await deliberateAIAPI({
        goal: goal || 'Mục tiêu quyết định',
        scope: scope || 'criteria',
        elements: elements,
        personas: personas,
        num_rounds: numRounds
      });
      setResult(res);
      setActiveTab('dialogue');
    } catch (err) {
      setError(err.message || 'Lỗi khi khởi chạy Hội đồng AI.');
    } finally {
      setIsDeliberating(false);
    }
  };

  const handleApply = () => {
    if (result?.consensus_matrix) {
      onApplyMatrix(result.consensus_matrix);
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(10, 15, 30, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1050,
      padding: '1.5rem'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '960px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '16px',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        overflow: 'hidden',
        background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.95) 100%)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)'
            }}>
              <FontAwesomeIcon icon={faBrain} style={{ color: '#fff', fontSize: '20px' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                Hội Đồng Chuyên Gia AI (AI Expert Panel)
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                LangGraph StateGraph • Pydantic/Instructor Schemas • NeMo Guardrails • AutoGen Debate Pattern
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '1.2rem',
              padding: '0.4rem',
              borderRadius: '6px'
            }}
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{
              padding: '0.9rem 1.2rem',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              marginBottom: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem'
            }}>
              <FontAwesomeIcon icon={faTriangleExclamation} />
              <span>{error}</span>
            </div>
          )}

          {/* Setup Section before deliberation */}
          {!result && (
            <div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '1.2rem',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '1.5rem'
              }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  <strong>Bài toán đánh giá:</strong> {goal || 'Mục tiêu chung'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <strong>Phạm vi so sánh ({scope === 'criteria' ? 'Tiêu chí' : `Phương án cho: ${scope}`}):</strong> {elements.join(' • ')}
                </div>
              </div>

              <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FontAwesomeIcon icon={faUsers} style={{ color: '#3b82f6' }} /> Hội Đồng Chuyên Gia Đánh Giá (Personas)
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {personas.map((persona, pIdx) => (
                  <div key={persona.id || pIdx} style={{
                    padding: '1rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${persona.avatar_color || '#3b82f6'}40`,
                    borderLeft: `4px solid ${persona.avatar_color || '#3b82f6'}`
                  }}>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                      {persona.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: persona.avatar_color || '#3b82f6', marginBottom: '0.4rem', fontWeight: 500 }}>
                      {persona.role}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {persona.perspective}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Số vòng phản biện (Debate rounds):</span>
                  <select 
                    value={numRounds} 
                    onChange={e => setNumRounds(Number(e.target.value))}
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#fff',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value={1}>1 Vòng (Nhanh)</option>
                    <option value={2}>2 Vòng (Khuyến nghị)</option>
                    <option value={3}>3 Vòng (Chuyên sâu)</option>
                  </select>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleStartDeliberation}
                  disabled={isDeliberating}
                  style={{
                    padding: '0.65rem 1.4rem',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 0 15px rgba(59, 130, 246, 0.4)'
                  }}
                >
                  <FontAwesomeIcon icon={isDeliberating ? faArrowsRotate : faBolt} spin={isDeliberating} />
                  {isDeliberating ? 'Đang Khởi Chạy LangGraph Panel...' : '🚀 Bắt Đầu Hội Đồng Tranh Biện'}
                </button>
              </div>
            </div>
          )}

          {/* Results Section */}
          {result && (
            <div>
              {/* Top Metrics Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.2rem' }}>
                <div style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                    Tỷ số Nhất quán Đồng thuận (CR)
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: result.evaluation?.is_consistent ? '#10b981' : '#ef4444' }}>
                    {(result.evaluation?.consistency_ratio * 100).toFixed(2)}%
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#10b981', marginTop: '0.2rem' }}>
                    {result.evaluation?.is_consistent ? '✓ Hợp lệ (CR < 10%)' : '⚠ Cần lưu ý'}
                  </div>
                </div>

                <div style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                    Độ Đồng Thuận Nhóm (Shannon S*)
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#3b82f6' }}>
                    {result.consensus_metric?.consensus_pct}%
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#60a5fa', marginTop: '0.2rem' }}>
                    {result.consensus_metric?.rating}
                  </div>
                </div>

                <div style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.3)'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                    Kiểm Định NeMo Guardrails
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#a78bfa' }}>
                    {result.guardrails_passed ? 'Passed (100%)' : 'Adjusted'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#c4b5fd', marginTop: '0.2rem' }}>
                    Tuân thủ Thang đo Saaty 1-9 & Bắc cầu
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div style={{ display: 'flex', gap: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '1.2rem' }}>
                <button
                  onClick={() => setActiveTab('dialogue')}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'dialogue' ? '2px solid #3b82f6' : '2px solid transparent',
                    color: activeTab === 'dialogue' ? '#3b82f6' : 'var(--text-secondary)',
                    padding: '0.6rem 1rem',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  <FontAwesomeIcon icon={faComments} style={{ marginRight: '0.4rem' }} /> Biên Bản Tranh Biện ({result.dialogue?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('assessments')}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'assessments' ? '2px solid #3b82f6' : '2px solid transparent',
                    color: activeTab === 'assessments' ? '#3b82f6' : 'var(--text-secondary)',
                    padding: '0.6rem 1rem',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  <FontAwesomeIcon icon={faUsers} style={{ marginRight: '0.4rem' }} /> Đánh Giá Độc Lập Chuyên Gia
                </button>
                <button
                  onClick={() => setActiveTab('matrix')}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'matrix' ? '2px solid #3b82f6' : '2px solid transparent',
                    color: activeTab === 'matrix' ? '#3b82f6' : 'var(--text-secondary)',
                    padding: '0.6rem 1rem',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  <FontAwesomeIcon icon={faScaleBalanced} style={{ marginRight: '0.4rem' }} /> Ma Trận Đồng Thuận Tổng Hợp
                </button>
              </div>

              {/* Tab 1: Dialogue */}
              {activeTab === 'dialogue' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {result.dialogue?.map((msg, mIdx) => (
                    <div key={mIdx} style={{
                      padding: '0.85rem 1.1rem',
                      borderRadius: '10px',
                      background: msg.counter_to ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                      border: msg.counter_to ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: msg.counter_to ? '#60a5fa' : '#34d399' }}>
                          {msg.speaker_name}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Vòng {msg.round} • Đối sánh: {msg.target_pair}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.45 }}>
                        {msg.argument}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 2: Individual Assessments */}
              {activeTab === 'assessments' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '350px', overflowY: 'auto' }}>
                  {result.individual_assessments?.map((item, idx) => (
                    <div key={idx} style={{
                      padding: '1rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                      <h5 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '0.9rem' }}>
                        {item.agent_name}
                      </h5>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>
                        {item.summary}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {item.judgments?.map((j, jIdx) => (
                          <div key={jIdx} style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem' }}>
                            <span style={{ color: '#60a5fa', minWidth: '160px' }}>• {j.element_a} vs {j.element_b}:</span>
                            <span style={{ color: '#e2e8f0' }}>{j.rationale}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 3: Consensus Matrix */}
              {activeTab === 'matrix' && (
                <div>
                  <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
                          <th style={{ padding: '0.6rem', border: '1px solid rgba(255,255,255,0.1)' }}>Phần tử</th>
                          {elements.map((el, idx) => (
                            <th key={idx} style={{ padding: '0.6rem', border: '1px solid rgba(255,255,255,0.1)' }}>{el}</th>
                          ))}
                          <th style={{ padding: '0.6rem', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(59,130,246,0.2)' }}>Trọng số (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.consensus_matrix?.map((row, rIdx) => (
                          <tr key={rIdx}>
                            <td style={{ padding: '0.6rem', fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
                              {elements[rIdx]}
                            </td>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} style={{
                                padding: '0.6rem',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: rIdx === cIdx ? 'var(--text-muted)' : '#60a5fa',
                                fontWeight: rIdx === cIdx ? 400 : 600
                              }}>
                                {cell >= 1 ? cell.toFixed(cell % 1 === 0 ? 0 : 2) : `1/${(1/cell).toFixed(0)}`}
                              </td>
                            ))}
                            <td style={{
                              padding: '0.6rem',
                              fontWeight: 700,
                              color: '#34d399',
                              border: '1px solid rgba(255,255,255,0.1)',
                              background: 'rgba(16,185,129,0.1)'
                            }}>
                              {(result.evaluation?.weights_list?.[rIdx] * 100 || 0).toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div>
            {result && (
              <button
                className="btn btn-secondary"
                onClick={() => setResult(null)}
                style={{ fontSize: '0.85rem' }}
              >
                <FontAwesomeIcon icon={faArrowsRotate} style={{ marginRight: '0.4rem' }} /> Cấu Hình Lại Hội Đồng
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button
              className="btn btn-secondary"
              onClick={onClose}
              style={{ fontSize: '0.85rem' }}
            >
              Đóng
            </button>
            {result && (
              <button
                className="btn btn-primary"
                onClick={handleApply}
                style={{
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)'
                }}
              >
                <FontAwesomeIcon icon={faCircleCheck} /> Áp Dụng Ma Trận Vào Dự Án
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
