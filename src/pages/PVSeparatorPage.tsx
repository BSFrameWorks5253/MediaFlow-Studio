import React, { useState, useEffect } from 'react';
import {
  Folder,
  Play,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  XSquare,
  FileSpreadsheet,
  ExternalLink,
  Video,
  Image as ImageIcon,
  Sparkles,
  Check,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { StudioButton } from '../components/StudioButton';
import { StorageHeadroomBar } from '../components/StorageHeadroomBar';
import { IngestionTerminal, LogLine } from '../components/IngestionTerminal';
import { StudioFolderInput } from '../components/StudioFolderInput';
import { PageKey } from '../components/Sidebar';
import {
  DiskHeadroom,
  PVScanResult,
  PVProgressData,
  SeparationTarget,
  PVSeparationSummary,
} from '../../electron/engines/pvSeparator';

interface PVSeparatorPageProps {
  onShowToast: (text: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
  onUpdateTelemetry: (data: any) => void;
  onNavigate?: (page: PageKey) => void;
}

export const PVSeparatorPage: React.FC<PVSeparatorPageProps> = ({ onShowToast, onUpdateTelemetry, onNavigate }) => {
  const [sourceDir, setSourceDir] = useState('');
  const [destDir, setDestDir] = useState('');
  const [target, setTarget] = useState<SeparationTarget>('video');
  const [mode, setMode] = useState<'copy' | 'move' | 'delete'>('move');
  const [generateExcel, setGenerateExcel] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [headroom, setHeadroom] = useState<DiskHeadroom | null>(null);
  const [scanResult, setScanResult] = useState<PVScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [executionResult, setExecutionResult] = useState<PVSeparationSummary | null>(null);

  const [progress, setProgress] = useState<PVProgressData>({
    current: 0,
    total: 0,
    current_file: '',
    speed_mbps: 0,
    speed_str: '0.0 MB/s',
    eta_sec: 0,
    eta_str: '00:00',
    threads_active: 0,
  });

  const [logs, setLogs] = useState<LogLine[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === 'true') {
        setSourceDir('D:\\DCIM\\100EOS5D_MASTER_CARD');
        setDestDir('D:\\2026_EVENTS\\ROYAL_WEDDING\\RAW_VIDEOS');
        setHeadroom({
          drive: 'D:',
          freeGB: 412.5,
          totalGB: 1000.0,
          usedPercent: 58.75,
          sufficient: true,
          statusMessage: 'Storage Headroom Verified: 412.5 GB available on target drive (D:)',
        } as any);
        setProgress({
          current: 1840,
          total: 2420,
          current_file: '2026-02-14\\MVI_4042.MP4 (1.4 GB)',
          speed_mbps: 842.5,
          speed_str: '842.5 MB/s',
          eta_sec: 14,
          eta_str: '00:14',
          threads_active: 32,
        });
        setLogs([
          { time: '14:02:10', type: 'info', text: '32-Thread SIMD worker pool initialized with 8MB direct memory chunking.' },
          { time: '14:02:11', type: 'success', text: 'Verified storage headroom on target drive D: (412.5 GB free, required 64.2 GB).' },
          { time: '14:02:12', type: 'info', text: 'Ingesting 2,420 files. Video stream isolation enabled.' },
          { time: '14:02:13', type: 'success', text: '[THREAD-04] MVI_4039.MOV -> D:\\2026_EVENTS\\ROYAL_WEDDING\\RAW_VIDEOS\\2026-02-14\\MVI_4039.MOV (Instant Atomic Rename)' },
          { time: '14:02:14', type: 'success', text: '[THREAD-12] MVI_4040.MOV -> D:\\2026_EVENTS\\ROYAL_WEDDING\\RAW_VIDEOS\\2026-02-14\\MVI_4040.MOV (Instant Atomic Rename)' },
          { time: '14:02:15', type: 'info', text: 'Transferring 2026-02-14\\MVI_4042.MP4 at 842.5 MB/s [76% completed, 32 threads active]' },
        ]);
      }
    }
  }, []);

  // Probe headroom whenever destination path changes
  useEffect(() => {
    if (destDir.trim() && window.electronAPI) {
      window.electronAPI.checkStorageHeadroom(destDir.trim()).then((res: any) => {
        setHeadroom(res);
      });
    }
  }, [destDir]);

  // Subscribe to progress stream
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onPVProgress) {
      const unsub = window.electronAPI.onPVProgress((data: PVProgressData) => {
        setProgress(data);
        onUpdateTelemetry({
          active: true,
          speedMbps: data.speed_mbps,
          speedStr: data.speed_str,
          threadsActive: data.threads_active,
          etaSec: data.eta_sec,
          etaStr: data.eta_str,
          driveLetter: headroom?.drive || '',
          driveFreeGB: headroom?.free_gb || 0,
          driveUsedPct: headroom?.used_pct || 0,
        });

        if (data.log_entry) {
          setLogs((prev) => [
            ...prev.slice(-300),
            {
              text: data.log_entry!,
              type: data.log_type || 'info',
              time: new Date().toLocaleTimeString(),
            },
          ]);
        }
      });
      return () => unsub();
    }
  }, [headroom, onUpdateTelemetry]);

  const handleBrowseSource = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory('Select Master Media / Source Ingest Folder', sourceDir);
    if (dir) {
      setSourceDir(dir);
      setExecutionResult(null);
    }
  };

  const handleBrowseDest = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory(
      target === 'video'
        ? 'Select Separated Videos Destination Folder'
        : 'Select Separated Photos Destination Folder',
      destDir
    );
    if (dir) {
      setDestDir(dir);
      setExecutionResult(null);
    }
  };

  const handleScan = async (overrideTarget?: SeparationTarget) => {
    if (!sourceDir.trim()) {
      onShowToast('Please select a valid media source directory', 'warning');
      return;
    }
    const currentTarget = overrideTarget || target;
    setIsScanning(true);
    setExecutionResult(null);
    try {
      const res: PVScanResult = await window.electronAPI.scanPV(sourceDir, currentTarget);
      setScanResult(res);
      const targetMB = (res.target_bytes / (1024 * 1024)).toFixed(1);
      const targetLabel = currentTarget === 'video' ? 'videos' : 'photos';
      onShowToast(`Scan complete: Found ${res.target_count} target ${targetLabel} (${targetMB} MB).`, 'success');
      setLogs((prev) => [
        ...prev,
        {
          text: `Scan finished: Found ${res.total_videos} videos (${(res.video_bytes / 1024 / 1024).toFixed(1)} MB), ${res.total_photos} photos (${(res.photo_bytes / 1024 / 1024).toFixed(1)} MB), ${res.total_sidecars} sidecars. Mode: ${currentTarget.toUpperCase()}`,
          type: 'success',
          time: new Date().toLocaleTimeString(),
        },
      ]);
    } catch (e: any) {
      onShowToast(`Scan failed: ${e.message}`, 'danger');
    } finally {
      setIsScanning(false);
    }
  };

  const handleTargetChange = (newTarget: SeparationTarget) => {
    setTarget(newTarget);
    setExecutionResult(null);
    if (sourceDir.trim()) {
      handleScan(newTarget);
    }
  };

  const handleExecute = async () => {
    if (!sourceDir.trim()) {
      onShowToast('Please select a valid media source directory', 'warning');
      return;
    }
    if (mode !== 'delete' && !destDir.trim()) {
      onShowToast('Please specify a destination folder for separation', 'warning');
      return;
    }
    if (!scanResult || scanResult.items_to_process.length === 0) {
      onShowToast(
        mode === 'delete'
          ? 'No matching items found to delete. Run directory scan first.'
          : 'No matching items to separate. Run directory scan first.',
        'warning'
      );
      return;
    }

    if (mode === 'delete') {
      setShowDeleteModal(true);
      return;
    }

    await proceedExecution();
  };

  const proceedExecution = async () => {
    setShowDeleteModal(false);
    setIsProcessing(true);
    setExecutionResult(null);
    const targetLabel = target === 'video' ? 'videos' : 'photos';
    setLogs((prev) => [
      ...prev,
      {
        text: mode === 'delete'
          ? `Starting PERMANENT DELETION of ${scanResult?.target_count} ${targetLabel} from ${sourceDir}...`
          : `Starting ${mode.toUpperCase()} separation of ${scanResult?.target_count} ${targetLabel} to ${destDir}...`,
        type: mode === 'delete' ? 'warning' : 'info',
        time: new Date().toLocaleTimeString(),
      },
    ]);

    try {
      const summary: PVSeparationSummary = await window.electronAPI.executePV(
        sourceDir,
        destDir.trim() ? destDir : sourceDir,
        mode,
        target,
        generateExcel
      );
      setExecutionResult(summary);
      onShowToast(
        mode === 'delete'
          ? `Purge completed: ${summary.success_count} files permanently deleted from master data!`
          : `Separation completed: ${summary.success_count} files processed!`,
        'success'
      );
      setLogs((prev) => [
        ...prev,
        {
          text: `Completed in ${summary.elapsed_sec}s (Avg ${summary.avg_speed_mbps} MB/s, ${summary.error_count} errors)`,
          type: 'success',
          time: new Date().toLocaleTimeString(),
        },
      ]);

      if (summary.report_path) {
        setLogs((prev) => [
          ...prev,
          {
            text: `Generated Audit Report: ${summary.report_path}`,
            type: 'success',
            time: new Date().toLocaleTimeString(),
          },
        ]);
      }

      // Re-scan directory if deleted so UI counts immediately reflect deletion
      if (mode === 'delete' && sourceDir.trim()) {
        handleScan();
      }
    } catch (e: any) {
      onShowToast(`${mode === 'delete' ? 'Deletion' : 'Separation'} error: ${e.message}`, 'danger');
      setLogs((prev) => [
        ...prev,
        {
          text: `Error: ${e.message}`,
          type: 'danger',
          time: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsProcessing(false);
      onUpdateTelemetry({ active: false });
    }
  };

  const handleCancel = () => {
    if (window.electronAPI) {
      window.electronAPI.cancelPV();
      onShowToast('Separation process cancelled', 'warning');
    }
  };

  const handleOpenFile = (filePath: string) => {
    if (window.electronAPI && filePath) {
      window.electronAPI.openPath(filePath);
    }
  };

  const percent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

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
      {/* Directory Selectors & Mode Configuration Card */}
      <div
        className="glass-card"
        style={{
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--label)' }}>
            Media Ingest & Separation Configuration
          </div>
          <div style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
            Separates Footage & Photos with Automatic Excel Audit Logging
          </div>
        </div>

        {/* 1. SEPARATION TARGET MODES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--secondary-label)' }}>
            Choose What to Separate from Master Data:
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 10,
            }}
          >
            {/* Mode 1: Separate Videos */}
            <button
              onClick={() => handleTargetChange('video')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 10,
                border: target === 'video' ? '1.5px solid #06B6D4' : '1px solid var(--border)',
                backgroundColor: target === 'video' ? 'rgba(6, 182, 212, 0.12)' : 'var(--surface-elevated)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--transition-fast)',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: target === 'video' ? '#06B6D4' : 'var(--border-subtle)',
                  color: target === 'video' ? '#FFF' : '#06B6D4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Video size={16} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: target === 'video' ? 'var(--label)' : 'var(--secondary-label)' }}>
                  {mode === 'delete' ? 'Purge Videos Only' : 'Extract Videos Only'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--tertiary-label)' }}>
                  {mode === 'delete' ? 'Deletes video clips from master data' : 'Moves/Copies video clips & sidecars'}
                </div>
              </div>
            </button>

            {/* Mode 2: Separate Photos */}
            <button
              onClick={() => handleTargetChange('photo')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 10,
                border: target === 'photo' ? '1.5px solid #8B5CF6' : '1px solid var(--border)',
                backgroundColor: target === 'photo' ? 'rgba(139, 92, 246, 0.12)' : 'var(--surface-elevated)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--transition-fast)',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: target === 'photo' ? '#8B5CF6' : 'var(--border-subtle)',
                  color: target === 'photo' ? '#FFF' : '#8B5CF6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ImageIcon size={16} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: target === 'photo' ? 'var(--label)' : 'var(--secondary-label)' }}>
                  {mode === 'delete' ? 'Purge Photos Only' : 'Extract Photos Only'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--tertiary-label)' }}>
                  {mode === 'delete' ? 'Deletes photo files from master data' : 'Moves/Copies RAW & raster photos'}
                </div>
              </div>
            </button>

          </div>
        </div>

        {/* Source Folder Picker with Drag-and-Drop */}
        <StudioFolderInput
          label="Source Directory (Master Data / Camera Ingest):"
          description="Drop camera memory card or master media folder here"
          value={sourceDir}
          onChange={(val) => setSourceDir(val)}
          onBrowse={handleBrowseSource}
          placeholder="Select or drop Master Data folder here..."
        />

        {/* Destination Folder Picker with Drag-and-Drop */}
        <StudioFolderInput
          label={
            mode === 'delete'
              ? 'Audit Log Destination Folder (Optional):'
              : `Target Destination Folder (${target === 'video' ? 'Videos' : target === 'photo' ? 'Photos' : 'Separated Media'}):`
          }
          description={mode === 'delete' ? 'Defaults to Master Data folder if left blank' : 'Drop target extraction directory here'}
          value={destDir}
          onChange={(val) => setDestDir(val)}
          onBrowse={handleBrowseDest}
          placeholder={
            mode === 'delete'
              ? 'Optional: Select folder to save Deletion Audit Excel report...'
              : target === 'video'
              ? 'Select target destination for extracted videos...'
              : target === 'photo'
              ? 'Select target destination for extracted photos...'
              : 'Select target destination for split folders...'
          }
        />

        {/* Storage Headroom Bar (Only when moving/copying to a destination) */}
        {mode !== 'delete' && <StorageHeadroomBar headroom={headroom} />}

        {/* Transfer Options & Execution Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 10,
            borderTop: '1px solid var(--border-subtle)',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          {/* Left: Transfer Mode & Excel Report Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            {/* Transfer Method / Action Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11.5, color: 'var(--secondary-label)' }}>Action:</span>
              <div
                style={{
                  display: 'flex',
                  backgroundColor: 'var(--surface-elevated)',
                  borderRadius: 8,
                  padding: 2,
                  border: '1px solid var(--border)',
                }}
              >
                <button
                  onClick={() => setMode('move')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: mode === 'move' ? 'var(--system-purple)' : 'transparent',
                    color: mode === 'move' ? '#ffffff' : 'var(--secondary-label)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Moves files out of master data into destination"
                >
                  Move (Fast Atomic)
                </button>
                <button
                  onClick={() => setMode('copy')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: mode === 'copy' ? 'var(--system-blue)' : 'transparent',
                    color: mode === 'copy' ? '#ffffff' : 'var(--secondary-label)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Duplicates files to destination without removing originals"
                >
                  Copy (Safe Stream)
                </button>
                <button
                  onClick={() => setMode('delete')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '5px 12px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: mode === 'delete' ? '#DC2626' : 'transparent',
                    color: mode === 'delete' ? '#ffffff' : '#EF4444',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Permanently deletes selected media directly from master data"
                >
                  <Trash2 size={12} />
                  Delete from Master (Purge)
                </button>
              </div>
            </div>

            {/* Excel Manifest Report Checkbox */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: 11.5,
                fontWeight: 600,
                color: generateExcel ? '#10B981' : 'var(--secondary-label)',
              }}
            >
              <input
                type="checkbox"
                checked={generateExcel}
                onChange={(e) => setGenerateExcel(e.target.checked)}
                style={{ accentColor: '#10B981', width: 15, height: 15, cursor: 'pointer' }}
              />
              <FileSpreadsheet size={15} color={generateExcel ? '#10B981' : 'var(--secondary-label)'} />
              <span>{mode === 'delete' ? 'Create Deletion Audit Excel (.xlsx)' : 'Create Excel Report (.xlsx)'}</span>
            </label>
          </div>

          {/* Right: Action Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <StudioButton
              variant="secondary"
              loading={isScanning}
              icon={<RefreshCw size={14} />}
              onClick={() => handleScan()}
            >
              Analyze Tree
            </StudioButton>

            {isProcessing ? (
              <StudioButton variant="danger" icon={<XSquare size={14} />} onClick={handleCancel}>
                {mode === 'delete' ? 'Cancel Deletion' : 'Cancel Separation'}
              </StudioButton>
            ) : mode === 'delete' ? (
              <StudioButton
                variant="danger"
                icon={<Trash2 size={14} />}
                onClick={handleExecute}
                disabled={!scanResult || scanResult.items_to_process.length === 0}
                style={{
                  backgroundColor: '#DC2626',
                  color: '#FFF',
                  fontWeight: 700,
                  boxShadow: '0 2px 10px rgba(220, 38, 38, 0.35)',
                }}
              >
                {`Permanently Delete All ${target === 'video' ? 'Videos' : target === 'photo' ? 'Photos' : 'Media'} from Master Data`}
              </StudioButton>
            ) : (
              <StudioButton
                variant="primary"
                icon={<Play size={14} />}
                onClick={handleExecute}
                disabled={!scanResult || scanResult.items_to_process.length === 0}
              >
                {`Execute ${target === 'video' ? 'Video' : target === 'photo' ? 'Photo' : 'Media'} Separation`}
              </StudioButton>
            )}
          </div>
        </div>
      </div>

      {/* Analysis Results Summary Bar */}
      {scanResult && (
        <div
          className="glass-card"
          style={{
            padding: '14px 20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
          }}
        >
          <div>
            <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
              {target === 'video' ? 'Videos to Extract:' : target === 'photo' ? 'Photos to Extract:' : 'Total Items:'}
            </span>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--system-cyan)', fontFamily: 'var(--font-mono)' }}>
              {scanResult.target_count} files
            </div>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>Target Volume:</span>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--label)', fontFamily: 'var(--font-mono)' }}>
              {(scanResult.target_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB
            </div>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>All Videos Found:</span>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--system-green)', fontFamily: 'var(--font-mono)' }}>
              {scanResult.total_videos} clips
            </div>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>All Photos Found:</span>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--system-purple)', fontFamily: 'var(--font-mono)' }}>
              {scanResult.total_photos} photos
            </div>
          </div>
        </div>
      )}

      {/* Completion Banner with Excel Download / View Buttons */}
      {executionResult && (
        <div
          className="glass-card"
          style={{
            padding: '16px 20px',
            backgroundColor: mode === 'delete' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
            border: mode === 'delete' ? '1.5px solid rgba(239, 68, 68, 0.4)' : '1.5px solid rgba(16, 185, 129, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: mode === 'delete' ? '#EF4444' : '#10B981',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {mode === 'delete' ? <Trash2 size={18} /> : <Check size={20} />}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: mode === 'delete' ? '#EF4444' : '#10B981' }}>
                {mode === 'delete' ? 'Master Data Purge Completed Successfully!' : 'Separation Completed Successfully!'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
                {mode === 'delete'
                  ? `${executionResult.success_count} files permanently deleted from master data in ${executionResult.elapsed_sec}s`
                  : `${executionResult.success_count} files separated in ${executionResult.elapsed_sec}s • Average throughput: ${executionResult.avg_speed_mbps} MB/s`}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {executionResult.report_path && (
              <StudioButton
                variant="primary"
                onClick={() => handleOpenFile(executionResult.report_path!)}
                style={{ backgroundColor: mode === 'delete' ? '#EF4444' : '#10B981', color: '#FFF' }}
              >
                <FileSpreadsheet size={15} style={{ marginRight: 6 }} />
                {mode === 'delete'
                  ? `Open Deletion Audit (${executionResult.report_type?.toUpperCase()})`
                  : `Open Excel Report ({executionResult.report_type?.toUpperCase()})`}
              </StudioButton>
            )}
            <StudioButton
              variant="secondary"
              onClick={() => handleOpenFile(mode === 'delete' ? sourceDir : destDir)}
            >
              <ExternalLink size={14} style={{ marginRight: 6 }} />
              {mode === 'delete' ? 'Open Master Data Folder' : 'Open Destination'}
            </StudioButton>
          </div>
        </div>
      )}

      {/* Live Transfer Progress Ribbon */}
      <div
        className="glass-card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--label)' }}>
              Live Streaming Progress
            </span>
            {progress.current_file && (
              <span style={{ fontSize: 11, color: 'var(--secondary-label)', fontFamily: 'var(--font-mono)' }}>
                ({progress.current_file})
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--system-cyan)' }}>
              {progress.speed_str}
            </span>
            <span style={{ fontSize: 12, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--label)' }}>
              {percent}%
            </span>
          </div>
        </div>

        {/* Progress Track */}
        <div
          style={{
            width: '100%',
            height: 8,
            borderRadius: 4,
            backgroundColor: 'var(--border)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: '100%',
              borderRadius: 4,
              background: 'linear-gradient(90deg, #00F2FE 0%, #8B5CF6 100%)',
              transition: 'width 0.2s ease',
            }}
          />
        </div>
      </div>

      {/* Terminal Stream Console */}
      <IngestionTerminal logs={logs} onClear={() => setLogs([])} />

      {/* Delete Confirmation Safety Modal */}
      {showDeleteModal && scanResult && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: 520,
              width: '100%',
              padding: '24px 26px',
              backgroundColor: 'var(--surface-elevated)',
              border: '1.5px solid rgba(239, 68, 68, 0.5)',
              borderRadius: 14,
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 20px rgba(239, 68, 68, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#EF4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={24} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--label)' }}>
                  Confirm Permanent Media Deletion
                </div>
                <div style={{ fontSize: 12, color: 'var(--secondary-label)' }}>
                  This action will permanently erase files from your drive.
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '14px 16px',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                fontSize: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--secondary-label)' }}>Target to Purge:</span>
                <span style={{ fontWeight: 700, color: '#EF4444' }}>
                  {scanResult.target_count} {target === 'video' ? 'Videos' : target === 'photo' ? 'Photos' : 'Media Files'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--secondary-label)' }}>Total Space to Free:</span>
                <span style={{ fontWeight: 700, color: 'var(--label)', fontFamily: 'var(--font-mono)' }}>
                  {(scanResult.target_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--secondary-label)' }}>Master Data Directory:</span>
                <span
                  style={{
                    fontWeight: 600,
                    color: 'var(--label)',
                    maxWidth: 260,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                  }}
                  title={sourceDir}
                >
                  {sourceDir}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--secondary-label)' }}>Audit Manifest:</span>
                <span style={{ fontWeight: 600, color: '#10B981' }}>
                  {generateExcel ? 'Excel (.xlsx) + CSV report will be saved' : 'Disabled'}
                </span>
              </div>
            </div>

            <div style={{ fontSize: 11.5, color: 'var(--secondary-label)', lineHeight: 1.5 }}>
              ⚠️ <strong>Warning:</strong> Selected files will be deleted directly from the master directory. They will NOT be moved to recycle bin. Please verify you have selected the correct files.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <StudioButton variant="secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </StudioButton>
              <StudioButton
                variant="danger"
                icon={<Trash2 size={14} />}
                onClick={proceedExecution}
                style={{ backgroundColor: '#DC2626', color: '#FFF' }}
              >
                {`Confirm & Delete ${scanResult.target_count} Files`}
              </StudioButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
