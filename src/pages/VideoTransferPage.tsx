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
  ChevronLeft,
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
  ChevronUp,
  Camera,
  Images,
  ArrowUp,
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
import { playSuccessSound, playRefreshSound } from '../utils/soundEffects';

// Fast, reliable thumbnail image renderer with IPC fallback
const ThumbnailImg: React.FC<{
  filePath?: string;
  alt: string;
  style?: React.CSSProperties;
  className?: string;
  cacheKey?: number | string;
}> = ({ filePath, alt, style, className, cacheKey }) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    if (!filePath) {
      setImgSrc(null);
      setHasError(false);
      return;
    }
    setHasError(false);
    // Directly try file:// protocol with cache buster
    const normalized = filePath.replace(/\\/g, '/');
    const directUrl = normalized.startsWith('file://') ? normalized : `file:///${normalized}`;
    const bustParam = cacheKey ? `?t=${cacheKey}` : '';
    setImgSrc(`${directUrl}${bustParam}`);

    return () => {
      active = false;
    };
  }, [filePath, cacheKey]);

  const handleImgError = async () => {
    if (!filePath) {
      setHasError(true);
      return;
    }
    // Fallback: Read via Electron IPC to bypass any web security/protocol constraints
    try {
      if (window.electronAPI?.readThumbnailDataUrl) {
        const base64 = await window.electronAPI.readThumbnailDataUrl(filePath);
        if (base64) {
          setImgSrc(base64);
          return;
        }
      }
    } catch {}
    setHasError(true);
  };

  if (!filePath || hasError) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          color: 'var(--tertiary-label)',
          fontSize: 9,
          ...style,
        }}
        className={className}
      >
        <span>No Img</span>
      </div>
    );
  }

  return (
    <img
      src={imgSrc || undefined}
      alt={alt}
      onError={handleImgError}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
        ...style,
      }}
      className={className}
    />
  );
};

