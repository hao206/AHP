import React, { useEffect, useRef, useState } from 'react';
import { Award, ArrowRight, ArrowLeft, BarChart3, Compass, CheckCircle2, TrendingUp, ShieldCheck, Zap, Info } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ResultsStep({ project, synthesisResult, onProceed, onBack }) {
  const canvasRef = useRef(null);
  const [activeAlts, setActiveAlts] = useState({});

  useEffect(() => {
    if (synthesisResult?.is_overall_consistent) {
      try {
        confetti({
          particleCount: 40,
          spread: 55,
          origin: { y: 0.7 }
        });
      } catch (e) {}
    }
  }, [synthesisResult]);

  useEffect(() => {
    if (synthesisResult?.alternatives) {
      const init = {};
      synthesisResult.alternatives.forEach(alt => { init[alt] = true; });
      setActiveAlts(init);
    }
  }, [synthesisResult]);

  // Helper to convert hex color to rgba for translucent polygon overlays
  const hexToRgba = (hex, alpha = 0.22) => {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Draw Radar / Spider Chart on canvas
  useEffect(() => {
    if (!canvasRef.current || !synthesisResult) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    // Leave ample padding (70px) for long label strings on all sides
    const radius = Math.min(centerX, centerY) - 70;

    const { criteria, alternatives, breakdown } = synthesisResult;
    const numCriteria = criteria.length;
    if (numCriteria < 3) {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 13px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Biểu đồ Radar yêu cầu từ 3 tiêu chí trở lên để vẽ đa giác.', centerX, centerY - 10);
      ctx.fillStyle = '#64748b';
      ctx.font = '11px Plus Jakarta Sans, sans-serif';
      ctx.fillText(`(Hiện tại có ${numCriteria} tiêu chí. Vui lòng xem bảng điểm phân rã chi tiết bên dưới)`, centerX, centerY + 15);
      return;
    }

    ctx.clearRect(0, 0, width, height);

    // Draw concentric polygon grid
    const levels = 4;
    for (let l = 1; l <= levels; l++) {
      const r = (radius / levels) * l;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i < numCriteria; i++) {
        const angle = (i / numCriteria) * 2 * Math.PI - Math.PI / 2;
        const x = centerX + r * Math.cos(angle);
        const y = centerY + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Draw radial axes and intelligent non-truncated labels
    for (let i = 0; i < numCriteria; i++) {
      const angle = (i / numCriteria) * 2 * Math.PI - Math.PI / 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const axisX = centerX + radius * cos;
      const axisY = centerY + radius * sin;

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(axisX, axisY);
      ctx.stroke();

      // Safe label placement with directional alignment
      const offset = 14;
      const labelX = centerX + (radius + offset) * cos;
      const labelY = centerY + (radius + offset) * sin;

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '600 11px Plus Jakarta Sans, sans-serif';

      // Smart alignment: Left quadrant aligns right, Right quadrant aligns left, Top/Bottom centers
      if (Math.abs(cos) < 0.25) {
        ctx.textAlign = 'center';
        ctx.textBaseline = sin < 0 ? 'bottom' : 'top';
      } else if (cos > 0) {
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
      } else {
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
      }

      // Multi-line wrap for long labels like "Service Pricing & TCO" or "Global Latency & Uptime"
      const text = criteria[i];
      if (text.length > 15 && text.includes(' ')) {
        const words = text.split(' ');
        const mid = Math.ceil(words.length / 2);
        const line1 = words.slice(0, mid).join(' ');
        const line2 = words.slice(mid).join(' ');
        const lineH = 13;
        if (ctx.textBaseline === 'middle') {
          ctx.fillText(line1, labelX, labelY - lineH / 2);
          ctx.fillText(line2, labelX, labelY + lineH / 2);
        } else if (ctx.textBaseline === 'bottom') {
          ctx.fillText(line1, labelX, labelY - lineH);
          ctx.fillText(line2, labelX, labelY);
        } else {
          ctx.fillText(line1, labelX, labelY);
          ctx.fillText(line2, labelX, labelY + lineH);
        }
      } else {
        ctx.fillText(text, labelX, labelY);
      }
    }

    // Draw polygons for each alternative with transparent fill and vertex dots
    const colors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

    breakdown.forEach((altData, altIdx) => {
      if (activeAlts[altData.alternative] === false) return;

      const color = colors[altIdx % colors.length];
      const points = [];

      for (let i = 0; i < numCriteria; i++) {
        const crit = criteria[i];
        const val = altData.local_scores?.[crit] || 0.2;
        const normalizedR = Math.min(1.0, val / 0.58) * radius;
        const angle = (i / numCriteria) * 2 * Math.PI - Math.PI / 2;
        const x = centerX + normalizedR * Math.cos(angle);
        const y = centerY + normalizedR * Math.sin(angle);
        points.push({ x, y });
      }

      // Fill and stroke polygon
      ctx.beginPath();
      points.forEach((pt, pIdx) => {
        if (pIdx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.closePath();
      
      ctx.fillStyle = hexToRgba(color, 0.22);
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Vertex dots
      ctx.fillStyle = color;
      points.forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
    });

  }, [synthesisResult, activeAlts]);

  if (!synthesisResult) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Đang tính toán tổng hợp quyết định...</div>;
  }

  const { rankings, criteria_evaluation, overall_consistency_ratio, is_overall_consistent, criteria, breakdown } = synthesisResult;
  const bestAlt = rankings[0];
  const secondAlt = rankings[1] || null;
  const leadMargin = secondAlt ? (bestAlt.percentage - secondAlt.percentage).toFixed(1) : 0;
  const critColors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  const toggleAlt = (altName) => {
    setActiveAlts({ ...activeAlts, [altName]: !activeAlts[altName] });
  };

  return (
    <div className="animate-fade-in" style={{ padding: '0 1.5rem 2rem 1.5rem' }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Unified Step 3 Header */}
        <div className="glass-panel" style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
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
                BƯỚC 03 / 05
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Vector Trọng Số Toàn Cục & Biểu Đồ Radar Đa Chiều</span>
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: '800', color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
              Bước 3: Tổng Hợp Kết Quả & Radar
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.35rem 0 0 0' }}>
              Tổng hợp điểm ưu tiên toàn diện từ ma trận so sánh cặp, đánh giá tính nhất quán và trực quan hóa phân bổ năng lực từng phương án.
            </p>
          </div>
        </div>

        {/* Step 3 Introduction & Guidance Card */}
        <div className="glass-panel" style={{ padding: '1rem 1.4rem', background: 'rgba(15, 23, 42, 0.55)', border: '1px solid rgba(6, 182, 212, 0.25)', display: 'flex', gap: '0.9rem', alignItems: 'flex-start' }}>
          <Info size={18} color="var(--accent-cyan)" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
          <div style={{ fontSize: '0.82rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
            <strong style={{ color: '#ffffff' }}>Giới thiệu Bước 3 (Tổng hợp Kết quả & Biểu đồ Radar):</strong> Hệ thống thực hiện nhân chập vector trọng số tiêu chí với ma trận ưu tiên cục bộ của các phương án để cho ra <span style={{ color: 'var(--accent-cyan)', fontWeight: '600' }}>Điểm số Tổng hợp Cuối cùng (Overall Priorities)</span>. 
            Bạn có thể theo dõi phương án quán quân, kiểm tra mức độ cách biệt so với vị trí thứ 2, đánh giá tính nhất quán toàn cục của cả mô hình (Overall CR), và so sánh trực quan thế mạnh từng ứng viên trên biểu đồ mạng nhện đa giác.
          </div>
        </div>

        {/* 4 Executive KPI Widgets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Phương Án Đứng Đầu
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ffffff', marginTop: '0.3rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {bestAlt?.alternative}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
              <Award size={14} /> Lựa chọn Hạng #1
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-cyan)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Trọng Số Tổng Hợp Toàn Cục
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', marginTop: '0.1rem' }}>
              {bestAlt?.percentage}%
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Điểm số chuẩn hóa: {bestAlt?.score}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Khoảng Cách Dẫn Trước Hạng 2
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#10b981', fontFamily: 'var(--font-mono)', marginTop: '0.1rem' }}>
              +{leadMargin}%
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              so với {secondAlt ? secondAlt.alternative : 'Không có'}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: `4px solid ${is_overall_consistent ? 'var(--success)' : 'var(--danger)'}` }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Chỉ Số Không Nhất Quán Toàn Cục (OIR)
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: is_overall_consistent ? 'var(--success)' : 'var(--danger)', fontFamily: 'var(--font-mono)', marginTop: '0.1rem' }}>
              {(overall_consistency_ratio * 100).toFixed(1)}%
            </div>
            <div style={{ fontSize: '0.8rem', color: is_overall_consistent ? 'var(--success)' : 'var(--danger)' }}>
              {is_overall_consistent ? 'Hợp lệ (< 10%)' : 'Vượt ngưỡng cho phép'}
            </div>
          </div>

        </div>

        {/* 2 Columns: Ranked Leaderboard vs Radar Profile Chart */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
          
          {/* Alternatives Ranking List */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={20} color="var(--accent-cyan)" />
              Bảng Xếp Hạng Phương Án Quyết Định
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {rankings.map((item, idx) => (
                <div 
                  key={idx}
                  style={{
                    background: idx === 0 ? 'rgba(79, 70, 229, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    border: idx === 0 ? '1px solid rgba(79, 70, 229, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '10px',
                    padding: '1rem 1.2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: idx === 0 ? '#f59e0b' : (idx === 1 ? '#94a3b8' : (idx === 2 ? '#b45309' : 'rgba(255,255,255,0.1)')),
                        color: '#ffffff',
                        fontWeight: '800',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {item.rank}
                      </span>
                      <span style={{ fontWeight: '700', fontSize: '1rem' }}>{item.alternative}</span>
                    </div>

                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '800', fontSize: '1.1rem', color: 'var(--accent-cyan)' }}>
                      {item.percentage}%
                    </span>
                  </div>

                  <div style={{ width: '100%', height: '8px', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${item.percentage}%`, 
                        height: '100%', 
                        background: idx === 0 ? 'linear-gradient(90deg, #4f46e5, #06b6d4)' : 'linear-gradient(90deg, #475569, #94a3b8)',
                        borderRadius: '4px',
                        transition: 'width 0.6s ease'
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Radar / Spider Chart */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Compass size={20} color="var(--accent-cyan)" />
                Biểu Đồ Radar Hồ Sơ Đa Tiêu Chí
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bấm chú thích để ẩn/hiện</span>
            </div>

            <canvas 
              ref={canvasRef} 
              width={460} 
              height={350} 
              style={{ maxWidth: '100%', height: 'auto' }}
            />

            {/* Interactive Toggleable Radar Legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.8rem', marginTop: '0.5rem' }}>
              {breakdown.map((b, idx) => {
                const isVisible = activeAlts[b.alternative] !== false;
                const color = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'][idx % 5];

                return (
                  <button
                    key={idx}
                    onClick={() => toggleAlt(b.alternative)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.8rem',
                      background: isVisible ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid ' + (isVisible ? color : 'var(--border-subtle)'),
                      borderRadius: '6px',
                      padding: '0.25rem 0.6rem',
                      color: isVisible ? '#ffffff' : 'var(--text-muted)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: isVisible ? color : 'var(--text-muted)' }} />
                    <span>{b.alternative}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stacked Contribution Breakdown Chart */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '0.4rem' }}>
            Ma Trận Đóng Góp Điểm Theo Từng Tiêu Chí
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.2rem' }}>
            Tỷ lệ phần trăm đóng góp chính xác của từng tiêu chí vào tổng điểm của mỗi phương án.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {breakdown.map((item, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: '700' }}>{item.alternative}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--accent-cyan)' }}>
                    Tổng: {item.percentage}%
                  </span>
                </div>

                <div style={{ display: 'flex', width: '100%', height: '18px', borderRadius: '6px', overflow: 'hidden', background: 'rgba(0,0,0,0.3)' }}>
                  {criteria.map((crit, cIdx) => {
                    const contrib = item.contributions[crit] || 0;
                    const contribPct = contrib * 100;
                    if (contribPct <= 0) return null;
                    return (
                      <div
                        key={cIdx}
                        title={`${crit}: ${contribPct.toFixed(1)}%`}
                        style={{
                          width: `${contribPct}%`,
                          height: '100%',
                          background: critColors[cIdx % critColors.length],
                          transition: 'width 0.3s ease'
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.2rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
            {criteria.map((crit, cIdx) => (
              <div key={cIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: critColors[cIdx % critColors.length] }} />
                <span>{crit} ({(criteria_evaluation.weights_list[cIdx] * 100).toFixed(1)}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            onClick={onBack}
            className="btn btn-secondary"
            style={{ padding: '0.75rem 1.4rem' }}
          >
            <ArrowLeft size={16} /> Quay lại Bước 2: So Sánh Cặp
          </button>

          <button 
            onClick={onProceed}
            className="btn btn-primary"
            style={{ padding: '0.75rem 1.8rem', fontSize: '0.95rem' }}
          >
            Mở Phòng Phân Tích Độ Nhạy (Động & Đồ Thị) <ArrowRight size={18} />
          </button>
        </div>

      </div>
    </div>
  );
}
