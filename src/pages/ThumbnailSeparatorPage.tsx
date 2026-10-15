import React, { useState } from 'react';
import { Folder, FolderArchive, RefreshCw, Play } from 'lucide-react';
import { StudioButton } from '../components/StudioButton';
import { PageKey } from '../types/pipelineStages';
import { ThumbnailScanResult } from '../../electron/engines/thumbnailSeparator';
import { usePipeline } from '../context/PipelineContext';
import { OperationLoadingOverlay } from '../components/OperationLoadingOverlay';

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
      onShowToast(
        `Scanned ${res.items.length} thumbnails (${res.totalPhotos} _P, ${res.totalVideos} _V)`,
        'success'
      );
    } catch (e: any) {
      onShowToast(`Scan failed: ${e.message}`, 'danger');
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
      onShowToast(`Separation error: ${e.message}`, 'danger');
    } finally {
      setIsProcessing(false);
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
          Thumbnail Shifter — Recursive _P and _V Folder Hierarchy Isolator
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
            gridTemplateColumns: 'repeat(4, 1fr)',
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
            <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>Total Volume:</span>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--system-purple)', fontFamily: 'var(--font-mono)' }}>
              {(scanResult.totalBytes / (1024 * 1024)).toFixed(1)} MB
            </div>
          </div>
        </div>
      )}

      {/* Mirrored Hierarchy Table */}
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
                  Select your source media folder and target thumbnail destination above, then click "Scan Thumbnails" to preview _P & _V files.
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
          ) : (
            scanResult.items.map((item, idx) => (
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

      {/* Live Operation Loading Overlay */}
      <OperationLoadingOverlay
        isOpen={isScanning || isProcessing}
        title={isScanning ? 'Scanning Thumbnail Hierarchy...' : 'Shifting Thumbnail Assets...'}
        subtitle={
          isScanning
            ? 'Detecting _P and _V thumbnail files across master folders...'
            : 'Relocating thumbnail files into mirrored destination folder hierarchy...'
        }
        accentColor="#0D9488"
      />
    </div>
  );
};
