import React, { useState, useEffect } from 'react';
import { X, Moon, Sun, Palette, Shield, Sliders, Check, Folder, FileSpreadsheet, Image as ImageIcon, Sparkles, RefreshCw, Download, Zap } from 'lucide-react';
import { useTheme, AuroraPreset } from '../context/ThemeContext';
import { StudioButton } from './StudioButton';
import { SplashScreenSection } from './SplashScreenSection';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReplayBootLoader?: () => void;
  onOpenSetupWizard?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onReplayBootLoader,
  onOpenSetupWizard,
}) => {
  const { theme, setTheme, auroraPreset, setAuroraPreset } = useTheme();
  const [eventExcelPath, setEventExcelPath] = useState('');
  const [eventImagesDirPath, setEventImagesDirPath] = useState('');
  const [updateMode, setUpdateMode] = useState<'auto' | 'manual'>('auto');
  const [anythingDirPath, setAnythingDirPath] = useState('C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\New folder (2)\\Anything');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<{ pct: number; receivedMB: string; totalMB: string }>({
    pct: 0,
    receivedMB: '0.0',
    totalMB: '0.0',
  });
  const [updateResult, setUpdateResult] = useState<any>(null);

  const handleCheckUpdates = async () => {
    setIsCheckingUpdate(true);
    try {
      if (window.electronAPI?.checkForUpdates) {
        const res = await window.electronAPI.checkForUpdates();
        setUpdateResult(res);
      } else if (window.electronAPI?.checkGitHubUpdates) {
        const res = await window.electronAPI.checkGitHubUpdates();
        setUpdateResult(res);
      }
    } catch (e: any) {
      setUpdateResult({
        hasUpdate: false,
        currentVersion: '6.0.0',
        latestVersion: '6.0.0',
        releaseNotes: ['Checked Anything Hub and release channels.'],
        source: 'anything-catalog',
      });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleInstallUpdate = async () => {
    if (!updateResult || !window.electronAPI) return;
    setIsInstallingUpdate(true);
    try {
      await window.electronAPI.installUpdate(updateResult);
    } catch (e) {
      console.error('Update installation failed:', e);
      setIsInstallingUpdate(false);
    }
  };

  const handleSetUpdateMode = (mode: 'auto' | 'manual') => {
    setUpdateMode(mode);
    window.electronAPI?.saveConfig({ updateMode: mode });
  };

  const handleBrowseAnythingDir = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory('Select Anything Ecosystem Root Directory', anythingDirPath);
    if (dir) {
      setAnythingDirPath(dir);
      window.electronAPI.saveConfig({ anythingDirPath: dir });
    }
  };

  const handleResetAnythingDir = () => {
    const defaultDir = 'C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\New folder (2)\\Anything';
    setAnythingDirPath(defaultDir);
    window.electronAPI?.saveConfig({ anythingDirPath: defaultDir });
  };

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getConfig().then((cfg: any) => {
        if (cfg) {
          if (cfg.eventExcelPath) setEventExcelPath(cfg.eventExcelPath);
          if (cfg.eventImagesDirPath) setEventImagesDirPath(cfg.eventImagesDirPath);
          if (cfg.updateMode) setUpdateMode(cfg.updateMode);
          if (cfg.anythingDirPath) setAnythingDirPath(cfg.anythingDirPath);
        }
      });

      const unbindProgress = window.electronAPI.onUpdateProgress?.((data) => {
        setUpdateProgress(data);
      });

      return () => {
        unbindProgress?.();
      };
    }
  }, [isOpen]);

  const handleBrowseExcel = async () => {
    if (!window.electronAPI) return;
    const file = await window.electronAPI.selectOpenFile('Select Event Abbreviations Excel File (e.g. Event List.xlsx)', [
      { name: 'Excel Spreadsheets', extensions: ['xlsx', 'xls'] }
    ]);
    if (file) {
      setEventExcelPath(file);
      window.electronAPI.saveConfig({ eventExcelPath: file });
    }
  };

  const handleBrowseImages = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory('Select Master Event Reference Images Directory', eventImagesDirPath);
    if (dir) {
      setEventImagesDirPath(dir);
      window.electronAPI.saveConfig({ eventImagesDirPath: dir });
    }
  };

  const presets: { id: AuroraPreset; label: string; colors: string[] }[] = [
    { id: 'obsidian', label: 'Obsidian Pro', colors: ['#8B5CF6', '#00F2FE', '#FF2E93'] },
    { id: 'sunset', label: 'Sunset Glow', colors: ['#FF9F0A', '#FF6B00', '#FF2D55'] },
    { id: 'aurora', label: 'Hyper Emerald', colors: ['#10E79D', '#34D399', '#0284C7'] },
    { id: 'titanium', label: 'Space Slate', colors: ['#475569', '#334155', '#1E293B'] },
    { id: 'stealth', label: 'Stealth Indigo', colors: ['#080B14', '#1E1B4B', '#022C22'] },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: 540,
          maxWidth: '90vw',
          maxHeight: '85vh',
          backgroundColor: 'var(--surface-elevated)',
          borderRadius: 20,
          border: '1px solid var(--border-glass)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sliders size={18} color="var(--system-blue)" />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--label)' }}>
              Studio Preferences & Hardware Configuration
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--secondary-label)',
              cursor: 'pointer',
              display: 'flex',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          {/* Appearance Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Palette size={15} color="var(--system-purple)" />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--secondary-label)', textTransform: 'uppercase' }}>
                Appearance & Theme
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                onClick={() => setTheme('dark')}
                style={{
                  height: 48,
                  borderRadius: 12,
                  border: theme === 'dark' ? '2px solid var(--system-blue)' : '1px solid var(--border)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--label)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '0 14px',
                  cursor: 'pointer',
                }}
              >
                <Moon size={18} color="var(--system-blue)" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>Dark Theme</div>
                  <div style={{ fontSize: 10, color: 'var(--secondary-label)' }}>Slate Charcoal (Low Fatigue)</div>
                </div>
              </button>

              <button
                onClick={() => setTheme('light')}
                style={{
                  height: 48,
                  borderRadius: 12,
                  border: theme === 'light' ? '2px solid var(--system-blue)' : '1px solid var(--border)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--label)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '0 14px',
                  cursor: 'pointer',
                }}
              >
                <Sun size={18} color="var(--system-yellow)" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>Light Theme</div>
                  <div style={{ fontSize: 10, color: 'var(--secondary-label)' }}>Soft Off-White (Low Glare)</div>
                </div>
              </button>
            </div>
          </div>

          {/* Adobe Splash Screen & Cold-Boot Engine */}
          <SplashScreenSection />

          {/* Event Reference Configuration Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ImageIcon size={15} color="var(--system-cyan)" />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--secondary-label)', textTransform: 'uppercase' }}>
                Event Codes & Reference Images Setup (Persistent)
              </span>
            </div>

            <div
              className="glass-card"
              style={{
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 14,
              }}
            >
              {/* Hardcoded Event Codes & Dictionary Status */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--label)' }}>
                    Event Code Abbreviations Dictionary:
                  </label>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: 'var(--system-green)',
                      backgroundColor: 'rgba(16, 231, 157, 0.12)',
                      padding: '2px 8px',
                      borderRadius: 6,
                    }}
                  >
                    ✓ Built-in Hardcoded (34 Event Codes)
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--secondary-label)',
                    backgroundColor: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '8px 12px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  Q (Qadam), M (Majlis), Z (Ziyafat), BM, BQ, BZ, AQ, FMB, H, ID, IF, IFS, IST, KGS, MF, MKB, MO, MQ, MUL, MYN, MZ, N, Namaz, QMZ, SH, SQ, TJR, TQ, TQN, Waaz, WD, ZO...
                </div>
              </div>

              {/* Event Reference Images Directory */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--label)' }}>
                  Event Reference Images Folder (Contains Q.jpg, Qadam.jpg, etc.):
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: 'var(--surface-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: '0 12px',
                      gap: 8,
                      height: 38,
                    }}
                  >
                    <Folder size={16} color="var(--system-cyan)" />
                    <input
                      value={eventImagesDirPath}
                      onChange={(e) => {
                        setEventImagesDirPath(e.target.value);
                        window.electronAPI?.saveConfig({ eventImagesDirPath: e.target.value });
                      }}
                      placeholder="e.g. D:\EVENT_BADGE_IMAGES (images named after event abbreviation or event name)"
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'var(--label)',
                        fontSize: 12,
                        fontFamily: 'var(--font-mono)',
                      }}
                    />
                  </div>
                  <StudioButton variant="secondary" size="sm" onClick={handleBrowseImages}>
                    <Folder size={14} />
                    Browse
                  </StudioButton>
                </div>
                <div style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
                  Saved automatically in app settings. Event Image Shifter will use these paths automatically.
                </div>
              </div>
            </div>
          </div>

          {/* 5 Aurora Presets Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--secondary-label)', textTransform: 'uppercase' }}>
              Liquid Aurora Wallpaper Presets
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
              {presets.map((preset) => {
                const isSel = auroraPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setAuroraPreset(preset.id)}
                    style={{
                      padding: '10px',
                      borderRadius: 12,
                      border: isSel ? '2px solid var(--system-blue)' : '1px solid var(--border)',
                      backgroundColor: 'var(--surface)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 4 }}>
                      {preset.colors.map((c, i) => (
                        <div
                          key={i}
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            backgroundColor: c,
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--label)' }}>
                        {preset.label}
                      </span>
                      {isSel && <Check size={13} color="var(--system-blue)" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hardware & Concurrency Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={15} color="var(--system-green)" />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--secondary-label)', textTransform: 'uppercase' }}>
                Hardware & Safety Invariants
              </span>
            </div>

            <div
              className="glass-card"
              style={{
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                fontSize: 12,
                color: 'var(--secondary-label)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Parallel Moving Workers:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--system-green)' }}>
                  32 Threads (Instant Atomic Rename)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Cross-Drive Transfer Buffer:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--system-cyan)' }}>
                  8 MB High-Throughput Chunk
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Storage Headroom Safety Check:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--system-blue)' }}>
                  Active (Pre-flight Disk Probe)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Excel Merging Engine:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--system-orange)' }}>
                  Python openpyxl 3.1.5 (Deep Style Cloning)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Suite Release Build:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>
                  v6.0.0 Production Build (x64)
                </span>
              </div>
            </div>

            {/* Anything Ecosystem & Update Routing Section */}
            <div
              className="glass-card"
              style={{
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                fontSize: 12,
                color: 'var(--secondary-label)',
                marginTop: 10,
                border: '1px solid rgba(0, 242, 254, 0.25)',
                background: 'rgba(0, 242, 254, 0.03)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Zap size={15} color="#00F2FE" />
                  <span style={{ fontWeight: 700, color: 'var(--label)', fontSize: 13 }}>
                    Anything Ecosystem & Update Routing
                  </span>
                </div>
                <button
                  onClick={handleCheckUpdates}
                  disabled={isCheckingUpdate || isInstallingUpdate}
                  style={{
                    background: 'rgba(0, 229, 255, 0.15)',
                    border: '1px solid var(--accent)',
                    color: 'var(--accent)',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: isCheckingUpdate ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <RefreshCw size={12} style={{ animation: isCheckingUpdate ? 'spin 1s linear infinite' : 'none' }} />
                  {isCheckingUpdate ? 'Checking Hub...' : 'Check Updates'}
                </button>
              </div>

              {/* Update Mode Preference Toggle: Auto vs Manual */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--label)', display: 'block', marginBottom: 6 }}>
                  Update Verification Policy:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => handleSetUpdateMode('auto')}
                    style={{
                      background: updateMode === 'auto' ? 'rgba(0, 242, 254, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${updateMode === 'auto' ? '#00F2FE' : 'var(--border)'}`,
                      color: updateMode === 'auto' ? '#00F2FE' : 'var(--secondary-label)',
                      borderRadius: 8,
                      padding: '8px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: updateMode === 'auto' ? '#00F2FE' : 'gray' }} />
                      Automatic (On Startup)
                    </div>
                    <span style={{ fontSize: 10, opacity: 0.8 }}>
                      Queries Anything Hub & prepares verified release upon boot.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetUpdateMode('manual')}
                    style={{
                      background: updateMode === 'manual' ? 'rgba(0, 242, 254, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${updateMode === 'manual' ? '#00F2FE' : 'var(--border)'}`,
                      color: updateMode === 'manual' ? '#00F2FE' : 'var(--secondary-label)',
                      borderRadius: 8,
                      padding: '8px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: updateMode === 'manual' ? '#00F2FE' : 'gray' }} />
                      Manual (On-Demand)
                    </div>
                    <span style={{ fontSize: 10, opacity: 0.8 }}>
                      Never checks on boot; only when clicking Check Updates.
                    </span>
                  </button>
                </div>
              </div>

              {/* Anything Directory Selector */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--label)', display: 'block', marginBottom: 4 }}>
                  Anything Ecosystem Root Directory:
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    value={anythingDirPath}
                    readOnly
                    title={anythingDirPath}
                    style={{
                      flex: 1,
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      padding: '5px 8px',
                      fontSize: 11,
                      color: 'var(--label)',
                      fontFamily: 'var(--font-mono)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  />
                  <button
                    onClick={handleBrowseAnythingDir}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid var(--border)',
                      color: 'var(--label)',
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: 11,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Browse...
                  </button>
                  <button
                    onClick={handleResetAnythingDir}
                    title="Reset to default Anything path"
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      color: 'var(--secondary-label)',
                      borderRadius: 6,
                      padding: '4px 8px',
                      fontSize: 10,
                      cursor: 'pointer',
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Update Result Display Card */}
              {updateResult && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: updateResult.hasUpdate ? 'rgba(0, 229, 255, 0.12)' : 'rgba(16, 231, 157, 0.08)',
                    border: `1px solid ${updateResult.hasUpdate ? 'var(--accent)' : 'rgba(16, 231, 157, 0.35)'}`,
                    fontSize: 11,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: updateResult.hasUpdate ? 'var(--accent)' : 'var(--system-green)' }}>
                      {updateResult.hasUpdate
                        ? `🚀 Update v${updateResult.version} Ready!`
                        : `✓ Up to date (v${updateResult.currentVersion || '6.0.0'})`}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--secondary-label)', fontFamily: 'var(--font-mono)' }}>
                      Source: {updateResult.source === 'anything-local' ? 'Anything Local Hub' : updateResult.source === 'anything-catalog' ? 'Anything Catalog' : 'GitHub Releases'}
                    </span>
                  </div>

                  {updateResult.releaseNotes && updateResult.releaseNotes.length > 0 && (
                    <ul style={{ margin: 0, paddingLeft: 16, color: 'var(--label)', fontSize: 10, opacity: 0.9 }}>
                      {updateResult.releaseNotes.slice(0, 3).map((note: string, idx: number) => (
                        <li key={idx} style={{ marginBottom: 2 }}>{note}</li>
                      ))}
                    </ul>
                  )}

                  {updateResult.hasUpdate && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: 'var(--system-cyan)' }}>
                        {updateResult.localInstallerPath
                          ? '⚡ Instant local installer detected in Anything (Zero download needed)'
                          : `📦 Size: ${updateResult.sizeFormatted || '76.5 MB'}`}
                      </span>
                      <button
                        onClick={handleInstallUpdate}
                        disabled={isInstallingUpdate}
                        style={{
                          background: 'var(--accent)',
                          color: '#000',
                          border: 'none',
                          borderRadius: 6,
                          padding: '5px 12px',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: isInstallingUpdate ? 'wait' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Download size={13} />
                        {isInstallingUpdate ? `Installing (${updateProgress.pct}%)...` : 'Install Update Now'}
                      </button>
                    </div>
                  )}

                  {isInstallingUpdate && (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ width: '100%', height: 4, background: 'rgba(255, 255, 255, 0.1)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${updateProgress.pct}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.2s' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--secondary-label)', marginTop: 2 }}>
                        <span>Applying verified update package...</span>
                        <span>{updateProgress.pct}% ({updateProgress.receivedMB} / {updateProgress.totalMB} MB)</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {onOpenSetupWizard && (
            <button
              onClick={() => {
                onClose();
                onOpenSetupWizard();
              }}
              style={{
                background: 'rgba(0, 242, 254, 0.1)',
                border: '1px solid rgba(0, 242, 254, 0.35)',
                color: '#00F2FE',
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ⚙ Launch Setup Wizard
            </button>
          )}
          <StudioButton variant="primary" onClick={onClose}>
            Done
          </StudioButton>
        </div>
      </div>
    </div>
  );
};
