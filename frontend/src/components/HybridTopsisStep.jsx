import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCircleInfo, faSliders, faArrowsRotate, 
  faArrowTrendDown, faArrowTrendUp, faAward, faArrowLeft 
} from '@fortawesome/free-solid-svg-icons';
import { runHybridTopsisAPI } from '../utils/ahpClient';
import { getDecisionMatrix, getCriterionTypes, missingDecisionCells } from '../utils/topsisData.js';

export default function HybridTopsisStep({ project, setProject, synthesisResult, onBack }) {
  const { criteria = [], alternatives = [], criteria_evaluation = {} } = synthesisResult || {};
  const criterionTypes = getCriterionTypes(project, criteria);
  const dataMatrix = getDecisionMatrix(project, alternatives, criteria);
  const missingCells = missingDecisionCells(dataMatrix, alternatives, criteria);
  const weights = criteria_evaluation?.weights_list || [];
  const hasMeasurements = dataMatrix.some(row => row.some(value => Number.isFinite(value) && value !== 0));
  const calculationKey = synthesisResult && missingCells.length === 0 && hasMeasurements
    ? JSON.stringify({ decision_matrix: dataMatrix, weights, criterion_types: criterionTypes, alternatives, criteria })
    : null;
  const [topsisState, setTopsisState] = useState({ key: null, result: null });
  const topsisResult = calculationKey && topsisState.key === calculationKey ? topsisState.result : null;
  const isCalculating = calculationKey && topsisState.key !== calculationKey;
  const [focusedCell, setFocusedCell] = useState(null);

  const handleCellChange = (r, c, val) => {
    const num = val === '' ? null : Number(val);
    setProject(previous => ({
      ...previous,
      data_matrix: getDecisionMatrix(previous, previous.alternatives, previous.criteria).map((row, rIdx) =>
        row.map((cell, cIdx) => rIdx === r && cIdx === c ? (Number.isFinite(num) ? num : null) : cell)
      ),
    }));
  };

  const handleTypeToggle = (cIdx) => {
    setProject(previous => {
      const updated = [...getCriterionTypes(previous, previous.criteria)];
      updated[cIdx] = updated[cIdx] === 'benefit' ? 'cost' : 'benefit';
      return { ...previous, criterion_types: updated };
    });
  };

  const handleClearData = () => {
    setProject(previous => ({
      ...previous,
      data_matrix: previous.alternatives.map(() => previous.criteria.map(() => null)),
    }));
  };

  const handleApplySampleValues = () => {
    const rows = alternatives.length;
    const cols = criteria.length;
    const sample = Array(rows).fill(0).map((_, r) => 
      Array(cols).fill(0).map((_, c) => {
        const isCost = criterionTypes[c] === 'cost';
        return isCost ? Math.round(30 + (r + 1) * 25) : Math.round(70 + (rows - r) * 9);
      })
    );
    setProject(previous => ({ ...previous, data_matrix: sample }));
  };

  useEffect(() => {
    if (!calculationKey) return;
    let cancelled = false;
    runHybridTopsisAPI(JSON.parse(calculationKey)).then(result => {
      if (!cancelled) setTopsisState({ key: calculationKey, result });
    });
    return () => { cancelled = true; };
  }, [calculationKey]);

  if (!synthesisResult) {
    return (
      <div className="glass-panel" style={{ margin: '2rem auto', maxWidth: '600px', padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Đang tổng hợp dữ liệu thứ bậc AHP...</p>
      </div>
    );
  }


  return (
    <div className="animate-fade-in" style={{ padding: '0 1.5rem 2rem 1.5rem' }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Header Intro */}
        <div className="glass-panel" style={{ padding: '1.5rem 1.75rem', background: 'linear-gradient(135deg, rgba(30, 41, 63, 0.7) 0%, rgba(16, 185, 129, 0.12) 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '0.4rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                <span style={{ 
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(6, 182, 212, 0.25) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#34d399',
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  letterSpacing: '0.05em'
                }}>
                  BƯỚC 05 / 05
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Đánh Giá Định Lượng & Khoảng Cách Nghiệm Lý Tưởng (TOPSIS)</span>
              </div>
              <h2 style={{ fontSize: '1.45rem', margin: 0, fontWeight: '800', color: '#ffffff', letterSpacing: '-0.02em' }}>
                Bước 5: Mô Hình Quyết Định Lai Ghép AHP – TOPSIS
              </h2>
            </div>
            <span style={{ 
              fontSize: '0.75rem', 
              padding: '0.25rem 0.75rem', 
              borderRadius: '20px', 
              background: 'rgba(16, 185, 129, 0.15)', 
              color: 'var(--success)', 
              fontWeight: '700',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              MÔ HÌNH TOÁN HỌC MCDM CHUYÊN SÂU
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0, lineHeight: 1.6 }}>
            Tích hợp bộ trọng số ưu tiên AHP đã xác định với <strong>dữ liệu đo lường định lượng thực tế</strong> của từng phương án. 
            Thuật toán <strong>TOPSIS</strong> tính toán khoảng cách hình học Euclid đến <em>Nghiệm lý tưởng tối ưu (D⁺)</em> và <em>Nghiệm phản lý tưởng (D⁻)</em> để tìm ra phương án tiệm cận mức hoàn hảo nhất (Cᵢ).
          </p>
        </div>

        {/* Step 5 Introduction & Guidance Card */}
        <div className="glass-panel" style={{ padding: '1rem 1.4rem', background: 'rgba(15, 23, 42, 0.55)', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', gap: '0.9rem', alignItems: 'flex-start' }}>
          <FontAwesomeIcon icon={faCircleInfo} style={{ fontSize: '18px', color: 'var(--success)', flexShrink: 0, marginTop: '0.2rem' }} />
          <div style={{ fontSize: '0.82rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
            <strong style={{ color: '#ffffff' }}>Giới thiệu Bước 5 (Mô hình Quyết định Lai Ghép AHP – TOPSIS):</strong> Trong quản trị thực tế, nhiều bài toán đòi hỏi kết hợp giữa <span style={{ color: 'var(--accent-cyan)', fontWeight: '600' }}>trọng số ưu tiên định tính AHP</span> với <span style={{ color: 'var(--success)', fontWeight: '600' }}>dữ liệu đo lường định lượng thực tế</span> (chi phí tính bằng tiền, thời gian tính bằng ngày, thông số kỹ thuật...).
            Thuật toán TOPSIS chuẩn hóa vector ma trận quyết định, phân loại tiêu chí Lợi ích (Max) và Chi phí (Min), từ đó đo lường khoảng cách Euclid đến Nghiệm lý tưởng ($D^+$) và Nghiệm phản lý tưởng ($D^-$) để xác định hệ số tiệm cận tương đối ($C_i$).
          </div>
        </div>

        {/* Guidance & Quick Actions Bar */}
        <div className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', background: 'rgba(15, 23, 42, 0.65)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
              <span style={{ color: '#ffffff', fontWeight: '600' }}>Tiêu chí Lợi ích:</span>
              <span style={{ color: 'var(--text-muted)' }}>Giá trị càng cao càng tốt (Tối đa hóa - Max)</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.8rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)', display: 'inline-block' }} />
              <span style={{ color: '#ffffff', fontWeight: '600' }}>Tiêu chí Chi phí:</span>
              <span style={{ color: 'var(--text-muted)' }}>Giá trị càng thấp càng có lợi (Tối thiểu hóa - Min)</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handleApplySampleValues}
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
              title="Điền tự động dữ liệu mẫu chuẩn hóa để xem trước kết quả xếp hạng"
            >
              <FontAwesomeIcon icon={faSliders} style={{ fontSize: '13px', color: 'var(--accent-cyan)', marginRight: '0.35rem' }} /> Điền Dữ Liệu Mẫu
            </button>
            <button
              onClick={handleClearData}
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
              title="Xóa toàn bộ giá trị đo lường đã nhập"
            >
              <FontAwesomeIcon icon={faArrowsRotate} style={{ fontSize: '13px', marginRight: '0.35rem' }} /> Xóa Dữ Liệu
            </button>
          </div>
        </div>

        {/* Matrix Entry Table */}
        <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#ffffff', margin: 0 }}>
                Bảng Ma Trận Quyết Định Định Lượng (Decision Matrix X)
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                Nhập số đo hiệu suất thực tế cho từng phương án theo từng tiêu chí, hoặc nhấp vào huy hiệu Lợi ích / Chi phí để chuyển chiều tối ưu.
              </p>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.1)', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(6, 182, 212, 0.25)', fontWeight: '600' }}>
              Tự động chuẩn hóa vector Euclid
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-medium)' }}>
            <thead>
              <tr style={{ background: 'rgba(15, 23, 42, 0.9)' }}>
                <th style={{ 
                  padding: '1rem 1.25rem', 
                  textAlign: 'left', 
                  fontSize: '0.85rem', 
                  fontWeight: '700', 
                  color: '#ffffff',
                  borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                  minWidth: '240px'
                }}>
                  Danh Sách Phương Án
                </th>
                {criteria.map((c, idx) => {
                  const isCost = criterionTypes[idx] === 'cost';
                  const w = weights[idx] ? (weights[idx] * 100).toFixed(1) : (100 / criteria.length).toFixed(1);

                  return (
                    <th key={idx} style={{ 
                      padding: '0.85rem 1rem', 
                      textAlign: 'center', 
                      borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                      borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
                      minWidth: '170px'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#f8fafc' }}>
                          {c}
                        </span>

                        <span style={{ 
                          fontSize: '0.72rem', 
                          fontFamily: 'var(--font-mono)', 
                          color: 'var(--accent-cyan)',
                          background: 'rgba(6, 182, 212, 0.12)',
                          padding: '0.1rem 0.45rem',
                          borderRadius: '4px',
                          fontWeight: '600'
                        }}>
                          Trọng số AHP: {w}%
                        </span>

                        <button
                          onClick={() => handleTypeToggle(idx)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '6px',
                            border: isCost ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(16, 185, 129, 0.5)',
                            cursor: 'pointer',
                            background: isCost ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                            color: isCost ? '#fca5a5' : '#86efac',
                            transition: 'all 0.18s ease'
                          }}
                          title={`Nhấp để chuyển sang tiêu chí ${isCost ? 'Lợi ích' : 'Chi phí'}`}
                        >
                          {isCost ? (
                            <>
                              <FontAwesomeIcon icon={faArrowTrendDown} style={{ fontSize: '12px' }} /> Chi Phí (Min)
                            </>
                          ) : (
                            <>
                              <FontAwesomeIcon icon={faArrowTrendUp} style={{ fontSize: '12px' }} /> Lợi Ích (Max)
                            </>
                          )}
                        </button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {alternatives.map((alt, r) => {
                const isEven = r % 2 === 0;

                return (
                  <tr 
                    key={r}
                    style={{
                      background: isEven ? 'rgba(255, 255, 255, 0.015)' : 'rgba(255, 255, 255, 0.035)',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <td style={{ 
                      padding: '0.85rem 1.25rem', 
                      textAlign: 'left', 
                      fontWeight: '600', 
                      color: '#ffffff',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      verticalAlign: 'middle'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span style={{ 
                          width: '24px', 
                          height: '24px', 
                          borderRadius: '50%', 
                          background: 'rgba(6, 182, 212, 0.2)', 
                          color: 'var(--accent-cyan)', 
                          fontSize: '0.75rem', 
                          fontWeight: '800', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center' 
                        }}>
                          A{r + 1}
                        </span>
                        <span style={{ fontSize: '0.92rem' }}>{alt}</span>
                      </div>
                    </td>

                    {criteria.map((_, c) => {
                      const isFocused = focusedCell?.r === r && focusedCell?.c === c;

                      return (
                        <td 
                          key={c} 
                          style={{ 
                            padding: '0.65rem 0.85rem', 
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            borderLeft: '1px solid rgba(255, 255, 255, 0.04)',
                            verticalAlign: 'middle'
                          }}
                        >
                          <input
                            type="number"
                            step="any"
                            value={dataMatrix[r]?.[c] ?? ''}
                            placeholder="Chưa nhập"
                            aria-label={`${alt} — ${criteria[c]}`}
                            onFocus={() => setFocusedCell({ r, c })}
                            onBlur={() => setFocusedCell(null)}
                            onChange={(e) => handleCellChange(r, c, e.target.value)}
                            style={{
                              width: '100%',
                              textAlign: 'center',
                              background: isFocused ? 'rgba(6, 182, 212, 0.15)' : 'rgba(0, 0, 0, 0.35)',
                              border: isFocused ? '1px solid var(--accent-cyan)' : dataMatrix[r]?.[c] == null ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '7px',
                              color: '#ffffff',
                              padding: '0.55rem 0.5rem',
                              fontSize: '0.95rem',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: '600',
                              outline: 'none',
                              boxShadow: isFocused ? '0 0 10px rgba(6, 182, 212, 0.3)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Results Card */}
        {(() => {
          if (missingCells.length > 0 || !hasMeasurements) {
            return (
              <div className="glass-panel" style={{ padding: '2.5rem 1.5rem', textAlign: 'center', background: 'rgba(15, 23, 42, 0.65)', border: '1px dashed rgba(255, 255, 255, 0.15)' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '50%', 
                  background: 'rgba(56, 189, 248, 0.1)', 
                  color: 'var(--accent-cyan)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 1rem auto' 
                }}>
                  <FontAwesomeIcon icon={faCircleInfo} style={{ fontSize: '24px' }} />
                </div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.5rem' }}>
                  {missingCells.length > 0 ? `Còn ${missingCells.length} ô dữ liệu chưa nhập` : 'Chưa Có Dữ Liệu Đo Lường Định Lượng'}
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: '540px', margin: '0 auto 1.5rem auto', lineHeight: 1.6 }}>
                  {missingCells.length > 0
                    ? `Hãy nhập các giá trị đo lường còn thiếu, bắt đầu với ${missingCells[0].alternative} — ${missingCells[0].criterion}. TOPSIS sẽ chỉ tính khi bảng dữ liệu hoàn chỉnh.`
                    : 'Bảng hiện chỉ có giá trị 0. Hãy nhập số liệu đo lường thực tế hoặc chọn dữ liệu mẫu để xem cách TOPSIS hoạt động.'}
                </p>
                <button
                  onClick={handleApplySampleValues}
                  className="btn btn-primary"
                  style={{ padding: '0.65rem 1.4rem', fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <FontAwesomeIcon icon={faSliders} style={{ fontSize: '15px' }} /> Điền Dữ Liệu Mẫu Chuẩn Hóa
                </button>
              </div>
            );
          }

          if (!topsisResult) {
            return <div className="glass-panel" style={{ padding: '1.5rem', color: 'var(--text-secondary)' }}>{isCalculating ? 'Đang tính TOPSIS…' : 'Không thể tính TOPSIS từ dữ liệu hiện tại.'}</div>;
          }

          const hasTieWinner = topsisResult.rankings.length > 1 && topsisResult.rankings[0].percentage === topsisResult.rankings[1].percentage;

          return (
            <div className="glass-panel" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <FontAwesomeIcon icon={faAward} style={{ fontSize: '20px', color: 'var(--success)' }} />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                    Bảng Xếp Hạng Giải Pháp Tối Ưu (Chỉ Số Tương Cận Cᵢ)
                  </h3>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Công thức: Cᵢ = D⁻ / (D⁺ + D⁻) × 100%
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.4rem' }}>
                {topsisResult.rankings.map((item, idx) => {
                  const isWinner = idx === 0 && !hasTieWinner;

                  return (
                    <div
                      key={idx}
                      style={{
                        background: isWinner ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(6, 182, 212, 0.08) 100%)' : 'rgba(255, 255, 255, 0.02)',
                        border: isWinner ? '2px solid rgba(16, 185, 129, 0.6)' : '1px solid rgba(255, 255, 255, 0.07)',
                        borderRadius: '12px',
                        padding: '1.4rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.85rem',
                        boxShadow: isWinner ? '0 8px 25px rgba(16, 185, 129, 0.25)' : 'var(--shadow-card)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {isWinner && (
                        <div style={{
                          position: 'absolute',
                          top: '0',
                          right: '0',
                          background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                          color: '#090d16',
                          fontSize: '0.68rem',
                          fontWeight: '800',
                          padding: '0.25rem 0.85rem',
                          borderBottomLeftRadius: '8px',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase'
                        }}>
                          Khuyến Nghị Tối Ưu (Hạng 1)
                        </div>
                      )}

                      {hasTieWinner && item.percentage === topsisResult.rankings[0].percentage && (
                        <div style={{
                          position: 'absolute',
                          top: '0',
                          right: '0',
                          background: '#334155',
                          color: '#e2e8f0',
                          fontSize: '0.68rem',
                          fontWeight: '700',
                          padding: '0.25rem 0.85rem',
                          borderBottomLeftRadius: '8px',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase'
                        }}>
                          Đồng Hạng 1
                        </div>
                      )}

                      {/* Header Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: (isWinner || hasTieWinner) ? '0.4rem' : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <span style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            background: isWinner ? 'var(--success)' : '#334155',
                            color: isWinner ? '#090d16' : '#ffffff',
                            fontWeight: '800',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: isWinner ? '0 0 12px rgba(16, 185, 129, 0.6)' : 'none'
                          }}>
                            {item.rank}
                          </span>
                          <div>
                            <span style={{ fontWeight: '800', fontSize: '1.05rem', color: '#ffffff', display: 'block' }}>
                              {item.alternative}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: isWinner ? 'var(--success)' : 'var(--text-muted)', fontWeight: '600' }}>
                              {isWinner ? 'Giải pháp đạt điểm tiệm cận cao nhất' : (hasTieWinner && item.percentage === topsisResult.rankings[0].percentage ? 'Đồng điểm tương cận' : `Xếp hạng thứ ${item.rank}`)}
                            </span>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span style={{ 
                            fontFamily: 'var(--font-mono)', 
                            fontWeight: '800', 
                            fontSize: '1.45rem', 
                            color: isWinner ? 'var(--success)' : '#e2e8f0',
                            letterSpacing: '-0.02em'
                          }}>
                            {item.percentage}%
                          </span>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Chỉ số Cᵢ
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ width: '100%', height: '8px', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${item.percentage}%`,
                            height: '100%',
                            background: isWinner ? 'linear-gradient(90deg, #10b981, #06b6d4)' : 'linear-gradient(90deg, #475569, #94a3b8)',
                            borderRadius: '4px',
                            transition: 'width 0.5s ease'
                          }}
                        />
                      </div>

                      {/* Distance Metric Cards */}
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '0.4rem', 
                        fontSize: '0.8rem', 
                        background: 'rgba(0, 0, 0, 0.3)', 
                        padding: '0.65rem 0.85rem', 
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Khoảng cách đến Nghiệm lý tưởng (D⁺):</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: isWinner ? '#86efac' : '#cbd5e1' }}>
                            {item.distance_ideal}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Khoảng cách đến Phản lý tưởng (D⁻):</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: isWinner ? 'var(--accent-cyan)' : '#cbd5e1' }}>
                            {item.distance_anti_ideal}
                          </span>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Bottom Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button 
            onClick={onBack}
            className="btn btn-secondary"
            style={{ padding: '0.75rem 1.4rem' }}
          >
            <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: '15px', marginRight: '0.4rem' }} /> Quay lại Bước 4: Phân Tích Độ Nhạy
          </button>
        </div>

      </div>
    </div>
  );
}
