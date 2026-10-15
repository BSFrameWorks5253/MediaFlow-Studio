import React, { useState } from 'react';
import { Folder, Layers, RefreshCw, Play, RotateCcw } from 'lucide-react';
import { StudioButton } from '../components/StudioButton';
import { PageKey } from '../types/pipelineStages';
import { RemainingFolderItem, RemainingScanResult } from '../../electron/engines/remainingCollector';
import { usePipeline } from '../context/PipelineContext';
import { OperationLoadingOverlay } from '../components/OperationLoadingOverlay';

interface RemainingCollectorPageProps {
  onShowToast: (text: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
  onNavigate?: (page: PageKey) => void;
}

export const RemainingCollectorPage: React.FC<RemainingCollectorPageProps> = ({ onShowToast, onNavigate }) => {
  const { uploadStructure } = usePipeline();
  const [sourceDir, setSourceDir] = useState('');
  const [destDir, setDestDir] = useState(uploadStructure.remainingPath || '');

  // Auto-update destDir when uploadStructure changes
  React.useEffect(() => {
    if (uploadStructure.remainingPath && !destDir) {
      setDestDir(uploadStructure.remainingPath);
    }
  }, [uploadStructure.remainingPath]);

  const [scanResult, setScanResult] = useState<RemainingScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isShifting, setIsShifting] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [lastManifest, setLastManifest] = useState('');

