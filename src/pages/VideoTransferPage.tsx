import React, { useState, useEffect, useMemo } from 'react';
import {
  Folder,
  Video,
  AlertTriangle,
  RotateCcw,
  Play,
  CheckCircle2,
  FolderCheck,
  ExternalLink,
  FolderOpen,
  AlertCircle,
  Calendar,
  FileQuestion,
  Search,
  RefreshCw,
  Trash2,
  FolderX,
  X,
  ChevronDown,
  ChevronRight,
  Eye,
  Sparkles,
  Filter,
  Link,
  Unlink,
  Layers,
  HardDrive,
  Check,
  Copy,
  Zap,
} from 'lucide-react';
import { StudioButton } from '../components/StudioButton';
import { StorageHeadroomBar } from '../components/StorageHeadroomBar';
import {
  VideoScanResult,
  VideoMatchedPair,
  VideoUnmatchedItem,
  DateFolderStatus,
  EmptyPhotoFolderItem,
  PhotoFolderUnmatchedItem,
} from '../../electron/engines/videoTransfer';
import { usePipeline } from '../context/PipelineContext';
import { PageKey } from '../components/Sidebar';
import { StudioFolderInput } from '../components/StudioFolderInput';
import { OperationLoadingOverlay } from '../components/OperationLoadingOverlay';
import { toUserErrorMessage } from '../utils/errorSanitizer';