interface VideoTransferPageProps {
  onShowToast: (text: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
  onNavigate?: (page: PageKey) => void;
}

export const VideoTransferPage: React.FC<VideoTransferPageProps> = ({ onShowToast, onNavigate }) => {
  const { uploadStructure } = usePipeline();
  const [videoDir, setVideoDir] = useState('');
  const [photoDir, setPhotoDir] = useState('');
  const [transferMode, setTransferMode] = useState<'copy' | 'move'>('move');
  const [collisionPolicy, setCollisionPolicy] = useState<'skip' | 'keepBoth'>('keepBoth');

  const [scanResult, setScanResult] = useState<VideoScanResult | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(Date.now());
  const [lastRefreshedTime, setLastRefreshedTime] = useState<string>('');
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
  const [activeTab, setActiveTab] = useState<'matched' | 'missing' | 'unmatched' | 'unmatchedFolders' | 'emptyFolders'>('matched');
  const [missingSubFilter, setMissingSubFilter] = useState<'all' | 'video' | 'photo' | 'empty' | 'unmatched_video' | 'unmatched_folder' | 'empty_folder'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('ALL');
  const [dismissedEmptyBanner, setDismissedEmptyBanner] = useState(false);
  const [emptyFolders, setEmptyFolders] = useState<EmptyPhotoFolderItem[]>([]);

  // Photo Folder Preview Gallery Modal State ("See Photos")
  const [viewingPhotoFolder, setViewingPhotoFolder] = useState<{ path: string; name: string } | null>(null);
  const [folderPhotos, setFolderPhotos] = useState<{ fileName: string; filePath: string; sizeBytes: number; mtime: number }[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [activePhotoLightboxIndex, setActivePhotoLightboxIndex] = useState<number | null>(null);

  // Scroll to Top & Action Highlight State
  const pageContainerRef = React.useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isActionHighlighted, setIsActionHighlighted] = useState(false);

  const handlePageScroll = () => {
    if (pageContainerRef.current) {
      setShowScrollTop(pageContainerRef.current.scrollTop > 180);
    }
  };

  const handleScrollToTop = () => {
    pageContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setIsActionHighlighted(true);
    setTimeout(() => setIsActionHighlighted(false), 2400);
  };

  // Dual Comparison Modal State (Single unified verification experience)
  const [activeCompareIndex, setActiveCompareIndex] = useState<number | null>(null);

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
      setDismissedEmptyBanner(false);

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

  const handleRefreshScan = async () => {
    const key = Date.now();
    setRefreshKey(key);
    playRefreshSound();
    await handleScan();
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastRefreshedTime(nowStr);
    onShowToast(`Refreshed! Folders and video clips re-scanned from disk at ${nowStr}`, 'info');
  };

  const handleTransfer = async () => {
    if (!scanResult || scanResult.matched.length === 0) {
      onShowToast('No matched clips to transfer. Run scan first.', 'warning');
      return;
    }

    const targetPairs = selectedDateFilter === 'ALL'
      ? scanResult.matched
      : scanResult.matched.filter((m) => m.dateFolder === selectedDateFilter);

    if (targetPairs.length === 0) {
      onShowToast(`No matched clips found to transfer for date "${selectedDateFilter}".`, 'warning');
      return;
    }

    setIsTransferring(true);
    setTransferProgress({
      current: 0,
      total: targetPairs.length,
      currentFile: targetPairs[0].videoFile,
      speedStr: 'Initiating transfer...',
      percent: 0,
    });

    try {
      const res = await window.electronAPI.executeVideoTransfer(
        targetPairs,
        transferMode,
        collisionPolicy
      );
      setLastManifest(res.manifestPath);
      playSuccessSound();
      onShowToast(
        `Transfer complete: ${res.transferred} video clip${res.transferred === 1 ? '' : 's'} ${transferMode === 'move' ? 'moved' : 'copied'} successfully!`,
        'success'
      );

      if (autoMoveToMainData && uploadStructure.mainDataPath && photoDir) {
        await handleMoveMergedFolder(uploadStructure.mainDataPath);
      } else {
        await handleScan();
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

  // Unified Missing & Mismatch Items
  interface MissingUnifiedItem {
    id: string;
    type: 'unmatched_video' | 'unmatched_photo_folder' | 'empty_folder';
    name: string;
    subtext: string;
    dateFolder: string;
    shotCode?: string;
    reason: string;
    videoPath?: string;
    photoFolderPath?: string;
    videoCandidateFolders?: { name: string; path: string }[];
    originalItem: any;
    data: any;
  }

  const filteredMissingItems = useMemo<MissingUnifiedItem[]>(() => {
    const list: MissingUnifiedItem[] = [];

    // 1. Unmatched video clips (photo folder not found)
    for (const v of filteredUnmatched) {
      list.push({
        id: `v_${v.videoPath}`,
        type: 'unmatched_video',
        name: v.videoFile,
        subtext: v.videoPath,
        dateFolder: v.dateFolder,
        shotCode: v.shotCode,
        reason: v.reason || 'Photo folder not found in photo directory',
        videoPath: v.videoPath,
        photoFolderPath: undefined,
        videoCandidateFolders: scanResult?.photoFoldersByDate[v.dateFolder] || [],
        originalItem: v,
        data: v,
      });
    }

    // 2. Photo folders without video (video clip not found)
    for (const p of filteredUnmatchedFolders) {
      list.push({
        id: `p_${p.folderPath}`,
        type: 'unmatched_photo_folder',
        name: p.folderName,
        subtext: p.folderPath,
        dateFolder: p.dateFolder,
        shotCode: p.shotCode,
        reason: 'No video clip matched with this photo subfolder',
        videoPath: undefined,
        photoFolderPath: p.folderPath,
        originalItem: p,
        data: p,
      });
    }

    // 3. Empty folders
    for (const e of filteredEmptyFolders) {
      list.push({
        id: `e_${e.folderPath}`,
        type: 'empty_folder',
        name: e.folderName,
        subtext: e.folderPath,
        dateFolder: e.dateFolder,
        shotCode: undefined,
        reason: e.reason || '0 media files found in folder',
        videoPath: undefined,
        photoFolderPath: e.folderPath,
        originalItem: e,
        data: e,
      });
    }

    return list;
  }, [filteredUnmatched, filteredUnmatchedFolders, filteredEmptyFolders, scanResult]);

  const activeMissingList = useMemo(() => {
    if (missingSubFilter === 'video' || missingSubFilter === 'unmatched_video') {
      return filteredMissingItems.filter((i) => i.type === 'unmatched_video');
    }
    if (missingSubFilter === 'photo' || missingSubFilter === 'unmatched_folder') {
      return filteredMissingItems.filter((i) => i.type === 'unmatched_photo_folder');
    }
    if (missingSubFilter === 'empty' || missingSubFilter === 'empty_folder') {
      return filteredMissingItems.filter((i) => i.type === 'empty_folder');
    }
    return filteredMissingItems;
  }, [filteredMissingItems, missingSubFilter]);

  // Load photos when viewingPhotoFolder is set
  useEffect(() => {
    if (!viewingPhotoFolder) {
      setFolderPhotos([]);
      setActivePhotoLightboxIndex(null);
      return;
    }
    let active = true;
    setIsLoadingPhotos(true);
    if (window.electronAPI?.listFolderImages) {
      window.electronAPI
        .listFolderImages(viewingPhotoFolder.path)
        .then((photos: any) => {
          if (active) {
            setFolderPhotos(photos || []);
            setIsLoadingPhotos(false);
          }
        })
        .catch(() => {
          if (active) {
            setFolderPhotos([]);
            setIsLoadingPhotos(false);
          }
        });
    } else {
      setIsLoadingPhotos(false);
    }
    return () => {
      active = false;
    };
  }, [viewingPhotoFolder]);

  // Keyboard navigation for photo lightbox
  useEffect(() => {
    if (activePhotoLightboxIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePhotoLightboxIndex(null);
      } else if (e.key === 'ArrowLeft') {
        setActivePhotoLightboxIndex((prev) =>
          prev !== null && prev > 0 ? prev - 1 : folderPhotos.length - 1
        );
      } else if (e.key === 'ArrowRight') {
        setActivePhotoLightboxIndex((prev) =>
          prev !== null && prev < folderPhotos.length - 1 ? prev + 1 : 0
        );
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activePhotoLightboxIndex, folderPhotos.length]);

  // Keyboard Arrow & Esc Navigation for Dual Verification Modal
  useEffect(() => {
    if (activeCompareIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveCompareIndex(null);
      } else if (e.key === 'ArrowLeft') {
        setActiveCompareIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'ArrowRight') {
        setActiveCompareIndex((prev) =>
          prev !== null && prev < filteredMatched.length - 1 ? prev + 1 : prev
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCompareIndex, filteredMatched.length]);

  return (
    <div
      ref={pageContainerRef}
      onScroll={handlePageScroll}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        height: '100%',
        position: 'relative',
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
              onClick={handleRefreshScan}
              title="Reload folders from disk to pick up newly rendered or copied videos"
              style={{ fontSize: 11.5, height: 34 }}
            >
              Refresh Module
            </StudioButton>

            <StudioButton
              variant="secondary"
              loading={isScanning}
              icon={<Play size={13} />}
              onClick={handleScan}
              style={{ fontSize: 11.5, height: 34 }}
            >
              Scan Sequence Pairs
            </StudioButton>

            <StudioButton
              variant="primary"
              className={isActionHighlighted ? 'action-highlight-pulse' : ''}
              loading={isTransferring}
              icon={<Play size={13} />}
              onClick={handleTransfer}
              disabled={!scanResult || scanResult.matched.length === 0 || !canProceedTransfer}
              title={!canProceedTransfer ? 'Transfer blocked: Insufficient space on target drive' : undefined}
              style={{
                fontSize: 11.5,
                height: 34,
                background: 'linear-gradient(135deg, #10B981, #059669)',
                boxShadow: isActionHighlighted
                  ? '0 0 25px #00F2FE, 0 0 10px #10B981'
                  : '0 4px 14px rgba(16, 185, 129, 0.3)',
                transform: isActionHighlighted ? 'scale(1.08)' : 'scale(1)',
                border: isActionHighlighted ? '2px solid #00F2FE' : undefined,
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {selectedDateFilter === 'ALL'
                ? `Start ${transferMode === 'move' ? 'Move' : 'Copy'} (${scanResult?.matched.length || 0})`
                : `Start ${transferMode === 'move' ? 'Move' : 'Copy'} ${selectedDateFilter} (${scanResult?.matched.filter((m) => m.dateFolder === selectedDateFilter).length || 0})`}
            </StudioButton>
          </div>
        </div>

        {/* Dual Path Selectors */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              backgroundColor: 'rgba(16, 185, 129, 0.03)',
              border: videoDir ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--border)',
              transition: 'border-color 0.2s ease',
            }}
          >
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
          </div>

          <div
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              backgroundColor: 'rgba(56, 189, 248, 0.03)',
              border: photoDir ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid var(--border)',
              transition: 'border-color 0.2s ease',
            }}
          >
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
            {photoDir.trim() && videoDir !== photoDir && (
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setVideoDir(photoDir);
                    onShowToast('Direct mode: Video directory set to same folder!', 'info');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#38BDF8',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '2px 6px',
                    borderRadius: 4,
                    backgroundColor: 'rgba(56, 189, 248, 0.08)',
                  }}
                >
                  <Sparkles size={11} />
                  <span>Direct Session Mode: Use this same folder for videos</span>
                </button>
              </div>
            )}
          </div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--secondary-label)', fontWeight: 600 }}>Transfer Mode:</span>
              <div
                style={{
                  display: 'inline-flex',
                  padding: 2,
                  borderRadius: 8,
                  backgroundColor: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid var(--border)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setTransferMode('move')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: transferMode === 'move' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                    color: transferMode === 'move' ? '#10B981' : 'var(--secondary-label)',
                    fontWeight: 700,
                    fontSize: 11,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: transferMode === 'move' ? '0 2px 8px rgba(16, 185, 129, 0.2)' : 'none',
                  }}
                >
                  🚀 MOVE (Default)
                </button>
                <button
                  type="button"
                  onClick={() => setTransferMode('copy')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: transferMode === 'copy' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                    color: transferMode === 'copy' ? '#38BDF8' : 'var(--secondary-label)',
                    fontWeight: 700,
                    fontSize: 11,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: transferMode === 'copy' ? '0 2px 8px rgba(56, 189, 248, 0.2)' : 'none',
                  }}
                >
                  ⚡ COPY (Safe)
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--secondary-label)', fontWeight: 600 }}>File Collisions:</span>
              <div
                style={{
                  display: 'inline-flex',
                  padding: 2,
                  borderRadius: 8,
                  backgroundColor: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid var(--border)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setCollisionPolicy('keepBoth')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: collisionPolicy === 'keepBoth' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                    color: collisionPolicy === 'keepBoth' ? '#38BDF8' : 'var(--secondary-label)',
                    fontWeight: 700,
                    fontSize: 11,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: collisionPolicy === 'keepBoth' ? '0 2px 8px rgba(56, 189, 248, 0.2)' : 'none',
                  }}
                >
                  Auto-Rename (_1, _2)
                </button>
                <button
                  type="button"
                  onClick={() => setCollisionPolicy('skip')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: collisionPolicy === 'skip' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                    color: collisionPolicy === 'skip' ? '#F59E0B' : 'var(--secondary-label)',
                    fontWeight: 700,
                    fontSize: 11,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: collisionPolicy === 'skip' ? '0 2px 8px rgba(245, 158, 11, 0.2)' : 'none',
                  }}
                >
                  Skip Existing
                </button>
              </div>
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
              borderRadius: 14,
              border: '1px solid var(--border)',
              borderTop: '3px solid #38BDF8',
              background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.08) 0%, transparent 100%)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tertiary-label)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Videos Found
              </span>
              <Video size={16} color="#38BDF8" />
            </div>
            <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--label)', fontFamily: 'var(--font-mono)' }}>
              {scanResult.matched.length + scanResult.unmatched.length}
            </span>
            <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
              Payload: <strong style={{ color: 'var(--label)' }}>{formatBytes(totalVideoBytes)}</strong>
            </span>
          </div>

          {/* Card 2: Matched Clips (with Percentage Ring Badge) */}
          <div
            className="glass-card"
            style={{
              padding: '16px 18px',
              borderRadius: 14,
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderTop: '3px solid #10B981',
              background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.12) 0%, transparent 100%)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Matched Sequences
              </span>
              <CheckCircle2 size={16} color="#10B981" />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: '#10B981', fontFamily: 'var(--font-mono)' }}>
                {scanResult.matched.length}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#10B981',
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  padding: '2px 8px',
                  borderRadius: 10,
                }}
              >
                {matchPercentage}% Ready
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
              borderRadius: 14,
              border:
                scanResult.unmatched.length > 0
                  ? '1px solid rgba(239, 68, 68, 0.4)'
                  : '1px solid var(--border)',
              borderTop:
                scanResult.unmatched.length > 0 ? '3px solid #EF4444' : '3px solid var(--border)',
              background:
                scanResult.unmatched.length > 0
                  ? 'linear-gradient(180deg, rgba(239, 68, 68, 0.12) 0%, transparent 100%)'
                  : 'transparent',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: scanResult.unmatched.length > 0 ? '#EF4444' : 'var(--tertiary-label)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Unmatched Clips
              </span>
              <AlertTriangle size={16} color={scanResult.unmatched.length > 0 ? '#EF4444' : 'var(--tertiary-label)'} />
            </div>
            <span style={{ fontSize: 26, fontWeight: 800, color: scanResult.unmatched.length > 0 ? '#EF4444' : 'var(--label)', fontFamily: 'var(--font-mono)' }}>
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
              borderRadius: 14,
              border: '1px solid var(--border)',
              borderTop: '3px solid #A78BFA',
              background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.08) 0%, transparent 100%)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tertiary-label)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Event Date Folders
              </span>
              <Calendar size={16} color="#A78BFA" />
            </div>
            <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--label)', fontFamily: 'var(--font-mono)' }}>
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

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {lastRefreshedTime && (
              <span style={{ fontSize: 10, color: 'var(--tertiary-label)', fontFamily: 'var(--font-mono)' }}>
                Scanned: {lastRefreshedTime}
              </span>
            )}
            <button
              onClick={handleRefreshScan}
              disabled={isScanning}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid rgba(56, 189, 248, 0.35)',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                color: '#38BDF8',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Re-read folders from disk and refresh pairs (useful when rendering new videos)"
            >
              <RefreshCw size={12} className={isScanning ? 'animate-spin' : ''} />
              <span>Refresh Clips</span>
            </button>
          </div>
        </div>
      )}

      {/* Single-Session / Direct Date Fast Track Banner */}
      {availableDates.length === 1 && (
        <div
          className="glass-card"
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px solid rgba(16, 185, 129, 0.3)',
            background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.08) 0%, rgba(56, 189, 248, 0.04) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11.5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={14} color="#10B981" />
            <span style={{ fontWeight: 700, color: '#10B981' }}>
              ⚡ Single-Session Direct Sync:
            </span>
            <span style={{ color: 'var(--label)', fontWeight: 600 }}>
              "{availableDates[0]}" is loaded and ready for 1-click execution.
            </span>
          </div>
          <span style={{ fontSize: 10.5, color: 'var(--secondary-label)' }}>
            All sequence pairs scoped exclusively to this session.
          </span>
        </div>
      )}

      {/* Non-intrusive Empty Folders Alert Ribbon (Replaces blocking popup) */}
      {emptyFolders.length > 0 && !dismissedEmptyBanner && (
        <div
          className="glass-card"
          style={{
            padding: '12px 18px',
            borderRadius: 12,
            border: '1px solid rgba(244, 63, 94, 0.35)',
            background:
              'linear-gradient(90deg, rgba(244, 63, 94, 0.12) 0%, rgba(236, 72, 153, 0.05) 50%, rgba(255, 255, 255, 0.02) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            boxShadow: '0 4px 20px rgba(244, 63, 94, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: 'rgba(244, 63, 94, 0.2)',
                border: '1px solid rgba(244, 63, 94, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FolderX size={17} color="#FB7185" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#FB7185' }}>
                  {emptyFolders.length} Empty Photo Folders Detected
                </span>
                <span
                  style={{
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 4,
                    backgroundColor: 'rgba(244, 63, 94, 0.2)',
                    color: '#FECDD3',
                    fontWeight: 700,
                  }}
                >
                  Contains 0 Media
                </span>
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--secondary-label)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                These target event folders contain zero photos. You can inspect or purge them without affecting valid clips.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <StudioButton
              variant="secondary"
              size="sm"
              icon={<Eye size={12} />}
              onClick={() => setActiveTab('emptyFolders')}
              style={{ fontSize: 11, height: 28, padding: '4px 10px' }}
            >
              Review in Tab ({emptyFolders.length})
            </StudioButton>
            <StudioButton
              variant="danger"
              size="sm"
              icon={<Trash2 size={12} />}
              onClick={handleDeleteAllEmptyFolders}
              style={{ fontSize: 11, height: 28, padding: '4px 10px' }}
            >
              Purge All Empty ({emptyFolders.length})
            </StudioButton>
            <button
              onClick={() => setDismissedEmptyBanner(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--tertiary-label)',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Dismiss notification"
            >
              <X size={15} />
            </button>
          </div>
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
              onClick={() => setActiveTab('missing')}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: activeTab === 'missing' ? '1px solid #F43F5E' : '1px solid transparent',
                backgroundColor: activeTab === 'missing' ? 'rgba(244, 63, 94, 0.16)' : 'transparent',
                color: activeTab === 'missing' ? '#FB7185' : 'var(--secondary-label)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>Missing & Mismatches</span>
              <span
                style={{
                  padding: '1.5px 7px',
                  borderRadius: 10,
                  fontSize: 10.5,
                  backgroundColor: filteredMissingItems.length > 0 ? 'rgba(244, 63, 94, 0.25)' : 'var(--surface)',
                  color: filteredMissingItems.length > 0 ? '#FB7185' : 'var(--tertiary-label)',
                  fontWeight: 800,
                }}
              >
                {filteredMissingItems.length}
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
                gridTemplateColumns: '2.4fr 1.1fr 2.3fr 2.4fr 1.2fr',
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
              <span>Match Details</span>
              <span>Target Photo Subfolder</span>
              <span style={{ textAlign: 'center' }}>Visual Verification (_V ⇄ _P)</span>
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
                        minHeight: 52,
                        display: 'grid',
                        gridTemplateColumns: '2.4fr 1.1fr 2.3fr 2.4fr 1.2fr',
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

                      {/* 4. Unified Visual Verification (_V ⇄ _P) */}
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div
                          onClick={() => setActiveCompareIndex(idx)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 10,
                            cursor: 'pointer',
                            padding: '4px 12px',
                            borderRadius: 10,
                            backgroundColor: 'rgba(255, 255, 255, 0.025)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.06)';
                            e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.45)';
                            e.currentTarget.style.transform = 'translateY(-1.5px) scale(1.02)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(56, 189, 248, 0.22)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.025)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.25)';
                          }}
                          title="Click to open Side-by-Side Dual Visual Verification Inspector"
                        >
                          {/* Video Thumbnail Mini Card (16:9) */}
                          <div
                            style={{
                              position: 'relative',
                              width: 56,
                              height: 36,
                              borderRadius: 7,
                              overflow: 'hidden',
                              border: item.hasVideoThumb
                                ? '1.5px solid rgba(16, 185, 129, 0.65)'
                                : '1px dashed rgba(255, 255, 255, 0.18)',
                              backgroundColor: '#06080D',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: item.hasVideoThumb ? '0 0 10px rgba(16, 185, 129, 0.2)' : 'none',
                            }}
                          >
                            {item.hasVideoThumb && item.videoThumbPath ? (
                              <ThumbnailImg filePath={item.videoThumbPath} alt={item.videoFile} cacheKey={refreshKey} />
                            ) : (
                              <Video size={15} color="var(--tertiary-label)" />
                            )}
                            <span
                              style={{
                                position: 'absolute',
                                bottom: 1,
                                left: 2,
                                fontSize: 8,
                                fontWeight: 800,
                                padding: '0 4px',
                                borderRadius: 3,
                                backgroundColor: item.hasVideoThumb ? 'rgba(16, 185, 129, 0.95)' : 'rgba(0,0,0,0.7)',
                                color: '#FFFFFF',
                                lineHeight: '12px',
                                letterSpacing: '0.02em',
                              }}
                            >
                              _V
                            </span>
                          </div>

                          {/* Center Comparison Connector Badge */}
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 2,
                              minWidth: 64,
                            }}
                          >
                            {item.hasVideoThumb && item.hasPhotoThumb ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontSize: 9.5,
                                  fontWeight: 800,
                                  color: '#38BDF8',
                                  background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(16, 185, 129, 0.15) 100%)',
                                  border: '1px solid rgba(56, 189, 248, 0.4)',
                                  padding: '1.5px 7px',
                                  borderRadius: 12,
                                  boxShadow: '0 0 10px rgba(56, 189, 248, 0.2)',
                                }}
                              >
                                <span>⇄</span> Synced
                              </span>
                            ) : item.hasVideoThumb ? (
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 700,
                                  color: '#10B981',
                                  backgroundColor: 'rgba(16, 185, 129, 0.14)',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  padding: '1px 6px',
                                  borderRadius: 8,
                                }}
                              >
                                _V ready
                              </span>
                            ) : item.hasPhotoThumb ? (
                              <span
                                style={{
                                  fontSize: 9,
                                  fontWeight: 700,
                                  color: '#A78BFA',
                                  backgroundColor: 'rgba(139, 92, 246, 0.14)',
                                  border: '1px solid rgba(139, 92, 246, 0.3)',
                                  padding: '1px 6px',
                                  borderRadius: 8,
                                }}
                              >
                                _P ready
                              </span>
                            ) : (
                              <span style={{ fontSize: 9, color: 'var(--tertiary-label)' }}>No thumbs</span>
                            )}
                            <span
                              style={{
                                fontSize: 8.5,
                                color: 'var(--tertiary-label)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3,
                                fontWeight: 600,
                              }}
                            >
                              <Eye size={9.5} color="#38BDF8" /> Inspect
                            </span>
                          </div>

                          {/* Photo Thumbnail Mini Card (16:9) */}
                          <div
                            style={{
                              position: 'relative',
                              width: 56,
                              height: 36,
                              borderRadius: 7,
                              overflow: 'hidden',
                              border: item.hasPhotoThumb
                                ? '1.5px solid rgba(139, 92, 246, 0.65)'
                                : '1px dashed rgba(255, 255, 255, 0.18)',
                              backgroundColor: '#06080D',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: item.hasPhotoThumb ? '0 0 10px rgba(139, 92, 246, 0.2)' : 'none',
                            }}
                          >
                            {item.hasPhotoThumb && item.photoThumbPath ? (
                              <ThumbnailImg filePath={item.photoThumbPath} alt={item.photoFolder} cacheKey={refreshKey} />
                            ) : (
                              <Folder size={15} color="var(--tertiary-label)" />
                            )}
                            <span
                              style={{
                                position: 'absolute',
                                bottom: 1,
                                right: 2,
                                fontSize: 8,
                                fontWeight: 800,
                                padding: '0 4px',
                                borderRadius: 3,
                                backgroundColor: item.hasPhotoThumb ? 'rgba(139, 92, 246, 0.95)' : 'rgba(0,0,0,0.7)',
                                color: '#FFFFFF',
                                lineHeight: '12px',
                                letterSpacing: '0.02em',
                              }}
                            >
                              _P
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 6. Action Buttons */}
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleLocateItem(item.videoPath)}
                          style={{
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: 6,
                            padding: '3px 8px',
                            color: '#10B981',
                            fontSize: 10.5,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontWeight: 600,
                          }}
                          title="Locate & Open Video Clip in Explorer"
                        >
                          <Video size={11} color="#10B981" />
                          <span>Open Video Folder</span>
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
                            fontWeight: 600,
                          }}
                          title="Open Target Photo Folder in Explorer"
                        >
                          <FolderOpen size={11} color="#38BDF8" />
                          <span>Open Photo Folder</span>
                        </button>

                        <button
                          onClick={() => setViewingPhotoFolder({ path: item.photoFolderPath, name: item.photoFolder })}
                          style={{
                            background: 'rgba(168, 85, 247, 0.12)',
                            border: '1px solid rgba(168, 85, 247, 0.35)',
                            borderRadius: 6,
                            padding: '3px 8px',
                            color: '#C084FC',
                            fontSize: 10.5,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontWeight: 700,
                          }}
                          title="Browse and inspect all photos inside this photo folder"
                        >
                          <Images size={11} color="#C084FC" />
                          <span>See Photos</span>
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

        {/* Tab: Unified Missing & Mismatches View */}
        {activeTab === 'missing' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Missing Sub-filter Bar */}
            <div
              style={{
                padding: '8px 16px',
                backgroundColor: 'rgba(244, 63, 94, 0.05)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tertiary-label)', textTransform: 'uppercase', marginRight: 4 }}>
                  Filter Mismatches:
                </span>
                <button
                  onClick={() => setMissingSubFilter('all')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: missingSubFilter === 'all' ? '1px solid #F43F5E' : '1px solid var(--border)',
                    backgroundColor: missingSubFilter === 'all' ? 'rgba(244, 63, 94, 0.2)' : 'transparent',
                    color: missingSubFilter === 'all' ? '#FB7185' : 'var(--secondary-label)',
                  }}
                >
                  All Mismatches ({filteredMissingItems.length})
                </button>
                <button
                  onClick={() => setMissingSubFilter('unmatched_video')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: missingSubFilter === 'unmatched_video' ? '1px solid #EF4444' : '1px solid var(--border)',
                    backgroundColor: missingSubFilter === 'unmatched_video' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                    color: missingSubFilter === 'unmatched_video' ? '#EF4444' : 'var(--secondary-label)',
                  }}
                >
                  Videos Missing Photo Folder ({filteredUnmatched.length})
                </button>
                <button
                  onClick={() => setMissingSubFilter('unmatched_folder')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: missingSubFilter === 'unmatched_folder' ? '1px solid #F59E0B' : '1px solid var(--border)',
                    backgroundColor: missingSubFilter === 'unmatched_folder' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: missingSubFilter === 'unmatched_folder' ? '#F59E0B' : 'var(--secondary-label)',
                  }}
                >
                  Photo Folders Missing Video ({filteredUnmatchedFolders.length})
                </button>
                <button
                  onClick={() => setMissingSubFilter('empty_folder')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: missingSubFilter === 'empty_folder' ? '1px solid #EC4899' : '1px solid var(--border)',
                    backgroundColor: missingSubFilter === 'empty_folder' ? 'rgba(236, 72, 153, 0.2)' : 'transparent',
                    color: missingSubFilter === 'empty_folder' ? '#EC4899' : 'var(--secondary-label)',
                  }}
                >
                  Empty Photo Folders ({filteredEmptyFolders.length})
                </button>
              </div>

              {filteredEmptyFolders.length > 0 && (
                <StudioButton
                  variant="danger"
                  size="sm"
                  icon={<Trash2 size={12} />}
                  onClick={handleDeleteAllEmptyFolders}
                  style={{ height: 26, fontSize: 10.5 }}
                >
                  Purge All ({filteredEmptyFolders.length}) Empty
                </StudioButton>
              )}
            </div>

            {/* Table Header */}
            <div
              style={{
                height: 38,
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderBottom: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 2fr 2.4fr',
                alignItems: 'center',
                padding: '0 16px',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--tertiary-label)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <span>Missing Item & Type</span>
              <span>Token</span>
              <span>Date Scope</span>
              <span>Diagnostic Problem</span>
              <span style={{ textAlign: 'right' }}>Actions & Exploration</span>
            </div>

            {/* Table Body */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {!scanResult || activeMissingList.length === 0 ? (
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
                  <CheckCircle2 size={36} color="#10B981" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--label)' }}>
                    No missing assets or mismatches found in this filter view.
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--secondary-label)', maxWidth: 420 }}>
                    All video sequence clips and photo subfolders are fully synchronized or matched.
                  </span>
                </div>
              ) : (
                activeMissingList.map((item, idx) => {
                  if (item.type === 'unmatched_video') {
                    const videoItem = item.data;
                    const candidateFolders = scanResult ? (scanResult.photoFoldersByDate[videoItem.dateFolder] || []) : [];

                    return (
                      <div
                        key={`missing-video-${idx}`}
                        style={{
                          minHeight: 52,
                          display: 'grid',
                          gridTemplateColumns: '2fr 1fr 1fr 2fr 2.4fr',
                          alignItems: 'center',
                          padding: '8px 16px',
                          borderBottom: '1px solid var(--border-subtle)',
                          fontSize: 11.5,
                          color: 'var(--label)',
                          backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.012)',
                          gap: 8,
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              style={{
                                padding: '1.5px 5px',
                                borderRadius: 4,
                                fontSize: 9.5,
                                fontWeight: 800,
                                color: '#EF4444',
                                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                textTransform: 'uppercase',
                              }}
                            >
                              Photo Folder Not Found
                            </span>
                          </div>
                          <span
                            style={{
                              fontWeight: 700,
                              fontFamily: 'var(--font-mono)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginTop: 3,
                            }}
                            title={videoItem.videoPath}
                          >
                            {videoItem.videoFile}
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
                            {videoItem.shotCode || 'None'}
                          </span>
                        </div>

                        <span style={{ color: 'var(--secondary-label)' }}>
                          {videoItem.dateFolder}
                        </span>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 10.5, color: '#EF4444', fontWeight: 600 }}>
                            {videoItem.reason}
                          </span>
                          {videoItem.suggestedFolder && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 10, color: '#38BDF8' }}>Suggested:</span>
                              <button
                                onClick={() => handleManualPair(videoItem, videoItem.suggestedFolder!.path)}
                                style={{
                                  padding: '1.5px 6px',
                                  borderRadius: 4,
                                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                                  border: '1px solid rgba(56, 189, 248, 0.35)',
                                  color: '#38BDF8',
                                  fontSize: 10,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                Pair with "{videoItem.suggestedFolder.name}"
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Actions for Video Clip */}
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) handleManualPair(videoItem, e.target.value);
                            }}
                            style={{
                              maxWidth: 135,
                              padding: '3px 6px',
                              borderRadius: 6,
                              backgroundColor: 'var(--surface-elevated)',
                              border: '1px solid var(--border)',
                              color: 'var(--label)',
                              fontSize: 10,
                              outline: 'none',
                            }}
                          >
                            <option value="" disabled>Pair to Photo Folder...</option>
                            {candidateFolders.map((cf) => (
                              <option key={cf.path} value={cf.path}>
                                {cf.name}
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={() => handleLocateItem(videoItem.videoPath)}
                            style={{
                              background: 'rgba(16, 185, 129, 0.12)',
                              border: '1px solid rgba(16, 185, 129, 0.35)',
                              borderRadius: 6,
                              padding: '3px 8px',
                              color: '#10B981',
                              fontSize: 10,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              height: 24,
                            }}
                            title="Open Video Folder in Explorer"
                          >
                            <Video size={10.5} color="#10B981" />
                            <span>Open Video Folder</span>
                          </button>

                          <button
                            onClick={() => {
                              const targetPhotoPath = videoItem.suggestedFolder?.path || (photoDir ? `${photoDir}\\${videoItem.dateFolder}` : undefined);
                              handleOpenPath(targetPhotoPath, `Photo Folder (${videoItem.dateFolder})`);
                            }}
                            style={{
                              background: 'rgba(56, 189, 248, 0.12)',
                              border: '1px solid rgba(56, 189, 248, 0.35)',
                              borderRadius: 6,
                              padding: '3px 8px',
                              color: '#38BDF8',
                              fontSize: 10,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              height: 24,
                            }}
                            title="Open Photo Date Folder in Explorer"
                          >
                            <FolderOpen size={10.5} color="#38BDF8" />
                            <span>Open Photo Folder</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (item.type === 'unmatched_photo_folder') {
                    const folderItem = item.data;
                    return (
                      <div
                        key={`missing-folder-${idx}`}
                        style={{
                          minHeight: 52,
                          display: 'grid',
                          gridTemplateColumns: '2fr 1fr 1fr 2fr 2.4fr',
                          alignItems: 'center',
                          padding: '8px 16px',
                          borderBottom: '1px solid var(--border-subtle)',
                          fontSize: 11.5,
                          color: 'var(--label)',
                          backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.012)',
                          gap: 8,
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              style={{
                                padding: '1.5px 5px',
                                borderRadius: 4,
                                fontSize: 9.5,
                                fontWeight: 800,
                                color: '#F59E0B',
                                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                textTransform: 'uppercase',
                              }}
                            >
                              Video Clip Not Found
                            </span>
                          </div>
                          <span
                            style={{
                              fontWeight: 700,
                              color: 'var(--system-cyan)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginTop: 3,
                            }}
                            title={folderItem.folderPath}
                          >
                            {folderItem.folderName}
                          </span>
                        </div>

                        <div>
                          <span
                            style={{
                              padding: '2px 7px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 700,
                              color: 'var(--secondary-label)',
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            {folderItem.shotCode || 'None'}
                          </span>
                        </div>

                        <span style={{ color: 'var(--secondary-label)' }}>
                          {folderItem.dateFolder}
                        </span>

                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 10.5, color: '#F59E0B', fontWeight: 600 }}>
                            Photo-only session; no corresponding video master clip identified
                          </span>
                        </div>

                        {/* Actions for Photo Folder */}
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => {
                              const targetVideoPath = videoDir ? `${videoDir}\\${folderItem.dateFolder}` : undefined;
                              handleOpenPath(targetVideoPath, `Video Folder (${folderItem.dateFolder})`);
                            }}
                            style={{
                              background: 'rgba(16, 185, 129, 0.12)',
                              border: '1px solid rgba(16, 185, 129, 0.35)',
                              borderRadius: 6,
                              padding: '3px 8px',
                              color: '#10B981',
                              fontSize: 10,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              height: 24,
                            }}
                            title="Open Video Date Folder in Explorer"
                          >
                            <Video size={10.5} color="#10B981" />
                            <span>Open Video Folder</span>
                          </button>

                          <button
                            onClick={() => handleOpenPath(folderItem.folderPath, `Photo Folder (${folderItem.folderName})`)}
                            style={{
                              background: 'rgba(56, 189, 248, 0.1)',
                              border: '1px solid rgba(56, 189, 248, 0.35)',
                              borderRadius: 6,
                              padding: '3px 8px',
                              color: '#38BDF8',
                              fontSize: 10,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              height: 24,
                            }}
                            title="Open Photo Folder in Explorer"
                          >
                            <FolderOpen size={10.5} color="#38BDF8" />
                            <span>Open Photo Folder</span>
                          </button>

                          <button
                            onClick={() => setViewingPhotoFolder({ path: folderItem.folderPath, name: folderItem.folderName })}
                            style={{
                              background: 'rgba(168, 85, 247, 0.14)',
                              border: '1px solid rgba(168, 85, 247, 0.4)',
                              borderRadius: 6,
                              padding: '3px 8px',
                              color: '#C084FC',
                              fontSize: 10,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              height: 24,
                            }}
                            title="Browse all photos inside this folder"
                          >
                            <Images size={10.5} color="#C084FC" />
                            <span>See Photos</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (item.type === 'empty_folder') {
                    const emptyItem = item.data;
                    return (
                      <div
                        key={`missing-empty-${idx}`}
                        style={{
                          minHeight: 52,
                          display: 'grid',
                          gridTemplateColumns: '2fr 1fr 1fr 2fr 2.4fr',
                          alignItems: 'center',
                          padding: '8px 16px',
                          borderBottom: '1px solid var(--border-subtle)',
                          fontSize: 11.5,
                          color: 'var(--label)',
                          backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.012)',
                          gap: 8,
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span
                              style={{
                                padding: '1.5px 5px',
                                borderRadius: 4,
                                fontSize: 9.5,
                                fontWeight: 800,
                                color: '#FB7185',
                                backgroundColor: 'rgba(244, 63, 94, 0.15)',
                                border: '1px solid rgba(244, 63, 94, 0.3)',
                                textTransform: 'uppercase',
                              }}
                            >
                              Empty Photo Folder
                            </span>
                          </div>
                          <span
                            style={{
                              fontWeight: 700,
                              color: '#FB7185',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginTop: 3,
                            }}
                            title={emptyItem.folderPath}
                          >
                            {emptyItem.folderName}
                          </span>
                        </div>

                        <div>
                          <span
                            style={{
                              padding: '2px 7px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 700,
                              color: 'var(--tertiary-label)',
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            0 items
                          </span>
                        </div>

                        <span style={{ color: 'var(--secondary-label)' }}>
                          {emptyItem.dateFolder}
                        </span>

                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 10.5, color: '#FB7185', fontWeight: 600 }}>
                            Contains 0 photos; target folder is vacant or abandoned
                          </span>
                        </div>

                        {/* Actions for Empty Folder */}
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => {
                              const targetVideoPath = videoDir ? `${videoDir}\\${emptyItem.dateFolder}` : undefined;
                              handleOpenPath(targetVideoPath, `Video Folder (${emptyItem.dateFolder})`);
                            }}
                            style={{
                              background: 'rgba(16, 185, 129, 0.12)',
                              border: '1px solid rgba(16, 185, 129, 0.35)',
                              borderRadius: 6,
                              padding: '3px 8px',
                              color: '#10B981',
                              fontSize: 10,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              height: 24,
                            }}
                            title="Open Video Date Folder in Explorer"
                          >
                            <Video size={10.5} color="#10B981" />
                            <span>Open Video Folder</span>
                          </button>

                          <button
                            onClick={() => handleOpenPath(emptyItem.folderPath, `Photo Folder (${emptyItem.folderName})`)}
                            style={{
                              background: 'rgba(56, 189, 248, 0.1)',
                              border: '1px solid rgba(56, 189, 248, 0.35)',
                              borderRadius: 6,
                              padding: '3px 8px',
                              color: '#38BDF8',
                              fontSize: 10,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              height: 24,
                            }}
                            title="Open Photo Folder in Explorer"
                          >
                            <FolderOpen size={10.5} color="#38BDF8" />
                            <span>Open Photo Folder</span>
                          </button>

                          <button
                            onClick={() => handleDeleteEmptyFolder(emptyItem.folderPath, emptyItem.folderName)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.35)',
                              borderRadius: 6,
                              padding: '3px 8px',
                              color: '#EF4444',
                              fontSize: 10,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              height: 24,
                            }}
                            title="Delete this empty folder"
                          >
                            <Trash2 size={10.5} color="#EF4444" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return null;
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
                            background: 'rgba(16, 185, 129, 0.12)',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                            borderRadius: 6,
                            padding: '3px 8px',
                            color: '#10B981',
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            height: 25,
                          }}
                          title="Open Video Folder in Explorer"
                        >
                          <Video size={11} color="#10B981" />
                          <span>Open Video Folder</span>
                        </button>

                        <button
                          onClick={() => {
                            const targetPhotoPath = item.suggestedFolder?.path || (photoDir ? `${photoDir}\\${item.dateFolder}` : undefined);
                            handleOpenPath(targetPhotoPath, `Photo Folder (${item.dateFolder})`);
                          }}
                          style={{
                            background: 'rgba(56, 189, 248, 0.12)',
                            border: '1px solid rgba(56, 189, 248, 0.35)',
                            borderRadius: 6,
                            padding: '3px 8px',
                            color: '#38BDF8',
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            height: 25,
                          }}
                          title="Open Photo Date Folder in Explorer"
                        >
                          <FolderOpen size={11} color="#38BDF8" />
                          <span>Open Photo Folder</span>
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

                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          const targetVideoPath = videoDir ? `${videoDir}\\${item.dateFolder}` : undefined;
                          handleOpenPath(targetVideoPath, `Video Folder (${item.dateFolder})`);
                        }}
                        style={{
                          background: 'rgba(16, 185, 129, 0.12)',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          borderRadius: 6,
                          padding: '3px 8px',
                          color: '#10B981',
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          height: 25,
                        }}
                        title="Open Video Date Folder in Explorer"
                      >
                        <Video size={11} color="#10B981" />
                        <span>Open Video Folder</span>
                      </button>

                      <button
                        onClick={() => handleOpenPath(item.folderPath, `Photo Folder (${item.folderName})`)}
                        style={{
                          background: 'rgba(56, 189, 248, 0.1)',
                          border: '1px solid rgba(56, 189, 248, 0.35)',
                          borderRadius: 6,
                          padding: '3px 8px',
                          color: '#38BDF8',
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          height: 25,
                        }}
                        title="Open Photo Folder in Explorer"
                      >
                        <FolderOpen size={11} color="#38BDF8" />
                        <span>Open Photo Folder</span>
                      </button>

                      <button
                        onClick={() => setViewingPhotoFolder({ path: item.folderPath, name: item.folderName })}
                        style={{
                          background: 'rgba(168, 85, 247, 0.14)',
                          border: '1px solid rgba(168, 85, 247, 0.4)',
                          borderRadius: 6,
                          padding: '3px 8px',
                          color: '#C084FC',
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          height: 25,
                        }}
                        title="Browse and view photos in this folder"
                      >
                        <Images size={11} color="#C084FC" />
                        <span>See Photos</span>
                      </button>
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
            {/* Action Bar for Empty Folders */}
            <div
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid var(--border)',
                backgroundColor: 'rgba(244, 63, 94, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FolderX size={16} color="#FB7185" />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--label)' }}>
                  Empty Target Photo Folders ({filteredEmptyFolders.length})
                </span>
                <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
                  — Folders with 0 media. Cleaning them prevents clutter in upload structures.
                </span>
              </div>
              {filteredEmptyFolders.length > 0 && (
                <StudioButton
                  variant="danger"
                  size="sm"
                  icon={<Trash2 size={12} />}
                  onClick={handleDeleteAllEmptyFolders}
                >
                  Purge All ({filteredEmptyFolders.length}) Empty Folders
                </StudioButton>
              )}
            </div>

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
                  <span style={{ fontSize: 12, color: 'var(--secondary-label)' }}>
                    All photo folders in the directory contain media.
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
                      <FolderX size={15} color="#FB7185" />
                      <span style={{ color: '#FB7185', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.folderPath}>
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
                        icon={<Video size={12} />}
                        onClick={() => {
                          const targetVideoPath = videoDir ? `${videoDir}\\${item.dateFolder}` : undefined;
                          handleOpenPath(targetVideoPath, `Video Folder (${item.dateFolder})`);
                        }}
                        style={{ fontSize: 10.5, height: 26, padding: '4px 8px' }}
                      >
                        Video
                      </StudioButton>
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

      {/* 6. Dual Side-by-Side Visual Verification Inspector Modal */}
      {activeCompareIndex !== null && filteredMatched[activeCompareIndex] && (() => {
        const item = filteredMatched[activeCompareIndex];
        const hasPrev = activeCompareIndex > 0;
        const hasNext = activeCompareIndex < filteredMatched.length - 1;
        const candidateFolders = scanResult ? (scanResult.photoFoldersByDate[item.dateFolder] || []) : [];

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              backgroundColor: 'rgba(0, 0, 0, 0.88)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
            onClick={() => setActiveCompareIndex(null)}
          >
            <div
              className="glass-card"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: 1060,
                width: '100%',
                maxHeight: '92vh',
                backgroundColor: 'var(--surface-card)',
                borderRadius: 18,
                border: '1px solid rgba(56, 189, 248, 0.35)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 30px 80px rgba(0, 0, 0, 0.85), 0 0 40px rgba(56, 189, 248, 0.15)',
              }}
            >
              {/* Modal Top Bar */}
              <div
                style={{
                  padding: '14px 22px',
                  borderBottom: '1px solid var(--border)',
                  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, transparent 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #10B981, #06B6D4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    <Layers size={18} color="#FFFFFF" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--label)' }}>
                        Dual Thumbnail Visual Verification
                      </span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 10.5,
                          fontWeight: 700,
                          backgroundColor: 'rgba(56, 189, 248, 0.15)',
                          color: '#38BDF8',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                        }}
                      >
                        Clip {activeCompareIndex + 1} of {filteredMatched.length}
                      </span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 10.5,
                          fontWeight: 700,
                          backgroundColor:
                            item.matchType === 'exact'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(56, 189, 248, 0.15)',
                          color: item.matchType === 'exact' ? '#10B981' : '#38BDF8',
                          border:
                            item.matchType === 'exact'
                              ? '1px solid rgba(16, 185, 129, 0.3)'
                              : '1px solid rgba(56, 189, 248, 0.3)',
                        }}
                      >
                        {item.matchType === 'exact'
                          ? 'Exact Stem (100%)'
                          : item.matchType === 'camera_id'
                          ? 'Camera Clip ID (90%)'
                          : item.matchType === 'normalized'
                          ? 'Normalized Key (95%)'
                          : item.matchType === 'shot_token'
                          ? `Shot Token ${item.shotCode} (85%)`
                          : 'Sequence (75%)'}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
                      Date Session: <strong style={{ color: 'var(--label)' }}>{item.dateFolder}</strong> • Side-by-side visual comparison for 100% confidence.
                    </span>
                  </div>
                </div>

                {/* Navigation and Close */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    disabled={!hasPrev}
                    onClick={() => setActiveCompareIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      color: hasPrev ? 'var(--label)' : 'var(--tertiary-label)',
                      cursor: hasPrev ? 'pointer' : 'not-allowed',
                      fontSize: 11.5,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    title="Previous Pair (Left Arrow ←)"
                  >
                    <ChevronLeft size={14} />
                    <span>Prev</span>
                  </button>

                  <button
                    disabled={!hasNext}
                    onClick={() => setActiveCompareIndex((prev) => (prev !== null && prev < filteredMatched.length - 1 ? prev + 1 : prev))}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      color: hasNext ? 'var(--label)' : 'var(--tertiary-label)',
                      cursor: hasNext ? 'pointer' : 'not-allowed',
                      fontSize: 11.5,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    title="Next Pair (Right Arrow →)"
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>

                  <button
                    onClick={() => setActiveCompareIndex(null)}
                    style={{
                      padding: '6px',
                      borderRadius: 6,
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: 'var(--secondary-label)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Close (Esc)"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Side-by-Side Dual Visual Canvas */}
              <div
                style={{
                  position: 'relative',
                  padding: 22,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 20,
                  overflowY: 'auto',
                  flex: 1,
                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                }}
              >
                {/* Center Visual Sequence Connector Bridge */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '42%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 20,
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      padding: '7px 16px',
                      borderRadius: 24,
                      backgroundColor: '#090D16',
                      border: '1.5px solid #38BDF8',
                      boxShadow: '0 0 30px rgba(56, 189, 248, 0.45), 0 8px 30px rgba(0, 0, 0, 0.9)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      color: '#38BDF8',
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Sparkles size={14} color="#38BDF8" />
                    <span>⇄ 100% SEQUENCE ALIGNED</span>
                  </div>
                </div>

                {/* Left Card: Master Video Clip */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 14,
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    backgroundColor: 'rgba(16, 185, 129, 0.025)',
                    overflow: 'hidden',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  <div
                    style={{
                      padding: '11px 16px',
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      borderBottom: '1px solid rgba(16, 185, 129, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Video size={15} color="#10B981" />
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: '#10B981' }}>
                        Video Master Feed (_V)
                      </span>
                    </div>
                    {item.hasVideoThumb ? (
                      <span
                        style={{
                          fontSize: 10,
                          color: '#10B981',
                          fontWeight: 800,
                          backgroundColor: 'rgba(16, 185, 129, 0.2)',
                          padding: '2px 8px',
                          borderRadius: 6,
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                        }}
                      >
                        ✓ _V THUMB READY
                      </span>
                    ) : (
                      <span style={{ fontSize: 10, color: 'var(--tertiary-label)', fontStyle: 'italic' }}>
                        — No companion video thumb
                      </span>
                    )}
                  </div>

                  {/* Cinema Monitor Viewport */}
                  <div
                    style={{
                      height: 330,
                      backgroundColor: '#04060A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      position: 'relative',
                      boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.9)',
                    }}
                  >
                    {/* Live Indicator Beacon */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 10,
                        left: 12,
                        zIndex: 5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: 9.5,
                        fontWeight: 800,
                        color: '#10B981',
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: '#10B981',
                          boxShadow: '0 0 8px #10B981',
                        }}
                      />
                      <span>MASTER CLIP 16:9</span>
                    </div>

                    {item.hasVideoThumb && item.videoThumbPath ? (
                      <ThumbnailImg
                        filePath={item.videoThumbPath}
                        alt={item.videoFile}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 10,
                          color: 'var(--tertiary-label)',
                        }}
                      >
                        <Video size={48} strokeWidth={1.5} color="rgba(255, 255, 255, 0.2)" />
                        <span style={{ fontSize: 11.5, fontWeight: 600 }}>No companion video thumbnail file</span>
                      </div>
                    )}
                  </div>

                  {/* Metadata & Actions */}
                  <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 9, fontSize: 11.5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, color: 'var(--label)', fontFamily: 'var(--font-mono)' }}>
                        {item.videoFile}
                      </span>
                      <button
                        onClick={() => handleCopyText(item.videoFile, 'video file')}
                        style={{ background: 'none', border: 'none', color: 'var(--tertiary-label)', cursor: 'pointer', padding: 2 }}
                        title="Copy filename"
                      >
                        <Copy size={13} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--secondary-label)' }}>
                      <span>Size: <strong style={{ color: 'var(--label)' }}>{formatBytes(item.videoSize)}</strong></span>
                      <span>•</span>
                      <span>Shot Token: <strong style={{ color: '#10B981' }}>{item.shotCode || 'General'}</strong></span>
                      <span>•</span>
                      <span>Date: <strong style={{ color: 'var(--label)' }}>{item.dateFolder}</strong></span>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <StudioButton
                        variant="secondary"
                        size="sm"
                        icon={<Video size={12} />}
                        onClick={() => handleLocateItem(item.videoPath)}
                        style={{ fontSize: 11, height: 28, padding: '3px 10px' }}
                      >
                        Locate Video in Explorer
                      </StudioButton>
                      {item.videoThumbPath && (
                        <StudioButton
                          variant="glass"
                          size="sm"
                          icon={<Eye size={12} />}
                          onClick={() => handleLocateItem(item.videoThumbPath)}
                          style={{ fontSize: 11, height: 28, padding: '3px 10px' }}
                        >
                          Locate Thumb
                        </StudioButton>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Card: Clean Photo Subfolder */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 14,
                    border: '1px solid rgba(139, 92, 246, 0.4)',
                    backgroundColor: 'rgba(139, 92, 246, 0.025)',
                    overflow: 'hidden',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  <div
                    style={{
                      padding: '11px 16px',
                      backgroundColor: 'rgba(139, 92, 246, 0.12)',
                      borderBottom: '1px solid rgba(139, 92, 246, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Folder size={15} color="#A78BFA" />
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: '#A78BFA' }}>
                        Target Photo Album (_P)
                      </span>
                    </div>
                    {item.hasPhotoThumb ? (
                      <span
                        style={{
                          fontSize: 10,
                          color: '#A78BFA',
                          fontWeight: 800,
                          backgroundColor: 'rgba(139, 92, 246, 0.2)',
                          padding: '2px 8px',
                          borderRadius: 6,
                          border: '1px solid rgba(139, 92, 246, 0.4)',
                        }}
                      >
                        ✓ _P THUMB READY
                      </span>
                    ) : (
                      <span style={{ fontSize: 10, color: 'var(--tertiary-label)', fontStyle: 'italic' }}>
                        — No companion photo thumb
                      </span>
                    )}
                  </div>

                  {/* Cinema Monitor Viewport */}
                  <div
                    style={{
                      height: 330,
                      backgroundColor: '#04060A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      position: 'relative',
                      boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.9)',
                    }}
                  >
                    {/* Live Indicator Beacon */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 10,
                        left: 12,
                        zIndex: 5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(139, 92, 246, 0.4)',
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: 9.5,
                        fontWeight: 800,
                        color: '#A78BFA',
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: '#A78BFA',
                          boxShadow: '0 0 8px #A78BFA',
                        }}
                      />
                      <span>EVENT ALBUM</span>
                    </div>

                    {item.hasPhotoThumb && item.photoThumbPath ? (
                      <ThumbnailImg
                        filePath={item.photoThumbPath}
                        alt={item.photoFolder}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 10,
                          color: 'var(--tertiary-label)',
                        }}
                      >
                        <Folder size={48} strokeWidth={1.5} color="rgba(255, 255, 255, 0.2)" />
                        <span style={{ fontSize: 11.5, fontWeight: 600 }}>No companion photo thumbnail found</span>
                      </div>
                    )}
                  </div>

                  {/* Metadata & Actions */}
                  <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 9, fontSize: 11.5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, color: 'var(--system-cyan)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.photoFolder}>
                        {item.photoFolder}
                      </span>
                      <button
                        onClick={() => handleCopyText(item.photoFolder, 'photo folder')}
                        style={{ background: 'none', border: 'none', color: 'var(--tertiary-label)', cursor: 'pointer', padding: 2 }}
                        title="Copy folder name"
                      >
                        <Copy size={13} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--secondary-label)' }}>
                      <span>Category: <strong style={{ color: 'var(--label)' }}>{item.parentCategoryFolder || 'Root'}</strong></span>
                      <span>•</span>
                      <span>Scope: <strong style={{ color: 'var(--label)' }}>{item.dateFolder}</strong></span>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <StudioButton
                        variant="secondary"
                        size="sm"
                        icon={<FolderOpen size={12} />}
                        onClick={() => handleOpenPath(item.photoFolderPath, 'Photo Subfolder')}
                        style={{ fontSize: 11, height: 28, padding: '3px 10px' }}
                      >
                        Open Subfolder
                      </StudioButton>
                      {item.photoThumbPath && (
                        <StudioButton
                          variant="glass"
                          size="sm"
                          icon={<Eye size={12} />}
                          onClick={() => handleLocateItem(item.photoThumbPath)}
                          style={{ fontSize: 11, height: 28, padding: '3px 10px' }}
                        >
                          Locate Thumb
                        </StudioButton>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div
                style={{
                  padding: '14px 24px',
                  borderTop: '1px solid var(--border)',
                  backgroundColor: 'var(--surface-elevated)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                }}
              >
                {/* Reassign Target Folder dropdown right in the modal */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--secondary-label)', whiteSpace: 'nowrap' }}>
                    Reassign Target:
                  </span>
                  <select
                    value={item.photoFolderPath}
                    onChange={(e) => handleReassignTarget(item.videoPath, e.target.value)}
                    style={{
                      maxWidth: 380,
                      width: '100%',
                      padding: '6px 12px',
                      borderRadius: 7,
                      backgroundColor: 'var(--surface-card)',
                      border: '1px solid var(--border)',
                      color: 'var(--label)',
                      fontSize: 11.5,
                      outline: 'none',
                    }}
                  >
                    {candidateFolders.map((cf) => (
                      <option key={cf.path} value={cf.path}>
                        {cf.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Keyboard Shortcut Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--tertiary-label)' }}>
                  <span>⌨ Shortcuts:</span>
                  <kbd style={{ padding: '2px 6px', borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--secondary-label)', fontFamily: 'var(--font-mono)' }}>←</kbd>
                  <kbd style={{ padding: '2px 6px', borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--secondary-label)', fontFamily: 'var(--font-mono)' }}>→</kbd>
                  <span>navigate •</span>
                  <kbd style={{ padding: '2px 6px', borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--secondary-label)', fontFamily: 'var(--font-mono)' }}>Esc</kbd>
                  <span>close</span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <StudioButton
                    variant="glass"
                    size="sm"
                    icon={<Unlink size={13} />}
                    onClick={() => {
                      handleUnpair(item);
                      if (hasNext) {
                        setActiveCompareIndex(activeCompareIndex);
                      } else {
                        setActiveCompareIndex(null);
                      }
                    }}
                  >
                    Unpair Clip
                  </StudioButton>

                  {hasNext ? (
                    <StudioButton
                      variant="primary"
                      size="sm"
                      icon={<CheckCircle2 size={13} />}
                      onClick={() => setActiveCompareIndex(activeCompareIndex + 1)}
                      style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)' }}
                    >
                      Verified • Next Pair →
                    </StudioButton>
                  ) : (
                    <StudioButton
                      variant="primary"
                      size="sm"
                      icon={<Check size={13} />}
                      onClick={() => setActiveCompareIndex(null)}
                      style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)' }}
                    >
                      All Verified • Done
                    </StudioButton>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 9. Dedicated Photo Viewer Gallery Modal */}
      {viewingPhotoFolder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            backgroundColor: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(14px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={() => {
            setViewingPhotoFolder(null);
            setActivePhotoLightboxIndex(null);
          }}
        >
          <div
            className="glass-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 980,
              width: '100%',
              maxHeight: '88vh',
              backgroundColor: 'var(--surface-card)',
              borderRadius: 18,
              border: '1px solid rgba(168, 85, 247, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 30px 80px rgba(0, 0, 0, 0.85), 0 0 35px rgba(168, 85, 247, 0.2)',
            }}
          >
            {/* Gallery Header */}
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border)',
                background: 'linear-gradient(180deg, rgba(168, 85, 247, 0.08) 0%, transparent 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: 'rgba(168, 85, 247, 0.15)',
                    border: '1px solid rgba(168, 85, 247, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Images size={18} color="#C084FC" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: 'var(--label)' }}>
                      Photo Gallery — {viewingPhotoFolder.name}
                    </h3>
                    <span
                      style={{
                        padding: '1px 8px',
                        borderRadius: 10,
                        backgroundColor: 'rgba(168, 85, 247, 0.2)',
                        color: '#C084FC',
                        fontSize: 10.5,
                        fontWeight: 700,
                      }}
                    >
                      {folderPhotos.length} {folderPhotos.length === 1 ? 'Photograph' : 'Photographs'}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--secondary-label)',
                      marginTop: 2,
                      fontFamily: 'var(--font-mono)',
                      maxWidth: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={viewingPhotoFolder.path}
                  >
                    {viewingPhotoFolder.path}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => handleOpenPath(viewingPhotoFolder.path, viewingPhotoFolder.name)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    backgroundColor: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    color: '#38BDF8',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <FolderOpen size={13} />
                  <span>Open Folder in Explorer</span>
                </button>
                <button
                  onClick={() => {
                    setViewingPhotoFolder(null);
                    setActivePhotoLightboxIndex(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--secondary-label)',
                    cursor: 'pointer',
                    padding: 6,
                    borderRadius: 6,
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Gallery Grid Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              {isLoadingPhotos ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12 }}>
                  <RefreshCw size={28} className="spin" color="#C084FC" />
                  <span style={{ fontSize: 13, color: 'var(--secondary-label)' }}>Scanning photographs in folder...</span>
                </div>
              ) : folderPhotos.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 10 }}>
                  <Camera size={36} color="var(--tertiary-label)" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--label)' }}>No Photographs Found in This Folder</span>
                  <span style={{ fontSize: 11.5, color: 'var(--secondary-label)', textAlign: 'center', maxWidth: 420 }}>
                    This subfolder does not contain supported image files (.jpg, .jpeg, .png, .cr2, .cr3, .arw, .nef, .dng, .heic).
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: 14,
                  }}
                >
                  {folderPhotos.map((photo, idx) => {
                    const sizeMb = (photo.sizeBytes / (1024 * 1024)).toFixed(2);
                    return (
                      <div
                        key={photo.filePath}
                        onClick={() => setActivePhotoLightboxIndex(idx)}
                        style={{
                          backgroundColor: '#07090E',
                          borderRadius: 10,
                          overflow: 'hidden',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.6)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(168, 85, 247, 0.25)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ width: '100%', height: 110, position: 'relative', overflow: 'hidden', backgroundColor: '#020305' }}>
                          <ThumbnailImg filePath={photo.filePath} alt={photo.fileName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 4,
                              right: 4,
                              fontSize: 9,
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: 4,
                              backgroundColor: 'rgba(0, 0, 0, 0.75)',
                              color: '#E0E7FF',
                            }}
                          >
                            {sizeMb} MB
                          </div>
                        </div>
                        <div style={{ padding: '6px 8px' }}>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: 'var(--label)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontFamily: 'var(--font-mono)',
                            }}
                            title={photo.fileName}
                          >
                            {photo.fileName}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 10. Photo Lightbox Modal */}
      {activePhotoLightboxIndex !== null && folderPhotos[activePhotoLightboxIndex] && (() => {
        const currentPhoto = folderPhotos[activePhotoLightboxIndex];
        const hasPrev = activePhotoLightboxIndex > 0;
        const hasNext = activePhotoLightboxIndex < folderPhotos.length - 1;

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              backgroundColor: 'rgba(0, 0, 0, 0.94)',
              backdropFilter: 'blur(20px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 32px',
            }}
            onClick={() => setActivePhotoLightboxIndex(null)}
          >
            {/* Top Bar */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#FFFFFF',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {currentPhoto.fileName}
                </span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginLeft: 12 }}>
                  ({activePhotoLightboxIndex + 1} of {folderPhotos.length} • {(currentPhoto.sizeBytes / (1024 * 1024)).toFixed(2)} MB)
                </span>
              </div>
              <button
                onClick={() => setActivePhotoLightboxIndex(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: 8,
                  color: '#FFFFFF',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                }}
              >
                <X size={16} /> Close (Esc)
              </button>
            </div>

            {/* Main Center Image */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                maxWidth: '92vw',
                maxHeight: '82vh',
                flex: 1,
                margin: '12px 0',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {hasPrev && (
                <button
                  onClick={() => setActivePhotoLightboxIndex(activePhotoLightboxIndex - 1)}
                  style={{
                    position: 'absolute',
                    left: -40,
                    zIndex: 10,
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Previous Photo (Left Arrow)"
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              <ThumbnailImg
                filePath={currentPhoto.filePath}
                alt={currentPhoto.fileName}
                style={{
                  maxWidth: '88vw',
                  maxHeight: '78vh',
                  objectFit: 'contain',
                  borderRadius: 8,
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
                }}
              />

              {hasNext && (
                <button
                  onClick={() => setActivePhotoLightboxIndex(activePhotoLightboxIndex + 1)}
                  style={{
                    position: 'absolute',
                    right: -40,
                    zIndex: 10,
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Next Photo (Right Arrow)"
                >
                  <ChevronRight size={24} />
                </button>
              )}
            </div>

            {/* Bottom Info Bar */}
            <div
              style={{
                fontSize: 11,
                color: 'rgba(255, 255, 255, 0.5)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <span>Use ← Left Arrow and → Right Arrow to browse photos • Esc to close</span>
            </div>
          </div>
        );
      })()}

      {/* 11. Floating Glass Command Deck when scrolled */}
      {showScrollTop && (
        <div
          className="animate-floating-deck"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 32,
            zIndex: 900,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 14px',
            borderRadius: 999,
            backgroundColor: 'var(--surface-elevated)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1.5px solid var(--border-glow)',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4), 0 0 24px rgba(0, 242, 254, 0.22)',
          }}
        >
          {scanResult && scanResult.matched.length > 0 && (
            <>
              {/* Quick Summary Pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 999,
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: '#10B981',
                }}
              >
                <Sparkles size={13} />
                <span>
                  {selectedDateFilter === 'ALL'
                    ? `${scanResult.matched.length} Matched (${formatBytes(totalVideoBytes)})`
                    : `${scanResult.matched.filter((m) => m.dateFolder === selectedDateFilter).length} Matched [${selectedDateFilter}]`}
                </span>
              </div>

              {/* Start Transfer Action Trigger */}
              <StudioButton
                variant="primary"
                size="sm"
                loading={isTransferring}
                icon={<Play size={12} />}
                onClick={handleTransfer}
                disabled={!canProceedTransfer}
                style={{
                  height: 32,
                  padding: '0 14px',
                  fontSize: 11.5,
                  borderRadius: 999,
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
                }}
              >
                {transferMode === 'move' ? 'Start Move' : 'Start Copy'}
              </StudioButton>
            </>
          )}

          {/* Back to Top & Highlight Action Button */}
          <button
            onClick={handleScrollToTop}
            className="btn-tactile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 32,
              padding: '0 12px',
              borderRadius: 999,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface-card)',
              color: 'var(--label)',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              transition: 'all 0.18s ease',
            }}
            title="Scroll back to top and focus Start button"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface-card-hover)';
              e.currentTarget.style.borderColor = '#00F2FE';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface-card)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            <ArrowUp size={14} color="#00F2FE" />
            <span>Back to Top</span>
          </button>
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
