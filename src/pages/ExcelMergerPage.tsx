import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Folder,
  Play,
  ExternalLink,
  FolderOpen,
  FileCheck,
  Camera,
  Video,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Layers,
  AlertTriangle,
  Copy,
  FolderArchive,
} from 'lucide-react';
import { StudioButton } from '../components/StudioButton';
import { PageKey } from '../types/pipelineStages';
import { ExcelInspectItem, ExcelMergeStats } from '../../electron/engines/excelMerger';
import { InventoryReportItem } from '../../electron/engines/productionTools';
import { OperationLoadingOverlay } from '../components/OperationLoadingOverlay';

interface ExcelMergerPageProps {
  onShowToast: (text: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
  onNavigate?: (page: PageKey) => void;
}

export const ExcelMergerPage: React.FC<ExcelMergerPageProps> = ({ onShowToast, onNavigate }) => {
  // Navigation Section Mode: 'merge' (default) or 'collector'
  const [activeMode, setActiveMode] = useState<'merge' | 'collector'>('merge');

  // Collector State
  const [collectorSourceDir, setCollectorSourceDir] = useState('');
  const [collectorDestDir, setCollectorDestDir] = useState('');
  const [collectorMode, setCollectorMode] = useState<'copy' | 'move'>('copy');
  const [collectorDryRun, setCollectorDryRun] = useState(false);
  const [collectorScanning, setCollectorScanning] = useState(false);
  const [collectorExecuting, setCollectorExecuting] = useState(false);
  const [collectorItems, setCollectorItems] = useState<InventoryReportItem[]>([]);
  const [collectorTargetFolder, setCollectorTargetFolder] = useState('');
  const [isCollectorDragOver, setIsCollectorDragOver] = useState(false);

  const [photoInventoryPath, setPhotoInventoryPath] = useState('');
  const [videoInventoryPath, setVideoInventoryPath] = useState('');
  const [photoInspected, setPhotoInspected] = useState<ExcelInspectItem | null>(null);
  const [videoInspected, setVideoInspected] = useState<ExcelInspectItem | null>(null);

  const [isInspecting, setIsInspecting] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeStats, setMergeStats] = useState<ExcelMergeStats | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === 'true') {
        const photoPath = 'D:\\2026_EVENTS\\ROYAL_WEDDING\\REPORTS\\Photo_Selection_Master.xlsx';
        const videoPath = 'D:\\2026_EVENTS\\ROYAL_WEDDING\\REPORTS\\Video_Sequence_Index.xlsx';
        setPhotoInventoryPath(photoPath);
        setVideoInventoryPath(videoPath);
        setPhotoInspected({
          name: 'Photo_Selection_Master.xlsx',
          path: photoPath,
          size: '1.24 MB',
          sheet_count: 3,
          sheets: ['Event Index', 'Photo_U_Selection', 'Client_Picks'],
          rows: 1420,
          valid: true,
        });
        setVideoInspected({
          name: 'Video_Sequence_Index.xlsx',
          path: videoPath,
          size: '840 KB',
          sheet_count: 2,
          sheets: ['Master Video Clips', 'Sequence Alignment Log'],
          rows: 348,
          valid: true,
        });
      }
    }
  }, []);

  const loadPhotoFile = async (filePath: string) => {
    if (!filePath) return;
    setPhotoInventoryPath(filePath);
    setMergeStats(null);
    try {
      setIsInspecting(true);
      const inspected = await window.electronAPI.inspectExcelFiles([filePath]);
      if (inspected && inspected.length > 0) {
        setPhotoInspected(inspected[0]);
      }
    } catch {
    } finally {
      setIsInspecting(false);
    }
  };

  const loadVideoFile = async (filePath: string) => {
    if (!filePath) return;
    setVideoInventoryPath(filePath);
    setMergeStats(null);
    try {
      setIsInspecting(true);
      const inspected = await window.electronAPI.inspectExcelFiles([filePath]);
      if (inspected && inspected.length > 0) {
        setVideoInspected(inspected[0]);
      }
    } catch {
    } finally {
      setIsInspecting(false);
    }
  };

  const handleBrowsePhoto = async () => {
    if (!window.electronAPI) return;
    const selected = await window.electronAPI.selectOpenFiles('Select Photo Inventory Report', [
      { name: 'Excel Spreadsheets', extensions: ['xlsx', 'xlsm'] },
    ]);
    if (selected && selected.length > 0) {
      loadPhotoFile(selected[0]);
    }
  };

  const handleBrowseVideo = async () => {
    if (!window.electronAPI) return;
    const selected = await window.electronAPI.selectOpenFiles('Select Video Inventory Report', [
      { name: 'Excel Spreadsheets', extensions: ['xlsx', 'xlsm'] },
    ]);
    if (selected && selected.length > 0) {
      loadVideoFile(selected[0]);
    }
  };

  const handleClear = () => {
    setPhotoInventoryPath('');
    setVideoInventoryPath('');
    setPhotoInspected(null);
    setVideoInspected(null);
    setMergeStats(null);
  };

  const handleMerge = async () => {
    if (!photoInventoryPath || !videoInventoryPath) {
      onShowToast('Please select both Photo Inventory and Video Inventory files.', 'warning');
      return;
    }

    setIsMerging(true);
    try {
      // Merge with output saved to video inventory's directory
      const stats = await window.electronAPI.mergeExcelFiles(
        [photoInventoryPath, videoInventoryPath],
        '' // Empty = auto-derive output path at video inventory location
      );
      setMergeStats(stats);
      onShowToast(
        `Successfully merged Photo + Video inventory reports into one workbook!`,
        'success'
      );
    } catch (e: any) {
      onShowToast(`Excel merge failed: ${e.message}`, 'danger');
    } finally {
      setIsMerging(false);
    }
  };

  const handleOpenFile = async () => {
    if (mergeStats?.output_path && window.electronAPI) {
      await window.electronAPI.openPath(mergeStats.output_path);
    }
  };

  const handleRevealInExplorer = () => {
    if (mergeStats?.output_path && window.electronAPI) {
      window.electronAPI.showItemInFolder(mergeStats.output_path);
    }
  };

  // Collector Handlers
  const handleBrowseCollectorSource = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory('Select Source Folder to Scan for Inventory Reports', collectorSourceDir);
    if (dir) setCollectorSourceDir(dir);
  };

  const handleBrowseCollectorDest = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory('Select Destination Folder (creates "All Inventory Reports")', collectorDestDir);
    if (dir) setCollectorDestDir(dir);
  };

  const handleScanCollector = async () => {
    if (!collectorSourceDir.trim()) {
      onShowToast('Please select a source folder to scan', 'warning');
      return;
    }
    setCollectorScanning(true);
    try {
      const items = await window.electronAPI.scanInventoryReports(collectorSourceDir, collectorDestDir);
      setCollectorItems(items);
      if (items.length > 0) {
        onShowToast(`Discovered ${items.length} inventory report(s) across Document directories!`, 'success');
      } else {
        onShowToast('No _Inventory_Report.xlsx files found in Document directories.', 'info');
      }
    } catch (e: any) {
      onShowToast(`Scan error: ${e.message}`, 'danger');
    } finally {
      setCollectorScanning(false);
    }
  };

  const handleExecuteCollector = async () => {
    if (!collectorItems.length) {
      onShowToast('No inventory reports found to collect. Please scan first.', 'warning');
      return;
    }
    if (!collectorDestDir.trim()) {
      onShowToast('Please select a destination folder.', 'warning');
      return;
    }
    setCollectorExecuting(true);
    try {
      const res = await window.electronAPI.executeInventoryReports(collectorItems, collectorDestDir, collectorMode, collectorDryRun);
      setCollectorTargetFolder(res.allReportsFolder);
      if (collectorDryRun) {
        onShowToast(`Simulation: ${res.success} files would be copied into 'All Inventory Reports'.`, 'info');
      } else {
        onShowToast(`Successfully collected ${res.success} reports into 'All Inventory Reports'!`, 'success');
        setCollectorItems((prev) => prev.map((item) => ({ ...item, status: 'Copied' })));
      }
    } catch (e: any) {
      onShowToast(`Execution error: ${e.message}`, 'danger');
    } finally {
      setCollectorExecuting(false);
    }
  };

  const handleOpenCollectorFolder = async () => {
    if (!collectorTargetFolder && collectorDestDir) {
      const fallback = `${collectorDestDir}\\All Inventory Reports`;
      await window.electronAPI?.openPath(fallback);
    } else if (collectorTargetFolder) {
      await window.electronAPI?.openPath(collectorTargetFolder);
    }
  };

  const handleUseInMerger = (filePath: string, targetSlot: 'photo' | 'video') => {
    if (targetSlot === 'photo') {
      loadPhotoFile(filePath);
      onShowToast('Loaded into Photo Inventory slot for fusion', 'info');
    } else {
      loadVideoFile(filePath);
      onShowToast('Loaded into Video Inventory slot for fusion', 'info');
    }
    setActiveMode('merge');
  };

  const canMerge = !!photoInventoryPath && !!videoInventoryPath && !isMerging;

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
      {/* ── Hero Header ─────────────────────────────── */}
      <div
        className="glass-card"
        style={{
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          background:
            'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(16, 231, 157, 0.04) 100%)',
          borderColor: 'rgba(245, 158, 11, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Layers size={22} color="#F59E0B" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--label)' }}>
                Excel Report Merger
              </span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: 9.5,
                  fontWeight: 800,
                  letterSpacing: 0.8,
                  color: '#F59E0B',
                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                STYLE PRESERVING
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--secondary-label)', marginTop: 2 }}>
              Consolidate Photo &amp; Video inventory reports with full style, column widths &amp;
              formatting fidelity
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {(photoInventoryPath || videoInventoryPath) && activeMode === 'merge' && (
            <StudioButton variant="secondary" icon={<RefreshCw size={14} />} onClick={handleClear}>
              Reset
            </StudioButton>
          )}
        </div>
      </div>

      {/* ── Mode Switcher Tab Bar ───────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          borderBottom: '1px solid var(--border)',
          paddingBottom: 8,
        }}
      >
        <button
          onClick={() => setActiveMode('merge')}
          style={{
            padding: '7px 18px',
            borderRadius: 8,
            border: activeMode === 'merge' ? '1px solid #F59E0B' : '1px solid var(--border)',
            backgroundColor: activeMode === 'merge' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
            color: activeMode === 'merge' ? '#F59E0B' : 'var(--secondary-label)',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Layers size={14} />
          <span>Merge Photo &amp; Video Reports</span>
        </button>

        <button
          onClick={() => setActiveMode('collector')}
          style={{
            padding: '7px 18px',
            borderRadius: 8,
            border: activeMode === 'collector' ? '1px solid var(--system-cyan)' : '1px solid var(--border)',
            backgroundColor: activeMode === 'collector' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
            color: activeMode === 'collector' ? 'var(--system-cyan)' : 'var(--secondary-label)',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <FolderArchive size={14} />
          <span>All Inventory Reports Collector</span>
          <span
            style={{
              padding: '1px 6px',
              borderRadius: 4,
              fontSize: 9.5,
              fontWeight: 800,
              backgroundColor: 'rgba(0, 242, 254, 0.2)',
              color: 'var(--system-cyan)',
            }}
          >
            SCAN DOCUMENT FOLDERS
          </span>
        </button>
      </div>

      {activeMode === 'merge' ? (
        <>
          {/* Quick link to collector if reports are not gathered yet */}
          <div
            style={{
              padding: '12px 18px',
              borderRadius: 10,
              backgroundColor: 'rgba(0, 242, 254, 0.04)',
              border: '1px solid rgba(0, 242, 254, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileSpreadsheet size={16} color="var(--system-cyan)" />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--label)' }}>
                  Need to gather inventory reports from multiple camera cards first?
                </div>
                <div style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
                  Scan all shoot folders to automatically find <code>_Inventory_Report.xlsx</code> files in <code>Document</code> directories and copy them into <code>All Inventory Reports</code>.
                </div>
              </div>
            </div>
            <StudioButton
              variant="glass"
              size="sm"
              icon={<ArrowRight size={13} />}
              onClick={() => setActiveMode('collector')}
            >
              Open Collector
            </StudioButton>
          </div>

          {/* ── 2-File Picker ───────────────────────────── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: 12,
              alignItems: 'stretch',
            }}
          >
        {/* Photo Inventory Card */}
        <FilePickerCard
          label="Photo Inventory"
          labelColor="var(--system-blue)"
          icon={<Camera size={18} color="var(--system-blue)" />}
          accentColor="var(--system-blue)"
          accentColorRgb="10, 132, 255"
          filePath={photoInventoryPath}
          inspected={photoInspected}
          isInspecting={isInspecting && !!photoInventoryPath && !photoInspected}
          onBrowse={handleBrowsePhoto}
          onDropFile={loadPhotoFile}
          placeholder="Select or drop Photo Inventory .xlsx report..."
        />

        {/* Arrow Connector */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '0 4px',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: canMerge
                ? 'rgba(245, 158, 11, 0.15)'
                : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${canMerge ? 'rgba(245, 158, 11, 0.4)' : 'var(--border)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            <ArrowRight
              size={16}
              color={canMerge ? '#F59E0B' : 'var(--tertiary-label)'}
            />
          </div>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: 0.5,
              color: canMerge ? '#F59E0B' : 'var(--tertiary-label)',
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
            }}
          >
            MERGE
          </span>
        </div>

        {/* Video Inventory Card */}
        <FilePickerCard
          label="Video Inventory"
          labelColor="var(--system-purple)"
          icon={<Video size={18} color="var(--system-purple)" />}
          accentColor="var(--system-purple)"
          accentColorRgb="191, 90, 242"
          filePath={videoInventoryPath}
          inspected={videoInspected}
          isInspecting={isInspecting && !!videoInventoryPath && !videoInspected}
          onBrowse={handleBrowseVideo}
          onDropFile={loadVideoFile}
          placeholder="Select or drop Video Inventory .xlsx report..."
          isOutputTarget
        />
      </div>

      {/* ── Filename Alignment Banner ──────────────────── */}
      {photoInventoryPath && videoInventoryPath && (() => {
        const pName = photoInventoryPath.split(/[\\/]/).pop() || '';
        const vName = videoInventoryPath.split(/[\\/]/).pop() || '';
        const cleanP = pName.replace(/\.[^/.]+$/, '').replace(/^\d{4}[-_.]\d{2}[-_.]\d{2}[\s_-]*/, '').replace(/(_01M|_02E|_Photo|_Video|_photo|_video)?(_Inventory_Report.*)?$/i, '').trim().toLowerCase();
        const cleanV = vName.replace(/\.[^/.]+$/, '').replace(/^\d{4}[-_.]\d{2}[-_.]\d{2}[\s_-]*/, '').replace(/(_01M|_02E|_Photo|_Video|_photo|_video)?(_Inventory_Report.*)?$/i, '').trim().toLowerCase();
        const isMatched = cleanP && cleanV && cleanP === cleanV;

        return (
          <div
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              backgroundColor: isMatched ? 'rgba(16, 231, 157, 0.08)' : 'rgba(245, 158, 11, 0.08)',
              border: `1px solid ${isMatched ? 'rgba(16, 231, 157, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 11.5,
              fontFamily: 'var(--font-mono)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isMatched ? (
                <>
                  <CheckCircle2 size={15} color="#10E79D" />
                  <span style={{ color: '#10E79D', fontWeight: 600 }}>
                    Report Pair Verified: Both files correspond to the same project sequence.
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle size={15} color="#F59E0B" />
                  <span style={{ color: '#F59E0B' }}>
                    Note: Workbook names differ slightly ({pName} vs {vName}). They will be merged with styles intact.
                  </span>
                </>
              )}
            </div>

            <span style={{ fontSize: 10.5, color: 'var(--secondary-label)' }}>
              Saved in: Video Inventory Folder
            </span>
          </div>
        );
      })()}

      {/* ── Merge Action Bar ─────────────────────────── */}
      <div
        className="glass-card"
        style={{
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: canMerge ? 'var(--label)' : 'var(--tertiary-label)',
            }}
          >
            {canMerge
              ? '✓ Both inventory reports loaded — ready to consolidate'
              : 'Select both Photo Inventory and Video Inventory files to merge'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--secondary-label)', marginTop: 2 }}>
            Merged output will be saved in the Video Inventory folder with same filename suffix
            _MERGED
          </div>
        </div>

        <StudioButton
          variant="primary"
          loading={isMerging}
          icon={<Play size={14} />}
          onClick={handleMerge}
          disabled={!canMerge}
          style={{
            background: canMerge
              ? 'linear-gradient(135deg, #F59E0B, #D97706)'
              : undefined,
            boxShadow: canMerge ? '0 4px 16px rgba(245, 158, 11, 0.35)' : undefined,
            minWidth: 160,
          }}
        >
          {isMerging ? 'Merging...' : 'Merge Reports'}
        </StudioButton>
      </div>

      {/* ── Merge Success Banner ─────────────────────── */}
      {mergeStats && (
        <div
          className="glass-card"
          style={{
            padding: '18px 22px',
            backgroundColor: 'rgba(16, 231, 157, 0.06)',
            border: '1px solid rgba(16, 231, 157, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'rgba(16, 231, 157, 0.15)',
                  border: '1px solid rgba(16, 231, 157, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileCheck size={18} color="#10E79D" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#10E79D' }}>
                  ✓ Consolidation Complete
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--secondary-label)',
                    fontFamily: 'var(--font-mono)',
                    marginTop: 2,
                  }}
                >
                  {mergeStats.output_path}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <StudioButton
                variant="glass"
                size="sm"
                icon={<ExternalLink size={13} />}
                onClick={handleOpenFile}
              >
                Open File
              </StudioButton>
              <StudioButton
                variant="glass"
                size="sm"
                icon={<FolderOpen size={13} />}
                onClick={handleRevealInExplorer}
              >
                Reveal
              </StudioButton>
            </div>
          </div>

          {/* Metric Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 10,
              paddingTop: 12,
              borderTop: '1px solid rgba(16, 231, 157, 0.15)',
            }}
          >
            {[
              {
                label: 'Files Fused',
                value: mergeStats.files_merged,
                color: '#F59E0B',
              },
              {
                label: 'Sheets Compiled',
                value: mergeStats.sheets_processed,
                color: '#00F2FE',
              },
              {
                label: 'Total Rows',
                value: mergeStats.total_rows_merged,
                color: '#10E79D',
              },
              {
                label: 'Missing Files',
                value: mergeStats.missing_files_count,
                color: '#EF4444',
              },
              {
                label: 'Camera Total',
                value: mergeStats.camera_summary_found,
                color: '#BF5AF2',
              },
            ].map((m) => (
              <div
                key={m.label}
                style={{
                  textAlign: 'center',
                  padding: '12px 8px',
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: 0.6,
                    color: 'var(--tertiary-label)',
                    fontFamily: 'var(--font-mono)',
                    marginBottom: 4,
                  }}
                >
                  {m.label.toUpperCase()}
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: m.color,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {m.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Sheet Preview Table ──────────────────────── */}
      {(photoInspected || videoInspected) && (
        <div
          className="glass-card"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: 200,
          }}
        >
          {/* Table Header */}
          <div
            style={{
              height: 38,
              backgroundColor: 'var(--surface-elevated)',
              borderBottom: '1px solid var(--border)',
              display: 'grid',
              gridTemplateColumns: '1.6fr 0.9fr 2.2fr 0.9fr',
              alignItems: 'center',
              padding: '0 18px',
              fontSize: 10.5,
              fontWeight: 700,
              color: 'var(--tertiary-label)',
              letterSpacing: 0.6,
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span>WORKBOOK FILENAME</span>
            <span>FILE SIZE</span>
            <span>SHEETS DISCOVERED</span>
            <span style={{ textAlign: 'right' }}>ROW COUNT</span>
          </div>

          {/* Table Body */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {[
              { item: photoInspected, type: 'Photo', color: 'var(--system-blue)' },
              { item: videoInspected, type: 'Video', color: 'var(--system-purple)' },
            ]
              .filter((r) => r.item !== null)
              .map(({ item, type, color }, idx) =>
                item ? (
                  <div
                    key={idx}
                    style={{
                      height: 52,
                      display: 'grid',
                      gridTemplateColumns: '1.6fr 0.9fr 2.2fr 0.9fr',
                      alignItems: 'center',
                      padding: '0 18px',
                      borderBottom: '1px solid var(--border-subtle)',
                      fontSize: 11.5,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--label)',
                      backgroundColor:
                        idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                      <div
                        style={{
                          padding: '2px 7px',
                          borderRadius: 5,
                          fontSize: 9.5,
                          fontWeight: 700,
                          color,
                          backgroundColor: `rgba(${color === 'var(--system-blue)' ? '10, 132, 255' : '191, 90, 242'}, 0.12)`,
                          border: `1px solid ${color === 'var(--system-blue)' ? 'rgba(10, 132, 255, 0.3)' : 'rgba(191, 90, 242, 0.3)'}`,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {type.toUpperCase()}
                      </div>
                      <FileSpreadsheet size={15} color="#F59E0B" style={{ flexShrink: 0 }} />
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.name}
                      </span>
                    </div>

                    <span style={{ color: 'var(--secondary-label)' }}>{item.size}</span>

                    <div
                      style={{
                        display: 'flex',
                        gap: 4,
                        overflow: 'hidden',
                        flexWrap: 'nowrap',
                      }}
                    >
                      {item.sheets.map((s, si) => (
                        <span
                          key={si}
                          style={{
                            padding: '2px 7px',
                            borderRadius: 5,
                            fontSize: 9.5,
                            backgroundColor: 'var(--border-subtle)',
                            border: '1px solid var(--border)',
                            color: 'var(--secondary-label)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    <div
                      style={{
                        textAlign: 'right',
                        color: item.valid ? 'var(--system-green)' : 'var(--system-red)',
                        fontWeight: 700,
                      }}
                    >
                      {item.rows} rows
                    </div>
                  </div>
                ) : null
              )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!photoInspected && !videoInspected && !mergeStats && (
        <div
          className="glass-card"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            minHeight: 220,
            padding: '36px 20px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.08)',
            }}
          >
            <FileSpreadsheet size={26} color="#F59E0B" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--label)' }}>
              Awaiting Workbook Selection
            </span>
            <span
              style={{
                fontSize: 12,
                color: 'var(--secondary-label)',
                textAlign: 'center',
                maxWidth: 440,
                lineHeight: 1.5,
              }}
            >
              Select the Photo Inventory and Video Inventory Excel workbooks above to preview sheet structures and execute style-preserved consolidation.
            </span>
          </div>
        </div>
      )}
        </>
      ) : (
        /* ── All Inventory Reports Collector Section ── */
        <div
          className="glass-card"
          style={{
            padding: '22px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            flex: 1,
            minHeight: 460,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--label)' }}>
                All Inventory Reports Collector
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  padding: '2px 8px',
                  borderRadius: 6,
                  backgroundColor: 'rgba(0, 242, 254, 0.12)',
                  color: 'var(--system-cyan)',
                  border: '1px solid rgba(0, 242, 254, 0.3)',
                  fontWeight: 700,
                }}
              >
                AUTOMATED AGGREGATOR
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--secondary-label)', marginTop: 4 }}>
              Recursively scans all subfolders to find <code>_Inventory_Report.xlsx</code> located inside <code>Document</code> directories, and copies them into an <code>All Inventory Reports</code> folder inside your chosen destination path.
            </div>
          </div>

          {/* Path Pickers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* 1. Source Directory */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsCollectorDragOver(true);
              }}
              onDragLeave={() => setIsCollectorDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsCollectorDragOver(false);
                if (e.dataTransfer.files.length > 0) {
                  const fp = (e.dataTransfer.files[0] as any).path || '';
                  if (fp) setCollectorSourceDir(fp);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: isCollectorDragOver ? 'rgba(0, 242, 254, 0.15)' : 'var(--surface-elevated)',
                border: isCollectorDragOver ? '1px dashed var(--system-cyan)' : '1px solid var(--border)',
                borderRadius: 10,
                padding: '0 12px',
                gap: 8,
                transition: 'all 0.2s ease',
              }}
            >
              <Folder size={16} color="var(--system-cyan)" />
              <input
                value={collectorSourceDir}
                onChange={(e) => setCollectorSourceDir(e.target.value)}
                placeholder="1. Select or drag & drop Source Folder to scan (e.g. Ingest drive or root shoots folder)..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--label)',
                  fontSize: 12.5,
                  padding: '10px 0',
                  fontFamily: 'var(--font-mono)',
                }}
              />
              <StudioButton variant="glass" size="sm" icon={<Folder size={12} />} onClick={handleBrowseCollectorSource}>
                Browse Source
              </StudioButton>
            </div>

            {/* 2. Destination Directory */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '0 12px',
                gap: 8,
              }}
            >
              <FolderOpen size={16} color="var(--system-green)" />
              <input
                value={collectorDestDir}
                onChange={(e) => setCollectorDestDir(e.target.value)}
                placeholder="2. Select Destination Folder (the app will create 'All Inventory Reports' inside)..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--label)',
                  fontSize: 12.5,
                  padding: '10px 0',
                  fontFamily: 'var(--font-mono)',
                }}
              />
              <StudioButton variant="glass" size="sm" icon={<FolderOpen size={12} />} onClick={handleBrowseCollectorDest}>
                Browse Destination
              </StudioButton>
            </div>

            {/* Dynamic Target Preview Badge */}
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                backgroundColor: 'rgba(0, 242, 254, 0.06)',
                border: '1px solid rgba(0, 242, 254, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                color: 'var(--label)',
              }}
            >
              <span>
                📁 <strong>Output Target:</strong>{' '}
                <span style={{ color: 'var(--system-cyan)' }}>
                  {collectorDestDir ? `${collectorDestDir}\\All Inventory Reports` : '[Selected Destination Folder]\\All Inventory Reports'}
                </span>
              </span>
              <span style={{ fontSize: 10, color: 'var(--secondary-label)' }}>Auto-created on execution</span>
            </div>
          </div>

          {/* Action & Option Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--label)' }}>
                <span style={{ color: 'var(--secondary-label)' }}>Transfer:</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="collectorMode"
                    value="copy"
                    checked={collectorMode === 'copy'}
                    onChange={() => setCollectorMode('copy')}
                  />
                  <span>Copy (Safe)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', marginLeft: 8 }}>
                  <input
                    type="radio"
                    name="collectorMode"
                    value="move"
                    checked={collectorMode === 'move'}
                    onChange={() => setCollectorMode('move')}
                  />
                  <span>Move</span>
                </label>
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11.5,
                  cursor: 'pointer',
                  color: 'var(--label)',
                  paddingLeft: 8,
                  borderLeft: '1px solid var(--border)',
                }}
              >
                <input
                  type="checkbox"
                  checked={collectorDryRun}
                  onChange={(e) => setCollectorDryRun(e.target.checked)}
                />
                <span>Dry Run (Preview Only)</span>
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StudioButton
                variant="glass"
                icon={<RefreshCw size={13} className={collectorScanning ? 'spin' : ''} />}
                onClick={handleScanCollector}
                loading={collectorScanning}
                disabled={!collectorSourceDir.trim()}
              >
                Scan Folders
              </StudioButton>

              <StudioButton
                variant="primary"
                icon={<Copy size={13} />}
                onClick={handleExecuteCollector}
                loading={collectorExecuting}
                disabled={collectorItems.length === 0 || !collectorDestDir.trim()}
              >
                Collect into 'All Inventory Reports'
              </StudioButton>

              {collectorTargetFolder && (
                <StudioButton
                  variant="glass"
                  icon={<FolderOpen size={13} />}
                  onClick={handleOpenCollectorFolder}
                >
                  Open Folder
                </StudioButton>
              )}
            </div>
          </div>

          {/* Results Table */}
          <div
            style={{
              flex: 1,
              borderRadius: 10,
              border: '1px solid var(--border)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--surface-elevated)',
            }}
          >
            <div
              style={{
                height: 38,
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderBottom: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: '1.4fr 1.1fr 1.5fr 0.8fr 2fr 1.4fr',
                alignItems: 'center',
                padding: '0 16px',
                fontSize: 10.5,
                fontWeight: 700,
                color: 'var(--tertiary-label)',
                letterSpacing: 0.6,
                fontFamily: 'var(--font-mono)',
              }}
            >
              <span>SHOOT / PARENT FOLDER</span>
              <span>DOC DIRECTORY</span>
              <span>ORIGINAL REPORT</span>
              <span>SIZE</span>
              <span>TARGET IN 'ALL INVENTORY REPORTS'</span>
              <span style={{ textAlign: 'right' }}>ACTIONS</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {collectorItems.length === 0 ? (
                <div
                  style={{
                    height: '100%',
                    minHeight: 180,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    color: 'var(--tertiary-label)',
                    fontSize: 12.5,
                  }}
                >
                  <FileSpreadsheet size={32} style={{ opacity: 0.4 }} />
                  <span>No inventory reports scanned yet. Select source & destination folders above and click 'Scan Folders'.</span>
                </div>
              ) : (
                collectorItems.map((itm, idx) => (
                  <div
                    key={idx}
                    style={{
                      height: 48,
                      display: 'grid',
                      gridTemplateColumns: '1.4fr 1.1fr 1.5fr 0.8fr 2fr 1.4fr',
                      alignItems: 'center',
                      padding: '0 16px',
                      borderBottom: '1px solid var(--border-subtle)',
                      fontSize: 11.5,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--label)',
                      backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.012)',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--label)' }}>{itm.shootFolder}</span>
                    <span style={{ color: itm.isInDocFolder ? 'var(--system-cyan)' : 'var(--secondary-label)' }}>
                      {itm.docFolderName}
                    </span>
                    <span style={{ color: 'var(--secondary-label)' }}>{itm.filename}</span>
                    <span style={{ color: 'var(--secondary-label)' }}>{itm.sizeStr}</span>
                    <span style={{ color: 'var(--system-green)', fontWeight: 600 }}>{itm.proposedName}</span>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleUseInMerger(itm.sourcePath, 'photo')}
                        title="Load this report as Photo Inventory for fusion"
                        style={{
                          padding: '3px 8px',
                          borderRadius: 5,
                          fontSize: 10,
                          fontWeight: 700,
                          backgroundColor: 'rgba(10, 132, 255, 0.15)',
                          color: 'var(--system-blue)',
                          border: '1px solid rgba(10, 132, 255, 0.3)',
                          cursor: 'pointer',
                        }}
                      >
                        + Photo
                      </button>
                      <button
                        onClick={() => handleUseInMerger(itm.sourcePath, 'video')}
                        title="Load this report as Video Inventory for fusion"
                        style={{
                          padding: '3px 8px',
                          borderRadius: 5,
                          fontSize: 10,
                          fontWeight: 700,
                          backgroundColor: 'rgba(191, 90, 242, 0.15)',
                          color: 'var(--system-purple)',
                          border: '1px solid rgba(191, 90, 242, 0.3)',
                          cursor: 'pointer',
                        }}
                      >
                        + Video
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Operation Loading Overlay */}
      <OperationLoadingOverlay
        isOpen={isInspecting || isMerging}
        title={isInspecting ? 'Inspecting Excel Spreadsheets...' : 'Consolidating Inventory Reports...'}
        subtitle={
          isInspecting
            ? 'Analyzing workbook sheets, column dimensions, and cell formatting...'
            : 'Merging photo & video inventories with deep cell style preservation...'
        }
        accentColor="#F59E0B"
      />
    </div>
  );
};

// ── Sub-component: File Picker Card ─────────────────────────────────────────
interface FilePickerCardProps {
  label: string;
  labelColor: string;
  icon: React.ReactNode;
  accentColor: string;
  accentColorRgb: string;
  filePath: string;
  inspected: ExcelInspectItem | null;
  isInspecting: boolean;
  onBrowse: () => void;
  onDropFile: (path: string) => void;
  placeholder: string;
  isOutputTarget?: boolean;
}

const FilePickerCard: React.FC<FilePickerCardProps> = ({
  label,
  labelColor,
  icon,
  accentColor,
  accentColorRgb,
  filePath,
  inspected,
  isInspecting,
  onBrowse,
  onDropFile,
  placeholder,
  isOutputTarget,
}) => {
  const hasFile = !!filePath;
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const p = (file as any).path || file.name;
      if (p) onDropFile(p);
    }
  };

  return (
    <div
      className="glass-card"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        border: isDragOver
          ? `2px dashed rgba(${accentColorRgb}, 0.9)`
          : hasFile
          ? `1px solid rgba(${accentColorRgb}, 0.35)`
          : '1px solid var(--border)',
        background: isDragOver
          ? `rgba(${accentColorRgb}, 0.12)`
          : hasFile
          ? `rgba(${accentColorRgb}, 0.04)`
          : undefined,
        boxShadow: isDragOver ? `0 0 20px rgba(${accentColorRgb}, 0.25)` : undefined,
        transition: 'all 0.2s',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Output target badge */}
      {isOutputTarget && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            padding: '2px 8px',
            borderRadius: 6,
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: 0.5,
            color: accentColor,
            backgroundColor: `rgba(${accentColorRgb}, 0.12)`,
            border: `1px solid rgba(${accentColorRgb}, 0.3)`,
            fontFamily: 'var(--font-mono)',
          }}
        >
          OUTPUT DIR
        </div>
      )}

      {/* Label Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `rgba(${accentColorRgb}, 0.12)`,
            border: `1px solid rgba(${accentColorRgb}, 0.3)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: labelColor }}>
            {label}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--tertiary-label)' }}>
            {isOutputTarget ? 'Merged output saves here' : 'Source inventory report'}
          </div>
        </div>
      </div>

      {/* File path display */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          backgroundColor: 'var(--surface-elevated)',
          border: `1px solid ${hasFile ? `rgba(${accentColorRgb}, 0.2)` : 'var(--border)'}`,
          borderRadius: 10,
          padding: '0 12px',
          height: 40,
        }}
      >
        <Folder size={14} color={hasFile ? accentColor : 'var(--tertiary-label)'} />
        <span
          style={{
            flex: 1,
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: hasFile ? 'var(--label)' : 'var(--tertiary-label)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {filePath || placeholder}
        </span>
        {hasFile && (
          <CheckCircle2 size={14} color={accentColor} style={{ flexShrink: 0 }} />
        )}
      </div>

      {/* Browse button */}
      <StudioButton
        variant="glass"
        icon={<FileSpreadsheet size={14} />}
        onClick={onBrowse}
        loading={isInspecting}
        style={{ width: '100%', justifyContent: 'center' }}
      >
        {hasFile ? `Change ${label}` : `Select ${label}`}
      </StudioButton>

      {/* Inspected file details */}
      {inspected && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: '10px 12px',
            borderRadius: 8,
            background: `rgba(${accentColorRgb}, 0.06)`,
            border: `1px solid rgba(${accentColorRgb}, 0.15)`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 10.5, color: 'var(--secondary-label)' }}>
              Size: <b style={{ color: 'var(--label)' }}>{inspected.size}</b>
            </span>
            <span style={{ fontSize: 10.5, color: 'var(--secondary-label)' }}>
              Rows:{' '}
              <b style={{ color: accentColor }}>{inspected.rows}</b>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {inspected.sheets.map((s, i) => (
              <span
                key={i}
                style={{
                  padding: '2px 7px',
                  borderRadius: 5,
                  fontSize: 9.5,
                  backgroundColor: 'var(--border-subtle)',
                  border: '1px solid var(--border)',
                  color: 'var(--secondary-label)',
                  whiteSpace: 'nowrap',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
