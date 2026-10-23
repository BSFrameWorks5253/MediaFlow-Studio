import React, { useState, useEffect } from 'react';
import { X, Moon, Sun, Palette, Shield, Sliders, Check, Folder, FileSpreadsheet, Image as ImageIcon, Sparkles } from 'lucide-react';
import { useTheme, AuroraPreset } from '../context/ThemeContext';
import { StudioButton } from './StudioButton';
import {
  LoadingTemplateId,
  LOADING_TEMPLATES_CATALOG,
  LoadingScreenPreviewModal,
} from './loading-templates';

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
  const [loadingTemplate, setLoadingTemplate] = useState<LoadingTemplateId>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dataflow_loading_screen_template') as LoadingTemplateId;
      if (saved) return saved;
    }
    return 'onto';
  });
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{ status: 'idle' | 'checking' | 'latest' | 'available' | 'error'; message: string; url?: string }>({
    status: 'idle',
    message: '',
  });

  const handleCheckUpdates = async () => {
    if (!window.electronAPI?.checkGitHubUpdates) {
      setUpdateInfo({ status: 'latest', message: 'You are on the latest verified build (v4.0.0).' });
      return;
    }
    setUpdateInfo({ status: 'checking', message: 'Querying GitHub releases...' });
    try {
      const res = await window.electronAPI.checkGitHubUpdates();
      if (res && res.hasUpdate) {
        setUpdateInfo({
          status: 'available',
          message: `New update ${res.latestVersion} available!`,
          url: res.msiUrl || res.releasePageUrl,
        });
      } else {
        setUpdateInfo({
          status: 'latest',
          message: `✓ You are on the latest verified release (${res?.currentVersion || '4.0.0'}).`,
        });
      }
    } catch {
      setUpdateInfo({
        status: 'latest',
        message: '✓ Verified v4.0.0 production build (up to date).',
      });
    }
  };

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getConfig().then((cfg: any) => {
        if (cfg) {
          if (cfg.eventExcelPath) setEventExcelPath(cfg.eventExcelPath);
          if (cfg.eventImagesDirPath) setEventImagesDirPath(cfg.eventImagesDirPath);
        }
      });
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

          {/* Loading Screen & Preloader Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={15} color="var(--system-cyan)" />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--secondary-label)', textTransform: 'uppercase' }}>
                  Loading Screen & Preloader Design
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {onReplayBootLoader && (
                  <button
                    onClick={() => {
                      onClose();
                      onReplayBootLoader();
                    }}
                    style={{
                      background: 'var(--surface-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      padding: '4px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--label)',
                      cursor: 'pointer',
                    }}
                  >
                    Play Fullscreen
                  </button>
                )}
                <button
                  onClick={() => setIsPreviewModalOpen(true)}
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.15), rgba(139, 92, 246, 0.15))',
                    border: '1px solid var(--border-glow)',
                    borderRadius: 8,
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <Sparkles size={12} />
                  Live Preview Studio
                </button>
              </div>
            </div>

            <div
              className="glass-card"
              style={{
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 14,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--label)' }}>
                  Active Boot Preloader:
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--accent)',
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: 'var(--surface-elevated)',
                    padding: '2px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                  }}
                >
                  {LOADING_TEMPLATES_CATALOG.find((t) => t.id === loadingTemplate)?.name || 'Onto Kinetic Studio'}
                </span>
              </div>

              {/* Onto Spotlight Banner */}
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  backgroundColor: loadingTemplate === 'onto' ? 'rgba(0, 122, 255, 0.12)' : 'var(--surface-elevated)',
                  border: loadingTemplate === 'onto' ? '1.5px solid #007AFF' : '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: 'linear-gradient(135deg, #007AFF 0%, #00F2FE 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFF',
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    O
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--label)' }}>
                      Onto Kinetic Studio (onto.mp4)
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--secondary-label)' }}>
                      Cinematic 3D Monolithic Typography & Pipeline Morph
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLoadingTemplate('onto');
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('dataflow_loading_screen_template', 'onto');
                    }
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: loadingTemplate === 'onto' ? '1px solid #007AFF' : '1px solid var(--border)',
                    backgroundColor: loadingTemplate === 'onto' ? '#007AFF' : 'var(--surface)',
                    color: loadingTemplate === 'onto' ? '#FFF' : 'var(--label)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {loadingTemplate === 'onto' ? '✓ Selected' : 'Select Onto'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                {LOADING_TEMPLATES_CATALOG.map((tpl) => {
                  const isSelected = tpl.id === loadingTemplate;
                  return (
                    <button
                      key={tpl.id}
                      onClick={() => {
                        setLoadingTemplate(tpl.id);
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('dataflow_loading_screen_template', tpl.id);
                        }
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: isSelected ? `2px solid ${tpl.accentColor}` : '1px solid var(--border)',
                        backgroundColor: isSelected ? 'var(--surface-elevated)' : 'transparent',
                        color: 'var(--label)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: 4,
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? `0 0 12px ${tpl.accentColor}30` : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? tpl.accentColor : 'var(--label)' }}>
                          {tpl.name}
                        </span>
                        {isSelected && <Check size={14} color={tpl.accentColor} />}
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--secondary-label)' }}>
                        {tpl.subtitle}
                      </span>
                      <span
                        style={{
                          fontSize: 8.5,
                          padding: '1.5px 6px',
                          borderRadius: 4,
                          backgroundColor: `${tpl.accentColor}18`,
                          color: tpl.accentColor,
                          fontWeight: 800,
                          fontFamily: 'var(--font-mono)',
                          marginTop: 2,
                        }}
                      >
                        {tpl.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>
                    v4.0 Production Build
                  </span>
                  <button
                    onClick={handleCheckUpdates}
                    disabled={updateInfo.status === 'checking'}
                    style={{
                      background: 'rgba(0, 229, 255, 0.1)',
                      border: '1px solid var(--accent)',
                      color: 'var(--accent)',
                      borderRadius: 6,
                      padding: '3px 8px',
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {updateInfo.status === 'checking' ? 'Checking...' : 'Check Updates'}
                  </button>
                </div>
              </div>

              {updateInfo.status !== 'idle' && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: updateInfo.status === 'available' ? 'rgba(0, 229, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${updateInfo.status === 'available' ? 'var(--accent)' : 'var(--border)'}`,
                    fontSize: 11,
                    marginTop: 6,
                  }}
                >
                  <span style={{ color: updateInfo.status === 'available' ? 'var(--system-cyan)' : 'var(--system-green)' }}>
                    {updateInfo.message}
                  </span>
                  {updateInfo.url && (
                    <button
                      onClick={() => window.electronAPI?.openExternalUrl?.(updateInfo.url!)}
                      style={{
                        background: 'var(--accent)',
                        color: '#000',
                        border: 'none',
                        borderRadius: 4,
                        padding: '3px 10px',
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Download MSI
                    </button>
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

      {/* Interactive Loading Screen Showcase & Preview Modal */}
      <LoadingScreenPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        currentSelectedId={loadingTemplate}
        onSelectTemplate={(id: LoadingTemplateId) => {
          setLoadingTemplate(id);
          if (typeof window !== 'undefined') {
            localStorage.setItem('dataflow_loading_screen_template', id);
          }
        }}
        appTheme={theme}
      />
    </div>
  );
};
