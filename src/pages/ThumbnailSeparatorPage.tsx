import React, { useState, useMemo } from 'react';
import {
  Folder,
  FolderArchive,
  RefreshCw,
  Play,
  AlertTriangle,
  CheckCircle2,
  FolderOpen,
  Search,
  Copy,
  Check,
  Layers,
  AlertCircle,
  FileQuestion,
} from 'lucide-react';
import { StudioButton } from '../components/StudioButton';
import { PageKey } from '../types/pipelineStages';
import {
  ThumbnailScanResult,
  FolderMismatchSummary,
} from '../../electron/engines/thumbnailSeparator';
import { usePipeline } from '../context/PipelineContext';
import { OperationLoadingOverlay } from '../components/OperationLoadingOverlay';
import { toUserErrorMessage } from '../utils/errorSanitizer';

interface ThumbnailSeparatorPageProps {
  onShowToast: (text: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
  onNavigate?: (page: PageKey) => void;
}

export const ThumbnailSeparatorPage: React.FC<ThumbnailSeparatorPageProps> = ({ onShowToast, onNavigate }) => {
  const { uploadStructure } = usePipeline();
  const [sourceDir, setSourceDir] = useState('');
  const [destDir, setDestDir] = useState(uploadStructure.thumbnailsPath || '');
  const [mode, setMode] = useState<'copy' | 'move'>('copy');

  // Auto-update destDir when uploadStructure changes
  React.useEffect(() => {
    if (uploadStructure.thumbnailsPath && !destDir) {
      setDestDir(uploadStructure.thumbnailsPath);
    }
  }, [uploadStructure.thumbnailsPath]);

  const [scanResult, setScanResult] = useState<ThumbnailScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Tab & Filter States
  const [activeTab, setActiveTab] = useState<'all' | 'mismatches'>('all');
  const [mismatchFilter, setMismatchFilter] = useState<'all' | 'video' | 'photo'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedFolder, setCopiedFolder] = useState<string | null>(null);

