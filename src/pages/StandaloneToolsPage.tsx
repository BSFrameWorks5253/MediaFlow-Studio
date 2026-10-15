import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Folder,
  FileCheck,
  Check,
  Play,
  RefreshCw,
  FolderArchive,
  FolderOpen,
  Layers,
  ShieldAlert,
  ExternalLink,
  FileSpreadsheet,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { StudioButton } from '../components/StudioButton';
import { DoNotUploadItem, InventoryReportItem } from '../../electron/engines/productionTools';

interface StandaloneToolsPageProps {
  onShowToast: (text: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
}

export const StandaloneToolsPage: React.FC<StandaloneToolsPageProps> = ({ onShowToast }) => {
  const [activeTab, setActiveTab] = useState<'normalizer' | 'taggerP' | 'taggerV' | 'doNotUpload' | 'collector'>('collector');

  // Inventory Report Collector State
  const [irSourceDir, setIrSourceDir] = useState('');
  const [irDestDir, setIrDestDir] = useState('');
  const [irMode, setIrMode] = useState<'copy' | 'move'>('copy');
  const [irDryRun, setIrDryRun] = useState(false);
  const [irScanning, setIrScanning] = useState(false);
  const [irExecuting, setIrExecuting] = useState(false);
  const [irItems, setIrItems] = useState<InventoryReportItem[]>([]);
  const [irTargetFolder, setIrTargetFolder] = useState('');
  const [isIrDragOver, setIsIrDragOver] = useState(false);

  // Normalizer State
  const [normDir, setNormDir] = useState('');
  const [normDryRun, setNormDryRun] = useState(true);
  const [normLoading, setNormLoading] = useState(false);
  const [normItems, setNormItems] = useState<{ old: string; new: string; path: string }[]>([]);

  // Tagger State
  const [tagFiles, setTagFiles] = useState<string[]>([]);
  const [tagLoading, setTagLoading] = useState(false);

  // DO NOT UPLOAD Isolator State
  const [dnuDir, setDnuDir] = useState('');
  const [dnuMode, setDnuMode] = useState<'move' | 'copy'>('move');
  const [dnuDryRun, setDnuDryRun] = useState(true);
  const [dnuScanning, setDnuScanning] = useState(false);
  const [dnuExecuting, setDnuExecuting] = useState(false);
  const [dnuItems, setDnuItems] = useState<DoNotUploadItem[]>([]);
  const [dnuManifest, setDnuManifest] = useState<string>('');
  const [isDnuDragOver, setIsDnuDragOver] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === 'true') {
        const demoDir = 'D:\\2026_EVENTS\\ROYAL_WEDDING\\RAW_EXPORTS';
        setNormDir(demoDir);
        setNormItems([
          { old: 'DSC04901.jpeg', new: 'DSC04901.jpg', path: `${demoDir}\\DSC04901.jpeg` },
          { old: 'DSC04902.JPEG', new: 'DSC04902.jpg', path: `${demoDir}\\DSC04902.JPEG` },
          { old: 'DSC04903.JPG', new: 'DSC04903.jpg', path: `${demoDir}\\DSC04903.JPG` },
        ]);
        setTagFiles([
          'D:\\2026_EVENTS\\ROYAL_WEDDING\\DELIVERY\\IMG_0042.jpg',
          'D:\\2026_EVENTS\\ROYAL_WEDDING\\DELIVERY\\IMG_0043.jpg',
        ]);
      }
    }
  }, []);

  // Inventory Report Collector Handlers
  const handleBrowseIrSource = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory('Select Source Folder to Scan for Inventory Reports', irSourceDir);
    if (dir) setIrSourceDir(dir);
  };

  const handleBrowseIrDest = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory('Select Destination Folder (creates "All Inventory Reports")', irDestDir);
    if (dir) setIrDestDir(dir);
  };

  const handleScanIr = async () => {
    if (!irSourceDir.trim()) {
      onShowToast('Please select a source folder to scan', 'warning');
      return;
    }
    setIrScanning(true);
    try {
      const items = await window.electronAPI.scanInventoryReports(irSourceDir, irDestDir);
      setIrItems(items);
      if (items.length > 0) {
        onShowToast(`Discovered ${items.length} inventory report(s) across Document directories!`, 'success');
      } else {
        onShowToast('No _Inventory_Report.xlsx files found in Document directories.', 'info');
      }
    } catch (e: any) {
      onShowToast(`Scan error: ${e.message}`, 'danger');
    } finally {
      setIrScanning(false);
    }
  };

  const handleExecuteIr = async () => {
    if (!irItems.length) {
      onShowToast('No reports to collect. Run scan first.', 'warning');
      return;
    }
    if (!irDestDir.trim()) {
      onShowToast('Please select a destination folder.', 'warning');
      return;
    }
    setIrExecuting(true);
    try {
      const res = await window.electronAPI.executeInventoryReports(irItems, irDestDir, irMode, irDryRun);
      setIrTargetFolder(res.allReportsFolder);
      if (irDryRun) {
        onShowToast(`Simulation: ${res.success} files would be collected into 'All Inventory Reports'.`, 'info');
      } else {
        onShowToast(`Successfully collected ${res.success} reports into 'All Inventory Reports'!`, 'success');
        setIrItems((prev) => prev.map((item) => ({ ...item, status: 'Copied' })));
      }
    } catch (e: any) {
      onShowToast(`Execution error: ${e.message}`, 'danger');
    } finally {
      setIrExecuting(false);
    }
  };

  const handleOpenIrTargetFolder = async () => {
    if (!irTargetFolder && irDestDir) {
      const fallback = `${irDestDir}\\All Inventory Reports`;
      await window.electronAPI?.openPath(fallback);
    } else if (irTargetFolder) {
      await window.electronAPI?.openPath(irTargetFolder);
    }
  };

  // Normalizer Handlers
  const handleBrowseNormDir = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory('Select Folder to Normalize JPG Extensions', normDir);
    if (dir) setNormDir(dir);
  };

  const handleRunNormalizer = async () => {
    if (!normDir.trim()) {
      onShowToast('Please select a folder to normalize', 'warning');
      return;
    }
    setNormLoading(true);
    try {
      const res = await window.electronAPI.normalizeExtensions(normDir, normDryRun);
      setNormItems(res.items);
      onShowToast(
        normDryRun
          ? `Simulation: ${res.renamed} compound extensions identified for normalization.`
          : `Normalized ${res.renamed} file extensions in-place!`,
        'success'
      );
    } catch (e: any) {
      onShowToast(`Normalizer error: ${e.message}`, 'danger');
    } finally {
      setNormLoading(false);
    }
  };

  // Tagger Handlers
  const handleSelectTagFiles = async () => {
    if (!window.electronAPI) return;
    const selected = await window.electronAPI.selectOpenFiles('Select Files to Append Suffix', []);
    if (selected && selected.length > 0) {
      setTagFiles(selected);
    }
  };

  const handleSelectTagFolder = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory('Select Folder to Append Suffix');
    if (dir) {
      setTagFiles([dir]);
    }
  };

  const handleRunTaggerP = async () => {
    if (tagFiles.length === 0) {
      onShowToast('Select files or a folder to tag', 'warning');
      return;
    }
    setTagLoading(true);
    try {
      const res = await window.electronAPI.tagPhotoSuffixP(tagFiles);
      onShowToast(`Tagged ${res.success} photos with '_P' suffix (${res.skipped} skipped).`, 'success');
      setTagFiles([]);
    } catch (e: any) {
      onShowToast(`Tagger error: ${e.message}`, 'danger');
    } finally {
      setTagLoading(false);
    }
  };

  const handleRunTaggerV = async () => {
    if (tagFiles.length === 0) {
      onShowToast('Select files or a folder to tag', 'warning');
      return;
    }
    setTagLoading(true);
    try {
      const res = await window.electronAPI.tagVideoThumbSuffixV(tagFiles);
      onShowToast(`Tagged ${res.success} video thumbnails with '_V' suffix (${res.skipped} skipped).`, 'success');
      setTagFiles([]);
    } catch (e: any) {
      onShowToast(`Tagger error: ${e.message}`, 'danger');
    } finally {
      setTagLoading(false);
    }
  };

  // DO NOT UPLOAD Isolator Handlers
  const handleBrowseDnuDir = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory('Select Production Folder to Scan', dnuDir);
    if (dir) {
      setDnuDir(dir);
      scanDnuDirectory(dir);
    }
  };

  const scanDnuDirectory = async (dir: string) => {
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

  const handleExecuteDnu = async () => {
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
        scanDnuDirectory(dnuDir);
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
      {/* Tool Navigation Pills */}
      <div
        className="glass-card"
        style={{
          padding: '12px 18px',
          display: 'flex',
          gap: 10,
        }}
      >
        <button
          onClick={() => setActiveTab('collector')}
          style={{
            padding: '6px 16px',
            borderRadius: 8,
            border: activeTab === 'collector' ? '1px solid var(--system-cyan)' : '1px solid var(--border)',
            backgroundColor: activeTab === 'collector' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
            color: activeTab === 'collector' ? 'var(--system-cyan)' : 'var(--secondary-label)',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <FileSpreadsheet size={14} />
          <span>All Inventory Reports Collector</span>
        </button>

        <button
          onClick={() => setActiveTab('doNotUpload')}
          style={{
            padding: '6px 16px',
            borderRadius: 8,
            border: activeTab === 'doNotUpload' ? '1px solid #EC4899' : '1px solid var(--border)',
            backgroundColor: activeTab === 'doNotUpload' ? 'rgba(236, 72, 153, 0.15)' : 'transparent',
            color: activeTab === 'doNotUpload' ? '#EC4899' : 'var(--secondary-label)',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <FolderArchive size={14} />
          <span>DO NOT UPLOAD Isolator</span>
        </button>

        <button
          onClick={() => setActiveTab('normalizer')}
          style={{
            padding: '6px 16px',
            borderRadius: 8,
            border: activeTab === 'normalizer' ? '1px solid var(--system-blue)' : '1px solid var(--border)',
            backgroundColor: activeTab === 'normalizer' ? 'var(--accent-soft)' : 'transparent',
            color: activeTab === 'normalizer' ? 'var(--system-blue)' : 'var(--secondary-label)',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Extension Normalizer
        </button>

        <button
          onClick={() => setActiveTab('taggerP')}
          style={{
            padding: '6px 16px',
            borderRadius: 8,
            border: activeTab === 'taggerP' ? '1px solid var(--system-cyan)' : '1px solid var(--border)',
            backgroundColor: activeTab === 'taggerP' ? 'rgba(0, 242, 254, 0.12)' : 'transparent',
            color: activeTab === 'taggerP' ? 'var(--system-cyan)' : 'var(--secondary-label)',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Photo Suffix Tagger (_P)
        </button>

        <button
          onClick={() => setActiveTab('taggerV')}
          style={{
            padding: '6px 16px',
            borderRadius: 8,
            border: activeTab === 'taggerV' ? '1px solid var(--system-green)' : '1px solid var(--border)',
            backgroundColor: activeTab === 'taggerV' ? 'rgba(48, 209, 88, 0.12)' : 'transparent',
            color: activeTab === 'taggerV' ? 'var(--system-green)' : 'var(--secondary-label)',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Video Thumbnail Tagger (_V)
        </button>
      </div>

      {activeTab === 'collector' ? (
        /* ── INVENTORY REPORT COLLECTOR PANEL ── */
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
              Recursively scans folders to find <code>_Inventory_Report.xlsx</code> located inside <code>Document</code> directories, and copies them into an <code>All Inventory Reports</code> folder inside your chosen destination path.
            </div>
          </div>

          {/* Path Pickers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* 1. Source Directory */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsIrDragOver(true);
              }}
              onDragLeave={() => setIsIrDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsIrDragOver(false);
                if (e.dataTransfer.files.length > 0) {
                  const fp = (e.dataTransfer.files[0] as any).path || '';
                  if (fp) setIrSourceDir(fp);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: isIrDragOver ? 'rgba(0, 242, 254, 0.15)' : 'var(--surface-elevated)',
                border: isIrDragOver ? '1px dashed var(--system-cyan)' : '1px solid var(--border)',
                borderRadius: 10,
                padding: '0 12px',
                gap: 8,
                transition: 'all 0.2s ease',
              }}
            >
              <Folder size={16} color="var(--system-cyan)" />
              <input
                value={irSourceDir}
                onChange={(e) => setIrSourceDir(e.target.value)}
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
              <StudioButton variant="glass" size="sm" icon={<Folder size={12} />} onClick={handleBrowseIrSource}>
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
                value={irDestDir}
                onChange={(e) => setIrDestDir(e.target.value)}
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
              <StudioButton variant="glass" size="sm" icon={<FolderOpen size={12} />} onClick={handleBrowseIrDest}>
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
                  {irDestDir ? `${irDestDir}\\All Inventory Reports` : '[Selected Destination Folder]\\All Inventory Reports'}
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
                    name="irMode"
                    value="copy"
                    checked={irMode === 'copy'}
                    onChange={() => setIrMode('copy')}
                  />
                  <span>Copy (Safe)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', marginLeft: 8 }}>
                  <input
                    type="radio"
                    name="irMode"
                    value="move"
                    checked={irMode === 'move'}
                    onChange={() => setIrMode('move')}
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
                  checked={irDryRun}
                  onChange={(e) => setIrDryRun(e.target.checked)}
                />
                <span>Dry Run (Preview Only)</span>
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StudioButton
                variant="glass"
                icon={<RefreshCw size={13} className={irScanning ? 'spin' : ''} />}
                onClick={handleScanIr}
                loading={irScanning}
                disabled={!irSourceDir.trim()}
              >
                Scan Folders
              </StudioButton>

              <StudioButton
                variant="primary"
                icon={<Copy size={13} />}
                onClick={handleExecuteIr}
                loading={irExecuting}
                disabled={irItems.length === 0 || !irDestDir.trim()}
              >
                Collect into 'All Inventory Reports'
              </StudioButton>

              {irTargetFolder && (
                <StudioButton
                  variant="glass"
                  icon={<FolderOpen size={13} />}
                  onClick={handleOpenIrTargetFolder}
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
                gridTemplateColumns: '1.4fr 1.1fr 1.5fr 0.8fr 2fr 0.8fr',
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
              <span style={{ textAlign: 'right' }}>STATUS</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {irItems.length === 0 ? (
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
                irItems.map((itm, idx) => (
                  <div
                    key={idx}
                    style={{
                      height: 44,
                      display: 'grid',
                      gridTemplateColumns: '1.4fr 1.1fr 1.5fr 0.8fr 2fr 0.8fr',
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
                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          backgroundColor:
                            itm.status === 'Copied'
                              ? 'rgba(48, 209, 88, 0.15)'
                              : 'rgba(0, 242, 254, 0.12)',
                          color: itm.status === 'Copied' ? 'var(--system-green)' : 'var(--system-cyan)',
                        }}
                      >
                        {itm.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'doNotUpload' ? (
        /* ── DO NOT UPLOAD ISOLATOR PANEL ── */
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
                DO NOT UPLOAD Folder Isolator
              </span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: 9.5,
                  fontWeight: 800,
                  letterSpacing: 0.8,
                  color: '#EC4899',
                  backgroundColor: 'rgba(236, 72, 153, 0.12)',
                  border: '1px solid rgba(236, 72, 153, 0.35)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                CONTRIBUTOR &amp; DOCUMENTS
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--secondary-label)', marginTop: 3 }}>
              Scans folder hierarchy for <code>Contributor</code> &amp; <code>Documents</code> folders and moves them into <code>DO NOT UPLOAD</code> organized date-wise.
            </div>
          </div>

          {/* Folder Ingestion Bay */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDnuDragOver(true);
            }}
            onDragLeave={() => setIsDnuDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDnuDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const p = (e.dataTransfer.files[0] as any).path;
                if (p) {
                  setDnuDir(p);
                  scanDnuDirectory(p);
                }
              }
            }}
            style={{
              padding: '14px 16px',
              borderRadius: 12,
              border: isDnuDragOver ? '2px dashed #EC4899' : '1px solid var(--border)',
              backgroundColor: isDnuDragOver ? 'rgba(236, 72, 153, 0.12)' : 'var(--surface-elevated)',
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
            <StudioButton variant="glass" onClick={handleBrowseDnuDir}>
              Browse Folder
            </StudioButton>
            <StudioButton
              variant="primary"
              loading={dnuScanning}
              icon={<RefreshCw size={13} />}
              onClick={() => scanDnuDirectory(dnuDir)}
              disabled={!dnuDir.trim()}
              style={{ background: 'linear-gradient(135deg, #EC4899, #DB2777)' }}
            >
              Scan
            </StudioButton>
          </div>

          {/* Controls Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              borderRadius: 10,
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border-subtle)',
              fontSize: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tertiary-label)', letterSpacing: 0.5, fontFamily: 'var(--font-mono)' }}>
                MODE:
              </span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--label)' }}>
                <input
                  type="radio"
                  name="dnuMode"
                  checked={dnuMode === 'move'}
                  onChange={() => setDnuMode('move')}
                />
                <span>Move to 'DO NOT UPLOAD'</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--label)' }}>
                <input
                  type="radio"
                  name="dnuMode"
                  checked={dnuMode === 'copy'}
                  onChange={() => setDnuMode('copy')}
                />
                <span>Copy (Keep Original)</span>
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
                loading={dnuExecuting}
                icon={<Play size={13} />}
                onClick={handleExecuteDnu}
                disabled={dnuItems.length === 0}
                style={!dnuDryRun ? { background: 'linear-gradient(135deg, #10E79D, #059669)' } : undefined}
              >
                {dnuDryRun ? 'Validate Isolation' : 'Execute Move'}
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
                  Isolation complete! Target folders organized into 'DO NOT UPLOAD'.
                </span>
              </div>
              <StudioButton variant="glass" size="sm" icon={<FolderOpen size={12} />} onClick={handleOpenDnuFolder}>
                Open 'DO NOT UPLOAD'
              </StudioButton>
            </div>
          )}

          {/* Items Table */}
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
                  <FolderArchive size={32} style={{ opacity: 0.4 }} />
                  <span>No folders queued. Select or drop a folder above and click Scan.</span>
                </div>
              ) : (
                dnuItems.map((itm, idx) => (
                  <div
                    key={idx}
                    style={{
                      height: 44,
                      display: 'grid',
                      gridTemplateColumns: '1.4fr 1.2fr 0.8fr 0.9fr 2fr',
                      alignItems: 'center',
                      padding: '0 16px',
                      borderBottom: '1px solid var(--border-subtle)',
                      fontSize: 11.5,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--label)',
                      backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.012)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                      <span
                        style={{
                          padding: '2px 7px',
                          borderRadius: 5,
                          fontSize: 9.5,
                          fontWeight: 700,
                          backgroundColor: 'rgba(236, 72, 153, 0.15)',
                          color: '#EC4899',
                          border: '1px solid rgba(236, 72, 153, 0.3)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {itm.name}
                      </span>
                    </div>

                    <span style={{ color: 'var(--secondary-label)' }}>{itm.dateFolder}</span>

                    <span style={{ color: 'var(--system-cyan)', fontWeight: 600 }}>{itm.fileCount}</span>

                    <span style={{ color: 'var(--secondary-label)' }}>{itm.sizeStr}</span>

                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: 'var(--system-green)',
                        fontSize: 11,
                      }}
                      title={itm.destination}
                    >
                      {itm.destination}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'normalizer' ? (
        /* Normalizer Panel */
        <div
          className="glass-card"
          style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--label)' }}>
              Clean JPG Compound Extension Normalizer
            </div>
            <div style={{ fontSize: 11, color: 'var(--secondary-label)', marginTop: 2 }}>
              Normalizes compound extensions like <code>FILE.CR3.jpg → FILE.jpg</code> and <code>PHOTO.CR3_V.jpg → PHOTO_V.jpg</code>.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
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
                value={normDir}
                onChange={(e) => setNormDir(e.target.value)}
                placeholder="Target Directory..."
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
            <StudioButton variant="glass" onClick={handleBrowseNormDir}>
              Browse
            </StudioButton>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--secondary-label)', cursor: 'pointer' }}>
              <input type="checkbox" checked={normDryRun} onChange={(e) => setNormDryRun(e.target.checked)} />
              <span>Dry Run Simulation</span>
            </label>

            <StudioButton variant="primary" loading={normLoading} icon={<Play size={14} />} onClick={handleRunNormalizer}>
              {normDryRun ? 'Validate Extensions' : 'Execute Renames'}
            </StudioButton>
          </div>

          {normItems.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--secondary-label)' }}>
                Detected {normItems.length} Renames:
              </div>
              <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {normItems.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      backgroundColor: 'var(--surface-elevated)',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      display: 'flex',
                      gap: 8,
                    }}
                  >
                    <span style={{ color: 'var(--system-red)' }}>{item.old}</span>
                    <span style={{ color: 'var(--tertiary-label)' }}>→</span>
                    <span style={{ color: 'var(--system-green)', fontWeight: 600 }}>{item.new}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Suffix Tagger Panel */
        <div
          className="glass-card"
          style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--label)' }}>
              Batch {activeTab === 'taggerP' ? "'_P' Photo" : "'_V' Video Thumbnail"} Suffix Tagger
            </div>
            <div style={{ fontSize: 11, color: 'var(--secondary-label)', marginTop: 2 }}>
              Renames images in-place appending <code>{activeTab === 'taggerP' ? '_P' : '_V'}</code> before the extension.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <StudioButton variant="glass" icon={<Folder size={14} />} onClick={handleSelectTagFolder}>
              Choose Folder
            </StudioButton>
            <StudioButton variant="glass" icon={<FileCheck size={14} />} onClick={handleSelectTagFiles}>
              Choose Specific Files
            </StudioButton>
          </div>

          {tagFiles.length > 0 && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                backgroundColor: 'var(--surface-elevated)',
                fontSize: 11.5,
                fontFamily: 'var(--font-mono)',
                color: 'var(--label)',
              }}
            >
              Selected: {tagFiles.length} target item(s) ready to tag.
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
            <StudioButton
              variant="primary"
              loading={tagLoading}
              icon={<Play size={14} />}
              onClick={activeTab === 'taggerP' ? handleRunTaggerP : handleRunTaggerV}
              disabled={tagFiles.length === 0}
            >
              Apply {activeTab === 'taggerP' ? '_P' : '_V'} Suffixes In-Place
            </StudioButton>
          </div>
        </div>
      )}
    </div>
  );
};
