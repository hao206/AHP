import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Sliders, RotateCcw, TrendingUp, ArrowLeft, Activity, 
  Info, RefreshCw, ShieldCheck, AlertTriangle, Play, Zap, CheckCircle2
} from 'lucide-react';
import { getGradientSensitivityAPI, runMonteCarloAPI } from '../utils/ahpClient';

export default function SensitivityStep({ project, synthesisResult, onBack }) {
  if (!synthesisResult || !project) {
    return (
      <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '3rem 2rem' }}>
          <RefreshCw size={32} className="spinning" color="var(--accent-cyan)" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.5rem' }}>
            Đang Tải Dữ Liệu Tổng Hợp Quyết Định...
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Vui lòng đợi hệ thống tổng hợp hoặc quay lại Bước 3 để hoàn tất ma trận so sánh cặp.
          </p>
          <button onClick={onBack} className="btn btn-secondary">
            <ArrowLeft size={16} /> Quay Lại Bước 3
          </button>
        </div>
      </div>
    );
  }

  const { criteria = [], alternatives = [], criteria_evaluation = {}, alternatives_evaluation = {}, rankings: baselineRankings = [] } = synthesisResult;

  // Active sensitivity tab: 'dynamic' | 'gradient' | 'monte-carlo'
  const [activeTab, setActiveTab] = useState('dynamic');

  // Dynamic sensitivity custom weights
  const [customWeights, setCustomWeights] = useState(() => {
    const initial = {};
    const wList = criteria_evaluation?.weights_list || [];
    criteria.forEach((c, idx) => {
      initial[c] = wList[idx] !== undefined ? wList[idx] : 1 / (criteria.length || 1);
    });
    return initial;
  });

  // Local alternative matrix for fast client-side dynamic calculation
  const altLocalMatrix = useMemo(() => {
    const matrix = [];
    criteria.forEach((c) => {
      const altEval = alternatives_evaluation?.[c]?.weights_list || [];
      const row = alternatives.map((_, aIdx) => altEval[aIdx] !== undefined ? altEval[aIdx] : 1 / (alternatives.length || 1));
      matrix.push(row);
    });
    return matrix;
  }, [criteria, alternatives, alternatives_evaluation]);

  // Compute dynamic rankings on client-side
  const activeRankings = useMemo(() => {
    const totalW = Object.values(customWeights).reduce((a, b) => a + b, 0) || 1.0;
    const normW = criteria.map(c => (customWeights[c] || 0) / totalW);

    const scores = alternatives.map((alt, aIdx) => {
      let score = 0;
      criteria.forEach((_, cIdx) => {
        score += (altLocalMatrix[cIdx]?.[aIdx] || 0) * normW[cIdx];
      });
      return {
        alternative: alt,
        score: score,
        percentage: Number((score * 100).toFixed(2))
      };
    });

    scores.sort((a, b) => b.score - a.score);
    return scores.map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [customWeights, criteria, alternatives, altLocalMatrix]);

  // Gradient Sensitivity State
  const [selectedCrit, setSelectedCrit] = useState(criteria[0] || '');
  const [gradientData, setGradientData] = useState(null);
  const [isLoadingGradient, setIsLoadingGradient] = useState(false);
  const canvasRef = useRef(null);

  // Monte Carlo Simulation State
  const [monteCarloResult, setMonteCarloResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [mcIterations, setMcIterations] = useState(1000);
  const [mcNoise, setMcNoise] = useState(0.20);
  const isSimulatingRef = useRef(false);

  // Color palette for alternatives
  const altColors = useMemo(() => [
    '#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'
  ], []);

  // Handle slider weight change in Dynamic tab
  const handleWeightSliderChange = (critName, newValue) => {
    const val = Math.max(0.01, Math.min(1.0, parseFloat(newValue)));
    const remainingCrit = criteria.filter(c => c !== critName);
    const sumRemaining = remainingCrit.reduce((sum, c) => sum + (customWeights[c] || 0), 0);

    const newWeights = { ...customWeights, [critName]: val };
    const remainingTarget = Math.max(0.0001, 1.0 - val);

    if (sumRemaining > 0.0001) {
      remainingCrit.forEach(c => {
        newWeights[c] = (customWeights[c] / sumRemaining) * remainingTarget;
      });
    } else if (remainingCrit.length > 0) {
      const equalShare = remainingTarget / remainingCrit.length;
      remainingCrit.forEach(c => {
        newWeights[c] = equalShare;
      });
    }

    setCustomWeights(newWeights);
  };

  // Reset custom weights to baseline
  const handleResetWeights = () => {
    const initial = {};
    const wList = criteria_evaluation?.weights_list || [];
    criteria.forEach((c, idx) => {
      initial[c] = wList[idx] !== undefined ? wList[idx] : 1 / (criteria.length || 1);
    });
    setCustomWeights(initial);
  };

  // Fetch gradient sensitivity
  useEffect(() => {
    if (!selectedCrit || !project) return;
    let isCancelled = false;
    setIsLoadingGradient(true);

    getGradientSensitivityAPI(project, selectedCrit)
      .then(res => {
        if (!isCancelled && res) {
          setGradientData(res);
        }
      })
      .catch(err => console.error('Gradient sensitivity load error:', err))
      .finally(() => {
        if (!isCancelled) setIsLoadingGradient(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedCrit, project]);

  // Run Monte Carlo simulation cleanly without UI stutter
  const triggerMonteCarlo = useCallback(async (iters = mcIterations, noise = mcNoise) => {
    if (!project || isSimulatingRef.current) return;
    isSimulatingRef.current = true;
    setIsSimulating(true);

    try {
      const res = await runMonteCarloAPI(project, iters, noise);
      if (res) {
        setMonteCarloResult(res);
      }
    } catch (err) {
      console.error('Lỗi chạy mô phỏng Monte Carlo:', err);
    } finally {
      setIsSimulating(false);
      isSimulatingRef.current = false;
    }
  }, [project, mcIterations, mcNoise]);

  // Initial Monte Carlo on entering tab
  useEffect(() => {
    if (activeTab === 'monte-carlo' && !monteCarloResult && project && !isSimulatingRef.current) {
      triggerMonteCarlo();
    }
  }, [activeTab, monteCarloResult, project, triggerMonteCarlo]);

  // Render 2D Gradient Canvas Chart
  useEffect(() => {
    if (activeTab !== 'gradient' || !canvasRef.current || !gradientData?.curves) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const padding = { top: 30, right: 30, bottom: 45, left: 55 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Background Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    // Horizontal grid lines (0% to 100% score)
    for (let p = 0; p <= 100; p += 20) {
      const y = padding.top + chartH - (p / 100) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '11px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${p}%`, padding.left - 10, y + 4);
    }

    // Vertical grid lines (0% to 100% criterion weight)
    for (let w = 0; w <= 100; w += 20) {
      const x = padding.left + (w / 100) * chartW;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${w}%`, x, height - padding.bottom + 18);
    }

    // Baseline current weight vertical marker
    const baseW = gradientData.baseline_weight_pct || 0;
    const baseX = padding.left + (baseW / 100) * chartW;
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(baseX, padding.top);
    ctx.lineTo(baseX, height - padding.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // Baseline text indicator
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Hiện tại: ${baseW}%`, baseX, padding.top - 8);

    // Plot Curves
    alternatives.forEach((alt, aIdx) => {
      const curvePoints = gradientData.curves[alt];
      if (!curvePoints || curvePoints.length === 0) return;

      const color = altColors[aIdx % altColors.length];
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      curvePoints.forEach((pt, ptIdx) => {
        const x = padding.left + (pt.criterion_weight / 100) * chartW;
        const y = padding.top + chartH - (pt.score / 100) * chartH;
        if (ptIdx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Dot at baseline
      const basePoint = curvePoints.reduce((prev, curr) => 
        Math.abs(curr.criterion_weight - baseW) < Math.abs(prev.criterion_weight - baseW) ? curr : prev
      );
      if (basePoint) {
        const dotX = padding.left + (basePoint.criterion_weight / 100) * chartW;
        const dotY = padding.top + chartH - (basePoint.score / 100) * chartH;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 4.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });

    // Axis Titles
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Trọng số Tiêu chí: "${selectedCrit}" (%)`, padding.left + chartW / 2, height - 8);

    ctx.save();
    ctx.translate(14, padding.top + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Điểm Tổng hợp Phương án (%)', 0, 0);
    ctx.restore();

  }, [activeTab, gradientData, selectedCrit, alternatives, altColors]);

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 1.5rem 2rem 1.5rem', animation: 'fadeIn 0.3s ease-in-out' }}>
      
      {/* Unified Step 4 Header */}
      <div className="glass-panel" style={{ padding: '1.5rem 2rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
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
              BƯỚC 04 / 05
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Phân Tích Độ Nhạy & Kiểm Định Độ Vững Chắc Quyết Định</span>
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: '800', color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
            Bước 4: Phân Tích Độ Nhạy & Mô Phỏng
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.35rem 0 0 0' }}>
            Khám phá tính ổn định của quyết định qua điều chỉnh trọng số động học, biểu đồ độ dốc 2D và mô phỏng ngẫu nhiên Monte Carlo.
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.75)', padding: '0.3rem', borderRadius: '10px', border: '1px solid var(--border-color)', gap: '0.3rem' }}>
          <button
            type="button"
            onClick={() => setActiveTab('dynamic')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 0.9rem',
              borderRadius: '7px',
              border: 'none',
              background: activeTab === 'dynamic' ? 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' : 'transparent',
              color: activeTab === 'dynamic' ? '#ffffff' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: activeTab === 'dynamic' ? '700' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Sliders size={15} /> Độ Nhạy Động Học
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gradient')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 0.9rem',
              borderRadius: '7px',
              border: 'none',
              background: activeTab === 'gradient' ? 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' : 'transparent',
              color: activeTab === 'gradient' ? '#ffffff' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: activeTab === 'gradient' ? '700' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <TrendingUp size={15} /> Độ Nhạy Độ Dốc 2D
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('monte-carlo')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 0.9rem',
              borderRadius: '7px',
              border: 'none',
              background: activeTab === 'monte-carlo' ? 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' : 'transparent',
              color: activeTab === 'monte-carlo' ? '#ffffff' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: activeTab === 'monte-carlo' ? '700' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Activity size={15} /> Mô Phỏng Monte Carlo
          </button>
        </div>
      </div>

      {/* Step 4 Introduction & Guidance Card */}
      <div className="glass-panel" style={{ padding: '1rem 1.4rem', marginBottom: '1.5rem', background: 'rgba(15, 23, 42, 0.55)', border: '1px solid rgba(6, 182, 212, 0.25)', display: 'flex', gap: '0.9rem', alignItems: 'flex-start' }}>
        <Info size={18} color="var(--accent-cyan)" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
        <div style={{ fontSize: '0.82rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
          <strong style={{ color: '#ffffff' }}>Giới thiệu Bước 4 (Phân tích Độ nhạy & Mô phỏng Rủi ro):</strong> Kiểm tra khả năng chịu đựng sai số của quyết định khi các trọng số tiêu chí bị biến động. 
          Bao gồm 3 công cụ phòng thí nghiệm: 
          <span style={{ color: 'var(--accent-cyan)', fontWeight: '600' }}> (1) Độ nhạy Động học</span>: Kéo thanh trượt để quan sát thứ hạng phương án thích ứng thời gian thực; 
          <span style={{ color: '#38bdf8', fontWeight: '600' }}> (2) Độ dốc 2D</span>: Xác định các ngưỡng đảo ngôi quán quân (Crossover Thresholds); 
          <span style={{ color: '#a78bfa', fontWeight: '600' }}> (3) Mô phỏng Monte Carlo</span>: Chạy ngẫu nhiên hàng nghìn kịch bản biến động Gauss để đo lường xác suất chiến thắng và Chỉ số độ vững chắc (Robustness Index).
        </div>
      </div>

      {/* ================= TAB 1: DYNAMIC SENSITIVITY ================= */}
      {activeTab === 'dynamic' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          
          {/* Sliders Panel */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#ffffff', margin: 0 }}>
                  Điều Chỉnh Trọng Số Tiêu Chí Thời Gian Thực
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                  Kéo thanh trượt để thử nghiệm. Các tiêu chí khác tự động chuẩn hóa về tổng 100%.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetWeights}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                title="Khôi phục về trọng số gốc của ma trận AHP"
              >
                <RotateCcw size={13} style={{ marginRight: '0.3rem' }} /> Đặt Lại Gốc
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {criteria.map((crit, idx) => {
                const w = customWeights[crit] || 0;
                const pct = (w * 100).toFixed(1);
                const baseW = criteria_evaluation?.weights_list?.[idx] !== undefined 
                  ? (criteria_evaluation.weights_list[idx] * 100).toFixed(1) 
                  : '0';

                return (
                  <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.45)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#ffffff' }}>
                        {idx + 1}. {crit}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Gốc: {baseW}%
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: '800', color: 'var(--accent-cyan)' }}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0.01"
                      max="0.99"
                      step="0.01"
                      value={w}
                      onChange={(e) => handleWeightSliderChange(crit, e.target.value)}
                      className="slider-expert"
                      style={{ width: '100%' }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Rankings Live Result */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Zap size={16} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#ffffff', margin: 0 }}>
                  Thứ Hạng Phương Án Tức Thời
                </h3>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                Điểm và thứ hạng tự động thích ứng ngay theo từng nấc điều chỉnh trọng số.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', flex: 1 }}>
              {activeRankings.map((item, idx) => {
                const isLeader = item.rank === 1;
                const baseItem = baselineRankings.find(b => b.alternative === item.alternative);
                const rankDelta = (baseItem ? baseItem.rank : idx + 1) - item.rank;

                return (
                  <div
                    key={idx}
                    style={{
                      padding: '1rem',
                      borderRadius: '8px',
                      background: isLeader ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(15, 23, 42, 0.8) 100%)' : 'rgba(15, 23, 42, 0.5)',
                      border: isLeader ? '1.5px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                      transition: 'border 0.25s, background 0.25s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: isLeader ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)',
                          color: isLeader ? '#020617' : '#ffffff',
                          fontWeight: '800',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {item.rank}
                        </span>
                        <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#ffffff' }}>
                          {item.alternative}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        {rankDelta !== 0 && (
                          <span style={{ 
                            fontSize: '0.72rem', 
                            fontWeight: '700',
                            color: rankDelta > 0 ? '#10b981' : '#ef4444' 
                          }}>
                            {rankDelta > 0 ? `▲ +${rankDelta}` : `▼ ${rankDelta}`}
                          </span>
                        )}
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: '800', color: isLeader ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>
                          {item.percentage}%
                        </span>
                      </div>
                    </div>

                    <div style={{ width: '100%', height: '7px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${item.percentage}%`,
                        height: '100%',
                        background: isLeader 
                          ? 'linear-gradient(90deg, #06b6d4 0%, #10b981 100%)' 
                          : 'linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)',
                        borderRadius: '999px',
                        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '1.2rem', padding: '0.8rem 1rem', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.06)', border: '1px solid rgba(6, 182, 212, 0.2)', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <Info size={16} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Nếu phương án quán quân vẫn giữ vị trí đầu bảng khi dao động trọng số trong khoảng ±10%, quyết định có tính ổn định cao.
              </span>
            </div>
          </div>

        </div>
      )}

      {/* ================= TAB 2: GRADIENT SENSITIVITY ================= */}
      {activeTab === 'gradient' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
          
          {/* Criterion Selector Bar */}
          <div className="glass-panel" style={{ padding: '1.2rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#ffffff' }}>
                Chọn Tiêu Chí Phân Tích Độ Dốc:
              </label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {criteria.map((crit, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedCrit(crit)}
                    style={{
                      padding: '0.45rem 0.85rem',
                      borderRadius: '6px',
                      border: selectedCrit === crit ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                      background: selectedCrit === crit ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255,255,255,0.04)',
                      color: selectedCrit === crit ? '#ffffff' : 'var(--text-muted)',
                      fontSize: '0.8rem',
                      fontWeight: selectedCrit === crit ? '700' : '500',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {crit}
                  </button>
                ))}
              </div>
            </div>
            
            {isLoadingGradient && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
                <RefreshCw size={14} className="spinning" /> Đang vẽ biểu đồ độ dốc...
              </div>
            )}
          </div>

          {/* Canvas Chart Panel */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.8rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#ffffff', margin: 0 }}>
                  Đồ Thị Tuyến Tính Độ Nhạy - Tiêu Chí: "{selectedCrit}"
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                  Biểu diễn điểm số tổng hợp của các phương án khi trọng số của "{selectedCrit}" thay đổi từ 0% đến 100%.
                </p>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                {alternatives.map((alt, aIdx) => (
                  <div key={aIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#ffffff' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: altColors[aIdx % altColors.length] }} />
                    {alt}
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#ef4444' }}>
                  <span style={{ width: '12px', height: '2px', background: '#ef4444' }} /> Vị trí hiện tại
                </div>
              </div>
            </div>

            {/* Canvas Container */}
            <div style={{ width: '100%', overflowX: 'auto', background: 'rgba(10, 14, 23, 0.7)', borderRadius: '10px', padding: '1rem 0' }}>
              <canvas
                ref={canvasRef}
                width={1100}
                height={380}
                style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '400px' }}
              />
            </div>

            {/* Crossover Points */}
            {gradientData?.crossovers && gradientData.crossovers.length > 0 && (
              <div style={{ marginTop: '1.2rem', padding: '1rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <AlertTriangle size={16} color="#f59e0b" />
                  <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#fbbf24' }}>
                    Các Ngưỡng Đảo Chiều Thứ Hạng (Crossover Points / Critical Thresholds):
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {gradientData.crossovers.map((co, idx) => (
                    <div key={idx}>
                      • {co.description}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ================= TAB 3: MONTE CARLO SIMULATION (SMOOTH & ANTI-JITTER) ================= */}
      {activeTab === 'monte-carlo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
          
          {/* Controls Bar */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={18} color="var(--accent-cyan)" />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                    Mô Phỏng Độ Vững Chắc Quyết Định Bằng Monte Carlo
                  </h3>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                  Áp dụng phân phối xác suất Gauss ngẫu nhiên vào vector trọng số tiêu chí để kiểm định độ vững bền thứ tự ưu tiên.
                </p>
              </div>

              {/* Simulation Configuration Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap' }}>
                
                {/* Iterations selector */}
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                    Số Kịch Bản:
                  </label>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    {[500, 1000, 2500, 5000].map(cnt => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => {
                          setMcIterations(cnt);
                          triggerMonteCarlo(cnt, mcNoise);
                        }}
                        disabled={isSimulating}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          border: mcIterations === cnt ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                          background: mcIterations === cnt ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255,255,255,0.04)',
                          color: mcIterations === cnt ? '#ffffff' : 'var(--text-muted)',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          cursor: isSimulating ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        {cnt >= 1000 ? `${cnt / 1000}k` : cnt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Noise Level Slider - Smooth without triggering heavy runs during drag */}
                <div style={{ minWidth: '170px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mức Biến Động (σ):</label>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: '700', color: 'var(--accent-cyan)' }}>
                      ±{Math.round(mcNoise * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    step="5"
                    value={Math.round(mcNoise * 100)}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) / 100;
                      setMcNoise(val);
                    }}
                    onPointerUp={(e) => {
                      const val = parseInt(e.target.value, 10) / 100;
                      triggerMonteCarlo(mcIterations, val);
                    }}
                    className="slider-expert"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Run Button */}
                <button
                  type="button"
                  onClick={() => triggerMonteCarlo(mcIterations, mcNoise)}
                  disabled={isSimulating}
                  className="btn btn-primary"
                  style={{ padding: '0.55rem 1.1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: '160px', justifyContent: 'center' }}
                >
                  {isSimulating ? (
                    <>
                      <RefreshCw size={14} className="spinning" /> Đang Tính Toán...
                    </>
                  ) : (
                    <>
                      <Play size={14} /> Chạy Lại Mô Phỏng
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>

          {/* Results Area with Persistent Layout to Prevent Jitter */}
          <div style={{
            position: 'relative',
            minHeight: '280px',
            opacity: isSimulating ? 0.7 : 1,
            transition: 'opacity 0.25s ease-in-out',
            pointerEvents: isSimulating ? 'none' : 'auto'
          }}>
            
            {/* Subtle In-flight Status Bar */}
            {isSimulating && (
              <div style={{
                position: 'absolute',
                top: '-10px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10,
                background: 'rgba(6, 182, 212, 0.95)',
                color: '#020617',
                padding: '0.3rem 0.9rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 4px 15px rgba(6, 182, 212, 0.4)'
              }}>
                <RefreshCw size={13} className="spinning" /> Đang chạy {mcIterations.toLocaleString()} kịch bản...
              </div>
            )}

            {monteCarloResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                
                {/* Robustness Alert */}
                <div style={{
                  padding: '1.2rem 1.5rem',
                  borderRadius: '12px',
                  border: monteCarloResult.is_highly_robust 
                    ? '1px solid rgba(16, 185, 129, 0.4)' 
                    : '1px solid rgba(245, 158, 11, 0.4)',
                  background: monteCarloResult.is_highly_robust
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)'
                    : 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(239, 68, 68, 0.08) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.2rem'
                }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '10px',
                    background: monteCarloResult.is_highly_robust ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {monteCarloResult.is_highly_robust ? (
                      <ShieldCheck size={26} color="#10b981" />
                    ) : (
                      <AlertTriangle size={26} color="#f59e0b" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                        {monteCarloResult.is_highly_robust ? 'Quyết Định Có Độ Vững Chắc Cao (Highly Robust)' : 'Quyết Định Nhạy Cảm Với Biến Động (Moderate Robustness)'}
                      </h4>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        fontWeight: '800',
                        padding: '0.15rem 0.6rem',
                        borderRadius: '999px',
                        background: monteCarloResult.is_highly_robust ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                        color: monteCarloResult.is_highly_robust ? '#34d399' : '#fbbf24',
                        border: `1px solid ${monteCarloResult.is_highly_robust ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`
                      }}>
                        Xác suất Thắng: {monteCarloResult.dominant_win_rate}%
                      </span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                      {monteCarloResult.recommendation}
                    </p>
                  </div>
                </div>

                {/* Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.2rem' }}>
                  {alternatives.map((alt, idx) => {
                    const winRate = monteCarloResult.win_probabilities?.[alt] ?? 0;
                    const stats = monteCarloResult.score_stats?.[alt] ?? { mean: 0, std: 0, min: 0, max: 0 };
                    const isDominant = alt === monteCarloResult.dominant_alternative;
                    const rank1Count = monteCarloResult.rank_distributions?.[alt]?.['1'] ?? 0;
                    const iters = monteCarloResult.iterations || mcIterations || 1000;

                    return (
                      <div key={idx} className="glass-panel" style={{
                        padding: '1.4rem',
                        border: isDominant ? '1.5px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                        position: 'relative',
                        overflow: 'hidden',
                        background: isDominant ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(15, 23, 42, 0.85) 100%)' : undefined,
                        transition: 'border 0.3s, background 0.3s'
                      }}>
                        {isDominant && (
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                            color: '#ffffff',
                            fontSize: '0.65rem',
                            fontWeight: '800',
                            letterSpacing: '0.05em',
                            padding: '0.2rem 0.75rem',
                            borderBottomLeftRadius: '8px',
                            textTransform: 'uppercase'
                          }}>
                            ★ Phương Án Tối Ưu
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          <div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>Phương án #{idx + 1}</span>
                            <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#ffffff', margin: '0.2rem 0 0 0' }}>{alt}</h4>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Xác suất Thắng</span>
                            <div style={{
                              fontSize: '1.25rem',
                              fontWeight: '800',
                              fontFamily: 'var(--font-mono)',
                              color: winRate > 50 ? 'var(--accent-cyan)' : winRate > 20 ? 'var(--warning)' : 'var(--text-muted)',
                              transition: 'color 0.3s'
                            }}>
                              {winRate}%
                            </div>
                          </div>
                        </div>

                        {/* Smooth Progress Bar */}
                        <div style={{ width: '100%', height: '7px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden', marginBottom: '1.1rem' }}>
                          <div style={{
                            width: `${winRate}%`,
                            height: '100%',
                            background: isDominant 
                              ? 'linear-gradient(90deg, #06b6d4 0%, #10b981 100%)' 
                              : 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
                            borderRadius: '999px',
                            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                          }} />
                        </div>

                        {/* Statistical metrics */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '0.4rem',
                          padding: '0.65rem',
                          background: 'rgba(0,0,0,0.25)',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.04)',
                          textAlign: 'center'
                        }}>
                          <div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Điểm TB (Mean)</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: '700', color: '#ffffff' }}>
                              {(stats.mean * 100).toFixed(1)}%
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Độ Lệch Chuẩn (σ)</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: '700', color: 'var(--accent-cyan)' }}>
                              ±{(stats.std * 100).toFixed(1)}%
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Hạng 1 / Tổng</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: '600', color: '#10b981' }}>
                              {rank1Count}/{iters}
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

              </div>
            ) : (
              <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                <RefreshCw size={28} className="spinning" color="var(--accent-cyan)" style={{ margin: '0 auto 0.8rem auto' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Đang khởi tạo các kịch bản mô phỏng ngẫu nhiên...</p>
              </div>
            )}

          </div>

          {/* Educational Note */}
          <div className="glass-panel" style={{ padding: '1.2rem', background: 'rgba(15, 23, 42, 0.4)', display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
            <Info size={18} color="var(--accent-cyan)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              <strong style={{ color: '#ffffff' }}>Ý nghĩa phương pháp luận Monte Carlo trong AHP:</strong> Kiểm định sự vững vàng của quyết định trước những sai số ước lượng trọng số giữa các chuyên gia. Nếu xác suất dẫn đầu đạt trên 70%, kết quả có độ vững chắc cao, đủ cơ sở để triển khai thực tế.
            </div>
          </div>

        </div>
      )}

      {/* Bottom Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
        <button 
          onClick={onBack}
          className="btn btn-secondary"
          style={{ padding: '0.65rem 1.2rem' }}
        >
          <ArrowLeft size={16} /> Quay Lại Bước 3: Tổng Hợp Kết Quả & Radar
        </button>
      </div>

    </div>
  );
}
