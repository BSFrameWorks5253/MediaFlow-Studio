import React, { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { PageKey, PIPELINE_NAV_ORDER } from './types/pipelineStages';
import {
  Sidebar,
  GlobalTelemetry,
  LiquidAuroraBackground,
  ToastNotification,
  ToastMessage,
  SettingsModal,
  CommandPalette,
  KeyboardShortcutsModal,
  StudioErrorBoundary,
  AppLoadingScreen,
  SetupWizard,
  UpdateModal,
} from './components';

import { PipelineProvider } from './context/PipelineContext';

import {
  OverviewPage,
  UploadStructurePage,
  PVSeparatorPage,
  PhotoMatcherPage,
  VideoTransferPage,
  ThumbnailSeparatorPage,
  RemainingCollectorPage,
  EventDistributorPage,
  DoNotUploadPage,
  ExcelMergerPage,
  ActivityPage,
  StandaloneToolsPage,
} from './pages';

const AppContent: React.FC = () => {
  const [activePage, setActivePage] = useState<PageKey>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const p = params.get('page');
      if (p) return p as PageKey;
      const hash = window.location.hash.replace('#', '');
      if (hash) return hash as PageKey;
    }
    return 'overview';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('settings') === 'true';
    }
    return false;
  });
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isAppBooting, setIsAppBooting] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('noboot') !== 'true';
    }
    return true;
  });
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('setup') === 'true';
    }
    return false;
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const { zoomLevel, toggleTheme } = useTheme();

  const [telemetry, setTelemetry] = useState<GlobalTelemetry>({
    active: false,
    speedMbps: 0.0,
    speedStr: '0.0 MB/s',
    threadsActive: 32,
    etaSec: 0,
    etaStr: '00:00',
    driveLetter: '',
    driveFreeGB: 0,
    driveUsedPct: 0,
    progressPct: 0,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === 'true') {
        setTelemetry({
          active: true,
          speedMbps: 842.0,
          speedStr: '842.0 MB/s',
          threadsActive: 32,
          etaSec: 14,
          etaStr: '00:14',
          driveLetter: 'D:',
          driveFreeGB: 412,
          driveUsedPct: 68,
          progressPct: 78,
        });
      }
    }
  }, []);

  const showToast = (text: string, type: ToastMessage['type'] = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    setToasts((prev) => [...prev, { id, text, type }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const updateTelemetry = (data: Partial<GlobalTelemetry>) => {
    setTelemetry((prev) => ({ ...prev, ...data }));
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Ctrl+K / Cmd+K: Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Ctrl+Shift+T: Toggle Theme
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        toggleTheme();
        return;
      }

      // Ctrl+Shift+P: Studio Preferences
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
        return;
      }

      // Alt + 1-9: Direct Stage Jumps
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const num = parseInt(e.key, 10);
        if (!isNaN(num) && num >= 1 && num <= 9) {
          const targetStage = PIPELINE_NAV_ORDER[num - 1];
          if (targetStage) {
            e.preventDefault();
            setActivePage(targetStage);
            return;
          }
        }
      }

      // Ctrl+[ and Ctrl+]: Prev/Next Stage
      if ((e.ctrlKey || e.metaKey) && (e.key === '[' || e.key === ']')) {
        e.preventDefault();
        const curIdx = PIPELINE_NAV_ORDER.indexOf(activePage);
        if (curIdx !== -1) {
          if (e.key === '[' && curIdx > 0) {
            setActivePage(PIPELINE_NAV_ORDER[curIdx - 1]);
          } else if (e.key === ']' && curIdx < PIPELINE_NAV_ORDER.length - 1) {
            setActivePage(PIPELINE_NAV_ORDER[curIdx + 1]);
          }
        }
        return;
      }

      // '?' key: Toggle Keyboard Shortcuts Modal (only when not typing in an input)
      if (!isInput && e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePage, toggleTheme]);

  const renderActivePage = () => {
    switch (activePage) {
      case 'overview':
        return <OverviewPage onNavigate={setActivePage} />;
      case 'uploadStructure':
        return <UploadStructurePage onNavigate={setActivePage} onShowToast={showToast} />;
      case 'pvSeparator':
        return <PVSeparatorPage onNavigate={setActivePage} onShowToast={showToast} onUpdateTelemetry={updateTelemetry} />;
      case 'photoMatcher':
        return <PhotoMatcherPage onNavigate={setActivePage} onShowToast={showToast} />;
      case 'videoTransfer':
        return <VideoTransferPage onNavigate={setActivePage} onShowToast={showToast} />;
      case 'thumbnailSeparator':
        return <ThumbnailSeparatorPage onNavigate={setActivePage} onShowToast={showToast} />;
      case 'remainingCollector':
        return <RemainingCollectorPage onNavigate={setActivePage} onShowToast={showToast} />;
      case 'eventDistributor':
        return <EventDistributorPage onNavigate={setActivePage} onShowToast={showToast} />;
      case 'doNotUpload':
        return <DoNotUploadPage onNavigate={setActivePage} onShowToast={showToast} />;
      case 'excelMerger':
        return <ExcelMergerPage onNavigate={setActivePage} onShowToast={showToast} />;
      case 'activity':
        return <ActivityPage />;
      case 'tools':
        return <StandaloneToolsPage onShowToast={showToast} />;
      default:
        return <OverviewPage onNavigate={setActivePage} />;
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        padding: 8,
        gap: 8,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Dynamic Liquid Aurora Canvas */}
      <LiquidAuroraBackground />

      {/* 270px Non-Compressible Liquid Glass Sidebar Dock */}
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Studio Viewport Shell */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 1,
        }}
      >
        {/* Zoomed Page Viewport Container */}
        <main
          className="glass-panel"
          style={{
            flex: 1,
            borderRadius: 18,
            padding: 16,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
          }}
        >
          <div
            style={{
              flex: 1,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <StudioErrorBoundary onResetPage={() => setActivePage('overview')}>
              <div
                key={activePage}
                className="page-enter"
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {renderActivePage()}
              </div>
            </StudioErrorBoundary>
          </div>
        </main>
      </div>

      {/* Modals & Overlays */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          if (typeof window !== 'undefined' && window.location.search.includes('settings')) {
            const url = new URL(window.location.href);
            url.searchParams.delete('settings');
            window.history.replaceState({}, '', url.toString());
          }
        }}
        onReplayBootLoader={() => setIsAppBooting(true)}
        onOpenSetupWizard={() => setIsSetupWizardOpen(true)}
      />
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={setActivePage}
        onOpenSettings={() => {
          setIsCommandPaletteOpen(false);
          setIsSettingsOpen(true);
        }}
      />
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />

      {/* Universal Auto-Update Notification / Progress Modal (Blueprint 01) */}
      <UpdateModal />

      {/* In-App First-Run Setup Wizard (Blueprint 05) */}
      {isSetupWizardOpen && !isAppBooting && (
        <SetupWizard
          onDone={() => {
            setIsSetupWizardOpen(false);
            if (typeof window !== 'undefined' && window.location.search.includes('setup')) {
              const url = new URL(window.location.href);
              url.searchParams.delete('setup');
              window.history.replaceState({}, '', url.toString());
            }
          }}
        />
      )}

      {/* Studio Initial Boot Loading Screen */}
      {isAppBooting && (
        <AppLoadingScreen
          onComplete={() => {
            setIsAppBooting(false);
          }}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <PipelineProvider>
        <AppContent />
      </PipelineProvider>
    </ThemeProvider>
  );
};

export default App;