  const handleBrowseSource = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory('Select Master Production Ingest Directory', sourceDir);
    if (dir) setSourceDir(dir);
  };

  const handleBrowseDest = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory('Select Consolidated Remaining Destination', destDir);
    if (dir) setDestDir(dir);
  };

  const handleScan = async () => {
    if (!sourceDir.trim()) {
      onShowToast('Please select a valid source folder', 'warning');
      return;
    }
    setIsScanning(true);
    try {
      const res: RemainingScanResult = await window.electronAPI.scanRemaining(sourceDir, destDir);
      setScanResult(res);
      onShowToast(`Scan complete: Found ${res.totalFolders} remaining folders (${res.totalPhotos} photos)`, 'success');
    } catch (e: any) {
      onShowToast(`Scan failed: ${e.message}`, 'danger');
    } finally {
      setIsScanning(false);
    }
  };

  const handleExecute = async () => {
    if (!destDir.trim()) {
      onShowToast('Please specify a destination directory for consolidated folders', 'warning');
      return;
    }
    if (!scanResult || scanResult.items.length === 0) {
      onShowToast('No remaining folders found to shift', 'warning');
      return;
    }

    setIsShifting(true);
    try {
      const summary = await window.electronAPI.executeRemainingShift(scanResult.items, destDir);
      setLastManifest(summary.manifestPath);
      onShowToast(`Shift complete: ${summary.success_count} folders relocated successfully!`, 'success');
      handleScan();
    } catch (e: any) {
      onShowToast(`Shift error: ${e.message}`, 'danger');
    } finally {
      setIsShifting(false);
    }
  };

  const handleUndo = async () => {
    if (!lastManifest) {
      onShowToast('No shift manifest available to undo', 'warning');
      return;
    }
    setIsUndoing(true);
    try {
      const res = await window.electronAPI.undoRemainingShift(lastManifest);
      onShowToast(`Undo complete: Restored ${res.restored} folders to their original trees.`, 'success');
      handleScan();
    } catch (e: any) {
      onShowToast(`Undo failed: ${e.message}`, 'danger');
    } finally {
      setIsUndoing(false);
    }
  };

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
          Remaining Shifter — Date Subtree Consolidation & Collision Counter
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
              <Layers size={16} color="var(--system-pink)" />
              <input
                value={sourceDir}
                onChange={(e) => setSourceDir(e.target.value)}
                placeholder="Master Source Directory..."
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
                placeholder="Consolidated Destination..."
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

        {uploadStructure.remainingPath && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              borderRadius: 8,
              backgroundColor: 'rgba(236, 72, 153, 0.1)',
              border: '1px solid rgba(236, 72, 153, 0.25)',
              fontSize: 11,
              color: '#EC4899',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✨ Upload Structure Output Active:</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>{uploadStructure.remainingPath}</strong>
            </div>
            {destDir !== uploadStructure.remainingPath && (
              <button
                onClick={() => setDestDir(uploadStructure.remainingPath)}
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
            justifyContent: 'flex-end',
            gap: 10,
            paddingTop: 8,
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {lastManifest && (
            <StudioButton variant="secondary" loading={isUndoing} icon={<RotateCcw size={14} />} onClick={handleUndo}>
              Undo Last Shift
            </StudioButton>
          )}

          <StudioButton variant="secondary" loading={isScanning} icon={<RefreshCw size={14} />} onClick={handleScan}>
            Scan Remaining Folders
          </StudioButton>

          <StudioButton
            variant="primary"
            loading={isShifting}
            icon={<Play size={14} />}
            onClick={handleExecute}
            disabled={!scanResult || scanResult.items.length === 0}
          >
            Consolidate Folders
          </StudioButton>
        </div>
      </div>

      {/* Summary Stats */}
      {scanResult && (
        <div
          className="glass-card"
          style={{
            padding: '12px 20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
          }}
        >
          <div>
            <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>Remaining Subtrees:</span>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--system-pink)', fontFamily: 'var(--font-mono)' }}>
              {scanResult.totalFolders} folders
            </div>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>Total Photo Count:</span>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--system-cyan)', fontFamily: 'var(--font-mono)' }}>
              {scanResult.totalPhotos} photos
            </div>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>Total Folder Volume:</span>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--label)', fontFamily: 'var(--font-mono)' }}>
              {(scanResult.totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB
            </div>
          </div>
        </div>
      )}

      {/* Folders Consolidation Table */}
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
        <div
          style={{
            height: 36,
            backgroundColor: 'var(--surface-elevated)',
            borderBottom: '1px solid var(--border)',
            display: 'grid',
            gridTemplateColumns: '1.5fr 2fr 1fr 1fr',
            alignItems: 'center',
            padding: '0 16px',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--tertiary-label)',
          }}
        >
          <span>RESOLVED DATE FOLDER</span>
          <span>ORIGINAL FOLDER PATH</span>
          <span>PHOTO COUNT</span>
          <span style={{ textAlign: 'right' }}>VOLUME</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {!scanResult || scanResult.items.length === 0 ? (
            <div
              style={{
                height: '100%',
                minHeight: 200,
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
                  backgroundColor: 'rgba(236, 72, 153, 0.1)',
                  border: '1px solid rgba(236, 72, 153, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(236, 72, 153, 0.08)',
                }}
              >
                <Layers size={26} color="#EC4899" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--label)' }}>
                  Awaiting Remaining Folder Scan
                </span>
                <span style={{ fontSize: 12, color: 'var(--secondary-label)', maxWidth: 420, lineHeight: 1.5 }}>
                  Select your source and target directories above, then click "Scan Remaining Folders" to inspect date subtrees ready for consolidation.
                </span>
              </div>
              <StudioButton
                variant="primary"
                size="sm"
                loading={isScanning}
                onClick={handleScan}
                disabled={!sourceDir || !destDir}
                icon={<RefreshCw size={13} />}
                style={{ background: 'linear-gradient(135deg, #EC4899, #DB2777)', marginTop: 4 }}
              >
                Scan Remaining Folders
              </StudioButton>
            </div>
          ) : (
            scanResult.items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  height: 40,
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 2fr 1fr 1fr',
                  alignItems: 'center',
                  padding: '0 16px',
                  borderBottom: '1px solid var(--border-subtle)',
                  fontSize: 11.5,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--label)',
                  backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)',
                }}
              >
                <span style={{ color: 'var(--system-pink)', fontWeight: 700 }}>
                  {item.dateFolderName}
                </span>

                <span style={{ color: 'var(--secondary-label)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.originalPath}
                </span>

                <span style={{ color: 'var(--system-cyan)', fontWeight: 600 }}>
                  {item.photoCount} files
                </span>

                <div style={{ textAlign: 'right', color: 'var(--tertiary-label)' }}>
                  {item.folderSizeFormatted}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Live Operation Loading Overlay */}
      <OperationLoadingOverlay
        isOpen={isScanning || isShifting}
        title={isScanning ? 'Scanning Remaining Folders...' : 'Consolidating Remaining Subtrees...'}
        subtitle={
          isScanning
            ? 'Detecting unshifted date folders across media directories...'
            : 'Relocating remaining folders into organized destination hierarchy...'
        }
        accentColor="#EC4899"
      />
    </div>
  );
};
