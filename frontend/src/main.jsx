import React, { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class RootErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('Root uncaught error:', error, info);
  }
  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: '#0a0d14',
          color: '#ffffff',
          fontFamily: 'sans-serif',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '560px',
            padding: '2rem',
            borderRadius: '16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            <h2 style={{ color: '#ef4444', marginBottom: '0.8rem' }}>Đã xảy ra sự cố hiển thị</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem', wordBreak: 'break-word' }}>
              {this.state.error?.message || 'Có lỗi không xác định xảy ra.'}
            </p>
            <button
              onClick={this.handleReset}
              style={{
                padding: '0.65rem 1.5rem',
                borderRadius: '8px',
                background: '#06b6d4',
                color: '#000',
                fontWeight: '700',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Khôi phục dữ liệu mặc định & Tải lại
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
)
