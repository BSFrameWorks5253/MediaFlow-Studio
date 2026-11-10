import React, { useState, useEffect, useMemo } from 'react';
import {
  Film,
  Camera,
  FolderOpen,
  Calendar,
  Layers,
  RefreshCw,
  ExternalLink,
  X,
  Play,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles,
  Copy,
  ChevronRight,
  Maximize2,
  FolderCheck,
  AlertCircle,
} from 'lucide-react';
import { StudioButton } from './StudioButton';
import { DualSyncInspectionResult, DualSyncFileItem } from '../../electron/engines/dualSyncInspector';

export interface InternalDualSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: {
    videoPath?: string;
    photoPath?: string;
    folderName?: string;
    date?: string;
    slot?: string;
  } | null;
  onShowToast: (msg: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
}

export const InternalDualSyncModal: React.FC<InternalDualSyncModalProps> = ({
  isOpen,
  onClose,
  params,
  onShowToast,
}) => {
  const [data, setData] = useState<DualSyncInspectionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<DualSyncFileItem | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<DualSyncFileItem | null>(null);
  const [videoSearch, setVideoSearch] = useState('');
  const [photoSearch, setPhotoSearch] = useState('');

  // Fetch directory inspection
  const loadInspection = async () => {
    if (!params) return;
    setIsLoading(true);
    setSelectedVideo(null);
    setSelectedPhoto(null);
    try {
      if (window.electronAPI?.inspectDualSync) {
        const res = await window.electronAPI.inspectDualSync(params);
        setData(res);
        // Pre-select target clip if present
        const target = res.videoFolder.files.find((f: DualSyncFileItem) => f.isTargetClip);
        if (target) {
          setSelectedVideo(target);
        } else if (res.videoFolder.files.length > 0) {
          setSelectedVideo(res.videoFolder.files[0]);
        }
        if (res.photoFolder.files.length > 0) {
          setSelectedPhoto(res.photoFolder.files[0]);
        }
      }
    } catch (e) {
      console.error('[InternalDualSyncModal] Inspection failed:', e);
      onShowToast('Could not inspect dual-sync folders.', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && params) {
      loadInspection();
    } else {
      setData(null);
      setSelectedVideo(null);
      setSelectedPhoto(null);
      setVideoSearch('');
      setPhotoSearch('');
    }
  }, [isOpen, params?.videoPath, params?.photoPath]);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopyPath = (p: string, label: string) => {
    if (!p) return;
    navigator.clipboard.writeText(p);
    onShowToast(`Copied ${label} path to clipboard!`, 'info');
  };

  const handleOpenExplorer = async (folderPath: string) => {
    if (!folderPath) return;
    if (window.electronAPI?.openPath) {
      await window.electronAPI.openPath(folderPath);
    }
  };

  const handleLaunchAfm = async () => {
    if (!params) return;
    try {
      if (window.electronAPI?.openAfmDualSync) {
        const opened = await window.electronAPI.openAfmDualSync(params);
        if (opened) {
          onShowToast('Opened Dual Sync in Anything File Manager!', 'success');
          onClose();
        } else {
          onShowToast('Anything File Manager is not running or not installed.', 'warning');
        }
      }
    } catch (e) {
      onShowToast('Failed to launch Anything File Manager.', 'danger');
    }
  };

  const filteredVideos = useMemo(() => {
    if (!data) return [];
    if (!videoSearch.trim()) return data.videoFolder.files;
    const q = videoSearch.toLowerCase();
    return data.videoFolder.files.filter((f) => f.fileName.toLowerCase().includes(q));
  }, [data, videoSearch]);

  const filteredPhotos = useMemo(() => {
    if (!data) return [];
    if (!photoSearch.trim()) return data.photoFolder.files;
    const q = photoSearch.toLowerCase();
    return data.photoFolder.files.filter((f) => f.fileName.toLowerCase().includes(q));
  }, [data, photoSearch]);

  if (!isOpen || !params) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(5, 8, 18, 0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '94vw',
          maxWidth: 1400,
          height: '92vh',
          maxHeight: 900,
          backgroundColor: '#0C1120',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 16,
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.75), 0 0 1px rgba(255, 255, 255, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* ── Top Header Bar ─────────────────────────────────────────── */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          {/* Left Title & Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(99, 102, 241, 0.25))',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38BDF8',
              }}
            >
              <Layers size={20} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: 1.1,
                    textTransform: 'uppercase',
                    color: '#38BDF8',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  Dual Sync Inspector
                </span>

                {data?.date && (
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 10.5,
                      fontWeight: 600,
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'var(--secondary-label)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Calendar size={11} />
                    {data.date}
                  </span>
                )}

                {data?.slot && (
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 10.5,
                      fontWeight: 700,
                      backgroundColor: 'rgba(168, 85, 247, 0.15)',
                      border: '1px solid rgba(168, 85, 247, 0.35)',
                      color: '#C084FC',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Clock size={11} />
                    {data.slot}
                  </span>
                )}
              </div>

              <h2
                style={{
                  margin: '3px 0 0 0',
                  fontSize: 17,
                  fontWeight: 700,
                  color: 'var(--label)',
                  letterSpacing: -0.2,
                }}
              >
                {data?.folderName || params.folderName || 'Synchronized Folder Comparison'}
              </h2>
            </div>
          </div>

          {/* Right Action Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {data?.isAfmInstalled && (
              <button
                type="button"
                onClick={handleLaunchAfm}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  fontSize: 11.5,
                  fontWeight: 700,
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  color: '#38BDF8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
                title="Launch this dual-view in Anything File Manager application"
              >
                <ExternalLink size={13} />
                Open in Anything File Manager
              </button>
            )}

            <button
              type="button"
              onClick={loadInspection}
              disabled={isLoading}
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--label)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Refresh Dual-Sync folders"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--secondary-label)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Close Dual Sync Inspector (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Main Dual-Pane Body ───────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            overflow: 'hidden',
          }}
        >
          {/* ═════════════════════════════════════════════════════════════ */}
          {/* LEFT PANE: Video Media & Source Clips                         */}
          {/* ═════════════════════════════════════════════════════════════ */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              borderRight: '1px solid rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
              backgroundColor: 'rgba(0, 0, 0, 0.15)',
            }}
          >
            {/* Left Pane Header */}
            <div
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                backgroundColor: 'rgba(56, 189, 248, 0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Film size={15} color="#38BDF8" />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--label)' }}>
                  Video Clips
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--secondary-label)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  ({data?.videoFolder.files.length || 0} clips • {data?.videoFolder.totalSizeFormatted || '0 B'})
                </span>
              </div>

              {data?.videoFolder.path && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => handleCopyPath(data.videoFolder.path, 'Video')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--tertiary-label)',
                      cursor: 'pointer',
                      padding: 4,
                    }}
                    title="Copy Video Folder Path"
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenExplorer(data.videoFolder.path)}
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 4,
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'var(--secondary-label)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <FolderOpen size={11} />
                    Explorer
                  </button>
                </div>
              )}
            </div>

            {/* Path indicator */}
            <div
              style={{
                padding: '6px 18px',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                fontSize: 10.5,
                fontFamily: 'var(--font-mono)',
                color: 'var(--tertiary-label)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={data?.videoFolder.path || 'No path'}
            >
              {data?.videoFolder.path || 'No incoming video path detected'}
            </div>

            {/* Search Input */}
            <div style={{ padding: '8px 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
              <input
                type="text"
                placeholder="Search video clips..."
                value={videoSearch}
                onChange={(e) => setVideoSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: 6,
                  fontSize: 11.5,
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: 'var(--label)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Video List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {isLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--secondary-label)' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto' }} />
                  <p style={{ fontSize: 12 }}>Inspecting video clips...</p>
                </div>
              ) : filteredVideos.length === 0 ? (
                <div
                  style={{
                    padding: 30,
                    textAlign: 'center',
                    color: 'var(--secondary-label)',
                    border: '1px dashed rgba(255, 255, 255, 0.1)',
                    borderRadius: 10,
                    margin: 10,
                  }}
                >
                  <AlertCircle size={28} color="var(--tertiary-label)" style={{ margin: '0 auto 8px auto' }} />
                  <p style={{ fontSize: 12.5, fontWeight: 600 }}>No video clips found</p>
                  <p style={{ fontSize: 11, color: 'var(--tertiary-label)', marginTop: 4 }}>
                    Verify the video source directory or format.
                  </p>
                </div>
              ) : (
                filteredVideos.map((item, idx) => {
                  const isSelected = selectedVideo?.filePath === item.filePath;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedVideo(item)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        backgroundColor: isSelected
                          ? 'rgba(56, 189, 248, 0.14)'
                          : item.isTargetClip
                          ? 'rgba(99, 102, 241, 0.08)'
                          : 'rgba(255, 255, 255, 0.02)',
                        border: isSelected
                          ? '1px solid rgba(56, 189, 248, 0.45)'
                          : item.isTargetClip
                          ? '1px solid rgba(99, 102, 241, 0.3)'
                          : '1px solid rgba(255, 255, 255, 0.05)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        transition: 'all 0.12s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isSelected ? '#38BDF8' : 'var(--secondary-label)',
                            flexShrink: 0,
                          }}
                        >
                          <Play size={13} />
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: isSelected || item.isTargetClip ? 700 : 500,
                                color: isSelected ? '#38BDF8' : 'var(--label)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {item.fileName}
                            </span>
                            {item.isTargetClip && (
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 800,
                                  letterSpacing: 0.5,
                                  padding: '1px 5px',
                                  borderRadius: 3,
                                  backgroundColor: '#4F46E5',
                                  color: '#FFFFFF',
                                }}
                              >
                                TARGET
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: 10.5,
                              color: 'var(--tertiary-label)',
                              fontFamily: 'var(--font-mono)',
                              marginTop: 2,
                            }}
                          >
                            {item.sizeFormatted} • {item.ext}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.electronAPI?.showItemInFolder) {
                              window.electronAPI.showItemInFolder(item.filePath);
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--tertiary-label)',
                            cursor: 'pointer',
                            padding: 4,
                          }}
                          title="Locate file in folder"
                        >
                          <FolderOpen size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Video Preview Drawer (If video is selected) */}
            {selectedVideo && (
              <div
                style={{
                  padding: 12,
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Play size={12} color="#38BDF8" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--label)' }}>
                      Selected: {selectedVideo.fileName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.electronAPI?.openPath) {
                        window.electronAPI.openPath(selectedVideo.filePath);
                      }
                    }}
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: 4,
                      backgroundColor: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#38BDF8',
                      cursor: 'pointer',
                    }}
                  >
                    Play in External Player
                  </button>
                </div>

                <div
                  style={{
                    maxHeight: 180,
                    borderRadius: 8,
                    overflow: 'hidden',
                    backgroundColor: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <video
                    src={`file://${selectedVideo.filePath}`}
                    controls
                    style={{ maxHeight: 180, width: '100%', objectFit: 'contain' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* RIGHT PANE: Photo Subfolder & Content                         */}
          {/* ═════════════════════════════════════════════════════════════ */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* Right Pane Header */}
            <div
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                backgroundColor: 'rgba(168, 85, 247, 0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Camera size={15} color="#C084FC" />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--label)' }}>
                  Photo Destination Subfolder
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--secondary-label)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  ({data?.photoFolder.files.length || 0} files • {data?.photoFolder.totalSizeFormatted || '0 B'})
                </span>
              </div>

              {data?.photoFolder.path && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => handleCopyPath(data.photoFolder.path, 'Photo')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--tertiary-label)',
                      cursor: 'pointer',
                      padding: 4,
                    }}
                    title="Copy Photo Folder Path"
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenExplorer(data.photoFolder.path)}
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 4,
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'var(--secondary-label)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <FolderOpen size={11} />
                    Explorer
                  </button>
                </div>
              )}
            </div>

            {/* Path indicator */}
            <div
              style={{
                padding: '6px 18px',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                fontSize: 10.5,
                fontFamily: 'var(--font-mono)',
                color: 'var(--tertiary-label)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={data?.photoFolder.path || 'No path'}
            >
              {data?.photoFolder.path || 'No target photo folder linked'}
            </div>

            {/* Search Input */}
            <div style={{ padding: '8px 18px', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
              <input
                type="text"
                placeholder="Search photo files..."
                value={photoSearch}
                onChange={(e) => setPhotoSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: 6,
                  fontSize: 11.5,
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: 'var(--label)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Photo List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {isLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--secondary-label)' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto' }} />
                  <p style={{ fontSize: 12 }}>Inspecting photo files...</p>
                </div>
              ) : filteredPhotos.length === 0 ? (
                <div
                  style={{
                    padding: 30,
                    textAlign: 'center',
                    color: 'var(--secondary-label)',
                    border: '1px dashed rgba(255, 255, 255, 0.1)',
                    borderRadius: 10,
                    margin: 10,
                  }}
                >
                  <FolderCheck size={28} color="#10B981" style={{ margin: '0 auto 8px auto' }} />
                  <p style={{ fontSize: 12.5, fontWeight: 600 }}>Folder is Ready / Empty</p>
                  <p style={{ fontSize: 11, color: 'var(--tertiary-label)', marginTop: 4 }}>
                    Ready to receive incoming matched video footage.
                  </p>
                </div>
              ) : (
                filteredPhotos.map((item, idx) => {
                  const isSelected = selectedPhoto?.filePath === item.filePath;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedPhoto(item)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        backgroundColor: isSelected
                          ? 'rgba(168, 85, 247, 0.14)'
                          : 'rgba(255, 255, 255, 0.02)',
                        border: isSelected
                          ? '1px solid rgba(168, 85, 247, 0.45)'
                          : '1px solid rgba(255, 255, 255, 0.05)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        transition: 'all 0.12s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            backgroundColor: isSelected ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isSelected ? '#C084FC' : 'var(--secondary-label)',
                            flexShrink: 0,
                          }}
                        >
                          <Eye size={13} />
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: isSelected ? 700 : 500,
                                color: isSelected ? '#C084FC' : 'var(--label)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {item.fileName}
                            </span>
                            {item.tag && (
                              <span
                                style={{
                                  fontSize: 9.5,
                                  fontWeight: 800,
                                  padding: '1px 5px',
                                  borderRadius: 3,
                                  backgroundColor:
                                    item.tag === '_P'
                                      ? 'rgba(16, 185, 129, 0.2)'
                                      : item.tag === '_V'
                                      ? 'rgba(168, 85, 247, 0.2)'
                                      : 'rgba(245, 158, 11, 0.2)',
                                  border: `1px solid ${
                                    item.tag === '_P'
                                      ? 'rgba(16, 185, 129, 0.4)'
                                      : item.tag === '_V'
                                      ? 'rgba(168, 85, 247, 0.4)'
                                      : 'rgba(245, 158, 11, 0.4)'
                                  }`,
                                  color:
                                    item.tag === '_P'
                                      ? '#34D399'
                                      : item.tag === '_V'
                                      ? '#C084FC'
                                      : '#FBBF24',
                                  fontFamily: 'var(--font-mono)',
                                }}
                              >
                                {item.tag}
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: 10.5,
                              color: 'var(--tertiary-label)',
                              fontFamily: 'var(--font-mono)',
                              marginTop: 2,
                            }}
                          >
                            {item.sizeFormatted} • {item.ext}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.electronAPI?.showItemInFolder) {
                              window.electronAPI.showItemInFolder(item.filePath);
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--tertiary-label)',
                            cursor: 'pointer',
                            padding: 4,
                          }}
                          title="Locate file in folder"
                        >
                          <FolderOpen size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Photo Preview Drawer */}
            {selectedPhoto && (
              <div
                style={{
                  padding: 12,
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Eye size={12} color="#C084FC" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--label)' }}>
                      Preview: {selectedPhoto.fileName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.electronAPI?.openPath) {
                        window.electronAPI.openPath(selectedPhoto.filePath);
                      }
                    }}
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: 4,
                      backgroundColor: 'rgba(168, 85, 247, 0.15)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      color: '#C084FC',
                      cursor: 'pointer',
                    }}
                  >
                    Open Full Image
                  </button>
                </div>

                <div
                  style={{
                    maxHeight: 180,
                    borderRadius: 8,
                    overflow: 'hidden',
                    backgroundColor: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={`file://${selectedPhoto.filePath}`}
                    alt={selectedPhoto.fileName}
                    style={{ maxHeight: 180, width: '100%', objectFit: 'contain' }}
                    onError={(e) => {
                      // For RAW formats like .ARW or .CR3, fallback to generic graphic
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom Status Strip ───────────────────────────────────── */}
        <div
          style={{
            padding: '10px 24px',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'var(--secondary-label)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span>
              <strong>Video Status:</strong>{' '}
              {data?.videoFolder.exists ? `${data.videoFolder.files.length} clips ready` : 'Folder not found'}
            </span>
            <span>•</span>
            <span>
              <strong>Photo Status:</strong>{' '}
              {data?.photoFolder.exists ? `${data.photoFolder.files.length} items present` : 'Folder not created yet'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10.5, color: 'var(--tertiary-label)' }}>
              Press <strong>Esc</strong> to close
            </span>
            <StudioButton variant="secondary" onClick={onClose} style={{ height: 28, fontSize: 11, padding: '0 12px' }}>
              Close Viewer
            </StudioButton>
          </div>
        </div>
      </div>
    </div>
  );
};