  const handleBrowseSource = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory('Select Master Media Directory to Scan', sourceDir);
    if (dir) setSourceDir(dir);
  };

  const handleBrowseDest = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory('Select Thumbnails Mirror Output Directory', destDir);
    if (dir) setDestDir(dir);
  };

  const handleScan = async () => {
    if (!sourceDir.trim()) {
      onShowToast('Please select a source folder', 'warning');
      return;
    }
    setIsScanning(true);
    try {
      const res: ThumbnailScanResult = await window.electronAPI.scanThumbnailSeparator(sourceDir, destDir);
      setScanResult(res);
      if (res.isBalanced) {
        onShowToast(
          `Scanned ${res.items.length} thumbnails. Perfect balance (_P = _V, ${res.totalPhotos} pairs)!`,
          'success'
        );
        setActiveTab('all');
      } else {
        onShowToast(
          `Found ${res.items.length} thumbnails with ${res.folderMismatches.length} folder mismatch(es) (_P: ${res.totalPhotos} ≠ _V: ${res.totalVideos})`,
          'warning'
        );
        setActiveTab('mismatches');
      }
    } catch (e: any) {
      console.error('Thumbnail scan failed:', e);
      onShowToast(toUserErrorMessage(e, 'Failed to scan thumbnails. Please check permissions and try again.'), 'danger');
    } finally {
      setIsScanning(false);
    }
  };

  const handleExecute = async () => {
    if (!destDir.trim()) {
      onShowToast('Please select a destination folder', 'warning');
      return;
    }
    if (!scanResult || scanResult.items.length === 0) {
      onShowToast('No thumbnail files found to separate', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const summary = await window.electronAPI.executeThumbnailSeparation(scanResult.items, destDir, mode);
      onShowToast(`Separation complete: ${summary.success_count} thumbnails mirrored!`, 'success');
      handleScan();
    } catch (e: any) {
      console.error('Thumbnail separation failed:', e);
      onShowToast(toUserErrorMessage(e, 'Failed to separate thumbnails. Please check file permissions and disk space.'), 'danger');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenFolder = async (folderPath: string) => {
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.openPath(folderPath);
    } catch {
      onShowToast('Could not open folder in Explorer', 'danger');
    }
  };

  const handleCopyFolderReport = (folder: FolderMismatchSummary) => {
    const lines = [
      `Folder: ${folder.folderRel}`,
      `Path: ${folder.folderPath}`,
      `Counts: ${folder.photoCount} _P vs ${folder.videoCount} _V (Deficit: ${folder.deficitCount} ${folder.missingType})`,
      'Missing Thumbnails:',
      ...folder.missingItems.map(
        (m) =>
          ` - [MISSING ${m.missingType.toUpperCase()}] ${m.expectedFilename}${
            m.companionFilename ? ` (Companion exists: ${m.companionFilename})` : ''
          }`
      ),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedFolder(folder.folderRel);
    onShowToast(`Copied missing list for ${folder.folderRel} to clipboard`, 'info');
    setTimeout(() => setCopiedFolder(null), 2000);
  };

  const handleCopyAllMismatches = () => {
    if (!scanResult || scanResult.folderMismatches.length === 0) return;
    const header = [
      `==================================================`,
      `DATAFLOW STUDIO — THUMBNAIL MISMATCH AUDIT REPORT`,
      `Total Photos (_P): ${scanResult.totalPhotos}`,
      `Total Videos (_V): ${scanResult.totalVideos}`,
      `Total Missing Files: ${scanResult.totalMismatches}`,
      `Mismatched Folders: ${scanResult.folderMismatches.length}`,
      `==================================================\n`,
    ];

    const body = scanResult.folderMismatches.map((f, i) => {
      const lines = [
        `[${i + 1}] Folder: ${f.folderRel}`,
        `    Path: ${f.folderPath}`,
        `    Counts: ${f.photoCount} _P vs ${f.videoCount} _V (Deficit: ${f.deficitCount} ${f.missingType})`,
        `    Missing Items:`,
        ...f.missingItems.map(
          (m) =>
            `     * [Missing ${m.missingType.toUpperCase()}] ${m.expectedFilename}${
              m.companionFilename ? ` (Companion: ${m.companionFilename})` : ''
            }`
        ),
      ];
      return lines.join('\n');
    });

    navigator.clipboard.writeText([...header, ...body].join('\n\n'));
    onShowToast(`Copied complete audit report (${scanResult.folderMismatches.length} folders) to clipboard!`, 'success');
  };

  // Filtered lists
  const filteredThumbnails = useMemo(() => {
    if (!scanResult) return [];
    if (!searchQuery.trim()) return scanResult.items;
    const q = searchQuery.toLowerCase();
    return scanResult.items.filter(
      (item) => item.filename.toLowerCase().includes(q) || item.relPath.toLowerCase().includes(q)
    );
  }, [scanResult, searchQuery]);

  const filteredMismatches = useMemo(() => {
    if (!scanResult?.folderMismatches) return [];
    let list = scanResult.folderMismatches;
    if (mismatchFilter === 'video') {
      list = list.filter((f) => f.missingType === 'video' || f.missingType === 'mixed');
    } else if (mismatchFilter === 'photo') {
      list = list.filter((f) => f.missingType === 'photo' || f.missingType === 'mixed');
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (f) =>
          f.folderRel.toLowerCase().includes(q) ||
          f.folderPath.toLowerCase().includes(q) ||
          f.missingItems.some(
            (m) =>
              m.expectedFilename.toLowerCase().includes(q) ||
              (m.companionFilename && m.companionFilename.toLowerCase().includes(q))
          )
      );
    }
    return list;
  }, [scanResult, mismatchFilter, searchQuery]);

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
      {/* Path Selectors */}
      <div
        className="glass-card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--label)' }}>
          Thumbnail Shifter — Recursive _P and _V Folder Hierarchy Isolator & Balance Verifier
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
              }}
            >
              <FolderArchive size={16} color="var(--system-teal)" />
              <input
                value={sourceDir}
                onChange={(e) => setSourceDir(e.target.value)}
                placeholder="Source Directory..."
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
            <StudioButton variant="glass" onClick={handleBrowseSource}>
              Browse
            </StudioButton>
          </div>

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
              }}
            >
              <Folder size={16} color="var(--system-blue)" />
              <input
                value={destDir}
                onChange={(e) => setDestDir(e.target.value)}
                placeholder="Destination Directory..."
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
            <StudioButton variant="glass" onClick={handleBrowseDest}>
              Browse
            </StudioButton>
          </div>
        </div>

        {uploadStructure.thumbnailsPath && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              borderRadius: 8,
              backgroundColor: 'rgba(13, 148, 136, 0.1)',
              border: '1px solid rgba(13, 148, 136, 0.25)',
              fontSize: 11,
              color: '#0D9488',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✨ Upload Structure Output Active:</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>{uploadStructure.thumbnailsPath}</strong>
            </div>
            {destDir !== uploadStructure.thumbnailsPath && (
              <button
                onClick={() => setDestDir(uploadStructure.thumbnailsPath)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--system-blue)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 11,
                  textDecoration: 'underline',
                }}
              >
                Reset to Upload Structure
              </button>
            )}
          </div>
        )}

        {/* Action Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 8,
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>Mode:</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
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
              <option value="move">MOVE (Extract In-Place)</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <StudioButton variant="secondary" loading={isScanning} icon={<RefreshCw size={14} />} onClick={handleScan}>
              Scan Thumbnails
            </StudioButton>
            <StudioButton
              variant="primary"
              loading={isProcessing}
              icon={<Play size={14} />}
              onClick={handleExecute}
              disabled={!scanResult || scanResult.items.length === 0}
            >
              Execute Separation
            </StudioButton>
          </div>
        </div>
      </div>

      {/* Summary KPI Bar */}
      {scanResult && (
        <div
          className="glass-card"
          style={{
            padding: '12px 20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 12,
          }}
        >
          <div>
            <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>Total Thumbnails:</span>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--label)', fontFamily: 'var(--font-mono)' }}>
              {scanResult.items.length}
            </div>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>_P Photo Thumbnails:</span>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--system-cyan)', fontFamily: 'var(--font-mono)' }}>
              {scanResult.totalPhotos}
            </div>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>_V Video Thumbnails:</span>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--system-green)', fontFamily: 'var(--font-mono)' }}>
              {scanResult.totalVideos}
            </div>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>_P = _V Balance Status:</span>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                marginTop: 3,
                color: scanResult.isBalanced ? '#10B981' : '#F59E0B',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {scanResult.isBalanced ? (
                <>
                  <CheckCircle2 size={15} color="#10B981" />
                  <span>BALANCED</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={15} color="#F59E0B" />
                  <span>{scanResult.totalMismatches} MISMATCH</span>
                </>
              )}
            </div>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>Total Volume:</span>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--system-purple)', fontFamily: 'var(--font-mono)' }}>
              {(scanResult.totalBytes / (1024 * 1024)).toFixed(1)} MB
            </div>
          </div>
        </div>
      )}

      {/* Prominent _P = _V Balance Status Alert Banner */}
      {scanResult && (
        scanResult.isBalanced ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 18px',
              borderRadius: 12,
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.05)',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CheckCircle2 size={20} color="#10B981" />
            </div>
            <div style={{ flex: 1, fontSize: 12 }}>
              <div style={{ fontWeight: 700, color: '#10B981', fontSize: 13, marginBottom: 2 }}>
                ✓ All Thumbnails Verified Balanced: _P Count Equals _V Count
              </div>
              <div style={{ color: 'var(--secondary-label)', lineHeight: 1.4 }}>
                Every folder contains equal pairs of photo thumbnails (_P) and video thumbnails (_V). All{' '}
                <strong style={{ color: 'var(--label)' }}>{scanResult.totalPhotos}</strong> pairs are present with zero missing items across all directories.
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
              padding: '12px 18px',
              borderRadius: 12,
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={20} color="#F59E0B" />
              </div>
              <div style={{ fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: '#F59E0B', fontSize: 13, marginBottom: 2 }}>
                  ⚠️ Thumbnail Count Mismatch Detected: _P Count ({scanResult.totalPhotos}) ≠ _V Count ({scanResult.totalVideos})
                </div>
                <div style={{ color: 'var(--secondary-label)', lineHeight: 1.4 }}>
                  Found <strong style={{ color: '#F59E0B' }}>{scanResult.totalMismatches} missing thumbnail(s)</strong> across{' '}
                  <strong style={{ color: 'var(--label)' }}>{scanResult.folderMismatches.length} folder(s)</strong>. Inspect the "Missing & Mismatched" tab below to view missing filenames and folder paths.
                </div>
              </div>
            </div>
            <StudioButton
              variant="secondary"
              size="sm"
              onClick={() => setActiveTab('mismatches')}
              style={{
                borderColor: 'rgba(245, 158, 11, 0.45)',
                color: '#F59E0B',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                flexShrink: 0,
                fontWeight: 700,
              }}
            >
              View Missing Files ({scanResult.folderMismatches.length} Folders) ➔
            </StudioButton>
          </div>
        )
      )}

      {/* Main Tabbed Container */}
      <div
        className="glass-card"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minHeight: 320,
        }}
      >
        {/* Tab Navigation Header */}
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: 'var(--surface-elevated)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          {/* Left: Tab Switches */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setActiveTab('all')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: activeTab === 'all' ? '#0D9488' : 'transparent',
                backgroundColor: activeTab === 'all' ? 'rgba(13, 148, 136, 0.14)' : 'transparent',
                color: activeTab === 'all' ? '#0D9488' : 'var(--secondary-label)',
                transition: 'all 0.15s ease',
              }}
            >
              <Layers size={14} />
              <span>All Thumbnails</span>
              <span
                style={{
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: 10,
                  backgroundColor: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {scanResult ? scanResult.items.length : 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('mismatches')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                borderColor:
                  activeTab === 'mismatches'
                    ? scanResult?.folderMismatches && scanResult.folderMismatches.length > 0
                      ? '#F59E0B'
                      : '#10B981'
                    : 'transparent',
                backgroundColor:
                  activeTab === 'mismatches'
                    ? scanResult?.folderMismatches && scanResult.folderMismatches.length > 0
                      ? 'rgba(245, 158, 11, 0.14)'
                      : 'rgba(16, 185, 129, 0.14)'
                    : 'transparent',
                color:
                  activeTab === 'mismatches'
                    ? scanResult?.folderMismatches && scanResult.folderMismatches.length > 0
                      ? '#F59E0B'
                      : '#10B981'
                    : 'var(--secondary-label)',
                transition: 'all 0.15s ease',
              }}
            >
              <AlertCircle size={14} />
              <span>Missing & Mismatched</span>
              {scanResult && (
                <span
                  style={{
                    padding: '1px 7px',
                    borderRadius: 10,
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    backgroundColor:
                      scanResult.folderMismatches.length > 0 ? 'rgba(245, 158, 11, 0.22)' : 'rgba(16, 185, 129, 0.22)',
                    color: scanResult.folderMismatches.length > 0 ? '#F59E0B' : '#10B981',
                    border: `1px solid ${
                      scanResult.folderMismatches.length > 0 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)'
                    }`,
                  }}
                >
                  {scanResult.folderMismatches.length}
                </span>
              )}
            </button>
          </div>

          {/* Right: Quick Search and Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {activeTab === 'mismatches' && scanResult && scanResult.folderMismatches.length > 0 && (
              <button
                onClick={handleCopyAllMismatches}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 10px',
                  borderRadius: 7,
                  fontSize: 11,
                  fontWeight: 600,
                  backgroundColor: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--label)',
                  cursor: 'pointer',
                }}
                title="Copy entire audit report to clipboard"
              >
                <Copy size={12} />
                <span>Copy Full Audit</span>
              </button>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '4px 10px',
                width: 230,
              }}
            >
              <Search size={13} color="var(--tertiary-label)" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'all' ? 'Search thumbnails...' : 'Search folder name or file...'}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  color: 'var(--label)',
                  fontSize: 11,
                  width: '100%',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: 'var(--tertiary-label)',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: 12,
                  }}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab 1: All Thumbnails Table */}
        {activeTab === 'all' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div
              style={{
                height: 36,
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderBottom: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 2.5fr 1fr',
                alignItems: 'center',
                padding: '0 16px',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--tertiary-label)',
              }}
            >
              <span>FILENAME</span>
              <span>TYPE</span>
              <span>RELATIVE MIRRORED PATH</span>
              <span style={{ textAlign: 'right' }}>SIZE</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {!scanResult || scanResult.items.length === 0 ? (
                <div
                  style={{
                    height: '100%',
                    minHeight: 220,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    padding: '36px 20px',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      backgroundColor: 'rgba(13, 148, 136, 0.1)',
                      border: '1px solid rgba(13, 148, 136, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 16px rgba(13, 148, 136, 0.08)',
                    }}
                  >
                    <FolderArchive size={26} color="#0D9488" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--label)' }}>
                      Awaiting Thumbnail Hierarchy Scan
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--secondary-label)', maxWidth: 420, lineHeight: 1.5 }}>
                      Select your source media folder and target thumbnail destination above, then click "Scan Thumbnails" to preview _P & _V files and verify counts.
                    </span>
                  </div>
                  <StudioButton
                    variant="primary"
                    size="sm"
                    loading={isScanning}
                    onClick={handleScan}
                    disabled={!sourceDir || !destDir}
                    icon={<RefreshCw size={13} />}
                    style={{ background: 'linear-gradient(135deg, #0D9488, #0F766E)', marginTop: 4 }}
                  >
                    Scan Thumbnails
                  </StudioButton>
                </div>
              ) : filteredThumbnails.length === 0 ? (
                <div
                  style={{
                    padding: 32,
                    textAlign: 'center',
                    color: 'var(--secondary-label)',
                    fontSize: 12,
                  }}
                >
                  No thumbnails matched "{searchQuery}"
                </div>
              ) : (
                filteredThumbnails.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      height: 38,
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 2.5fr 1fr',
                      alignItems: 'center',
                      padding: '0 16px',
                      borderBottom: '1px solid var(--border-subtle)',
                      fontSize: 11.5,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--label)',
                      backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.filename}
                    </span>

                    <span
                      style={{
                        display: 'inline-block',
                        width: 'fit-content',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 10,
                        fontWeight: 700,
                        color: item.type === 'photo' ? 'var(--system-cyan)' : 'var(--system-green)',
                        backgroundColor: item.type === 'photo' ? 'rgba(0, 242, 254, 0.12)' : 'rgba(48, 209, 88, 0.12)',
                        border: `1px solid ${item.type === 'photo' ? 'var(--system-cyan)' : 'var(--system-green)'}`,
                      }}
                    >
                      {item.type === 'photo' ? '_P (PHOTO)' : '_V (VIDEO)'}
                    </span>

                    <span style={{ color: 'var(--secondary-label)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.relPath}
                    </span>

                    <div style={{ textAlign: 'right', color: 'var(--tertiary-label)' }}>
                      {(item.size / 1024).toFixed(0)} KB
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Missing & Mismatched Folders Tab */}
        {activeTab === 'mismatches' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {!scanResult ? (
              <div
                style={{
                  height: '100%',
                  minHeight: 220,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  padding: 36,
                  textAlign: 'center',
                }}
              >
                <AlertCircle size={32} color="var(--tertiary-label)" />
                <span style={{ fontSize: 13, color: 'var(--secondary-label)' }}>
                  Scan a media directory above to detect whether all thumbnails have matching _P and _V pairs.
                </span>
              </div>
            ) : scanResult.folderMismatches.length === 0 ? (
              <div
                style={{
                  height: '100%',
                  minHeight: 240,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  padding: 36,
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(16, 185, 129, 0.1)',
                  }}
                >
                  <CheckCircle2 size={30} color="#10B981" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#10B981' }}>
                    Zero Missing Thumbnails Detected
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--secondary-label)', maxWidth: 440, lineHeight: 1.5 }}>
                    Every single folder scanned contains balanced pairs of _P and _V thumbnail files ({scanResult.totalPhotos} _P = {scanResult.totalVideos} _V).
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Filter Sub-bar */}
                <div
                  style={{
                    padding: '8px 16px',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: 'rgba(255, 255, 255, 0.015)',
                  }}
                >
                  <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>Filter Deficit:</span>
                  <button
                    onClick={() => setMismatchFilter('all')}
                    style={{
                      padding: '3px 9px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: mismatchFilter === 'all' ? '#0D9488' : 'var(--border)',
                      backgroundColor: mismatchFilter === 'all' ? 'rgba(13, 148, 136, 0.15)' : 'transparent',
                      color: mismatchFilter === 'all' ? '#0D9488' : 'var(--secondary-label)',
                    }}
                  >
                    All ({scanResult.folderMismatches.length})
                  </button>
                  <button
                    onClick={() => setMismatchFilter('video')}
                    style={{
                      padding: '3px 9px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: mismatchFilter === 'video' ? '#F59E0B' : 'var(--border)',
                      backgroundColor: mismatchFilter === 'video' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                      color: mismatchFilter === 'video' ? '#F59E0B' : 'var(--secondary-label)',
                    }}
                  >
                    Missing _V Video ({scanResult.folderMismatches.filter((f) => f.missingType === 'video').length})
                  </button>
                  <button
                    onClick={() => setMismatchFilter('photo')}
                    style={{
                      padding: '3px 9px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: mismatchFilter === 'photo' ? 'var(--system-cyan)' : 'var(--border)',
                      backgroundColor: mismatchFilter === 'photo' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
                      color: mismatchFilter === 'photo' ? 'var(--system-cyan)' : 'var(--secondary-label)',
                    }}
                  >
                    Missing _P Photo ({scanResult.folderMismatches.filter((f) => f.missingType === 'photo').length})
                  </button>
                </div>

                {/* Folder Mismatches Card List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredMismatches.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--secondary-label)', fontSize: 12 }}>
                      No folders matched the selected filter
                    </div>
                  ) : (
                    filteredMismatches.map((folder, fIdx) => (
                      <div
                        key={fIdx}
                        style={{
                          backgroundColor: 'var(--surface-elevated)',
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                          padding: '12px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        {/* Folder Header */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                            flexWrap: 'wrap',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 260 }}>
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <Folder size={16} color="#F59E0B" />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: 'var(--label)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {folder.folderRel}
                              </span>
                              <span
                                style={{
                                  fontSize: 10.5,
                                  color: 'var(--tertiary-label)',
                                  fontFamily: 'var(--font-mono)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {folder.folderPath}
                              </span>
                            </div>
                          </div>

                          {/* Badges & Actions */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontSize: 10.5,
                                fontWeight: 700,
                                fontFamily: 'var(--font-mono)',
                                color: 'var(--system-cyan)',
                                backgroundColor: 'rgba(0, 242, 254, 0.1)',
                                border: '1px solid rgba(0, 242, 254, 0.3)',
                              }}
                            >
                              {folder.photoCount} _P
                            </span>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontSize: 10.5,
                                fontWeight: 700,
                                fontFamily: 'var(--font-mono)',
                                color: 'var(--system-green)',
                                backgroundColor: 'rgba(48, 209, 88, 0.1)',
                                border: '1px solid rgba(48, 209, 88, 0.3)',
                              }}
                            >
                              {folder.videoCount} _V
                            </span>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontSize: 10.5,
                                fontWeight: 700,
                                color: '#F59E0B',
                                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                border: '1px solid rgba(245, 158, 11, 0.4)',
                              }}
                            >
                              {folder.deficitCount}{' '}
                              {folder.missingType === 'video'
                                ? '_V Missing'
                                : folder.missingType === 'photo'
                                ? '_P Missing'
                                : 'Missing'}
                            </span>

                            <button
                              onClick={() => handleCopyFolderReport(folder)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '5px 9px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 600,
                                backgroundColor: 'var(--surface)',
                                border: '1px solid var(--border)',
                                color: 'var(--label)',
                                cursor: 'pointer',
                              }}
                              title="Copy details to clipboard"
                            >
                              {copiedFolder === folder.folderRel ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                              <span>{copiedFolder === folder.folderRel ? 'Copied' : 'Copy'}</span>
                            </button>

                            <StudioButton
                              variant="secondary"
                              size="sm"
                              icon={<FolderOpen size={13} />}
                              onClick={() => handleOpenFolder(folder.folderPath)}
                              style={{ fontSize: 11, padding: '4px 10px' }}
                            >
                              Open Folder
                            </StudioButton>
                          </div>
                        </div>

                        {/* Missing Items List in this Folder */}
                        <div
                          style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            backgroundColor: 'rgba(0, 0, 0, 0.18)',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--secondary-label)' }}>
                            Missing Thumbnail Files in this Folder:
                          </div>
                          {folder.missingItems.map((m, mIdx) => (
                            <div
                              key={mIdx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: 11.5,
                                fontFamily: 'var(--font-mono)',
                                gap: 8,
                                padding: '3px 0',
                                borderBottom: mIdx < folder.missingItems.length - 1 ? '1px dashed var(--border-subtle)' : 'none',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <FileQuestion size={13} color="#F59E0B" />
                                <span style={{ color: '#F59E0B', fontWeight: 700 }}>
                                  {m.expectedFilename}
                                </span>
                                {m.companionFilename && (
                                  <span style={{ color: 'var(--secondary-label)', fontSize: 11 }}>
                                    (Companion exists: <span style={{ color: 'var(--label)' }}>{m.companionFilename}</span>)
                                  </span>
                                )}
                              </div>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  backgroundColor: m.missingType === 'video' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0, 242, 254, 0.15)',
                                  color: m.missingType === 'video' ? '#F59E0B' : 'var(--system-cyan)',
                                }}
                              >
                                {m.missingType === 'video' ? 'MISSING _V VIDEO THUMB' : 'MISSING _P PHOTO THUMB'}
                              </span>
                            </div>
                          ))}

                          {/* Present items preview chips */}
                          {folder.samplePresentItems.length > 0 && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                marginTop: 4,
                                paddingTop: 6,
                                borderTop: '1px solid var(--border-subtle)',
                                flexWrap: 'wrap',
                              }}
                            >
                              <span style={{ fontSize: 10, color: 'var(--tertiary-label)' }}>
                                Present in folder:
                              </span>
                              {folder.samplePresentItems.map((item, pIdx) => (
                                <span
                                  key={pIdx}
                                  style={{
                                    fontSize: 9.5,
                                    fontFamily: 'var(--font-mono)',
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                    backgroundColor: 'var(--surface-elevated)',
                                    color: 'var(--secondary-label)',
                                    border: '1px solid var(--border)',
                                  }}
                                >
                                  {item}
                                </span>
                              ))}
                              {folder.photoCount + folder.videoCount > folder.samplePresentItems.length && (
                                <span style={{ fontSize: 9.5, color: 'var(--tertiary-label)' }}>
                                  +{folder.photoCount + folder.videoCount - folder.samplePresentItems.length} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Live Operation Loading Overlay */}
      <OperationLoadingOverlay
        isOpen={isScanning || isProcessing}
        title={isScanning ? 'Scanning Thumbnail Hierarchy...' : 'Shifting Thumbnail Assets...'}
        subtitle={
          isScanning
            ? 'Detecting _P and _V thumbnail files across master folders and checking balances...'
            : 'Relocating thumbnail files into mirrored destination folder hierarchy...'
        }
        accentColor="#0D9488"
      />
    </div>
  );
};