interface VideoTransferPageProps {
  onShowToast: (text: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
  onNavigate?: (page: PageKey) => void;
}

export const VideoTransferPage: React.FC<VideoTransferPageProps> = ({ onShowToast, onNavigate }) => {
  const { uploadStructure } = usePipeline();
  const [videoDir, setVideoDir] = useState('');
  const [photoDir, setPhotoDir] = useState('');
  const [transferMode, setTransferMode] = useState<'copy' | 'move'>('copy');
  const [collisionPolicy, setCollisionPolicy] = useState<'skip' | 'keepBoth'>('keepBoth');

  const [scanResult, setScanResult] = useState<VideoScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [lastManifest, setLastManifest] = useState('');

  // Transfer Progress Telemetry
  const [transferProgress, setTransferProgress] = useState<{
    current: number;
    total: number;
    currentFile: string;
    speedStr: string;
    percent: number;
  } | null>(null);

  const [pathErrors, setPathErrors] = useState<{ video?: string; photo?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'matched' | 'unmatched' | 'unmatchedFolders' | 'emptyFolders'>('matched');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('ALL');
  const [showEmptyModal, setShowEmptyModal] = useState(false);
  const [emptyFolders, setEmptyFolders] = useState<EmptyPhotoFolderItem[]>([]);

  // Thumbnail Preview Modal State
  const [previewThumb, setPreviewThumb] = useState<{
    url: string;
    title: string;
    type: '_V' | '_P';
    path: string;
  } | null>(null);

  // Manual Re-assignment / Pairing State
  const [reassigningItem, setReassigningItem] = useState<string | null>(null);

  const [autoMoveToMainData, setAutoMoveToMainData] = useState(true);
  const [isMovingFolder, setIsMovingFolder] = useState(false);
  const [movedResult, setMovedResult] = useState<{ count: number; path: string } | null>(null);
  const [canProceedTransfer, setCanProceedTransfer] = useState(true);

  // Subscribe to Live Transfer Progress IPC
  useEffect(() => {
    if (window.electronAPI?.onVideoTransferProgress) {
      const unsubscribe = window.electronAPI.onVideoTransferProgress((curr, total, file, speed) => {
        const percent = total > 0 ? Math.round((curr / total) * 100) : 0;
        setTransferProgress({
          current: curr,
          total,
          currentFile: file,
          speedStr: speed || 'Streaming',
          percent,
        });
      });
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
    return undefined;
  }, []);

  const totalVideoBytes = useMemo(() => {
    if (!scanResult || !scanResult.matched) return 0;
    return scanResult.matched.reduce((acc, m) => acc + (m.videoSize || 0), 0);
  }, [scanResult]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Unique list of dates present in results
  const availableDates = useMemo(() => {
    if (!scanResult) return [];
    const set = new Set<string>();
    scanResult.matched.forEach((m) => set.add(m.dateFolder));
    scanResult.unmatched.forEach((u) => set.add(u.dateFolder));
    scanResult.videoDates.forEach((vd) => set.add(vd));
    return Array.from(set).sort();
  }, [scanResult]);

  // Date stats helper
  const dateStats = useMemo(() => {
    const stats: Record<string, { matched: number; unmatched: number; total: number }> = {};
    if (!scanResult) return stats;

    scanResult.matched.forEach((m) => {
      const d = m.dateFolder || 'General';
      if (!stats[d]) stats[d] = { matched: 0, unmatched: 0, total: 0 };
      stats[d].matched++;
      stats[d].total++;
    });

    scanResult.unmatched.forEach((u) => {
      const d = u.dateFolder || 'General';
      if (!stats[d]) stats[d] = { matched: 0, unmatched: 0, total: 0 };
      stats[d].unmatched++;
      stats[d].total++;
    });

    return stats;
  }, [scanResult]);

  const handleGoToFolder = async (folderPath?: string) => {
    if (!folderPath || !folderPath.trim()) return;
    try {
      if (window.electronAPI) {
        await window.electronAPI.openPath(folderPath);
        onShowToast('Opened folder in Windows Explorer', 'info');
      }
    } catch (e: any) {
      console.error('Failed to open folder:', e);
      onShowToast(toUserErrorMessage(e, 'Failed to open folder. Please check if the folder still exists.'), 'danger');
    }
  };

  const handleDeleteEmptyFolder = async (folderPath: string, folderName: string) => {
    if (!folderPath) return;
    try {
      if (window.electronAPI && window.electronAPI.deleteEmptyFolder) {
        await window.electronAPI.deleteEmptyFolder(folderPath);
      }
      setEmptyFolders((prev) => prev.filter((f) => f.folderPath !== folderPath));
      setScanResult((prev) =>
        prev
          ? {
              ...prev,
              emptyPhotoFolders: (prev.emptyPhotoFolders || []).filter((f) => f.folderPath !== folderPath),
            }
          : null
      );
      onShowToast(`Deleted empty folder: "${folderName}"`, 'success');
    } catch (e: any) {
      console.error('Failed to delete empty folder:', e);
      onShowToast(toUserErrorMessage(e, 'Failed to delete folder. It may not be empty or is currently in use.'), 'danger');
    }
  };

  const handleDeleteAllEmptyFolders = async () => {
    if (emptyFolders.length === 0) return;
    let count = 0;
    for (const f of emptyFolders) {
      try {
        if (window.electronAPI && window.electronAPI.deleteEmptyFolder) {
          await window.electronAPI.deleteEmptyFolder(f.folderPath);
          count++;
        }
      } catch {}
    }
    setEmptyFolders([]);
    setScanResult((prev) => (prev ? { ...prev, emptyPhotoFolders: [] } : null));
    setShowEmptyModal(false);
    onShowToast(`Deleted ${count} empty folder(s) successfully`, 'success');
  };

  const handleOpenPath = async (targetPath?: string, label?: string) => {
    if (!targetPath || !targetPath.trim()) {
      onShowToast(`No path provided to open${label ? ` for ${label}` : ''}.`, 'warning');
      return;
    }
    if (!window.electronAPI) return;
    try {
      const res = await window.electronAPI.openPath(targetPath);
      if (res && typeof res === 'string' && res.toLowerCase().includes('not exist')) {
        onShowToast('The target folder does not exist or cannot be accessed.', 'warning');
      } else {
        onShowToast(`Opened ${label || 'folder'} in Explorer`, 'info');
      }
    } catch (e: any) {
      console.error('Failed to open path:', e);
      onShowToast(toUserErrorMessage(e, 'Failed to open folder. Please check if the path exists.'), 'danger');
    }
  };

  const handleLocateItem = async (filePath?: string) => {
    if (!filePath || !filePath.trim()) return;
    if (!window.electronAPI) return;
    try {
      window.electronAPI.showItemInFolder(filePath);
      onShowToast('Highlighted item in Windows Explorer', 'info');
    } catch (e: any) {
      console.error('Failed to locate item:', e);
      onShowToast(toUserErrorMessage(e, 'Failed to locate file. Please check if it still exists.'), 'danger');
    }
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    onShowToast(`Copied ${label} to clipboard!`, 'info');
  };

  const handleBrowseVideo = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory('Select Master Video Clips Directory', videoDir);
    if (dir) {
      setVideoDir(dir);
      setPathErrors((prev) => (prev ? { ...prev, video: undefined } : null));
    }
  };

  const handleBrowsePhoto = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory('Select Clean Photo Subfolders Directory', photoDir);
    if (dir) {
      setPhotoDir(dir);
      setPathErrors((prev) => (prev ? { ...prev, photo: undefined } : null));
    }
  };

  const handleScan = async () => {
    setPathErrors(null);
    if (!videoDir.trim() || !photoDir.trim()) {
      onShowToast('Please select both Video and Photo directories', 'warning');
      return;
    }

    setIsScanning(true);
    try {
      // 1. Verify existence of both folders before scanning
      const vidCheck = await window.electronAPI.checkPathExists(videoDir.trim());
      const photoCheck = await window.electronAPI.checkPathExists(photoDir.trim());

      const errs: { video?: string; photo?: string } = {};
      if (!vidCheck.exists) {
        errs.video = 'Video folder does not exist or cannot be accessed.';
      }
      if (!photoCheck.exists) {
        errs.photo = 'Photo folder does not exist or cannot be accessed.';
      }

      if (errs.video || errs.photo) {
        setPathErrors(errs);
        const msg = [errs.video, errs.photo].filter(Boolean).join(' | ');
        onShowToast(`Folder Problem: ${msg}`, 'danger');
        setIsScanning(false);
        return;
      }

      // 2. Perform deep sequence and multi-pass matching scan
      const res: VideoScanResult = await window.electronAPI.scanVideoTransfer(videoDir, photoDir);
      setScanResult(res);
      const foundEmpty = res.emptyPhotoFolders || [];
      setEmptyFolders(foundEmpty);
      if (foundEmpty.length > 0) {
        setShowEmptyModal(true);
      }

      if (res.unmatched.length === 0 && res.matched.length > 0) {
        onShowToast(
          `Perfect Synchronization! 100% of clips (${res.matched.length} / ${res.matched.length}) paired successfully!`,
          'success'
        );
      } else if (res.matched.length > 0) {
        onShowToast(
          `Scan complete: ${res.matched.length} clips paired, ${res.unmatched.length} unmatched clips pending review.`,
          'info'
        );
      } else {
        onShowToast(
          `Scan completed: 0 clips automatically paired. Please check your folder structure.`,
          'warning'
        );
        setActiveTab('unmatched');
      }
    } catch (e: any) {
      console.error('Video transfer scan failed:', e);
      onShowToast(toUserErrorMessage(e, 'Failed to scan video and photo directories. Please check permissions and try again.'), 'danger');
    } finally {
      setIsScanning(false);
    }
  };

  // Manual Pair Action: Move an unmatched clip to matched list with selected target folder
  const handleManualPair = (unmatchedItem: VideoUnmatchedItem, targetFolderPath: string) => {
    if (!scanResult || !targetFolderPath) return;

    const targetFolderName = targetFolderPath.split(/[\\/]/).pop() || targetFolderPath;

    const newPair: VideoMatchedPair = {
      videoFile: unmatchedItem.videoFile,
      videoPath: unmatchedItem.videoPath,
      videoSize: 0,
      photoFolder: targetFolderName,
      photoFolderPath: targetFolderPath,
      dateFolder: unmatchedItem.dateFolder,
      shotCode: unmatchedItem.shotCode,
      hasVideoThumb: false,
      hasPhotoThumb: false,
      manualOverride: true,
      matchType: 'manual',
      confidence: 100,
    };

    setScanResult({
      ...scanResult,
      matched: [...scanResult.matched, newPair],
      unmatched: scanResult.unmatched.filter((u) => u.videoPath !== unmatchedItem.videoPath),
    });

    onShowToast(`Paired "${unmatchedItem.videoFile}" with "${targetFolderName}"`, 'success');
  };

  // Manual Re-assignment: Change target folder of an already matched clip
  const handleReassignTarget = (videoPath: string, newTargetFolderPath: string) => {
    if (!scanResult || !newTargetFolderPath) return;
    const targetFolderName = newTargetFolderPath.split(/[\\/]/).pop() || newTargetFolderPath;

    setScanResult({
      ...scanResult,
      matched: scanResult.matched.map((m) => {
        if (m.videoPath === videoPath) {
          return {
            ...m,
            photoFolder: targetFolderName,
            photoFolderPath: newTargetFolderPath,
            manualOverride: true,
            matchType: 'manual',
            confidence: 100,
          };
        }
        return m;
      }),
    });
    setReassigningItem(null);
    onShowToast(`Reassigned target to "${targetFolderName}"`, 'success');
  };

  // Manual Unpair Action: Move a matched clip to unmatched list
  const handleUnpair = (item: VideoMatchedPair) => {
    if (!scanResult) return;

    const unmatchedItem: VideoUnmatchedItem = {
      videoFile: item.videoFile,
      videoPath: item.videoPath,
      videoDir: item.videoPath.substring(0, item.videoPath.lastIndexOf(/[\\/]/ as any)),
      dateFolder: item.dateFolder,
      shotCode: item.shotCode,
      cleanName: item.videoFile.replace(/\.[^.]+$/, ''),
      reason: 'Manually unpaired by user',
    };

    setScanResult({
      ...scanResult,
      matched: scanResult.matched.filter((m) => m.videoPath !== item.videoPath),
      unmatched: [...scanResult.unmatched, unmatchedItem],
    });

    onShowToast(`Unpaired "${item.videoFile}"`, 'info');
  };

  const handleMoveMergedFolder = async (customTarget?: string) => {
    const target = customTarget || uploadStructure.mainDataPath;
    if (!photoDir.trim()) {
      onShowToast('No photo/video directory selected to move.', 'warning');
      return;
    }
    if (!target) {
      onShowToast('Please set up an Upload Structure (Stage 01) first to define the Main Data destination path.', 'warning');
      return;
    }

    setIsMovingFolder(true);
    try {
      const res = await window.electronAPI.moveMergedFolder(photoDir, target);
      if (res && res.success) {
        setMovedResult({ count: res.movedCount, path: res.targetPath });
        onShowToast(
          `Merged media moved to Main Data successfully (${res.movedCount} subfolders preserved without renaming)!`,
          'success'
        );
        setPhotoDir(res.targetPath);
      }
    } catch (e: any) {
      console.error('Failed to move merged folder:', e);
      onShowToast(toUserErrorMessage(e, 'Failed to move merged folder. Please check drive permissions and available space.'), 'danger');
    } finally {
      setIsMovingFolder(false);
    }
  };

  const handleTransfer = async () => {
    if (!scanResult || scanResult.matched.length === 0) {
      onShowToast('No matched clips to transfer. Run scan first.', 'warning');
      return;
    }

    setIsTransferring(true);
    setTransferProgress({
      current: 0,
      total: scanResult.matched.length,
      currentFile: scanResult.matched[0].videoFile,
      speedStr: 'Initiating transfer...',
      percent: 0,
    });

    try {
      const res = await window.electronAPI.executeVideoTransfer(
        scanResult.matched,
        transferMode,
        collisionPolicy
      );
      setLastManifest(res.manifestPath);
      onShowToast(`Transfer complete: ${res.transferred} video clips aligned successfully!`, 'success');

      if (autoMoveToMainData && uploadStructure.mainDataPath && photoDir) {
        await handleMoveMergedFolder(uploadStructure.mainDataPath);
      } else {
        handleScan();
      }
    } catch (e: any) {
      console.error('Video transfer failed:', e);
      onShowToast(toUserErrorMessage(e, 'Video transfer operation failed. Please check drive permissions and free space.'), 'danger');
    } finally {
      setIsTransferring(false);
      setTransferProgress(null);
    }
  };

  const handleUndo = async () => {
    if (!lastManifest) {
      onShowToast('No recent transfer manifest available to undo', 'warning');
      return;
    }
    setIsUndoing(true);
    try {
      const res = await window.electronAPI.undoVideoTransfer(lastManifest);
      onShowToast(`Undo complete: Restored ${res.restored} files, unlinked ${res.unlinked} copied items.`, 'success');
      handleScan();
    } catch (e: any) {
      console.error('Video transfer undo failed:', e);
      onShowToast(toUserErrorMessage(e, 'Failed to restore transferred video clips.'), 'danger');
    } finally {
      setIsUndoing(false);
    }
  };

  // Filtered Rows with Date and Search Support
  const filteredMatched = useMemo(() => {
    return (scanResult?.matched || []).filter((item) => {
      if (selectedDateFilter !== 'ALL' && item.dateFolder !== selectedDateFilter) {
        return false;
      }
      if (!searchFilter.trim()) return true;
      const q = searchFilter.toLowerCase();
      return (
        item.videoFile.toLowerCase().includes(q) ||
        item.photoFolder.toLowerCase().includes(q) ||
        item.shotCode.toLowerCase().includes(q) ||
        item.dateFolder.toLowerCase().includes(q)
      );
    });
  }, [scanResult, selectedDateFilter, searchFilter]);

  const filteredUnmatched = useMemo(() => {
    return (scanResult?.unmatched || []).filter((item) => {
      if (selectedDateFilter !== 'ALL' && item.dateFolder !== selectedDateFilter) {
        return false;
      }
      if (!searchFilter.trim()) return true;
      const q = searchFilter.toLowerCase();
      return (
        item.videoFile.toLowerCase().includes(q) ||
        item.shotCode.toLowerCase().includes(q) ||
        item.dateFolder.toLowerCase().includes(q) ||
        item.reason.toLowerCase().includes(q)
      );
    });
  }, [scanResult, selectedDateFilter, searchFilter]);

  const filteredUnmatchedFolders = useMemo(() => {
    return (scanResult?.unmatchedPhotoFolders || []).filter((item) => {
      if (selectedDateFilter !== 'ALL' && item.dateFolder !== selectedDateFilter) {
        return false;
      }
      if (!searchFilter.trim()) return true;
      const q = searchFilter.toLowerCase();
      return (
        item.folderName.toLowerCase().includes(q) ||
        item.shotCode.toLowerCase().includes(q) ||
        item.dateFolder.toLowerCase().includes(q) ||
        item.reason.toLowerCase().includes(q)
      );
    });
  }, [scanResult, selectedDateFilter, searchFilter]);

  const filteredEmptyFolders = useMemo(() => {
    return emptyFolders.filter((item) => {
      if (selectedDateFilter !== 'ALL' && item.dateFolder !== selectedDateFilter) {
        return false;
      }
      if (!searchFilter.trim()) return true;
      const q = searchFilter.toLowerCase();
      return (
        item.folderName.toLowerCase().includes(q) ||
        item.folderPath.toLowerCase().includes(q) ||
        item.dateFolder.toLowerCase().includes(q) ||
        item.reason.toLowerCase().includes(q)
      );
    });
  }, [emptyFolders, selectedDateFilter, searchFilter]);

  const matchPercentage = useMemo(() => {
    if (!scanResult) return 0;
    const total = scanResult.matched.length + scanResult.unmatched.length;
    return total > 0 ? Math.round((scanResult.matched.length / total) * 100) : 0;
  }, [scanResult]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        height: '100%',
        overflowY: 'auto',
        paddingRight: 6,
      }}
    >
      {/* 1. Header Card with Path Selectors & Transfer Options */}
      <div
        className="glass-card"
        style={{
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          border: '1px solid var(--border)',
          borderRadius: 14,
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #10B981, #06B6D4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
              }}
            >
              <Video size={20} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: 'var(--label)',
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Video-to-Photo Sequence Synchronizer
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 10,
                    fontWeight: 700,
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#10B981',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                >
                  Multi-Pass Intelligent Matching
                </span>
              </div>
              <span style={{ fontSize: 11.5, color: 'var(--secondary-label)' }}>
                Deeply scans nested event subfolders, pairs camera video clips (_V) with photo folders (_P), and routes companion thumbnails.
              </span>
            </div>
          </div>

          {/* Quick Actions in Header */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {lastManifest && (
              <StudioButton
                variant="secondary"
                loading={isUndoing}
                icon={<RotateCcw size={13} />}
                onClick={handleUndo}
                style={{ fontSize: 11.5, height: 34 }}
              >
                Undo Last Sync
              </StudioButton>
            )}

            <StudioButton
              variant="secondary"
              loading={isScanning}
              icon={<RefreshCw size={13} />}
              onClick={handleScan}
              style={{ fontSize: 11.5, height: 34 }}
            >
              Scan Sequence Pairs
            </StudioButton>

            <StudioButton
              variant="primary"
              loading={isTransferring}
              icon={<Play size={13} />}
              onClick={handleTransfer}
              disabled={!scanResult || scanResult.matched.length === 0 || !canProceedTransfer}
              title={!canProceedTransfer ? 'Transfer blocked: Insufficient space on target drive' : undefined}
              style={{
                fontSize: 11.5,
                height: 34,
                background: 'linear-gradient(135deg, #10B981, #059669)',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
              }}
            >
              Start Synchronization ({scanResult?.matched.length || 0})
            </StudioButton>
          </div>
        </div>

        {/* Dual Path Selectors */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <StudioFolderInput
            label="1. Video Master Clips Directory (_V)"
            description="Folder containing source camera video files and companion _V thumbnails"
            value={videoDir}
            onChange={(val) => {
              setVideoDir(val);
              if (pathErrors?.video) setPathErrors((p) => (p ? { ...p, video: undefined } : null));
            }}
            onBrowse={handleBrowseVideo}
            placeholder="e.g. E:\In Process\Morbi Atraaf Safar\Morbi Atraaf Safar_V"
            error={pathErrors?.video}
          />

          <StudioFolderInput
            label="2. Clean Photo Subfolders Directory (_P)"
            description="Target event photo subfolders where videos will be placed"
            value={photoDir}
            onChange={(val) => {
              setPhotoDir(val);
              if (pathErrors?.photo) setPathErrors((p) => (p ? { ...p, photo: undefined } : null));
            }}
            onBrowse={handleBrowsePhoto}
            placeholder="e.g. E:\In Process\Morbi Atraaf Safar\Morbi Atraaf Safar_P"
            error={pathErrors?.photo}
          />
        </div>

        {/* Storage Capacity Bar */}
        {photoDir.trim() && (
          <StorageHeadroomBar
            destPath={photoDir}
            sourcePath={videoDir}
            transferMode={transferMode}
            payloadBytes={totalVideoBytes}
            payloadFileCount={scanResult?.matched.length}
            onCanProceedChange={setCanProceedTransfer}
          />
        )}

        {/* Settings Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 10,
            borderTop: '1px solid var(--border-subtle)',
            fontSize: 11.5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--secondary-label)', fontWeight: 600 }}>Transfer Mode:</span>
              <select
                value={transferMode}
                onChange={(e) => setTransferMode(e.target.value as any)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  backgroundColor: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--label)',
                  fontSize: 11.5,
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                <option value="copy">COPY (Safe: Preserves Source Files)</option>
                <option value="move">MOVE (Fast: Move into Target Folders)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--secondary-label)', fontWeight: 600 }}>File Collisions:</span>
              <select
                value={collisionPolicy}
                onChange={(e) => setCollisionPolicy(e.target.value as any)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  backgroundColor: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--label)',
                  fontSize: 11.5,
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                <option value="keepBoth">Auto-Rename (_1, _2)</option>
                <option value="skip">Skip Existing</option>
              </select>
            </div>

            {uploadStructure.mainDataPath && (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  color: '#38BDF8',
                  fontWeight: 600,
                }}
              >
                <input
                  type="checkbox"
                  checked={autoMoveToMainData}
                  onChange={(e) => setAutoMoveToMainData(e.target.checked)}
                />
                <span>Auto-move to Main Data ({uploadStructure.safarName}) on complete</span>
              </label>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--tertiary-label)', fontSize: 11 }}>
            <span>Auto Companion _V / _P Thumb Routing: </span>
            <b style={{ color: '#10B981' }}>Active</b>
          </div>
        </div>
      </div>

      {/* 2. Live Transfer Progress Floating Drawer */}
      {transferProgress && (
        <div
          className="glass-card"
          style={{
            padding: '16px 20px',
            borderRadius: 12,
            border: '1px solid rgba(16, 185, 129, 0.4)',
            background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.04) 100%)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            boxShadow: '0 8px 32px rgba(16, 185, 129, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={16} color="#10B981" />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--label)' }}>
                Synchronizing Video Clips: {transferProgress.current} / {transferProgress.total} ({transferProgress.percent}%)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  color: '#10B981',
                  fontWeight: 700,
                }}
              >
                {transferProgress.speedStr}
              </span>
            </div>
          </div>

          {/* Progress Bar Track */}
          <div
            style={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${transferProgress.percent}%`,
                background: 'linear-gradient(90deg, #10B981, #06B6D4)',
                borderRadius: 4,
                transition: 'width 0.2s ease',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--secondary-label)' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
              Current file: <strong style={{ color: 'var(--label)' }}>{transferProgress.currentFile}</strong>
            </span>
            <span>Mode: {transferMode.toUpperCase()}</span>
          </div>
        </div>
      )}

      {/* 3. Hero Statistics & Health HUD Cards */}
      {scanResult && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {/* Card 1: Total Videos */}
          <div
            className="glass-card"
            style={{
              padding: '16px 18px',
              borderRadius: 12,
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tertiary-label)', textTransform: 'uppercase' }}>
                Total Videos Found
              </span>
              <Video size={16} color="var(--system-blue)" />
            </div>
            <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--label)', fontFamily: 'var(--font-mono)' }}>
              {scanResult.matched.length + scanResult.unmatched.length}
            </span>
            <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
              Payload: {formatBytes(totalVideoBytes)}
            </span>
          </div>

          {/* Card 2: Matched Clips (with Percentage Ring Badge) */}
          <div
            className="glass-card"
            style={{
              padding: '16px 18px',
              borderRadius: 12,
              border: '1px solid rgba(16, 185, 129, 0.3)',
              background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.08) 0%, transparent 100%)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981', textTransform: 'uppercase' }}>
                Matched Sequences
              </span>
              <CheckCircle2 size={16} color="#10B981" />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: '#10B981', fontFamily: 'var(--font-mono)' }}>
                {scanResult.matched.length}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#10B981',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  padding: '2px 8px',
                  borderRadius: 10,
                }}
              >
                {matchPercentage}%
              </span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
              Ready for immediate synchronization
            </span>
          </div>

          {/* Card 3: Unmatched Videos */}
          <div
            className="glass-card"
            style={{
              padding: '16px 18px',
              borderRadius: 12,
              border:
                scanResult.unmatched.length > 0
                  ? '1px solid rgba(239, 68, 68, 0.35)'
                  : '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: scanResult.unmatched.length > 0 ? '#EF4444' : 'var(--tertiary-label)', textTransform: 'uppercase' }}>
                Unmatched Clips
              </span>
              <AlertTriangle size={16} color={scanResult.unmatched.length > 0 ? '#EF4444' : 'var(--tertiary-label)'} />
            </div>
            <span style={{ fontSize: 24, fontWeight: 800, color: scanResult.unmatched.length > 0 ? '#EF4444' : 'var(--label)', fontFamily: 'var(--font-mono)' }}>
              {scanResult.unmatched.length}
            </span>
            <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
              {scanResult.unmatched.length > 0 ? 'Click Unmatched tab to pair manually' : 'Zero unmapped video orphans'}
            </span>
          </div>

          {/* Card 4: Event Dates Synced */}
          <div
            className="glass-card"
            style={{
              padding: '16px 18px',
              borderRadius: 12,
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tertiary-label)', textTransform: 'uppercase' }}>
                Event Date Folders
              </span>
              <Calendar size={16} color="var(--system-purple)" />
            </div>
            <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--label)', fontFamily: 'var(--font-mono)' }}>
              {availableDates.length}
            </span>
            <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
              {scanResult.dateMismatch ? 'Date mismatch quarantine flagged' : 'All date scopes verified'}
            </span>
          </div>
        </div>
      )}

      {/* 4. Interactive Date Filter Horizontal Ribbon */}
      {availableDates.length > 0 && (
        <div
          className="glass-card"
          style={{
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            overflowX: 'auto',
            borderRadius: 10,
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, fontSize: 11, fontWeight: 700, color: 'var(--secondary-label)' }}>
            <Filter size={13} />
            <span>Filter by Event Date:</span>
          </div>

          <button
            onClick={() => setSelectedDateFilter('ALL')}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: selectedDateFilter === 'ALL' ? '1px solid #10B981' : '1px solid var(--border)',
              backgroundColor: selectedDateFilter === 'ALL' ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface-elevated)',
              color: selectedDateFilter === 'ALL' ? '#10B981' : 'var(--label)',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            All Dates ({scanResult?.matched.length || 0})
          </button>

          {availableDates.map((date) => {
            const stat = dateStats[date] || { matched: 0, unmatched: 0, total: 0 };
            const isSelected = selectedDateFilter === date;
            const isAllMatched = stat.unmatched === 0 && stat.matched > 0;

            return (
              <button
                key={date}
                onClick={() => setSelectedDateFilter(date)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: isSelected
                    ? '1px solid #38BDF8'
                    : isAllMatched
                    ? '1px solid rgba(16, 185, 129, 0.3)'
                    : '1px solid var(--border)',
                  backgroundColor: isSelected
                    ? 'rgba(56, 189, 248, 0.15)'
                    : 'var(--surface-elevated)',
                  color: isSelected ? '#38BDF8' : 'var(--label)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                <span>{date}</span>
                <span
                  style={{
                    fontSize: 9.5,
                    fontFamily: 'var(--font-mono)',
                    padding: '1px 5px',
                    borderRadius: 8,
                    backgroundColor: isAllMatched ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: isAllMatched ? '#10B981' : '#EF4444',
                    fontWeight: 700,
                  }}
                >
                  {stat.matched}/{stat.total}
                </span>
                {isAllMatched && <Check size={11} color="#10B981" />}
              </button>
            );
          })}
        </div>
      )}

      {/* 5. Main Workstation Multi-Tab Table */}
      <div
        className="glass-card"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minHeight: 380,
          borderRadius: 14,
          border: '1px solid var(--border)',
        }}
      >
        {/* Table Tabs & Search Filter Header */}
        <div
          style={{
            height: 48,
            backgroundColor: 'var(--surface-elevated)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            gap: 14,
          }}
        >
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setActiveTab('matched')}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: activeTab === 'matched' ? '1px solid #10B981' : '1px solid transparent',
                backgroundColor: activeTab === 'matched' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                color: activeTab === 'matched' ? '#10B981' : 'var(--secondary-label)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>Matched Pairs</span>
              <span
                style={{
                  padding: '1.5px 7px',
                  borderRadius: 10,
                  fontSize: 10.5,
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  color: '#10B981',
                  fontWeight: 800,
                }}
              >
                {filteredMatched.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('unmatched')}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: activeTab === 'unmatched' ? '1px solid #EF4444' : '1px solid transparent',
                backgroundColor: activeTab === 'unmatched' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                color: activeTab === 'unmatched' ? '#EF4444' : 'var(--secondary-label)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>Unmatched Video Clips</span>
              <span
                style={{
                  padding: '1.5px 7px',
                  borderRadius: 10,
                  fontSize: 10.5,
                  backgroundColor: filteredUnmatched.length > 0 ? 'rgba(239, 68, 68, 0.25)' : 'var(--surface)',
                  color: filteredUnmatched.length > 0 ? '#EF4444' : 'var(--tertiary-label)',
                  fontWeight: 800,
                }}
              >
                {filteredUnmatched.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('unmatchedFolders')}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: activeTab === 'unmatchedFolders' ? '1px solid #F59E0B' : '1px solid transparent',
                backgroundColor: activeTab === 'unmatchedFolders' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                color: activeTab === 'unmatchedFolders' ? '#F59E0B' : 'var(--secondary-label)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>Photo Folders Without Video</span>
              <span
                style={{
                  padding: '1.5px 7px',
                  borderRadius: 10,
                  fontSize: 10.5,
                  backgroundColor: 'rgba(245, 158, 11, 0.2)',
                  color: '#F59E0B',
                  fontWeight: 800,
                }}
              >
                {filteredUnmatchedFolders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('emptyFolders')}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: activeTab === 'emptyFolders' ? '1px solid #EC4899' : '1px solid transparent',
                backgroundColor: activeTab === 'emptyFolders' ? 'rgba(236, 72, 153, 0.15)' : 'transparent',
                color: activeTab === 'emptyFolders' ? '#EC4899' : 'var(--secondary-label)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>Empty Folders</span>
              <span
                style={{
                  padding: '1.5px 7px',
                  borderRadius: 10,
                  fontSize: 10.5,
                  backgroundColor: filteredEmptyFolders.length > 0 ? 'rgba(236, 72, 153, 0.25)' : 'var(--surface)',
                  color: filteredEmptyFolders.length > 0 ? '#EC4899' : 'var(--tertiary-label)',
                  fontWeight: 800,
                }}
              >
                {filteredEmptyFolders.length}
              </span>
            </button>
          </div>

          {/* Search Filter Input */}
          <div style={{ position: 'relative', width: 280 }}>
            <Search
              size={14}
              color="var(--tertiary-label)"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search filename, shot, folder, date..."
              style={{
                width: '100%',
                padding: '6px 28px 6px 30px',
                borderRadius: 6,
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--label)',
                fontSize: 11.5,
                outline: 'none',
              }}
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--tertiary-label)',
                  cursor: 'pointer',
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Matched Pairs View */}
        {activeTab === 'matched' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Table Header */}
            <div
              style={{
                height: 38,
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderBottom: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: '2.5fr 1.2fr 2.5fr 1fr 1fr 1.5fr',
                alignItems: 'center',
                padding: '0 16px',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--tertiary-label)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <span>Video Master Clip</span>
              <span>Match Confidence</span>
              <span>Target Photo Subfolder</span>
              <span>Video Thumb (_V)</span>
              <span>Photo Thumb (_P)</span>
              <span style={{ textAlign: 'right' }}>Actions</span>
            </div>

            {/* Table Body */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {!scanResult || filteredMatched.length === 0 ? (
                <div
                  style={{
                    height: '100%',
                    minHeight: 240,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    padding: 32,
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Video size={26} color="#10B981" />
                  </div>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--label)' }}>
                      {scanResult ? 'No Matched Clips Matching Filter' : 'Awaiting Sequence Pair Scan'}
                    </span>
                    <div style={{ fontSize: 12, color: 'var(--secondary-label)', maxWidth: 400, marginTop: 4 }}>
                      {scanResult
                        ? 'Try clearing the search query or selecting "All Dates" above.'
                        : 'Select master video and photo directories above, then click "Scan Sequence Pairs" to match clips.'}
                    </div>
                  </div>
                  {!scanResult && (
                    <StudioButton
                      variant="primary"
                      size="sm"
                      loading={isScanning}
                      onClick={handleScan}
                      disabled={!videoDir || !photoDir}
                      icon={<RefreshCw size={13} />}
                      style={{ background: 'linear-gradient(135deg, #10B981, #059669)', marginTop: 6 }}
                    >
                      Scan Sequence Pairs
                    </StudioButton>
                  )}
                </div>
              ) : (
                filteredMatched.map((item, idx) => {
                  const candidateFolders = scanResult.photoFoldersByDate[item.dateFolder] || [];
                  const isReassigning = reassigningItem === item.videoPath;

                  return (
                    <div
                      key={idx}
                      style={{
                        minHeight: 48,
                        display: 'grid',
                        gridTemplateColumns: '2.5fr 1.2fr 2.5fr 1fr 1fr 1.5fr',
                        alignItems: 'center',
                        padding: '6px 16px',
                        borderBottom: '1px solid var(--border-subtle)',
                        fontSize: 11.5,
                        color: 'var(--label)',
                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.012)',
                      }}
                    >
                      {/* 1. Video File & Date */}
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingRight: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              fontFamily: 'var(--font-mono)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={item.videoPath}
                          >
                            {item.videoFile}
                          </span>
                          <button
                            onClick={() => handleCopyText(item.videoFile, 'filename')}
                            style={{ background: 'none', border: 'none', color: 'var(--tertiary-label)', cursor: 'pointer', padding: 2 }}
                            title="Copy video file name"
                          >
                            <Copy size={11} />
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10.5, color: 'var(--secondary-label)' }}>
                          <span>Date: <strong style={{ color: 'var(--label)' }}>{item.dateFolder}</strong></span>
                          <span>•</span>
                          <span>{formatBytes(item.videoSize)}</span>
                        </div>
                      </div>

                      {/* 2. Match Confidence Badge */}
                      <div>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 10.5,
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor:
                              item.matchType === 'exact'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : item.matchType === 'camera_id'
                                ? 'rgba(56, 189, 248, 0.15)'
                                : item.matchType === 'normalized'
                                ? 'rgba(20, 184, 166, 0.15)'
                                : item.matchType === 'shot_token'
                                ? 'rgba(99, 102, 241, 0.15)'
                                : item.matchType === 'manual'
                                ? 'rgba(245, 158, 11, 0.15)'
                                : 'rgba(139, 92, 246, 0.15)',
                            color:
                              item.matchType === 'exact'
                                ? '#10B981'
                                : item.matchType === 'camera_id'
                                ? '#38BDF8'
                                : item.matchType === 'normalized'
                                ? '#14B8A6'
                                : item.matchType === 'shot_token'
                                ? '#6366F1'
                                : item.matchType === 'manual'
                                ? '#F59E0B'
                                : '#8B5CF6',
                            border:
                              item.matchType === 'exact'
                                ? '1px solid rgba(16, 185, 129, 0.35)'
                                : item.matchType === 'camera_id'
                                ? '1px solid rgba(56, 189, 248, 0.35)'
                                : item.matchType === 'normalized'
                                ? '1px solid rgba(20, 184, 166, 0.35)'
                                : item.matchType === 'shot_token'
                                ? '1px solid rgba(99, 102, 241, 0.35)'
                                : item.matchType === 'manual'
                                ? '1px solid rgba(245, 158, 11, 0.35)'
                                : '1px solid rgba(139, 92, 246, 0.35)',
                          }}
                        >
                          <Sparkles size={11} />
                          <span>
                            {item.matchType === 'exact'
                              ? 'Exact Stem'
                              : item.matchType === 'camera_id'
                              ? 'Camera Clip ID'
                              : item.matchType === 'normalized'
                              ? 'Normalized'
                              : item.matchType === 'shot_token'
                              ? `Shot ${item.shotCode}`
                              : item.matchType === 'manual'
                              ? 'Manual Pair'
                              : 'Sequence'}
                          </span>
                        </span>
                      </div>

                      {/* 3. Target Photo Subfolder */}
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingRight: 10 }}>
                        {isReassigning ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <select
                              defaultValue={item.photoFolderPath}
                              onChange={(e) => handleReassignTarget(item.videoPath, e.target.value)}
                              style={{
                                width: '100%',
                                padding: '4px 6px',
                                borderRadius: 6,
                                backgroundColor: 'var(--surface-card)',
                                border: '1px solid #38BDF8',
                                color: 'var(--label)',
                                fontSize: 11,
                                outline: 'none',
                              }}
                            >
                              {candidateFolders.map((cf) => (
                                <option key={cf.path} value={cf.path}>
                                  {cf.name}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => setReassigningItem(null)}
                              style={{ background: 'none', border: 'none', color: 'var(--secondary-label)', cursor: 'pointer' }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: 'var(--system-cyan)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={item.photoFolderPath}
                              >
                                {item.photoFolder}
                              </span>
                              {item.parentCategoryFolder && item.parentCategoryFolder !== item.photoFolder && (
                                <span
                                  style={{
                                    fontSize: 9.5,
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                    color: 'var(--secondary-label)',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  in {item.parentCategoryFolder}
                                </span>
                              )}
                            </div>
                            <span
                              style={{
                                fontSize: 10.5,
                                color: 'var(--tertiary-label)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={item.photoFolderPath}
                            >
                              {item.photoFolderPath}
                            </span>
                          </>
                        )}
                      </div>

                      {/* 4. Video Thumbnail (_V) */}
                      <div>
                        {item.hasVideoThumb && item.videoThumbPath ? (
                          <button
                            onClick={() =>
                              setPreviewThumb({
                                url: `file://${item.videoThumbPath!.replace(/\\/g, '/')}`,
                                title: item.videoFile,
                                type: '_V',
                                path: item.videoThumbPath!,
                              })
                            }
                            style={{
                              padding: '3px 8px',
                              borderRadius: 6,
                              backgroundColor: 'rgba(16, 185, 129, 0.12)',
                              border: '1px solid rgba(16, 185, 129, 0.35)',
                              color: '#10B981',
                              fontSize: 10.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                            title="Click to view thumbnail"
                          >
                            <Eye size={11} />
                            <span>Found (_V)</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: 10.5, color: 'var(--tertiary-label)' }}>— None</span>
                        )}
                      </div>

                      {/* 5. Photo Thumbnail (_P) */}
                      <div>
                        {item.hasPhotoThumb && item.photoThumbPath ? (
                          <button
                            onClick={() =>
                              setPreviewThumb({
                                url: `file://${item.photoThumbPath!.replace(/\\/g, '/')}`,
                                title: item.photoFolder,
                                type: '_P',
                                path: item.photoThumbPath!,
                              })
                            }
                            style={{
                              padding: '3px 8px',
                              borderRadius: 6,
                              backgroundColor: 'rgba(139, 92, 246, 0.12)',
                              border: '1px solid rgba(139, 92, 246, 0.35)',
                              color: '#A78BFA',
                              fontSize: 10.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                            title="Click to view thumbnail"
                          >
                            <Eye size={11} />
                            <span>Found (_P)</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: 10.5, color: 'var(--tertiary-label)' }}>— None</span>
                        )}
                      </div>

                      {/* 6. Action Buttons */}
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          onClick={() => handleLocateItem(item.videoPath)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            padding: '3px 8px',
                            color: 'var(--label)',
                            fontSize: 10.5,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                          title="Locate Video in Explorer"
                        >
                          <Video size={11} color="#10B981" />
                          <span>Video</span>
                        </button>

                        <button
                          onClick={() => handleOpenPath(item.photoFolderPath, 'Photo Subfolder')}
                          style={{
                            background: 'rgba(0, 122, 255, 0.08)',
                            border: '1px solid rgba(0, 122, 255, 0.3)',
                            borderRadius: 6,
                            padding: '3px 8px',
                            color: '#38BDF8',
                            fontSize: 10.5,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                          title="Open Target Photo Folder in Explorer"
                        >
                          <FolderOpen size={11} color="#38BDF8" />
                          <span>Folder</span>
                        </button>

                        <button
                          onClick={() => setReassigningItem(isReassigning ? null : item.videoPath)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--secondary-label)',
                            fontSize: 10.5,
                            cursor: 'pointer',
                            padding: '3px 4px',
                          }}
                          title="Re-assign to another photo folder"
                        >
                          <Link size={12} />
                        </button>

                        <button
                          onClick={() => handleUnpair(item)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#EF4444',
                            fontSize: 10.5,
                            cursor: 'pointer',
                            padding: '3px 4px',
                          }}
                          title="Unpair clip"
                        >
                          <Unlink size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Unmatched Video Clips (with Smart Pair Dropdown & Suggested Match) */}
        {activeTab === 'unmatched' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Table Header */}
            <div
              style={{
                height: 38,
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderBottom: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: '2.5fr 1fr 1fr 2.5fr 2fr',
                alignItems: 'center',
                padding: '0 16px',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--tertiary-label)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <span>Unmatched Video File</span>
              <span>Shot Token</span>
              <span>Date Scope</span>
              <span>Diagnostic / Reason</span>
              <span style={{ textAlign: 'right' }}>Pair with Photo Folder</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {!scanResult || filteredUnmatched.length === 0 ? (
                <div
                  style={{
                    height: '100%',
                    minHeight: 240,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    padding: 32,
                    textAlign: 'center',
                  }}
                >
                  <CheckCircle2 size={32} color="#10B981" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--label)' }}>
                    All video clips paired successfully — zero orphans detected!
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--secondary-label)' }}>
                    Every single video file has been accurately matched with a photo subfolder.
                  </span>
                </div>
              ) : (
                filteredUnmatched.map((item, idx) => {
                  const candidateFolders = scanResult.photoFoldersByDate[item.dateFolder] || [];

                  return (
                    <div
                      key={idx}
                      style={{
                        minHeight: 52,
                        display: 'grid',
                        gridTemplateColumns: '2.5fr 1fr 1fr 2.5fr 2fr',
                        alignItems: 'center',
                        padding: '8px 16px',
                        borderBottom: '1px solid var(--border-subtle)',
                        fontSize: 11.5,
                        color: 'var(--label)',
                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.012)',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingRight: 10 }}>
                        <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.videoPath}>
                          {item.videoFile}
                        </span>
                        <span style={{ fontSize: 10.5, color: 'var(--tertiary-label)' }}>
                          {item.videoPath}
                        </span>
                      </div>

                      <div>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#F59E0B',
                            backgroundColor: 'rgba(245, 158, 11, 0.15)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                          }}
                        >
                          {item.shotCode || 'None'}
                        </span>
                      </div>

                      <span style={{ color: 'var(--secondary-label)' }}>
                        {item.dateFolder}
                      </span>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingRight: 10 }}>
                        <span style={{ color: '#EF4444', fontWeight: 700, fontSize: 10.5 }}>
                          [UNMATCHED]
                        </span>
                        <span style={{ fontSize: 10.5, color: 'var(--secondary-label)' }} title={item.reason}>
                          {item.reason}
                        </span>
                        {item.suggestedFolder && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <span style={{ fontSize: 10.5, color: '#38BDF8' }}>Suggested:</span>
                            <button
                              onClick={() => handleManualPair(item, item.suggestedFolder!.path)}
                              style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                                border: '1px solid rgba(56, 189, 248, 0.35)',
                                color: '#38BDF8',
                                fontSize: 10.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Pair with "{item.suggestedFolder.name}"
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Manual Pairing Selector */}
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) handleManualPair(item, e.target.value);
                          }}
                          style={{
                            maxWidth: 160,
                            padding: '4px 6px',
                            borderRadius: 6,
                            backgroundColor: 'var(--surface-elevated)',
                            border: '1px solid var(--border)',
                            color: 'var(--label)',
                            fontSize: 10.5,
                            outline: 'none',
                          }}
                        >
                          <option value="" disabled>Choose Photo Folder...</option>
                          {candidateFolders.map((cf) => (
                            <option key={cf.path} value={cf.path}>
                              {cf.name}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => handleLocateItem(item.videoPath)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--secondary-label)',
                            cursor: 'pointer',
                            padding: '4px 6px',
                          }}
                          title="Locate Video File"
                        >
                          <Video size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Photo Folders Without Video */}
        {activeTab === 'unmatchedFolders' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div
              style={{
                height: 38,
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderBottom: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: '2.5fr 1fr 1fr 2.5fr 1.5fr',
                alignItems: 'center',
                padding: '0 16px',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--tertiary-label)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <span>Photo Subfolder</span>
              <span>Sequence Token</span>
              <span>Date Scope</span>
              <span>Status</span>
              <span style={{ textAlign: 'right' }}>Explorer Action</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {!scanResult || filteredUnmatchedFolders.length === 0 ? (
                <div
                  style={{
                    height: '100%',
                    minHeight: 240,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    padding: 32,
                    textAlign: 'center',
                  }}
                >
                  <CheckCircle2 size={32} color="#10B981" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--label)' }}>
                    All photo subfolders have matching video coverage.
                  </span>
                </div>
              ) : (
                filteredUnmatchedFolders.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      height: 48,
                      display: 'grid',
                      gridTemplateColumns: '2.5fr 1fr 1fr 2.5fr 1.5fr',
                      alignItems: 'center',
                      padding: '0 16px',
                      borderBottom: '1px solid var(--border-subtle)',
                      fontSize: 11.5,
                      color: 'var(--label)',
                      backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.012)',
                    }}
                  >
                    <span style={{ color: 'var(--system-cyan)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.folderPath}>
                      {item.folderName}
                    </span>

                    <span style={{ color: 'var(--secondary-label)' }}>
                      {item.shotCode}
                    </span>

                    <span style={{ color: 'var(--secondary-label)' }}>
                      {item.dateFolder}
                    </span>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: '#F59E0B', fontWeight: 700, fontSize: 10.5 }}>
                        [PHOTO-ONLY SESSION]
                      </span>
                      <span style={{ fontSize: 10.5, color: 'var(--secondary-label)' }}>
                        No video master clip paired with this folder
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                      <StudioButton
                        variant="glass"
                        icon={<FolderOpen size={12} />}
                        onClick={() => handleOpenPath(item.folderPath, `Photo Folder (${item.folderName})`)}
                        style={{ fontSize: 10.5, padding: '4px 8px', height: 26 }}
                      >
                        Open Folder
                      </StudioButton>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Empty Folders */}
        {activeTab === 'emptyFolders' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div
              style={{
                height: 38,
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderBottom: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: '2.5fr 1fr 2.5fr 1.5fr',
                alignItems: 'center',
                padding: '0 16px',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--tertiary-label)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <span>Empty Photo Subfolder</span>
              <span>Date Scope</span>
              <span>Condition</span>
              <span style={{ textAlign: 'right' }}>Actions</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredEmptyFolders.length === 0 ? (
                <div
                  style={{
                    height: '100%',
                    minHeight: 240,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    padding: 32,
                    textAlign: 'center',
                  }}
                >
                  <CheckCircle2 size={32} color="#10B981" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--label)' }}>
                    Zero empty photo folders detected.
                  </span>
                </div>
              ) : (
                filteredEmptyFolders.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    style={{
                      height: 50,
                      display: 'grid',
                      gridTemplateColumns: '2.5fr 1fr 2.5fr 1.5fr',
                      alignItems: 'center',
                      padding: '0 16px',
                      borderBottom: '1px solid var(--border-subtle)',
                      fontSize: 11.5,
                      color: 'var(--label)',
                      backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.012)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                      <FolderX size={15} color="#EC4899" />
                      <span style={{ color: '#EC4899', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.folderPath}>
                        {item.folderName}
                      </span>
                    </div>

                    <span style={{ color: 'var(--secondary-label)' }}>
                      {item.dateFolder}
                    </span>

                    <span style={{ color: '#EF4444', fontWeight: 600, fontSize: 11 }}>
                      Contains 0 photos and 0 child subfolders
                    </span>

                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                      <StudioButton
                        variant="secondary"
                        icon={<FolderOpen size={12} />}
                        onClick={() => handleGoToFolder(item.folderPath)}
                        style={{ fontSize: 10.5, height: 26, padding: '4px 8px' }}
                      >
                        Inspect
                      </StudioButton>
                      <StudioButton
                        variant="danger"
                        icon={<Trash2 size={12} />}
                        onClick={() => handleDeleteEmptyFolder(item.folderPath, item.folderName)}
                        style={{ fontSize: 10.5, height: 26, padding: '4px 8px' }}
                      >
                        Delete
                      </StudioButton>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 6. Thumbnail Preview Lightbox Popover Modal */}
      {previewThumb && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={() => setPreviewThumb(null)}
        >
          <div
            className="glass-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 680,
              width: '100%',
              backgroundColor: 'var(--surface-card)',
              borderRadius: 16,
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
            }}
          >
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    backgroundColor: previewThumb.type === '_V' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                    color: previewThumb.type === '_V' ? '#10B981' : '#A78BFA',
                  }}
                >
                  {previewThumb.type} Thumbnail
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--label)' }}>
                  {previewThumb.title}
                </span>
              </div>
              <button
                onClick={() => setPreviewThumb(null)}
                style={{ background: 'none', border: 'none', color: 'var(--secondary-label)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#090B10' }}>
              <img
                src={previewThumb.url}
                alt={previewThumb.title}
                style={{ maxWidth: '100%', maxHeight: 420, borderRadius: 8, objectFit: 'contain' }}
                onError={(e) => {
                  (e.target as any).style.display = 'none';
                }}
              />
            </div>

            <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--secondary-label)' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                {previewThumb.path}
              </span>
              <button
                onClick={() => handleLocateItem(previewThumb.path)}
                style={{ background: 'none', border: 'none', color: '#38BDF8', cursor: 'pointer', fontWeight: 600 }}
              >
                Reveal in Explorer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Empty Folders Modal */}
      {showEmptyModal && emptyFolders.length > 0 && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setShowEmptyModal(false)}
        >
          <div
            className="glass-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 720,
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 16,
              border: '1px solid rgba(236, 72, 153, 0.35)',
              backgroundColor: 'var(--surface-card)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(236, 72, 153, 0.15)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border)',
                background: 'linear-gradient(180deg, rgba(236, 72, 153, 0.12) 0%, transparent 100%)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <FolderX size={20} color="#EC4899" />
                <span style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--label)' }}>
                  Empty Photo Folders Detected ({emptyFolders.length})
                </span>
              </div>
              <button
                onClick={() => setShowEmptyModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--secondary-label)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '14px 20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {emptyFolders.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface-elevated)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--label)' }}>
                      {item.folderName}
                    </span>
                    <span style={{ fontSize: 10.5, color: 'var(--tertiary-label)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.folderPath}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <StudioButton
                      variant="secondary"
                      size="sm"
                      onClick={() => handleGoToFolder(item.folderPath)}
                    >
                      Inspect
                    </StudioButton>
                    <StudioButton
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteEmptyFolder(item.folderPath, item.folderName)}
                    >
                      Delete
                    </StudioButton>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                padding: '12px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid var(--border)',
                backgroundColor: 'var(--surface-elevated)',
              }}
            >
              <StudioButton
                variant="danger"
                icon={<Trash2 size={13} />}
                onClick={handleDeleteAllEmptyFolders}
              >
                Delete All Empty Folders
              </StudioButton>
              <StudioButton
                variant="glass"
                onClick={() => setShowEmptyModal(false)}
              >
                Dismiss / Keep Folders
              </StudioButton>
            </div>
          </div>
        </div>
      )}

      {/* 8. Operation Overlay */}
      <OperationLoadingOverlay
        isOpen={isScanning || isMovingFolder}
        title={
          isScanning
            ? 'Scanning & Pairing Video Sequences...'
            : 'Relocating Merged Media to Upload Structure...'
        }
        subtitle={
          isScanning
            ? 'Inspecting multi-pass camera tokens, shot codes, and companion thumbnails...'
            : 'Moving merged event folders into Main Data upload structure...'
        }
        accentColor="#10B981"
      />
    </div>
  );
};
