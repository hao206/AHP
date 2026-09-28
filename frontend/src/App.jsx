import React, { useState, useEffect, useRef, useCallback, Component } from 'react';
import Navbar from './components/Navbar';
import HierarchyStep from './components/HierarchyStep';
import PairwiseStep from './components/PairwiseStep';
import ResultsStep from './components/ResultsStep';
import SensitivityStep from './components/SensitivityStep';
import HybridTopsisStep from './components/HybridTopsisStep';
import ImportModal from './components/ImportModal';
import { 
  synthesizeHierarchyAPI, exportExcelAPI, getProjectAPI, saveProjectAPI, 
  setProjectAccessToken, evaluateLocalSynthesis 
} from './utils/ahpClient';
import { ahpSignature, missingProjectComparisons, invalidProjectComparisons } from './utils/projectCompleteness.js';
import {
  ACTIVE_STEP_KEY, copyAsNewProject, createProjectSaveQueue,
  hasUnsyncedChanges, markProjectSynced, nextUpdatedAt, readActiveProject,
  readActiveProjectId, readActiveStep, serverProjectIsNewer, writeLocalProject,
} from './utils/projectPersistence.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation, faArrowsRotate } from '@fortawesome/free-solid-svg-icons';

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
            <FontAwesomeIcon icon={faTriangleExclamation} style={{ fontSize: '42px', color: '#ef4444', margin: '0 auto 1rem auto' }} />
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
                <FontAwesomeIcon icon={faArrowsRotate} style={{ fontSize: '14px', marginRight: '0.4rem' }} /> Tải Lại Trang
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
  const [project, setProjectState] = useState(() => readActiveProject() || copyAsNewProject(TEMPLATES['template-vendor-selection']));
  const [currentStep, setCurrentStep] = useState(() => {
    const step = readActiveStep();
    const local = readActiveProject();
    return step > 2 && local && (missingProjectComparisons(local).length || invalidProjectComparisons(local).length) ? 2 : step;
  });
  const [isRestoring, setIsRestoring] = useState(() => Boolean(readActiveProjectId()));
  const [saveStatus, setSaveStatus] = useState(() => readActiveProjectId() ? 'restoring' : 'pending');
  const projectRef = useRef(project);
  const startupProjectIdRef = useRef(project.id);
  const activatedDuringRecoveryRef = useRef(false);
  const editedDuringRecoveryRef = useRef(false);
  const saveTimerRef = useRef(null);
  const saveQueueRef = useRef(null);

  useEffect(() => { projectRef.current = project; }, [project]);

  useEffect(() => {
    let mounted = true;
    saveQueueRef.current = createProjectSaveQueue(saveProjectAPI, (snapshot, _saved, error) => {
      if (!mounted) return;
      if (!error) {
        try { markProjectSynced(snapshot); } catch (storageError) { console.warn('Project sync marker failed:', storageError); }
      }
      if (error?.status === 409 && projectRef.current.id === snapshot.id) {
        saveQueueRef.current?.cancel(snapshot.id);
        const fork = copyAsNewProject(projectRef.current);
        try { writeLocalProject(fork); } catch (storageError) { console.warn('Local project backup failed:', storageError); }
        projectRef.current = fork;
        setProjectState(fork);
        setSaveStatus('pending');
        return;
      }
      if (projectRef.current.id !== snapshot.id || projectRef.current.updated_at !== snapshot.updated_at) return;
      if (error) {
        console.warn('Project autosave failed:', error);
        setSaveStatus(error.status === 401 ? 'auth' : 'local');
      } else {
        setSaveStatus('saved');
      }
    });
    return () => { mounted = false; saveQueueRef.current = null; };
  }, []);

  const setProject = useCallback(update => {
    editedDuringRecoveryRef.current = true;
    setSaveStatus('pending');
    setProjectState(previous => {
      const next = typeof update === 'function' ? update(previous) : update;
      if (next === previous) return previous;
      return { ...next, updated_at: nextUpdatedAt(previous) };
    });
  }, []);

  const saveActiveProject = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const snapshot = projectRef.current;
    try {
      writeLocalProject(snapshot);
    } catch (error) {
      console.warn('Local project backup failed:', error);
    }
    if (isRestoring) return Promise.resolve();
    setSaveStatus('saving');
    return saveQueueRef.current?.enqueue(snapshot) || Promise.resolve();
  }, [isRestoring]);

  useEffect(() => {
    let cancelled = false;
    const activeId = readActiveProjectId();
    if (!activeId) return;
    getProjectAPI(activeId)
      .then(server => {
        if (cancelled || activatedDuringRecoveryRef.current || editedDuringRecoveryRef.current || !server || server.id !== activeId || projectRef.current.id !== startupProjectIdRef.current) return;
        const local = projectRef.current;
        const useServer = local.id !== activeId || serverProjectIsNewer(server, local);
        if (useServer) {
          const recovered = local.id === activeId && hasUnsyncedChanges(local)
            ? copyAsNewProject(local)
            : server;
          try {
            if (recovered === server) markProjectSynced(server);
            writeLocalProject(recovered);
          } catch (storageError) { console.warn('Local project backup failed:', storageError); }
          projectRef.current = recovered;
          setProjectState(recovered);
          if (missingProjectComparisons(recovered).length || invalidProjectComparisons(recovered).length) {
            setCurrentStep(step => step > 2 ? 2 : step);
          }
          setSaveStatus(recovered === server ? 'saved' : 'pending');
        } else {
          setSaveStatus('pending');
        }
      })
      .catch(error => {
        if (!cancelled) {
          console.warn('Project recovery from server failed:', error);
          setSaveStatus(error.status === 401 ? 'auth' : 'local');
        }
      })
      .finally(() => { if (!cancelled) setIsRestoring(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (isRestoring) return;
    try {
      writeLocalProject(project);
    } catch (error) {
      console.warn('Local project backup failed:', error);
    }
    saveTimerRef.current = setTimeout(() => {
      setSaveStatus('saving');
      saveQueueRef.current?.enqueue(project);
    }, 700);
    return () => clearTimeout(saveTimerRef.current);
  }, [project, isRestoring]);

  useEffect(() => {
    try { localStorage.setItem(ACTIVE_STEP_KEY, String(currentStep)); } catch { /* browser storage may be unavailable */ }
  }, [currentStep]);

  useEffect(() => {
    if (isRestoring) return;
    const onOnline = () => { saveActiveProject(); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [isRestoring, saveActiveProject]);

  useEffect(() => {
    if (isRestoring || saveStatus !== 'local') return;
    const retry = window.setInterval(saveActiveProject, 30000);
    return () => window.clearInterval(retry);
  }, [isRestoring, saveStatus, saveActiveProject]);
  const connectProjectBackend = token => {
    setProjectAccessToken(token);
    saveActiveProject();
  };
  const [synthesisState, setSynthesisState] = useState({ signature: null, result: null });
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

  const missingComparisons = missingProjectComparisons(project);
  const invalidComparisons = invalidProjectComparisons(project);
  const isProjectComplete = missingComparisons.length === 0 && invalidComparisons.length === 0;
  const currentAhpSignature = ahpSignature(project);
  let synthesisResult = null;
  if (isProjectComplete) {
    if (synthesisState.signature === currentAhpSignature && synthesisState.result) {
      synthesisResult = synthesisState.result;
    } else {
      try {
        synthesisResult = evaluateLocalSynthesis(JSON.parse(currentAhpSignature));
      } catch (e) {
        console.warn('Local synthesis calculation failed:', e);
      }
    }
  }

  useEffect(() => {
    let cancelled = false;
    const ahpProject = JSON.parse(currentAhpSignature);
    if (missingProjectComparisons(ahpProject).length > 0 || invalidProjectComparisons(ahpProject).length > 0) {
      return;
    }
    synthesizeHierarchyAPI(ahpProject)
      .then(res => { if (!cancelled) setSynthesisState({ signature: currentAhpSignature, result: res }); })
      .catch(err => { if (!cancelled) console.error('Synthesis failed:', err); });
    return () => { cancelled = true; };
  }, [currentAhpSignature]);

  const activateProject = source => {
    activatedDuringRecoveryRef.current = true;
    saveActiveProject();
    const nextProject = copyAsNewProject(source);
    try { writeLocalProject(nextProject); } catch (error) { console.warn('Local project backup failed:', error); }
    setProject(nextProject);
    setCurrentStep(1);
  };

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
      activateProject(customTemplates[templateKey]);
    } else if (TEMPLATES[templateKey]) {
      activateProject(TEMPLATES[templateKey]);
    }
  };

  const handleImportSuccess = (importedProject) => {
    activateProject(importedProject);
  };

  const handleNewProject = () => {
    const fresh = {
      id: `project-${Date.now()}`,
      title: 'Mô hình Quyết định Chiến lược Mới',
      goal: 'Xác định Phương án Chiến lược Tối ưu',
      criteria: ['Phù hợp Chiến lược', 'Chi phí & Vốn Đầu tư', 'Giảm thiểu Rủi ro'],
      alternatives: ['Phương án Alpha', 'Phương án Beta', 'Phương án Gamma'],
      criteria_matrix: [
        [1.0, null, null],
        [null, 1.0, null],
        [null, null, 1.0]
      ],
      alt_matrices: {
        'Phù hợp Chiến lược': [[1.0, null, null], [null, 1.0, null], [null, null, 1.0]],
        'Chi phí & Vốn Đầu tư': [[1.0, null, null], [null, 1.0, null], [null, null, 1.0]],
        'Giảm thiểu Rủi ro': [[1.0, null, null], [null, 1.0, null], [null, null, 1.0]]
      }
    };
    activateProject(fresh);
  };

  const handleBlankProject = () => {
    const blank = {
      id: `project-blank-${Date.now()}`,
      title: 'Mô hình Quyết định Tùy biến (Trống)',
      goal: '',
      criteria: ['Tiêu chí A', 'Tiêu chí B'],
      alternatives: ['Phương án 1', 'Phương án 2'],
      criteria_matrix: [
        [1.0, null],
        [null, 1.0]
      ],
      alt_matrices: {
        'Tiêu chí A': [[1.0, null], [null, 1.0]],
        'Tiêu chí B': [[1.0, null], [null, 1.0]]
      }
    };
    activateProject(blank);
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
    if (!isProjectComplete) return;
    saveActiveProject();
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
        saveStatus={saveStatus}
        onSaveProject={saveActiveProject}
        onConnectProject={connectProjectBackend}
        missingComparisonCount={missingComparisons.length}
        invalidComparisonCount={invalidComparisons.length}
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
              missingComparisons={missingComparisons}
              invalidComparisons={invalidComparisons}
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
              setProject={setProject}
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
