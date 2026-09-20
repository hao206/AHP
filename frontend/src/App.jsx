import React, { useState, useEffect, Component } from 'react';
import Navbar from './components/Navbar';
import HierarchyStep from './components/HierarchyStep';
import PairwiseStep from './components/PairwiseStep';
import ResultsStep from './components/ResultsStep';
import SensitivityStep from './components/SensitivityStep';
import HybridTopsisStep from './components/HybridTopsisStep';
import ImportModal from './components/ImportModal';
import { synthesizeHierarchyAPI, exportExcelAPI } from './utils/ahpClient';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '560px',
            padding: '2.5rem 2rem',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(15, 23, 42, 0.95) 100%)'
          }}>
            <AlertTriangle size={48} color="#ef4444" style={{ margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff', marginBottom: '0.5rem' }}>
              Đã Xảy Ra Sự Cố Hiển Thị
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              {this.state.error?.message || 'Có lỗi không xác định xảy ra trong tiến trình tính toán hoặc kết xuất giao diện.'}
            </p>
            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
              >
                <RefreshCw size={15} style={{ marginRight: '0.4rem' }} /> Tải Lại Trang
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  if (this.props.onReset) this.props.onReset();
                }}
              >
                Quay Lại Bước 1
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const TEMPLATES = {
  'template-vendor-selection': {
    id: 'project-erp-selection',
    title: 'Lựa chọn Giải pháp Phần mềm ERP Doanh nghiệp',
    goal: 'Chọn Nền tảng ERP Doanh nghiệp Tối ưu',
    criteria: ['Chi phí Triển khai', 'Tính năng Nghiệp vụ', 'Uy tín Nhà cung cấp & SLA', 'Khả năng Mở rộng'],
    alternatives: ['SAP S/4HANA Enterprise', 'Oracle Cloud ERP', 'Odoo Enterprise Edition'],
    criteria_matrix: [
      [1.0, 0.3333, 2.0, 0.5],
      [3.0, 1.0, 4.0, 2.0],
      [0.5, 0.25, 1.0, 0.3333],
      [2.0, 0.5, 3.0, 1.0]
    ],
    alt_matrices: {
      'Chi phí Triển khai': [
        [1.0, 0.5, 0.2],
        [2.0, 1.0, 0.25],
        [5.0, 4.0, 1.0]
      ],
      'Tính năng Nghiệp vụ': [
        [1.0, 2.0, 5.0],
        [0.5, 1.0, 3.0],
        [0.2, 0.3333, 1.0]
      ],
      'Uy tín Nhà cung cấp & SLA': [
        [1.0, 1.5, 4.0],
        [0.6667, 1.0, 3.0],
        [0.25, 0.3333, 1.0]
      ],
      'Khả năng Mở rộng': [
        [1.0, 1.0, 3.0],
        [1.0, 1.0, 3.0],
        [0.3333, 0.3333, 1.0]
      ]
    }
  },
  'template-hr-recruitment': {
    id: 'project-hr-cto',
    title: 'Tuyển dụng Giám đốc Kỹ thuật (CTO / Tech Lead)',
    goal: 'Tuyển chọn Giám đốc Kỹ thuật Tối ưu cho Doanh nghiệp',
    criteria: ['Năng lực Kiến trúc & Kỹ thuật', 'Kỹ năng Quản lý Đội ngũ', 'Văn hóa & Đạo đức Nghề nghiệp', 'Mức lương & Chi phí Đãi ngộ'],
    alternatives: ['Ứng viên A (Senior Architect)', 'Ứng viên B (Engineering Manager)', 'Ứng viên C (Startup Founder)'],
    criteria_matrix: [
      [1.0, 2.0, 3.0, 4.0],
      [0.5, 1.0, 2.0, 3.0],
      [0.3333, 0.5, 1.0, 2.0],
      [0.25, 0.3333, 0.5, 1.0]
    ],
    alt_matrices: {
      'Năng lực Kiến trúc & Kỹ thuật': [
        [1.0, 3.0, 2.0],
        [0.3333, 1.0, 0.5],
        [0.5, 2.0, 1.0]
      ],
      'Kỹ năng Quản lý Đội ngũ': [
        [1.0, 0.3333, 0.5],
        [3.0, 1.0, 2.0],
        [2.0, 0.5, 1.0]
      ],
      'Văn hóa & Đạo đức Nghề nghiệp': [
        [1.0, 1.0, 2.0],
        [1.0, 1.0, 2.0],
        [0.5, 0.5, 1.0]
      ],
      'Mức lương & Chi phí Đãi ngộ': [
        [1.0, 0.5, 0.3333],
        [2.0, 1.0, 0.5],
        [3.0, 2.0, 1.0]
      ]
    }
  },
  'template-laptop-procurement': {
    id: 'project-laptop-procurement',
    title: 'Mua sắm Thiết bị / Laptop cho Đội ngũ R&D Kỹ thuật',
    goal: 'Lựa chọn Dòng Laptop Chuyên dụng Phù hợp Nhất',
    criteria: ['Hiệu năng Xử lý & Đồ họa', 'Màn hình & Độ chuẩn màu', 'Thời lượng Pin & Tản nhiệt', 'Chi phí & Bảo hành Chính hãng'],
    alternatives: ['MacBook Pro 16 M3 Max', 'Dell XPS 16 Creator', 'ThinkPad P1 Gen 6 Workstation'],
    criteria_matrix: [
      [1.0, 3.0, 2.0, 2.0],
      [0.3333, 1.0, 0.5, 0.5],
      [0.5, 2.0, 1.0, 1.0],
      [0.5, 2.0, 1.0, 1.0]
    ],
    alt_matrices: {
      'Hiệu năng Xử lý & Đồ họa': [
        [1.0, 2.0, 3.0],
        [0.5, 1.0, 1.5],
        [0.3333, 0.6667, 1.0]
      ],
      'Màn hình & Độ chuẩn màu': [
        [1.0, 2.0, 2.0],
        [0.5, 1.0, 1.0],
        [0.5, 1.0, 1.0]
      ],
      'Thời lượng Pin & Tản nhiệt': [
        [1.0, 4.0, 3.0],
        [0.25, 1.0, 0.6667],
        [0.3333, 1.5, 1.0]
      ],
      'Chi phí & Bảo hành Chính hãng': [
        [1.0, 0.5, 0.3333],
        [2.0, 1.0, 0.6667],
        [3.0, 1.5, 1.0]
      ]
    }
  },
  'template-location-selection': {
    id: 'project-location-selection',
    title: 'Lựa chọn Địa điểm Mở Chi nhánh / Nhà máy Mới',
    goal: 'Chọn Vị trí Đặt Trụ sở Chi nhánh Kinh doanh Tối ưu',
    criteria: ['Chi phí Thuê & Hạ tầng', 'Giao thông & Tiếp cận Khách hàng', 'Nguồn Nhân lực Xung quanh', 'Tiềm năng Mở rộng Quy mô'],
    alternatives: ['Khu Trung tâm CBD (Quận 1)', 'Khu Công nghệ Cao (Quận 9)', 'Khu Đô thị Mới (Thủ Thiêm)'],
    criteria_matrix: [
      [1.0, 0.5, 2.0, 1.0],
      [2.0, 1.0, 3.0, 2.0],
      [0.5, 0.3333, 1.0, 0.5],
      [1.0, 0.5, 2.0, 1.0]
    ],
    alt_matrices: {
      'Chi phí Thuê & Hạ tầng': [
        [1.0, 0.25, 0.3333],
        [4.0, 1.0, 2.0],
        [3.0, 0.5, 1.0]
      ],
      'Giao thông & Tiếp cận Khách hàng': [
        [1.0, 4.0, 2.0],
        [0.25, 1.0, 0.3333],
        [0.5, 3.0, 1.0]
      ],
      'Nguồn Nhân lực Xung quanh': [
        [1.0, 2.0, 1.0],
        [0.5, 1.0, 0.5],
        [1.0, 2.0, 1.0]
      ],
      'Tiềm năng Mở rộng Quy mô': [
        [1.0, 0.2, 0.3333],
        [5.0, 1.0, 2.0],
        [3.0, 0.5, 1.0]
      ]
    }
  },
  'template-car-purchase': {
    id: 'project-car-purchase',
    title: 'Mua sắm Đội xe Doanh nghiệp Điều hành',
    goal: 'Mua sắm Dòng xe Sedan Điều hành Tốt nhất',
    criteria: ['Chi phí Mua sắm', 'Chỉ số An toàn', 'Tiết kiệm Nhiên liệu & Eco', 'Phong cách & Tiện nghi'],
    alternatives: ['Toyota Camry Hybrid', 'Honda Accord Executive', 'Mazda 6 Signature'],
    criteria_matrix: [
      [1.0, 0.3333, 3.0, 2.0],
      [3.0, 1.0, 5.0, 4.0],
      [0.3333, 0.2, 1.0, 0.5],
      [0.5, 0.25, 2.0, 1.0]
    ],
    alt_matrices: {
      'Chi phí Mua sắm': [
        [1.0, 1.5, 0.6667],
        [0.6667, 1.0, 0.5],
        [1.5, 2.0, 1.0]
      ],
      'Chỉ số An toàn': [
        [1.0, 1.0, 2.0],
        [1.0, 1.0, 2.0],
        [0.5, 0.5, 1.0]
      ],
      'Tiết kiệm Nhiên liệu & Eco': [
        [1.0, 2.0, 3.0],
        [0.5, 1.0, 2.0],
        [0.3333, 0.5, 1.0]
      ],
      'Phong cách & Tiện nghi': [
        [1.0, 0.5, 0.3333],
        [2.0, 1.0, 0.5],
        [3.0, 2.0, 1.0]
      ]
    }
  },
  'template-cloud-provider': {
    id: 'project-cloud-eval',
    title: 'Đánh giá Hạ tầng Điện toán Đám mây Toàn cầu',
    goal: 'Lựa chọn Nhà cung cấp Đám mây Công cộng Chính',
    criteria: ['Độ trễ & Thời gian Uptime', 'Chi phí Dịch vụ & TCO', 'Công nghệ AI & Phân tích', 'Bảo mật Doanh nghiệp'],
    alternatives: ['Amazon Web Services (AWS)', 'Microsoft Azure', 'Google Cloud Platform (GCP)'],
    criteria_matrix: [
      [1.0, 2.0, 0.5, 1.0],
      [0.5, 1.0, 0.3333, 0.5],
      [2.0, 3.0, 1.0, 2.0],
      [1.0, 2.0, 0.5, 1.0]
    ],
    alt_matrices: {
      'Độ trễ & Thời gian Uptime': [
        [1.0, 1.5, 1.2],
        [0.6667, 1.0, 0.8],
        [0.8333, 1.25, 1.0]
      ],
      'Chi phí Dịch vụ & TCO': [
        [1.0, 0.8, 0.5],
        [1.25, 1.0, 0.6667],
        [2.0, 1.5, 1.0]
      ],
      'Công nghệ AI & Phân tích': [
        [1.0, 0.5, 0.25],
        [2.0, 1.0, 0.5],
        [4.0, 2.0, 1.0]
      ],
      'Bảo mật Doanh nghiệp': [
        [1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0]
      ]
    }
  },
  'template-wikipedia-leader': {
    id: 'project-wikipedia-leader',
    title: 'Bầu Chọn Lãnh Đạo Xuất Sắc (Wikipedia Leader Benchmark)',
    goal: 'Bầu chọn Lãnh đạo Đội ngũ Xuất sắc Nhất',
    criteria: ['Kinh nghiệm', 'Học vấn & Bằng cấp', 'Sức hút & Uy tín (Charisma)', 'Độ tuổi & Năng lượng'],
    alternatives: ['Tom', 'Dick', 'Harry'],
    criteria_matrix: [
      [1.0, 4.0, 3.0, 7.0],
      [0.25, 1.0, 0.3333, 3.0],
      [0.3333, 3.0, 1.0, 5.0],
      [0.1428, 0.3333, 0.2, 1.0]
    ],
    alt_matrices: {
      'Kinh nghiệm': [
        [1.0, 0.25, 4.0],
        [4.0, 1.0, 9.0],
        [0.25, 0.1111, 1.0]
      ],
      'Học vấn & Bằng cấp': [
        [1.0, 3.0, 0.2],
        [0.3333, 1.0, 0.1428],
        [5.0, 7.0, 1.0]
      ],
      'Sức hút & Uy tín (Charisma)': [
        [1.0, 5.0, 9.0],
        [0.2, 1.0, 4.0],
        [0.1111, 0.25, 1.0]
      ],
      'Độ tuổi & Năng lượng': [
        [1.0, 0.3333, 5.0],
        [3.0, 1.0, 9.0],
        [0.2, 0.1111, 1.0]
      ]
    }
  }
};

