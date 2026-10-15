import React, { useState } from 'react';
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
} from 'lucide-react';
import { StudioButton } from '../components/StudioButton';
import {
  VideoScanResult,
  DateFolderStatus,
} from '../../electron/engines/videoTransfer';
import { usePipeline } from '../context/PipelineContext';
import { PageKey } from '../components/Sidebar';
import { StudioFolderInput } from '../components/StudioFolderInput';
import { OperationLoadingOverlay } from '../components/OperationLoadingOverlay';

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

  const [pathErrors, setPathErrors] = useState<{ video?: string; photo?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'matched' | 'unmatched' | 'unmatchedFolders'>('matched');
  const [searchFilter, setSearchFilter] = useState('');

  const [autoMoveToMainData, setAutoMoveToMainData] = useState(true);
  const [isMovingFolder, setIsMovingFolder] = useState(false);
  const [movedResult, setMovedResult] = useState<{ count: number; path: string } | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === 'true') {
        setVideoDir('D:\\2026_EVENTS\\ROYAL_WEDDING\\MASTER_VIDEOS');
        setPhotoDir('D:\\2026_EVENTS\\ROYAL_WEDDING\\CLEAN_PHOTOS');
        setScanResult({
          matched: [
            {
              videoFile: 'VID_20260214_0042.MP4',
              videoPath: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\MASTER_VIDEOS\\2026-02-14\\VID_20260214_0042.MP4',
              shotCode: '0042',
              dateFolder: '2026-02-14',
              photoFolder: '2026-02-14\\0042_Ceremony_BrideArrival',
              targetDir: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\CLEAN_PHOTOS\\2026-02-14\\0042_Ceremony_BrideArrival',
              hasThumbP: true,
              hasThumbV: true,
              thumbPName: '0042_Ceremony_BrideArrival_P.jpg',
              thumbVName: '0042_Ceremony_BrideArrival_V.jpg',
            },
            {
              videoFile: 'VID_20260214_0043.MP4',
              videoPath: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\MASTER_VIDEOS\\2026-02-14\\VID_20260214_0043.MP4',
              shotCode: '0043',
              dateFolder: '2026-02-14',
              photoFolder: '2026-02-14\\0043_Varmala_Exchange',
              targetDir: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\CLEAN_PHOTOS\\2026-02-14\\0043_Varmala_Exchange',
              hasThumbP: true,
              hasThumbV: true,
              thumbPName: '0043_Varmala_Exchange_P.jpg',
              thumbVName: '0043_Varmala_Exchange_V.jpg',
            },
            {
              videoFile: 'VID_20260215_0108.MP4',
              videoPath: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\MASTER_VIDEOS\\2026-02-15\\VID_20260215_0108.MP4',
              shotCode: '0108',
              dateFolder: '2026-02-15',
              photoFolder: '2026-02-15\\0108_Reception_Toast_Speeches',
              targetDir: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\CLEAN_PHOTOS\\2026-02-15\\0108_Reception_Toast_Speeches',
              hasThumbP: false,
              hasThumbV: true,
              thumbVName: '0108_Reception_Toast_Speeches_V.jpg',
            },
          ],
          unmatched: [
            {
              videoFile: 'BROLL_Drone_Landscape_001.MP4',
              videoPath: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\MASTER_VIDEOS\\2026-02-14\\BROLL_Drone_Landscape_001.MP4',
              shotCode: 'None',
              dateFolder: '2026-02-14',
              reason: 'No matching numeric shot code sequence in photo subfolders',
            },
          ],
          unmatchedPhotoFolders: [
            {
              folderName: '0001_Portrait_Solo_Groom',
              folderPath: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\CLEAN_PHOTOS\\2026-02-14\\0001_Portrait_Solo_Groom',
              shotCode: '0001',
              dateFolder: '2026-02-14',
              reason: 'Photo-only session (no master video shot recorded)',
            },
          ],
          dateFolderStatuses: [
            {
              date: '2026-02-14',
              status: 'ok',
              inVideo: true,
              inPhoto: true,
              videoPath: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\MASTER_VIDEOS\\2026-02-14',
              photoPath: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\CLEAN_PHOTOS\\2026-02-14',
            },
            {
              date: '2026-02-15',
              status: 'ok',
              inVideo: true,
              inPhoto: true,
              videoPath: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\MASTER_VIDEOS\\2026-02-15',
              photoPath: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\CLEAN_PHOTOS\\2026-02-15',
            },
          ],
          videoDates: ['2026-02-14', '2026-02-15'],
          photoDates: ['2026-02-14', '2026-02-15'],
          dateMismatch: false,
          issues: [],
        } as any);
      }
    }
  }, []);

  const handleOpenPath = async (targetPath?: string, label?: string) => {
    if (!targetPath || !targetPath.trim()) {
      onShowToast(`No path provided to open${label ? ` for ${label}` : ''}.`, 'warning');
      return;
    }
    if (!window.electronAPI) return;
    try {
      const res = await window.electronAPI.openPath(targetPath);
      if (res && typeof res === 'string' && res.toLowerCase().includes('not exist')) {
        onShowToast(res, 'warning');
      } else {
        onShowToast(`Opened ${label || 'folder'} in Explorer`, 'info');
      }
    } catch (e: any) {
      onShowToast(`Failed to open folder: ${e.message}`, 'danger');
    }
  };

  const handleLocateItem = async (filePath?: string) => {
    if (!filePath || !filePath.trim()) return;
    if (!window.electronAPI) return;
    try {
      window.electronAPI.showItemInFolder(filePath);
      onShowToast('Highlighted item in Windows Explorer', 'info');
    } catch (e: any) {
      onShowToast(`Failed to locate item: ${e.message}`, 'danger');
    }
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
        errs.video = `Video folder does not exist: "${videoDir.trim()}"`;
      }
      if (!photoCheck.exists) {
        errs.photo = `Photo folder does not exist: "${photoDir.trim()}"`;
      }

      if (errs.video || errs.photo) {
        setPathErrors(errs);
        const msg = [errs.video, errs.photo].filter(Boolean).join(' | ');
        onShowToast(`Folder Problem: ${msg}`, 'danger');
        setIsScanning(false);
        return;
      }

      // 2. Perform deep sequence and date scan
      const res: VideoScanResult = await window.electronAPI.scanVideoTransfer(videoDir, photoDir);
      setScanResult(res);

      if (res.issues && res.issues.length > 0) {
        onShowToast(
          `Scan completed: ${res.matched.length} clips paired, ${res.unmatched.length} unmatched clips. Notice: ${res.issues.length} warnings/missing folder issues found!`,
          'warning'
        );
        // Automatically switch tab if 0 matched but unmatched clips exist
        if (res.matched.length === 0 && res.unmatched.length > 0) {
          setActiveTab('unmatched');
        }
      } else {
        onShowToast(
          `Scan complete: ${res.matched.length} clips paired successfully across all folders.`,
          'success'
        );
      }
    } catch (e: any) {
      onShowToast(`Scan failed: ${e.message}`, 'danger');
    } finally {
      setIsScanning(false);
    }
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
          `Merged media moved to Main Data: "${res.targetPath}" (${res.movedCount} subfolders preserved without renaming)!`,
          'success'
        );
        setPhotoDir(res.targetPath);
      }
    } catch (e: any) {
      onShowToast(`Failed to move merged folder: ${e.message}`, 'danger');
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
    try {
      const res = await window.electronAPI.executeVideoTransfer(
        scanResult.matched,
        transferMode,
        collisionPolicy
      );
      setLastManifest(res.manifestPath);
      onShowToast(`Transfer complete: ${res.transferred} video clips aligned successfully!`, 'success');

      // Automatically move merged folder to Upload Structure (Main Data/[Safar Name]) if configured
      if (autoMoveToMainData && uploadStructure.mainDataPath && photoDir) {
        await handleMoveMergedFolder(uploadStructure.mainDataPath);
      } else {
        handleScan();
      }
    } catch (e: any) {
      onShowToast(`Transfer error: ${e.message}`, 'danger');
    } finally {
      setIsTransferring(false);
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
      onShowToast(`Undo failed: ${e.message}`, 'danger');
    } finally {
      setIsUndoing(false);
    }
  };

  const filteredMatched = (scanResult?.matched || []).filter((item) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      item.videoFile.toLowerCase().includes(q) ||
      item.photoFolder.toLowerCase().includes(q) ||
      item.shotCode.toLowerCase().includes(q) ||
      item.dateFolder.toLowerCase().includes(q)
    );
  });

  const filteredUnmatched = (scanResult?.unmatched || []).filter((item) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      item.videoFile.toLowerCase().includes(q) ||
      item.shotCode.toLowerCase().includes(q) ||
      item.dateFolder.toLowerCase().includes(q) ||
      item.reason.toLowerCase().includes(q)
    );
  });

  const filteredUnmatchedFolders = (scanResult?.unmatchedPhotoFolders || []).filter((item) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      item.folderName.toLowerCase().includes(q) ||
      item.shotCode.toLowerCase().includes(q) ||
      item.dateFolder.toLowerCase().includes(q) ||
      item.reason.toLowerCase().includes(q)
    );
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        height: '100%',
        overflowY: 'auto',
        paddingRight: 6,
      }}
    >
      {/* Path Selector Bar */}
      <div
        className="glass-card"
        style={{
          padding: '18px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--label)', fontFamily: 'var(--font-display)' }}>
              Sync Photo Video — Sequence Alignment Workstation
            </span>
            <span style={{ fontSize: 11, color: 'var(--secondary-label)', marginLeft: 10 }}>
              (Pairs master video clips with photo subfolders & companion _V / _P thumbnails)
            </span>
          </div>

          {scanResult && (
            <div style={{ display: 'flex', gap: 10, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: 'var(--secondary-label)' }}>
                Matched: <b style={{ color: 'var(--system-green)' }}>{scanResult.matched.length}</b>
              </span>
              <span style={{ color: 'var(--secondary-label)' }}>
                Unmatched Clips: <b style={{ color: scanResult.unmatched.length > 0 ? 'var(--system-orange)' : 'var(--tertiary-label)' }}>{scanResult.unmatched.length}</b>
              </span>
              <span style={{ color: 'var(--secondary-label)' }}>
                Photo Folders Without Video: <b style={{ color: 'var(--tertiary-label)' }}>{scanResult.unmatchedPhotoFolders?.length || 0}</b>
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Video Directory with Native Drag & Drop */}
          <StudioFolderInput
            label="1. Master Video Clips Directory"
            description="Folder containing camera video files"
            value={videoDir}
            onChange={(val) => {
              setVideoDir(val);
              if (pathErrors?.video) setPathErrors((p) => (p ? { ...p, video: undefined } : null));
            }}
            onBrowse={handleBrowseVideo}
            placeholder="Drop master video folder here or click Browse..."
            error={pathErrors?.video}
          />

          {/* Photo Directory with Native Drag & Drop */}
          <StudioFolderInput
            label="2. Target Clean Photo Subfolders Directory"
            description="Destination event photo subfolders"
            value={photoDir}
            onChange={(val) => {
              setPhotoDir(val);
              if (pathErrors?.photo) setPathErrors((p) => (p ? { ...p, photo: undefined } : null));
            }}
            onBrowse={handleBrowsePhoto}
            placeholder="Drop clean photos folder here or click Browse..."
            error={pathErrors?.photo}
          />
        </div>

        {/* Options & Action Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 8,
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Mode Switch */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>Mode:</span>
              <select
                value={transferMode}
                onChange={(e) => setTransferMode(e.target.value as any)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  backgroundColor: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--label)',
                  fontSize: 11,
                }}
              >
                <option value="copy">COPY (Preserve Source)</option>
                <option value="move">MOVE (Cut & Re-locate)</option>
              </select>
            </div>

            {/* Collision Policy */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>Collisions:</span>
              <select
                value={collisionPolicy}
                onChange={(e) => setCollisionPolicy(e.target.value as any)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  backgroundColor: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--label)',
                  fontSize: 11,
                }}
              >
                <option value="keepBoth">Keep Both (_1, _2)</option>
                <option value="skip">Skip Existing</option>
              </select>
            </div>

            {/* Auto Move to Main Data Toggle */}
            {uploadStructure.mainDataPath && (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#38BDF8',
                  cursor: 'pointer',
                  padding: '3px 8px',
                  borderRadius: 6,
                  backgroundColor: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
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

          <div style={{ display: 'flex', gap: 10 }}>
            {lastManifest && (
              <StudioButton
                variant="secondary"
                loading={isUndoing}
                icon={<RotateCcw size={14} />}
                onClick={handleUndo}
              >
                Undo Last Transfer
              </StudioButton>
            )}

            <StudioButton variant="secondary" loading={isScanning} onClick={handleScan}>
              Scan Sequence Pairs
            </StudioButton>

            <StudioButton
              variant="primary"
              loading={isTransferring}
              icon={<Play size={14} />}
              onClick={handleTransfer}
              disabled={!scanResult || scanResult.matched.length === 0}
            >
              Transfer Paired Clips
            </StudioButton>
          </div>
        </div>

        {/* Move Merged Folder Action Card */}
        {photoDir && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              backgroundColor: movedResult ? 'rgba(16, 185, 129, 0.08)' : 'var(--surface-elevated)',
              border: movedResult ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              marginTop: 2,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  backgroundColor: movedResult ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {movedResult ? <CheckCircle2 size={16} color="#10B981" /> : <FolderCheck size={16} color="#38BDF8" />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--label)' }}>
                  {movedResult ? 'Merged Folder Relocated & Renamed' : 'Move Merged Media to Upload Structure'}
                </span>
                <span style={{ fontSize: 10.5, color: 'var(--secondary-label)' }}>
                  {movedResult ? (
                    <>Target: <strong style={{ color: '#10B981' }}>{movedResult.path}</strong> (all subfolders preserved)</>
                  ) : uploadStructure.mainDataPath ? (
                    <>Moves into <strong style={{ color: '#38BDF8' }}>Main Data/{uploadStructure.safarName}</strong> (renames parent folder to "{uploadStructure.safarName}", keeps all subfolders untouched)</>
                  ) : (
                    'Configure Stage 01 Upload Structure to automatically wire the destination.'
                  )}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {movedResult ? (
                <StudioButton
                  variant="secondary"
                  onClick={() => handleOpenPath(movedResult.path, 'Moved Merged Media')}
                  icon={<ExternalLink size={13} />}
                  style={{ fontSize: 11 }}
                >
                  Open in Explorer
                </StudioButton>
              ) : (
                <StudioButton
                  variant="secondary"
                  loading={isMovingFolder}
                  onClick={() => handleMoveMergedFolder()}
                  disabled={!uploadStructure.mainDataPath || isTransferring}
                  icon={<FolderCheck size={14} />}
                  style={{ fontSize: 11 }}
                >
                  Move & Rename to Main Data
                </StudioButton>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Path Errors Alert Card */}
      {pathErrors && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid var(--system-red)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: 'var(--system-red)', fontSize: 12.5 }}>
            <AlertCircle size={16} />
            <span>Folder Path Problem Detected</span>
          </div>

          {pathErrors.video && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 11.5 }}>
              <span style={{ color: 'var(--label)' }}>❌ {pathErrors.video}</span>
              <StudioButton
                variant="glass"
                icon={<FolderOpen size={12} />}
                onClick={() => handleOpenPath(videoDir, 'Video Parent Folder')}
                style={{ fontSize: 10.5, padding: '3px 8px', height: 26 }}
              >
                Open in Explorer to Check
              </StudioButton>
            </div>
          )}

          {pathErrors.photo && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 11.5 }}>
              <span style={{ color: 'var(--label)' }}>❌ {pathErrors.photo}</span>
              <StudioButton
                variant="glass"
                icon={<FolderOpen size={12} />}
                onClick={() => handleOpenPath(photoDir, 'Photo Parent Folder')}
                style={{ fontSize: 10.5, padding: '3px 8px', height: 26 }}
              >
                Open in Explorer to Check
              </StudioButton>
            </div>
          )}
        </div>
      )}

      {/* Date Folders Alignment & Presence Status Card */}
      {scanResult?.dateFolderStatuses && scanResult.dateFolderStatuses.length > 0 && (
        <div
          className="glass-card"
          style={{
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={16} color="var(--system-blue)" />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--label)' }}>
                Date Folders Presence & Sync Status
              </span>
              <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
                ({scanResult.dateFolderStatuses.length} date folder{scanResult.dateFolderStatuses.length > 1 ? 's' : ''} detected)
              </span>
            </div>
            <span style={{ fontSize: 10.5, color: 'var(--tertiary-label)' }}>
              Click any folder button to open directly in Windows Explorer to verify existence
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 8 }}>
            {scanResult.dateFolderStatuses.map((ds: DateFolderStatus) => {
              const isOk = ds.status === 'ok';
              const missingPhoto = ds.status === 'missing_in_photo';

              return (
                <div
                  key={ds.date}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    backgroundColor: isOk ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.08)',
                    border: isOk ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.35)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isOk ? <CheckCircle2 size={15} color="var(--system-green)" /> : <AlertTriangle size={15} color="var(--system-red)" />}
                      <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--label)' }}>
                        {ds.date}
                      </span>
                    </div>

                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        color: isOk ? 'var(--system-green)' : 'var(--system-red)',
                        backgroundColor: isOk ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      }}
                    >
                      {isOk ? 'SYNCED' : missingPhoto ? 'MISSING IN PHOTO' : 'MISSING IN VIDEO'}
                    </span>
                  </div>

                  {/* Open Folder Actions */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <StudioButton
                      variant={ds.inVideo ? 'glass' : 'secondary'}
                      icon={<FolderOpen size={12} />}
                      onClick={() => handleOpenPath(ds.videoPath, `Video Date Folder (${ds.date})`)}
                      style={{ fontSize: 10.5, flex: 1, padding: '4px 8px', height: 26 }}
                      title={ds.inVideo ? `Open ${ds.videoPath}` : `Date missing in Video. Opens parent video directory to inspect`}
                    >
                      {ds.inVideo ? 'Open Video Date' : 'Check Video (Missing)'}
                    </StudioButton>

                    <StudioButton
                      variant={ds.inPhoto ? 'glass' : 'secondary'}
                      icon={<FolderOpen size={12} />}
                      onClick={() => handleOpenPath(ds.photoPath, `Photo Date Folder (${ds.date})`)}
                      style={{ fontSize: 10.5, flex: 1, padding: '4px 8px', height: 26 }}
                      title={ds.inPhoto ? `Open ${ds.photoPath}` : `Date missing in Photo. Opens parent photo directory to inspect`}
                    >
                      {ds.inPhoto ? 'Open Photo Date' : 'Check Photo (Missing)'}
                    </StudioButton>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Diagnostic Issues & Warnings Panel */}
      {scanResult?.issues && scanResult.issues.length > 0 && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#F59E0B' }}>
            <AlertTriangle size={16} />
            <span>Synchronization Warnings & Missing Items ({scanResult.issues.length})</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 130, overflowY: 'auto' }}>
            {scanResult.issues.map((iss, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '5px 10px',
                  borderRadius: 6,
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  fontSize: 11,
                  color: 'var(--label)',
                  gap: 10,
                }}
              >
                <span>• {iss.message}</span>
                {iss.folderPath && (
                  <StudioButton
                    variant="glass"
                    icon={<FolderOpen size={11} />}
                    onClick={() => handleOpenPath(iss.folderPath, 'folder')}
                    style={{ fontSize: 10, padding: '2px 8px', height: 24, whiteSpace: 'nowrap' }}
                  >
                    Open Folder in Explorer
                  </StudioButton>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Date Mismatch Alert Banner */}
      {scanResult?.dateMismatch && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            backgroundColor: 'rgba(255, 69, 58, 0.15)',
            border: '1px solid var(--system-red)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <AlertTriangle size={18} color="var(--system-red)" />
          <div style={{ fontSize: 11.5, color: 'var(--label)' }}>
            <b>Date Mismatch Quarantine:</b> Video date folders ({scanResult.videoDates.join(', ')}) do not match Photo date folders ({scanResult.photoDates.join(', ')}). Cross-event pairing is restricted.
          </div>
        </div>
      )}

      {/* Multi-Tab Table Workstation */}
      <div
        className="glass-card"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minHeight: 280,
        }}
      >
        {/* Table Tabs & Search Header */}
        <div
          style={{
            height: 44,
            backgroundColor: 'var(--surface-elevated)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 14px',
            gap: 12,
          }}
        >
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setActiveTab('matched')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: activeTab === 'matched' ? '1px solid var(--system-green)' : '1px solid transparent',
                backgroundColor: activeTab === 'matched' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                color: activeTab === 'matched' ? 'var(--system-green)' : 'var(--secondary-label)',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>Matched Pairs</span>
              <span
                style={{
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: 10,
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  color: 'var(--system-green)',
                }}
              >
                {scanResult?.matched.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('unmatched')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: activeTab === 'unmatched' ? '1px solid var(--system-red)' : '1px solid transparent',
                backgroundColor: activeTab === 'unmatched' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                color: activeTab === 'unmatched' ? 'var(--system-red)' : 'var(--secondary-label)',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>Missing Photo Subfolder</span>
              <span
                style={{
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: 10,
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  color: 'var(--system-red)',
                }}
              >
                {scanResult?.unmatched.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('unmatchedFolders')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: activeTab === 'unmatchedFolders' ? '1px solid var(--system-orange)' : '1px solid transparent',
                backgroundColor: activeTab === 'unmatchedFolders' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                color: activeTab === 'unmatchedFolders' ? 'var(--system-orange)' : 'var(--secondary-label)',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>Missing Video Files</span>
              <span
                style={{
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: 10,
                  backgroundColor: 'rgba(245, 158, 11, 0.2)',
                  color: 'var(--system-orange)',
                }}
              >
                {scanResult?.unmatchedPhotoFolders?.length || 0}
              </span>
            </button>
          </div>

          {/* Search Filter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '0 8px',
              gap: 6,
              height: 28,
              width: 220,
            }}
          >
            <Search size={12} color="var(--tertiary-label)" />
            <input
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter items..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--label)',
                fontSize: 11,
              }}
            />
          </div>
        </div>

        {/* Tab 1: Matched Pairs */}
        {activeTab === 'matched' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div
              style={{
                height: 34,
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderBottom: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 2fr 1fr 1fr 1.2fr',
                alignItems: 'center',
                padding: '0 16px',
                fontSize: 10.5,
                fontWeight: 700,
                color: 'var(--tertiary-label)',
              }}
            >
              <span>VIDEO MASTER CLIP</span>
              <span>SHOT CODE</span>
              <span>MATCHED PHOTO SUBFOLDER</span>
              <span>VIDEO THUMB (_V)</span>
              <span>PHOTO THUMB (_P)</span>
              <span style={{ textAlign: 'right' }}>ACTIONS</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {!scanResult || filteredMatched.length === 0 ? (
                <div
                  style={{
                    height: '100%',
                    minHeight: 200,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    padding: '32px 20px',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Video size={24} color="#10B981" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--label)' }}>
                      {scanResult ? 'No Matched Clips Found' : 'Awaiting Sequence Pair Scan'}
                    </span>
                    <span style={{ fontSize: 11.5, color: 'var(--secondary-label)', maxWidth: 380, lineHeight: 1.4 }}>
                      {scanResult
                        ? 'Try clearing the search filter above to see all matched clips.'
                        : 'Select video and photo directories above, then click "Scan Sequence Pairs" to match clips with event subfolders.'}
                    </span>
                  </div>
                  {!scanResult && (
                    <StudioButton
                      variant="primary"
                      size="sm"
                      loading={isScanning}
                      onClick={handleScan}
                      disabled={!videoDir || !photoDir}
                      icon={<RefreshCw size={13} />}
                      style={{ background: 'linear-gradient(135deg, #10B981, #059669)', marginTop: 4 }}
                    >
                      Scan Sequence Pairs
                    </StudioButton>
                  )}
                </div>
              ) : (
                filteredMatched.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      height: 40,
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 2fr 1fr 1fr 1.2fr',
                      alignItems: 'center',
                      padding: '0 16px',
                      borderBottom: '1px solid var(--border-subtle)',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--label)',
                      backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.videoPath}>
                      {item.videoFile}
                    </span>

                    <span
                      style={{
                        display: 'inline-block',
                        width: 'fit-content',
                        padding: '1px 6px',
                        borderRadius: 4,
                        fontSize: 9.5,
                        fontWeight: 700,
                        color: 'var(--system-green)',
                        backgroundColor: 'rgba(48, 209, 88, 0.12)',
                        border: '1px solid var(--system-green)',
                      }}
                    >
                      {item.shotCode}
                    </span>

                    <span style={{ color: 'var(--system-cyan)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.photoFolderPath}>
                      {item.photoFolder}
                    </span>

                    <span style={{ color: item.hasVideoThumb ? 'var(--system-green)' : 'var(--tertiary-label)', fontSize: 10 }}>
                      {item.hasVideoThumb ? '✓ Found (_V)' : '— None'}
                    </span>

                    <span style={{ color: item.hasPhotoThumb ? 'var(--system-green)' : 'var(--tertiary-label)', fontSize: 10 }}>
                      {item.hasPhotoThumb ? '✓ Found (_P)' : '— None'}
                    </span>

                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleLocateItem(item.videoPath)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--secondary-label)',
                          fontSize: 10.5,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                        }}
                        title="Locate Video File in Explorer"
                      >
                        <Video size={11} /> Video
                      </button>
                      <button
                        onClick={() => handleOpenPath(item.photoFolderPath, 'Photo Subfolder')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--system-blue)',
                          fontSize: 10.5,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                        }}
                        title="Open Photo Subfolder in Explorer"
                      >
                        <FolderOpen size={11} /> Photo
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Missing Photo Folder / Unmatched Video Clips */}
        {activeTab === 'unmatched' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div
              style={{
                height: 36,
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderBottom: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: '2fr 0.9fr 1fr 2fr 1.8fr',
                alignItems: 'center',
                padding: '0 16px',
                fontSize: 10.5,
                fontWeight: 700,
                color: 'var(--tertiary-label)',
              }}
            >
              <span>VIDEO MASTER CLIP</span>
              <span>SHOT TOKEN</span>
              <span>DATE FOLDER</span>
              <span>DIAGNOSTIC STATUS (MISSING PHOTO)</span>
              <span style={{ textAlign: 'right' }}>EXPLORER ACTIONS</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {!scanResult || filteredUnmatched.length === 0 ? (
                <div
                  style={{
                    height: '100%',
                    minHeight: 180,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: 30,
                    textAlign: 'center',
                  }}
                >
                  <CheckCircle2 size={28} color={scanResult ? '#10B981' : 'var(--tertiary-label)'} style={{ opacity: scanResult ? 1 : 0.4 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: scanResult ? 'var(--label)' : 'var(--secondary-label)' }}>
                    {scanResult ? 'All video clips paired successfully — zero orphans detected.' : 'Run sequence scan to check for missing photo folders.'}
                  </span>
                </div>
              ) : (
                filteredUnmatched.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      height: 46,
                      display: 'grid',
                      gridTemplateColumns: '2fr 0.9fr 1fr 2fr 1.8fr',
                      alignItems: 'center',
                      padding: '0 16px',
                      borderBottom: '1px solid var(--border-subtle)',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--label)',
                      backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.videoPath}>
                      {item.videoFile}
                    </span>

                    <span
                      style={{
                        display: 'inline-block',
                        width: 'fit-content',
                        padding: '1px 6px',
                        borderRadius: 4,
                        fontSize: 9.5,
                        fontWeight: 700,
                        color: 'var(--system-orange)',
                        backgroundColor: 'rgba(245, 158, 11, 0.12)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                      }}
                    >
                      {item.shotCode}
                    </span>

                    <span style={{ color: 'var(--secondary-label)' }}>
                      {item.dateFolder || '(Root)'}
                    </span>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
                      <span style={{ color: 'var(--system-red)', fontWeight: 700, fontSize: 10 }}>
                        [MISSING PHOTO SUBFOLDER]
                      </span>
                      <span style={{ color: 'var(--secondary-label)', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.reason}>
                        {item.reason}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                      {/* Open Video Folder */}
                      <button
                        onClick={() => handleLocateItem(item.videoPath)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          padding: '4px 8px',
                          color: 'var(--label)',
                          fontSize: 10.5,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        title="Open Video Folder to locate this video clip"
                      >
                        <Video size={12} color="var(--system-green)" />
                        <span>Open Video</span>
                      </button>

                      {/* Open Photo Folder to check if photo folder exists or create it */}
                      <button
                        onClick={() => handleOpenPath(item.targetExpectedDir || photoDir, `Target Photo Folder (${item.dateFolder})`)}
                        style={{
                          background: 'rgba(0, 122, 255, 0.1)',
                          border: '1px solid rgba(0, 122, 255, 0.35)',
                          borderRadius: 6,
                          padding: '4px 8px',
                          color: 'var(--system-blue)',
                          fontSize: 10.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        title="Open Photo Folder in Explorer where this photo subfolder should be placed"
                      >
                        <FolderOpen size={12} color="var(--system-blue)" />
                        <span>Open Photo Folder</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Missing Video Files / Photo Subfolders Without Video */}
        {activeTab === 'unmatchedFolders' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div
              style={{
                height: 36,
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderBottom: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: '2fr 0.9fr 1fr 2fr 1.8fr',
                alignItems: 'center',
                padding: '0 16px',
                fontSize: 10.5,
                fontWeight: 700,
                color: 'var(--tertiary-label)',
              }}
            >
              <span>PHOTO SUBFOLDER</span>
              <span>SEQUENCE TOKEN</span>
              <span>DATE FOLDER</span>
              <span>DIAGNOSTIC STATUS (MISSING VIDEO)</span>
              <span style={{ textAlign: 'right' }}>EXPLORER ACTIONS</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {!scanResult || filteredUnmatchedFolders.length === 0 ? (
                <div
                  style={{
                    height: '100%',
                    minHeight: 180,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: 30,
                    textAlign: 'center',
                  }}
                >
                  <CheckCircle2 size={28} color={scanResult ? '#10B981' : 'var(--tertiary-label)'} style={{ opacity: scanResult ? 1 : 0.4 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: scanResult ? 'var(--label)' : 'var(--secondary-label)' }}>
                    {scanResult ? 'All photo subfolders matched with corresponding video clips.' : 'Run sequence scan to inspect photo subfolder coverage.'}
                  </span>
                </div>
              ) : (
                filteredUnmatchedFolders.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      height: 46,
                      display: 'grid',
                      gridTemplateColumns: '2fr 0.9fr 1fr 2fr 1.8fr',
                      alignItems: 'center',
                      padding: '0 16px',
                      borderBottom: '1px solid var(--border-subtle)',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--label)',
                      backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)',
                    }}
                  >
                    <span style={{ color: 'var(--system-cyan)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.folderPath}>
                      {item.folderName}
                    </span>

                    <span style={{ color: 'var(--secondary-label)' }}>
                      {item.shotCode}
                    </span>

                    <span style={{ color: 'var(--secondary-label)' }}>
                      {item.dateFolder}
                    </span>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
                      <span style={{ color: 'var(--system-orange)', fontWeight: 700, fontSize: 10 }}>
                        [MISSING VIDEO FILE]
                      </span>
                      <span style={{ color: 'var(--secondary-label)', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.reason}>
                        {item.reason}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                      {/* Open Photo Folder */}
                      <button
                        onClick={() => handleOpenPath(item.folderPath, `Photo Folder (${item.folderName})`)}
                        style={{
                          background: 'rgba(0, 122, 255, 0.1)',
                          border: '1px solid rgba(0, 122, 255, 0.35)',
                          borderRadius: 6,
                          padding: '4px 8px',
                          color: 'var(--system-blue)',
                          fontSize: 10.5,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        title="Open Photo Subfolder in Explorer"
                      >
                        <FolderOpen size={12} color="var(--system-blue)" />
                        <span>Open Photo</span>
                      </button>

                      {/* Open Video Folder */}
                      <button
                        onClick={() => handleOpenPath(item.videoFolderPath || videoDir, `Video Folder (${item.dateFolder})`)}
                        style={{
                          background: 'rgba(52, 199, 89, 0.1)',
                          border: '1px solid rgba(52, 199, 89, 0.35)',
                          borderRadius: 6,
                          padding: '4px 8px',
                          color: 'var(--system-green)',
                          fontSize: 10.5,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        title="Open Video Folder in Explorer to check for missing video clips"
                      >
                        <Video size={12} color="var(--system-green)" />
                        <span>Open Video Folder</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Live Operation Loading Overlay */}
      <OperationLoadingOverlay
        isOpen={isScanning || isTransferring || isMovingFolder}
        title={
          isScanning
            ? 'Scanning & Pairing Video Sequences...'
            : isTransferring
            ? 'Transferring Paired Video Clips...'
            : 'Relocating Merged Media to Upload Structure...'
        }
        subtitle={
          isScanning
            ? 'Inspecting video tokens and matching them to corresponding photo subfolders...'
            : isTransferring
            ? 'Copying verified video sequence pairs into the target project hierarchy...'
            : 'Moving merged event folders into Main Data upload structure...'
        }
        accentColor="#10B981"
      />
    </div>
  );
};
