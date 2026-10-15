import React, { useState, useEffect } from 'react';
import {
  FolderX,
  Folder,
  FolderOpen,
  RefreshCw,
  Play,
  Check,
  Layers,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { StudioButton } from '../components/StudioButton';
import { PageKey } from '../types/pipelineStages';
import { usePipeline } from '../context/PipelineContext';
import { DoNotUploadItem } from '../../electron/engines/productionTools';
import { OperationLoadingOverlay } from '../components/OperationLoadingOverlay';

interface DoNotUploadPageProps {
  onShowToast: (text: string, type: 'info' | 'success' | 'warning' | 'danger') => void;
  onNavigate?: (page: PageKey) => void;
}

export const DoNotUploadPage: React.FC<DoNotUploadPageProps> = ({ onShowToast, onNavigate }) => {
  const { uploadStructure } = usePipeline();

  const [dnuDir, setDnuDir] = useState('');
  const [dnuMode, setDnuMode] = useState<'move' | 'copy'>('move');
  const [dnuDryRun, setDnuDryRun] = useState(false);
  const [dnuScanning, setDnuScanning] = useState(false);
  const [dnuExecuting, setDnuExecuting] = useState(false);
  const [dnuItems, setDnuItems] = useState<DoNotUploadItem[]>([]);
  const [dnuManifest, setDnuManifest] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Auto-init with pipeline mainDataPath if available
  useEffect(() => {
    if (uploadStructure.mainDataPath && !dnuDir) {
      setDnuDir(uploadStructure.mainDataPath);
    }
  }, [uploadStructure.mainDataPath]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === 'true') {
        const demoDir = 'D:\\2026_EVENTS\\ROYAL_WEDDING\\DELIVERY_PACKAGE';
        setDnuDir(demoDir);
        setDnuItems([
          {
            source: `${demoDir}\\2026-02-14\\Contributor_Card1`,
            name: 'Contributor_Card1',
            dateFolder: '2026-02-14',
            fileCount: 14,
            totalBytes: 3650722201,
            sizeStr: '3.40 GB',
            destination: `${demoDir}\\DO NOT UPLOAD\\2026-02-14\\Contributor_Card1`,
          },
          {
            source: `${demoDir}\\2026-02-14\\Documents_Contracts`,
            name: 'Documents_Contracts',
            dateFolder: '2026-02-14',
            fileCount: 6,
            totalBytes: 18874368,
            sizeStr: '18.00 MB',
            destination: `${demoDir}\\DO NOT UPLOAD\\2026-02-14\\Documents_Contracts`,
          },
          {
            source: `${demoDir}\\2026-02-15\\Contributor_SecondShooter`,
            name: 'Contributor_SecondShooter',
            dateFolder: '2026-02-15',
            fileCount: 22,
            totalBytes: 6549839872,
            sizeStr: '6.10 GB',
            destination: `${demoDir}\\DO NOT UPLOAD\\2026-02-15\\Contributor_SecondShooter`,
          },
        ]);
      }
    }
  }, []);

  const handleBrowseDir = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory('Select Production Folder to Scan for Contributor & Documents', dnuDir);
    if (dir) {
      setDnuDir(dir);
      scanDirectory(dir);
    }
  };

  const scanDirectory = async (dir: string) => {
    if (!dir.trim() || !window.electronAPI) return;
    setDnuScanning(true);
    setDnuItems([]);
    setDnuManifest('');
    try {
      const items = await window.electronAPI.scanDoNotUpload(dir);
      setDnuItems(items);
      if (items.length > 0) {
        onShowToast(`Found ${items.length} Contributor / Documents folder(s) ready to isolate.`, 'success');
      } else {
        onShowToast('No folders matching "Contributor" or "Documents" found.', 'info');
      }
    } catch (e: any) {
      onShowToast(`Scan failed: ${e.message}`, 'danger');
    } finally {
      setDnuScanning(false);
    }
  };

  const handleExecute = async () => {
    if (dnuItems.length === 0) {
      onShowToast('No folders queued for isolation. Please scan a folder first.', 'warning');
      return;
    }
    setDnuExecuting(true);
    try {
      const res = await window.electronAPI.executeDoNotUpload(dnuItems, dnuMode, dnuDryRun);
      if (dnuDryRun) {
        onShowToast(`Dry Run: ${res.success} folder(s) validated for isolation into 'DO NOT UPLOAD'.`, 'info');
      } else {
        setDnuManifest(res.manifestPath);
        onShowToast(`Successfully isolated ${res.success} folder(s) into 'DO NOT UPLOAD' date-wise!`, 'success');
        // Rescan directory
        scanDirectory(dnuDir);
      }
    } catch (e: any) {
      onShowToast(`Execution failed: ${e.message}`, 'danger');
    } finally {
      setDnuExecuting(false);
    }
  };

  const handleOpenDnuFolder = async () => {
    if (!dnuDir || !window.electronAPI) return;
    const p = `${dnuDir}\\DO NOT UPLOAD`;
    await window.electronAPI.openPath(p);
  };

  const totalFiles = dnuItems.reduce((acc, item) => acc + item.fileCount, 0);
  const totalBytes = dnuItems.reduce((acc, item) => acc + item.totalBytes, 0);
  const totalSizeFormatted = (totalBytes / (1024 * 1024)).toFixed(1) + ' MB';

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
      {/* Stage Header Banner */}
      <div
        className="glass-card"
        style={{
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderLeft: '4px solid #EC4899',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: 'rgba(236, 72, 153, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FolderX size={22} color="#EC4899" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--label)', letterSpacing: 0.3 }}>
                DO NOT UPLOAD Folder Isolator
              </span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 800,
                  color: '#EC4899',
                  backgroundColor: 'rgba(236, 72, 153, 0.12)',
                  border: '1px solid rgba(236, 72, 153, 0.35)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                PRE-REPORT ISOLATION
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--secondary-label)', marginTop: 2 }}>
              Scans media tree for <code>Contributor</code> &amp; <code>Documents</code> folders and moves them into <code>DO NOT UPLOAD</code> organized date-wise before final Report Merger.
            </div>
          </div>
        </div>

        {dnuItems.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--secondary-label)' }}>Ready to Isolate</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#EC4899', fontFamily: 'var(--font-mono)' }}>
                {dnuItems.length} Folders &bull; {totalFiles} Files ({totalSizeFormatted})
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Workspace Path Ingestion Bay */}
      <div
        className="glass-card"
        style={{
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--label)' }}>
            Target Workspace Directory (Contains Event Date Folders):
          </label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const p = (e.dataTransfer.files[0] as any).path;
                if (p) {
                  setDnuDir(p);
                  scanDirectory(p);
                }
              }
            }}
            style={{
              padding: '6px 12px',
              borderRadius: 12,
              border: isDragOver ? '2px dashed #EC4899' : '1px solid var(--border)',
              backgroundColor: isDragOver ? 'rgba(236, 72, 153, 0.12)' : 'var(--surface-elevated)',
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              transition: 'all 0.2s',
            }}
          >
            <Folder size={18} color="#EC4899" />
            <input
              value={dnuDir}
              onChange={(e) => setDnuDir(e.target.value)}
              placeholder="Select or drop production folder to scan for Contributor & Documents..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--label)',
                fontSize: 13,
                fontFamily: 'var(--font-system)',
              }}
            />
            <StudioButton variant="secondary" size="sm" onClick={handleBrowseDir}>
              <Folder size={14} />
              Browse Folder
            </StudioButton>
            <StudioButton
              variant="primary"
              size="sm"
              loading={dnuScanning}
              icon={<RefreshCw size={13} />}
              onClick={() => scanDirectory(dnuDir)}
              disabled={!dnuDir.trim()}
              style={{ background: 'linear-gradient(135deg, #EC4899, #DB2777)' }}
            >
              Scan Folders
            </StudioButton>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderRadius: 10,
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border-subtle)',
            fontSize: 12,
            marginTop: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tertiary-label)', letterSpacing: 0.5, fontFamily: 'var(--font-mono)' }}>
              MODE:
            </span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--label)' }}>
              <input
                type="radio"
                name="dnuModeStage"
                checked={dnuMode === 'move'}
                onChange={() => setDnuMode('move')}
              />
              <span>Move to 'DO NOT UPLOAD' (Standard)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--label)' }}>
              <input
                type="radio"
                name="dnuModeStage"
                checked={dnuMode === 'copy'}
                onChange={() => setDnuMode('copy')}
              />
              <span>Copy (Preserve Originals)</span>
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--secondary-label)' }}>
              <input
                type="checkbox"
                checked={dnuDryRun}
                onChange={(e) => setDnuDryRun(e.target.checked)}
              />
              <span>Dry Run Simulation</span>
            </label>

            <StudioButton
              variant={dnuDryRun ? 'secondary' : 'primary'}
              size="md"
              loading={dnuExecuting}
              icon={<Play size={13} />}
              onClick={handleExecute}
              disabled={dnuItems.length === 0}
              style={!dnuDryRun ? { background: 'linear-gradient(135deg, #10E79D, #059669)' } : undefined}
            >
              {dnuDryRun ? 'Validate Isolation' : `Execute Isolation (${dnuItems.length} Folders)`}
            </StudioButton>
          </div>
        </div>

        {/* Manifest Success Banner */}
        {dnuManifest && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              backgroundColor: 'rgba(16, 231, 157, 0.08)',
              border: '1px solid rgba(16, 231, 157, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Check size={16} color="#10E79D" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#10E79D' }}>
                Isolation complete! Target folders organized into 'DO NOT UPLOAD' date-wise.
              </span>
            </div>
            <StudioButton variant="glass" size="sm" icon={<FolderOpen size={12} />} onClick={handleOpenDnuFolder}>
              Open 'DO NOT UPLOAD'
            </StudioButton>
          </div>
        )}
      </div>

      {/* Matched Folders Table */}
      <div
        className="glass-card"
        style={{
          flex: 1,
          minHeight: 260,
          borderRadius: 14,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
        }}
      >
        <div
          style={{
            height: 38,
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderBottom: '1px solid var(--border)',
            display: 'grid',
            gridTemplateColumns: '1.4fr 1.2fr 0.8fr 0.9fr 2fr',
            alignItems: 'center',
            padding: '0 16px',
            fontSize: 10.5,
            fontWeight: 700,
            color: 'var(--tertiary-label)',
            letterSpacing: 0.6,
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span>MATCHED FOLDER</span>
          <span>DATE / MAIN FOLDER</span>
          <span>FILES</span>
          <span>SIZE</span>
          <span>DESTINATION IN 'DO NOT UPLOAD'</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {dnuItems.length === 0 ? (
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
                  backgroundColor: 'rgba(236, 72, 153, 0.1)',
                  border: '1px solid rgba(236, 72, 153, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(236, 72, 153, 0.08)',
                }}
              >
                <FolderX size={26} color="#EC4899" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--label)' }}>
                  Awaiting Quarantine Scan
                </span>
                <span style={{ fontSize: 12, color: 'var(--secondary-label)', maxWidth: 420, lineHeight: 1.5 }}>
                  Select your production directory above and click "Scan Folders" to detect any Contributor or Document directories.
                </span>
              </div>
              {!dnuDir.trim() ? (
                <StudioButton variant="secondary" size="sm" onClick={handleBrowseDir} icon={<Folder size={13} />}>
                  Browse Workspace Directory
                </StudioButton>
              ) : (
                <StudioButton
                  variant="primary"
                  size="sm"
                  loading={dnuScanning}
                  onClick={() => scanDirectory(dnuDir)}
                  icon={<RefreshCw size={13} />}
                  style={{ background: 'linear-gradient(135deg, #EC4899, #DB2777)' }}
                >
                  Scan Selected Folder
                </StudioButton>
              )}
            </div>
          ) : (
            dnuItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 1.2fr 0.8fr 0.9fr 2fr',
                  alignItems: 'center',
                  padding: '9px 16px',
                  borderBottom: '1px solid var(--border-subtle)',
                  fontSize: 11.5,
                  backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.01)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Folder size={14} color="#EC4899" />
                  <span style={{ fontWeight: 600, color: 'var(--label)' }}>{item.name}</span>
                </div>
                <span style={{ color: 'var(--secondary-label)' }}>{item.dateFolder}</span>
                <span style={{ color: 'var(--label)', fontWeight: 600 }}>{item.fileCount}</span>
                <span style={{ color: 'var(--system-cyan)' }}>{item.sizeStr}</span>
                <span
                  style={{
                    color: '#EC4899',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: 10.5,
                  }}
                  title={item.destination}
                >
                  {item.destination}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Live Operation Loading Overlay */}
      <OperationLoadingOverlay
        isOpen={dnuScanning || dnuExecuting}
        title={dnuScanning ? 'Scanning for Contributor Folders...' : 'Isolating to DO NOT UPLOAD...'}
        subtitle={
          dnuScanning
            ? 'Analyzing workspace folder hierarchy for Contributor and Documents directories...'
            : `Relocating ${dnuItems.length} matched folders into organized quarantine structure...`
        }
        accentColor="#EC4899"
      />
    </div>
  );
};