export default function App() {
  const [project, setProject] = useState(TEMPLATES['template-vendor-selection']);
  const [currentStep, setCurrentStep] = useState(1);
  const [synthesisResult, setSynthesisResult] = useState(null);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [customTemplates, setCustomTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem('ahp_custom_templates');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    synthesizeHierarchyAPI(project).then(res => {
      setSynthesisResult(res);
    });
  }, [project]);

  const handleSaveCustomTemplate = (customName) => {
    const templateId = `custom-${Date.now()}`;
    const name = customName?.trim() || project.title || 'Mẫu Cá Nhân Hóa Của Tôi';
    const newTemplate = {
      ...project,
      id: templateId,
      title: name,
      isCustom: true,
      createdAt: new Date().toLocaleDateString('vi-VN')
    };

    const updated = {
      ...customTemplates,
      [templateId]: newTemplate
    };
    setCustomTemplates(updated);
    try {
      localStorage.setItem('ahp_custom_templates', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    return templateId;
  };

  const handleDeleteCustomTemplate = (templateId) => {
    const updated = { ...customTemplates };
    delete updated[templateId];
    setCustomTemplates(updated);
    try {
      localStorage.setItem('ahp_custom_templates', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoadTemplate = (templateKey) => {
    if (customTemplates[templateKey]) {
      setProject(customTemplates[templateKey]);
      setCurrentStep(1);
    } else if (TEMPLATES[templateKey]) {
      setProject(TEMPLATES[templateKey]);
      setCurrentStep(1);
    }
  };

  const handleImportSuccess = (importedProject) => {
    setProject(importedProject);
    setCurrentStep(1);
  };

  const handleNewProject = () => {
    const fresh = {
      id: `project-${Date.now()}`,
      title: 'Mô hình Quyết định Chiến lược Mới',
      goal: 'Xác định Phương án Chiến lược Tối ưu',
      criteria: ['Phù hợp Chiến lược', 'Chi phí & Vốn Đầu tư', 'Giảm thiểu Rủi ro'],
      alternatives: ['Phương án Alpha', 'Phương án Beta', 'Phương án Gamma'],
      criteria_matrix: [
        [1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0]
      ],
      alt_matrices: {
        'Phù hợp Chiến lược': [[1.0, 1.0, 1.0], [1.0, 1.0, 1.0], [1.0, 1.0, 1.0]],
        'Chi phí & Vốn Đầu tư': [[1.0, 1.0, 1.0], [1.0, 1.0, 1.0], [1.0, 1.0, 1.0]],
        'Giảm thiểu Rủi ro': [[1.0, 1.0, 1.0], [1.0, 1.0, 1.0], [1.0, 1.0, 1.0]]
      }
    };
    setProject(fresh);
    setCurrentStep(1);
  };

  const handleBlankProject = () => {
    const blank = {
      id: `project-blank-${Date.now()}`,
      title: 'Mô hình Quyết định Tùy biến (Trống)',
      goal: '',
      criteria: ['Tiêu chí A', 'Tiêu chí B'],
      alternatives: ['Phương án 1', 'Phương án 2'],
      criteria_matrix: [
        [1.0, 1.0],
        [1.0, 1.0]
      ],
      alt_matrices: {
        'Tiêu chí A': [[1.0, 1.0], [1.0, 1.0]],
        'Tiêu chí B': [[1.0, 1.0], [1.0, 1.0]]
      }
    };
    setProject(blank);
    setCurrentStep(1);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${project.title.replace(/\s+/g, "_")}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    await exportExcelAPI(project);
    setIsExportingExcel(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar 
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        builtInTemplates={TEMPLATES}
        customTemplates={customTemplates}
        onLoadTemplate={handleLoadTemplate}
        onNewProject={handleNewProject}
        onBlankProject={handleBlankProject}
        onDeleteCustomTemplate={handleDeleteCustomTemplate}
        onOpenImport={() => setIsImportOpen(true)}
        onExportJSON={handleExportJSON}
        onExportExcel={handleExportExcel}
        isExportingExcel={isExportingExcel}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      <main style={{ flex: 1 }}>
        <ErrorBoundary onReset={() => setCurrentStep(1)}>
          {currentStep === 1 && (
            <HierarchyStep 
              project={project} 
              setProject={setProject} 
              onProceed={() => setCurrentStep(2)} 
              onSaveCustomTemplate={handleSaveCustomTemplate}
              onBlankProject={handleBlankProject}
            />
          )}

          {currentStep === 2 && (
            <PairwiseStep 
              project={project} 
              setProject={setProject} 
              onProceed={() => setCurrentStep(3)}
              onBack={() => setCurrentStep(1)}
            />
          )}

          {currentStep === 3 && (
            <ResultsStep 
              project={project}
              synthesisResult={synthesisResult}
              onProceed={() => setCurrentStep(4)}
              onBack={() => setCurrentStep(2)}
            />
          )}

          {currentStep === 4 && (
            <SensitivityStep 
              project={project}
              synthesisResult={synthesisResult}
              onBack={() => setCurrentStep(3)}
            />
          )}

          {currentStep === 5 && (
            <HybridTopsisStep
              project={project}
              synthesisResult={synthesisResult}
              onBack={() => setCurrentStep(4)}
            />
          )}
        </ErrorBoundary>
      </main>

      <footer style={{
        padding: '1.2rem',
        textAlign: 'center',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        borderTop: '1px solid var(--border-color)',
        background: 'rgba(10, 13, 20, 0.85)'
      }}>
        AHP Decision Studio • Hệ thống Hỗ trợ Ra Quyết định Đa Tiêu chí Doanh nghiệp
      </footer>
    </div>
  );
}
