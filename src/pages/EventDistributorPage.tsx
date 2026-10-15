import React, { useState, useEffect } from 'react';
import {
  ImageIcon,
  Folder,
  FileSpreadsheet,
  RefreshCw,
  Play,
  CheckCircle2,
  FolderCheck,
  AlertCircle,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { StudioButton } from '../components/StudioButton';
import { PageKey } from '../types/pipelineStages';
import { usePipeline } from '../context/PipelineContext';
import { OperationLoadingOverlay } from '../components/OperationLoadingOverlay';
import {
  EventDistributorScanResult,
  FolderEventMatch,
  EventDistributorSummary,
} from '../../electron/engines/eventImageDistributor';

interface EventDistributorPageProps {
  onShowToast: (text: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
  onNavigate?: (page: PageKey) => void;
}

export const EventDistributorPage: React.FC<EventDistributorPageProps> = ({ onShowToast, onNavigate }) => {
  const { uploadStructure } = usePipeline();

  const [targetDir, setTargetDir] = useState(uploadStructure.mainDataPath || '');
  const [imagesDir, setImagesDir] = useState('');
  const [excelPath, setExcelPath] = useState('');

  const [isScanning, setIsScanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [scanResult, setScanResult] = useState<EventDistributorScanResult | null>(null);
  const [executionSummary, setExecutionSummary] = useState<EventDistributorSummary | null>(null);
  const [filterAbbr, setFilterAbbr] = useState<string>('ALL');
  const [isPathSetupOpen, setIsPathSetupOpen] = useState(false);
  const [setupImagesPath, setSetupImagesPath] = useState('');
  const [setupExcelPath, setSetupExcelPath] = useState('');

  // Auto-load persistent config on mount and prompt if not set
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === 'true') {
        const demoDir = 'D:\\2026_EVENTS\\ROYAL_WEDDING\\EVENT_SETS';
        setTargetDir(demoDir);
        setScanResult({
          imagesDirPath: 'D:\\APP_DATA\\EVENT_BADGES',
          targetWorkingDir: demoDir,
          mappingsCount: 34,
          availableImages: [
            { fileName: 'Q.jpg', filePath: 'D:\\APP_DATA\\EVENT_BADGES\\Q.jpg', matchedEventNames: ['Qadam'], matchedAbbreviations: ['Q'] },
            { fileName: 'M.jpg', filePath: 'D:\\APP_DATA\\EVENT_BADGES\\M.jpg', matchedEventNames: ['Majlis'], matchedAbbreviations: ['M'] },
            { fileName: 'Z.jpg', filePath: 'D:\\APP_DATA\\EVENT_BADGES\\Z.jpg', matchedEventNames: ['Ziyafat'], matchedAbbreviations: ['Z'] },
          ],
          foldersMatched: [
            {
              folderPath: `${demoDir}\\2026-02-14\\0042_Ceremony_Q_Bride`,
              folderName: '0042_Ceremony_Q_Bride',
              dateSlot: '2026-02-14',
              seq: '0042',
              rawEventToken: 'Q',
              stickerNumber: '0042',
              abbreviation: 'Q',
              matchedEventName: 'Qadam Mubarak',
              its: '10928374',
              matchedImages: [{ fileName: 'Q.jpg', filePath: 'D:\\APP_DATA\\EVENT_BADGES\\Q.jpg', alreadyExists: false }],
            },
            {
              folderPath: `${demoDir}\\2026-02-14\\0043_Varmala_M_Rituals`,
              folderName: '0043_Varmala_M_Rituals',
              dateSlot: '2026-02-14',
              seq: '0043',
              rawEventToken: 'M',
              stickerNumber: '0043',
              abbreviation: 'M',
              matchedEventName: 'Majlis Khidmat',
              its: '10928375',
              matchedImages: [{ fileName: 'M.jpg', filePath: 'D:\\APP_DATA\\EVENT_BADGES\\M.jpg', alreadyExists: false }],
            },
            {
              folderPath: `${demoDir}\\2026-02-15\\0108_Dinner_Z_Reception`,
              folderName: '0108_Dinner_Z_Reception',
              dateSlot: '2026-02-15',
              seq: '0108',
              rawEventToken: 'Z',
              stickerNumber: '0108',
              abbreviation: 'Z',
              matchedEventName: 'Ziyafat Thaali',
              its: '10928376',
              matchedImages: [{ fileName: 'Z.jpg', filePath: 'D:\\APP_DATA\\EVENT_BADGES\\Z.jpg', alreadyExists: false }],
            },
          ],
          unmatchedFolders: [],
          totalPlannedCopies: 3,
        });
        return;
      }
    }

    if (window.electronAPI) {
      window.electronAPI.getConfig().then((cfg: any) => {
        if (cfg) {
          if (cfg.eventExcelPath && !excelPath) {
            setExcelPath(cfg.eventExcelPath);
            setSetupExcelPath(cfg.eventExcelPath);
          }
          if (cfg.eventImagesDirPath && !imagesDir) {
            setImagesDir(cfg.eventImagesDirPath);
            setSetupImagesPath(cfg.eventImagesDirPath);
          } else if (!cfg.eventImagesDirPath) {
            // Path has not been set yet: ask the user immediately on opening Event Image Shift
            setIsPathSetupOpen(true);
          }
        } else {
          setIsPathSetupOpen(true);
        }
      });
    }
  }, []);

  // Update target dir if uploadStructure becomes available
  useEffect(() => {
    if (uploadStructure.mainDataPath && !targetDir) {
      setTargetDir(uploadStructure.mainDataPath);
    }
  }, [uploadStructure.mainDataPath]);

  const handleBrowseSetupImages = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory(
      'Select Master Event Reference Images Directory',
      setupImagesPath || imagesDir
    );
    if (dir) setSetupImagesPath(dir);
  };

  const handleBrowseSetupExcel = async () => {
    if (!window.electronAPI) return;
    const file = await window.electronAPI.selectOpenFile('Select Event Abbreviations Excel File', [
      { name: 'Excel Spreadsheets', extensions: ['xlsx', 'xls'] },
    ]);
    if (file) setSetupExcelPath(file);
  };

  const handleSaveFixedPath = async () => {
    if (!setupImagesPath.trim()) {
      onShowToast('Please select a valid Event Reference Images directory.', 'warning');
      return;
    }
    if (window.electronAPI) {
      await window.electronAPI.saveConfig({
        eventImagesDirPath: setupImagesPath.trim(),
        ...(setupExcelPath ? { eventExcelPath: setupExcelPath.trim() } : {}),
      });
    }
    setImagesDir(setupImagesPath.trim());
    if (setupExcelPath) setExcelPath(setupExcelPath.trim());
    setIsPathSetupOpen(false);
    onShowToast('✓ Master Event Images path saved permanently until changed in Settings.', 'success');
  };

  const handleBrowseTarget = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory('Select Target Production Workspace (containing event folders)', targetDir);
    if (dir) setTargetDir(dir);
  };

  const handleBrowseExcel = async () => {
    if (!window.electronAPI) return;
    const file = await window.electronAPI.selectOpenFile('Select Event Abbreviations Excel File', [
      { name: 'Excel Spreadsheets', extensions: ['xlsx', 'xls'] },
    ]);
    if (file) {
      setExcelPath(file);
      window.electronAPI.saveConfig({ eventExcelPath: file });
    }
  };

  const handleScan = async () => {
    if (!targetDir.trim()) {
      onShowToast('Please select a Target Workspace Directory containing event folders.', 'warning');
      return;
    }

    let activeImagesDir = imagesDir;
    if (window.electronAPI) {
      const cfg = await window.electronAPI.getConfig();
      if (cfg?.eventImagesDirPath) {
        activeImagesDir = cfg.eventImagesDirPath;
        setImagesDir(cfg.eventImagesDirPath);
      }
    }

    if (!activeImagesDir.trim()) {
      onShowToast('Please configure the Event Reference Images folder in Settings.', 'warning');
      return;
    }

    if (!window.electronAPI || typeof window.electronAPI.scanEventDistributor !== 'function') {
      setIsScanning(true);
      setTimeout(() => {
        setIsScanning(false);
        const demoDir = targetDir || 'D:\\2026_EVENTS\\ROYAL_WEDDING\\EVENT_SETS';
        setScanResult({
          imagesDirPath: activeImagesDir || 'D:\\APP_DATA\\EVENT_BADGES',
          targetWorkingDir: demoDir,
          mappingsCount: 34,
          availableImages: [
            { fileName: 'Q.jpg', filePath: 'D:\\APP_DATA\\EVENT_BADGES\\Q.jpg', matchedEventNames: ['Qadam'], matchedAbbreviations: ['Q'] },
            { fileName: 'M.jpg', filePath: 'D:\\APP_DATA\\EVENT_BADGES\\M.jpg', matchedEventNames: ['Majlis'], matchedAbbreviations: ['M'] },
            { fileName: 'Z.jpg', filePath: 'D:\\APP_DATA\\EVENT_BADGES\\Z.jpg', matchedEventNames: ['Ziyafat'], matchedAbbreviations: ['Z'] },
          ],
          foldersMatched: [
            {
              folderPath: `${demoDir}\\2026-02-14\\0042_Ceremony_Q_Bride`,
              folderName: '0042_Ceremony_Q_Bride',
              dateSlot: '2026-02-14',
              seq: '0042',
              rawEventToken: 'Q',
              stickerNumber: '0042',
              abbreviation: 'Q',
              matchedEventName: 'Qadam Mubarak',
              its: '10928374',
              matchedImages: [{ fileName: 'Q.jpg', filePath: 'D:\\APP_DATA\\EVENT_BADGES\\Q.jpg', alreadyExists: false }],
            },
            {
              folderPath: `${demoDir}\\2026-02-14\\0043_Varmala_M_Rituals`,
              folderName: '0043_Varmala_M_Rituals',
              dateSlot: '2026-02-14',
              seq: '0043',
              rawEventToken: 'M',
              stickerNumber: '0043',
              abbreviation: 'M',
              matchedEventName: 'Majlis Khidmat',
              its: '10928375',
              matchedImages: [{ fileName: 'M.jpg', filePath: 'D:\\APP_DATA\\EVENT_BADGES\\M.jpg', alreadyExists: false }],
            },
          ],
          unmatchedFolders: [],
          totalPlannedCopies: 2,
        });
        onShowToast('Scan simulation complete: Found 2 event folders matched (Preview Mode)', 'info');
      }, 500);
      return;
    }

    setIsScanning(true);
    setExecutionSummary(null);
    try {
      const res: EventDistributorScanResult = await window.electronAPI.scanEventDistributor(
        targetDir,
        activeImagesDir,
        excelPath || ''
      );
      setScanResult(res);
      onShowToast(
        `Scan complete: Found ${res.foldersMatched.length} event folders matched (${res.totalPlannedCopies} planned copies)`,
        'success'
      );
    } catch (e: any) {
      onShowToast(`Scan failed: ${e.message}`, 'danger');
    } finally {
      setIsScanning(false);
    }
  };

  const handleExecute = async () => {
    if (!scanResult || scanResult.foldersMatched.length === 0) {
      onShowToast('No matched folders to distribute images to.', 'warning');
      return;
    }

    if (!window.electronAPI || typeof window.electronAPI.executeEventDistribution !== 'function') {
      setIsExecuting(true);
      setTimeout(() => {
        setIsExecuting(false);
        setExecutionSummary({
          success: true,
          totalFoldersProcessed: scanResult.foldersMatched.length,
          totalImagesCopied: scanResult.foldersMatched.length,
          skippedExisting: 0,
          errors: [],
        });
        onShowToast(`Simulation finished! Successfully copied ${scanResult.foldersMatched.length} images. (Preview Mode)`, 'success');
      }, 600);
      return;
    }

    setIsExecuting(true);
    try {
      const summary: EventDistributorSummary = await window.electronAPI.executeEventDistribution(
        scanResult.foldersMatched
      );
      setExecutionSummary(summary);
      if (summary.success) {
        onShowToast(
          `Distribution finished! Successfully copied ${summary.totalImagesCopied} images across ${summary.totalFoldersProcessed} folders (${summary.skippedExisting} already existed).`,
          'success'
        );
      } else {
        onShowToast(
          `Finished with errors: Copied ${summary.totalImagesCopied} images. (${summary.errors.length} failed)`,
          'warning'
        );
      }
      // Re-scan to update status
      handleScan();
    } catch (e: any) {
      onShowToast(`Execution error: ${e.message}`, 'danger');
    } finally {
      setIsExecuting(false);
    }
  };

  // Unique abbreviations found in scan
  const uniqueAbbrs = scanResult
    ? Array.from(new Set(scanResult.foldersMatched.map((f) => f.abbreviation))).sort()
    : [];

  const filteredFolders = scanResult
    ? scanResult.foldersMatched.filter((f) => filterAbbr === 'ALL' || f.abbreviation === filterAbbr)
    : [];

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
      {/* Top Banner */}
      <div
        className="glass-card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderLeft: '4px solid #6366F1',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ImageIcon size={22} color="#6366F1" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--label)', letterSpacing: 0.3 }}>
                Event Image Shifter
              </span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 800,
                  color: '#6366F1',
                  backgroundColor: 'rgba(99, 102, 241, 0.12)',
                  border: '1px solid rgba(99, 102, 241, 0.35)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                BADGE DISTRIBUTOR
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--secondary-label)', marginTop: 2 }}>
              Automatically places reference event badge images (e.g. Q / Qadam image) into all corresponding event subfolders.
            </div>
          </div>
        </div>
      </div>

      {/* Path Selectors */}
      <div
        className="glass-card"
        style={{
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {/* Master Reference Images Fixed Path Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: 10,
            background: imagesDir ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 159, 10, 0.1)',
            border: `1px solid ${imagesDir ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 159, 10, 0.35)'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: imagesDir ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 159, 10, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ImageIcon size={17} color={imagesDir ? '#6366F1' : '#FF9F0A'} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--secondary-label)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Master Event Reference Images Path (Fixed)
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  fontFamily: 'var(--font-mono)',
                  color: imagesDir ? 'var(--label)' : 'var(--system-orange)',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginTop: 2,
                }}
                title={imagesDir || 'Not configured'}
              >
                {imagesDir || '⚠️ No path set — Click "Set Fixed Path" to lock reference images location.'}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setSetupImagesPath(imagesDir);
              setSetupExcelPath(excelPath);
              setIsPathSetupOpen(true);
            }}
            style={{
              background: imagesDir ? 'rgba(255, 255, 255, 0.08)' : 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              color: imagesDir ? 'var(--label)' : '#fff',
              borderRadius: 7,
              padding: '6px 14px',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              marginLeft: 14,
              boxShadow: imagesDir ? 'none' : '0 2px 10px rgba(99, 102, 241, 0.3)',
            }}
          >
            {imagesDir ? '⚙ Change in Settings' : 'Set Fixed Path →'}
          </button>
        </div>

        {/* Target Workspace Directory */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--label)' }}>
            Target Workspace Directory (Contains folders like 1448-04-09_02E-27-12Q-40905764):
          </label>
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
                height: 38,
              }}
            >
              <Folder size={16} color="#6366F1" />
              <input
                value={targetDir}
                onChange={(e) => setTargetDir(e.target.value)}
                placeholder="Target media root directory..."
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
            </div>
            <StudioButton variant="secondary" size="sm" onClick={handleBrowseTarget}>
              <Folder size={14} />
              Browse
            </StudioButton>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <StudioButton variant="secondary" size="md" onClick={handleScan} disabled={isScanning || isExecuting}>
            <RefreshCw size={14} className={isScanning ? 'spin' : ''} />
            {isScanning ? 'Analyzing Folders & Images...' : 'Scan & Analyze Matching Folders'}
          </StudioButton>

          <StudioButton
            variant="primary"
            size="md"
            onClick={handleExecute}
            disabled={!scanResult || scanResult.foldersMatched.length === 0 || isExecuting}
            style={{ backgroundColor: '#6366F1' }}
          >
            <Play size={14} />
            {isExecuting ? 'Distributing Images...' : `Execute Image Distribution (${scanResult ? scanResult.totalPlannedCopies : 0} Files)`}
          </StudioButton>
        </div>
      </div>

      {/* Results & Statistics */}
      {scanResult ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <div className="glass-card" style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--secondary-label)' }}>Mapped Event Codes</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--system-blue)' }}>
                {scanResult.mappingsCount} Codes
              </div>
            </div>
            <div className="glass-card" style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--secondary-label)' }}>Available Badge Images</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--system-cyan)' }}>
                {scanResult.availableImages.length} Images
              </div>
            </div>
            <div className="glass-card" style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--secondary-label)' }}>Matched Destination Folders</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#6366F1' }}>
                {scanResult.foldersMatched.length} Folders
              </div>
            </div>
            <div className="glass-card" style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--secondary-label)' }}>Planned Copies</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--system-green)' }}>
                {scanResult.totalPlannedCopies} File Moves
              </div>
            </div>
          </div>

          {/* Abbreviation Filter Chips */}
          <div
            className="glass-card"
            style={{
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              overflowX: 'auto',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--secondary-label)', whiteSpace: 'nowrap' }}>
              Filter by Event Code:
            </span>
            <button
              onClick={() => setFilterAbbr('ALL')}
              style={{
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                border: filterAbbr === 'ALL' ? '1px solid #6366F1' : '1px solid var(--border)',
                backgroundColor: filterAbbr === 'ALL' ? '#6366F1' : 'var(--surface-elevated)',
                color: filterAbbr === 'ALL' ? '#fff' : 'var(--label)',
              }}
            >
              All ({scanResult.foldersMatched.length})
            </button>
            {uniqueAbbrs.map((abbr) => {
              const count = scanResult.foldersMatched.filter((f) => f.abbreviation === abbr).length;
              const isSel = filterAbbr === abbr;
              return (
                <button
                  key={abbr}
                  onClick={() => setFilterAbbr(abbr)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: isSel ? '1px solid #6366F1' : '1px solid var(--border)',
                    backgroundColor: isSel ? '#6366F1' : 'var(--surface-elevated)',
                    color: isSel ? '#fff' : 'var(--label)',
                  }}
                >
                  {abbr} ({count})
                </button>
              );
            })}
          </div>

          {/* Folder Breakdown Table */}
          <div
            className="glass-card"
            style={{
              padding: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'var(--surface-elevated)',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--label)' }}>
                Matched Folders & Image Placement Plan ({filteredFolders.length} Folders)
              </div>
            </div>

            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--secondary-label)' }}>
                    <th style={{ textAlign: 'left', padding: '10px 14px' }}>Folder Name</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px' }}>Code / Abbr</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px' }}>Event Name</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px' }}>Seq #</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px' }}>Target Images to Copy</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFolders.map((item, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid var(--border-glass)',
                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                      }}
                    >
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Folder size={14} color="#6366F1" />
                          <span>{item.folderName}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 6,
                            backgroundColor: 'rgba(99, 102, 241, 0.15)',
                            color: '#818CF8',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {item.abbreviation}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--label)' }}>
                        {item.matchedEventName || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--secondary-label)', fontFamily: 'var(--font-mono)' }}>
                        {item.seq || '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {item.matchedImages.length === 0 ? (
                          <span style={{ color: 'var(--secondary-label)', fontStyle: 'italic' }}>
                            No matching image found
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {item.matchedImages.map((img, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <ImageIcon size={13} color="var(--system-cyan)" />
                                <span style={{ fontFamily: 'var(--font-mono)' }}>{img.fileName}</span>
                                {img.alreadyExists ? (
                                  <span style={{ fontSize: 10, color: 'var(--system-green)', fontWeight: 600 }}>
                                    (Already present)
                                  </span>
                                ) : (
                                  <span style={{ fontSize: 10, color: '#818CF8', fontWeight: 600 }}>
                                    (Will copy)
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="glass-card"
          style={{
            flex: 1,
            minHeight: 260,
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
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.08)',
            }}
          >
            <ImageIcon size={26} color="#6366F1" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--label)' }}>
              Awaiting Event Code Analysis
            </span>
            <span style={{ fontSize: 12, color: 'var(--secondary-label)', maxWidth: 440, lineHeight: 1.5 }}>
              Select your target workspace directory above and click "Scan &amp; Analyze Matching Folders" to inspect event codes and preview reference image placement.
            </span>
          </div>
          <StudioButton
            variant="primary"
            size="sm"
            loading={isScanning}
            onClick={handleScan}
            disabled={!targetDir.trim()}
            icon={<RefreshCw size={13} />}
            style={{ backgroundColor: '#6366F1', marginTop: 4 }}
          >
            Scan &amp; Analyze Matching Folders
          </StudioButton>
        </div>
      )}

      {/* Permanent Event Images Path Setup Modal */}
      {isPathSetupOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(5, 8, 14, 0.85)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            style={{
              width: 580,
              maxWidth: '94vw',
              background: '#0D111A',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              borderRadius: 16,
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 35px rgba(99, 102, 241, 0.2)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(0, 242, 254, 0.08) 100%)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: 'rgba(99, 102, 241, 0.2)',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ImageIcon size={20} color="#6366F1" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#F8FAFC' }}>
                  Set Master Event Reference Images Path
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: 12, color: '#94A3B8' }}>
                  This path will remain permanently fixed until you change it in Settings.
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Images Folder */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Folder size={14} color="#6366F1" />
                  Master Event Badge Images Folder (Contains Q.jpg, M.jpg, Z.jpg, etc.):
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={setupImagesPath}
                    onChange={(e) => setSetupImagesPath(e.target.value)}
                    placeholder="e.g. D:\APP_DATA\EVENT_BADGES"
                    style={{
                      flex: 1,
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: 8,
                      padding: '8px 12px',
                      color: '#F8FAFC',
                      fontSize: 12.5,
                      fontFamily: 'var(--font-mono)',
                      outline: 'none',
                    }}
                  />
                  <StudioButton variant="secondary" size="sm" onClick={handleBrowseSetupImages}>
                    <Folder size={13} />
                    Browse
                  </StudioButton>
                </div>
              </div>

              {/* Optional Excel File */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileSpreadsheet size={14} color="#10E79D" />
                  Event Abbreviations Spreadsheet (Optional):
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={setupExcelPath}
                    onChange={(e) => setSetupExcelPath(e.target.value)}
                    placeholder="e.g. D:\EVENTS\Event Abbreviations List.xlsx (Optional)"
                    style={{
                      flex: 1,
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: 8,
                      padding: '8px 12px',
                      color: '#F8FAFC',
                      fontSize: 12.5,
                      fontFamily: 'var(--font-mono)',
                      outline: 'none',
                    }}
                  />
                  <StudioButton variant="secondary" size="sm" onClick={handleBrowseSetupExcel}>
                    <FileSpreadsheet size={13} />
                    Browse
                  </StudioButton>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '14px 24px',
                background: 'rgba(15, 23, 42, 0.5)',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              {imagesDir && (
                <StudioButton variant="secondary" size="sm" onClick={() => setIsPathSetupOpen(false)}>
                  Cancel
                </StudioButton>
              )}
              <StudioButton
                variant="primary"
                size="sm"
                onClick={handleSaveFixedPath}
                disabled={!setupImagesPath.trim()}
                style={{ backgroundColor: '#6366F1' }}
              >
                Save &amp; Fix Path
              </StudioButton>
            </div>
          </div>
        </div>
      )}

      {/* Live Operation Loading Overlay */}
      <OperationLoadingOverlay
        isOpen={isScanning || isExecuting}
        title={isScanning ? 'Analyzing Event Code Mappings...' : 'Distributing Event Badge Images...'}
        subtitle={
          isScanning
            ? 'Scanning media directories and matching event codes to reference badges...'
            : 'Copying reference event badges into matched event folders...'
        }
        accentColor="#6366F1"
      />
    </div>
  );
};
