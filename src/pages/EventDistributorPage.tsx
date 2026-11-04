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
  X,
  BarChart3,
  Database,
  Link,
  Sparkles,
  Check,
  Copy,
  PlusCircle,
} from 'lucide-react';
import { StudioButton } from '../components/StudioButton';
import { StudioFolderInput } from '../components/StudioFolderInput';
import { PageKey } from '../types/pipelineStages';
import { usePipeline } from '../context/PipelineContext';
import { OperationLoadingOverlay } from '../components/OperationLoadingOverlay';
import { AddToStatsModal, SafarStatsModal } from '../components';
import {
  EventDistributorScanResult,
  FolderEventMatch,
  EventDistributorSummary,
} from '../../electron/engines/eventImageDistributor';
import { toUserErrorMessage } from '../utils/errorSanitizer';

interface EventDistributorPageProps {
  onShowToast: (text: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
  onNavigate?: (page: PageKey) => void;
}

export const EventDistributorPage: React.FC<EventDistributorPageProps> = ({ onShowToast, onNavigate }) => {
  const { uploadStructure, isStatsPageUnlocked, unlockStatsPage } = usePipeline();

  const [targetDir, setTargetDir] = useState(uploadStructure.mainDataDatePath || uploadStructure.mainDataPath || '');
  const [imagesDir, setImagesDir] = useState('');
  const [excelPath, setExcelPath] = useState('');

  const [isScanning, setIsScanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [scanResult, setScanResult] = useState<EventDistributorScanResult | null>(null);
  const [executionSummary, setExecutionSummary] = useState<EventDistributorSummary | null>(null);
  const [filterAbbr, setFilterAbbr] = useState<string>('ALL');
  const [isPathSetupOpen, setIsPathSetupOpen] = useState(false);
  const [setupImagesPath, setSetupImagesPath] = useState('');
  const [isAddToStatsOpen, setIsAddToStatsOpen] = useState(false);
  const [isStatsLedgerOpen, setIsStatsLedgerOpen] = useState(false);
  const [ecosystemStatus, setEcosystemStatus] = useState<any>(null);
  const [isSyncingWithAnything, setIsSyncingWithAnything] = useState(false);
  const [isCopiedPath, setIsCopiedPath] = useState(false);

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

    const initEcosystemAndConfig = async () => {
      if (window.electronAPI) {
        // 1. Check ecosystem linked folder from Anything / shared config
        if (typeof (window.electronAPI as any).ecosystemGetLinkedEventFolder === 'function') {
          try {
            const eco = await (window.electronAPI as any).ecosystemGetLinkedEventFolder();
            if (eco) {
              setEcosystemStatus(eco);
              if (eco.path && eco.exists) {
                setImagesDir(eco.path);
                setSetupImagesPath(eco.path);
              }
            }
          } catch (err) {
            console.warn('[Ecosystem Link] Error getting linked folder:', err);
          }
        }

        // 2. Check general app config
        window.electronAPI.getConfig().then((cfg: any) => {
          if (cfg) {
            if (cfg.eventExcelPath && !excelPath) {
              setExcelPath(cfg.eventExcelPath);
            } else if (!excelPath) {
              setExcelPath('C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\Pla Cards.xlsx');
            }

            if (cfg.eventImagesDirPath && !imagesDir) {
              setImagesDir(cfg.eventImagesDirPath);
              setSetupImagesPath(cfg.eventImagesDirPath);
            } else if (!imagesDir) {
              setImagesDir('C:\\Users\\Burhanuddin\\Downloads\\Full Downloads Data\\Warning and iltemas');
              setSetupImagesPath('C:\\Users\\Burhanuddin\\Downloads\\Full Downloads Data\\Warning and iltemas');
            }
          } else {
            setExcelPath('C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\Pla Cards.xlsx');
            if (!imagesDir) {
              setImagesDir('C:\\Users\\Burhanuddin\\Downloads\\Full Downloads Data\\Warning and iltemas');
              setSetupImagesPath('C:\\Users\\Burhanuddin\\Downloads\\Full Downloads Data\\Warning and iltemas');
            }
          }
        });

        // 3. Listen to cross-app remote link calls from Anything
        if (typeof (window.electronAPI as any).onEcosystemRemoteLink === 'function') {
          const unsub = (window.electronAPI as any).onEcosystemRemoteLink((data: any) => {
            if (data?.imagesDir) {
              setImagesDir(data.imagesDir);
              setSetupImagesPath(data.imagesDir);
              onShowToast('🔗 Event Reference Images folder updated from Anything Hub!', 'info');
              if (typeof (window.electronAPI as any).ecosystemInspectFolder === 'function') {
                (window.electronAPI as any).ecosystemInspectFolder(data.imagesDir).then((insp: any) => {
                  setEcosystemStatus((prev: any) => ({
                    ...(prev || {}),
                    path: data.imagesDir,
                    exists: insp.exists,
                    totalImages: insp.totalImages,
                    sampleBadges: insp.sampleBadges,
                    source: 'anything',
                  }));
                });
              }
            }
          });
          return unsub;
        }
      } else {
        setExcelPath('C:\\Users\\Burhanuddin\\OneDrive\\Desktop\\Pla Cards.xlsx');
      }
    };

    initEcosystemAndConfig();
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

  const handleSaveFixedPath = async () => {
    if (!setupImagesPath.trim()) {
      onShowToast('Please select a valid Event Reference Images directory.', 'warning');
      return;
    }
    const cleanPath = setupImagesPath.trim();
    if (window.electronAPI) {
      if (typeof (window.electronAPI as any).ecosystemSetLinkedEventFolder === 'function') {
        const res = await (window.electronAPI as any).ecosystemSetLinkedEventFolder(cleanPath);
        if (res) setEcosystemStatus(res);
      }
      await window.electronAPI.saveConfig({
        eventImagesDirPath: cleanPath,
      });
    }
    setImagesDir(cleanPath);
    setIsPathSetupOpen(false);
    onShowToast('✓ Master Event Images linked & broadcasted to Anything Ecosystem.', 'success');
  };

  const handleSyncFromAnything = async () => {
    if (!window.electronAPI || typeof (window.electronAPI as any).ecosystemSyncWithAnything !== 'function') {
      onShowToast('Ecosystem bridge is only available in Desktop mode.', 'warning');
      return;
    }
    setIsSyncingWithAnything(true);
    try {
      const res = await (window.electronAPI as any).ecosystemSyncWithAnything();
      if (res && res.path && res.exists) {
        setImagesDir(res.path);
        setSetupImagesPath(res.path);
        setEcosystemStatus(res);
        onShowToast(`✓ Successfully fetched from Anything: ${res.totalImages} badges ready!`, 'success');
      } else if (res && res.path) {
        setImagesDir(res.path);
        setSetupImagesPath(res.path);
        setEcosystemStatus(res);
        onShowToast(`Linked path found (${res.path}) but directory is not currently accessible.`, 'warning');
      } else {
        onShowToast('No active Event Images folder link found in Anything ecosystem.', 'info');
      }
    } catch (err: any) {
      onShowToast('Failed to sync with Anything ecosystem.', 'danger');
    } finally {
      setIsSyncingWithAnything(false);
    }
  };

  const handleCopyImagesPath = () => {
    if (!imagesDir) return;
    navigator.clipboard.writeText(imagesDir);
    setIsCopiedPath(true);
    setTimeout(() => setIsCopiedPath(false), 2000);
    onShowToast('✓ Path copied to clipboard', 'info');
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
      onShowToast(toUserErrorMessage(e, 'Failed to scan event folders. Please verify your workspace path.'), 'danger');
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
        unlockStatsPage();
        onShowToast(`Simulation finished! Successfully copied ${scanResult.foldersMatched.length} images. 'Safar & Date Stats' page is now unlocked!`, 'success');
      }, 600);
      return;
    }

    setIsExecuting(true);
    try {
      const summary: EventDistributorSummary = await window.electronAPI.executeEventDistribution(
        scanResult.foldersMatched
      );
      setExecutionSummary(summary);
      unlockStatsPage();
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
      onShowToast(toUserErrorMessage(e, 'Failed to distribute event placards. Please check folder write permissions.'), 'danger');
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

        {true && (
          <StudioButton
            variant="glass"
            size="sm"
            onClick={() => setIsAddToStatsOpen(true)}
            icon={<BarChart3 size={14} color="#00F2FE" />}
            style={{
              backgroundColor: 'rgba(0, 242, 254, 0.12)',
              border: '1px solid rgba(0, 242, 254, 0.3)',
              color: '#00F2FE',
              fontWeight: 700,
            }}
          >
            Safar Production Stats Ledger →
          </StudioButton>
        )}
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
        {/* Master Reference Images & Anything Ecosystem Link Bar */}
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)',
            border: imagesDir ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid rgba(245, 158, 11, 0.4)',
            boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: imagesDir ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(168, 85, 247, 0.3) 100%)' : 'rgba(245, 158, 11, 0.15)',
                  border: `1px solid ${imagesDir ? 'rgba(99, 102, 241, 0.4)' : 'rgba(245, 158, 11, 0.3)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: imagesDir ? '0 0 16px rgba(99, 102, 241, 0.25)' : 'none',
                }}
              >
                <ImageIcon size={20} color={imagesDir ? '#A5B4FC' : '#FBBF24'} />
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--secondary-label)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    Master Event Badges Directory
                  </span>

                  {/* Ecosystem Link Pill */}
                  {ecosystemStatus?.source === 'anything' && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 10,
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2) 0%, rgba(99, 102, 241, 0.25) 100%)',
                        border: '1px solid rgba(14, 165, 233, 0.4)',
                        color: '#38BDF8',
                      }}
                      title="Directly connected with Anything Master Hub Files Page"
                    >
                      <Link size={10} />
                      Linked via Anything
                    </span>
                  )}

                  {ecosystemStatus?.source === 'cli' && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 10,
                        fontWeight: 700,
                        background: 'rgba(168, 85, 247, 0.2)',
                        border: '1px solid rgba(168, 85, 247, 0.4)',
                        color: '#C084FC',
                      }}
                    >
                      <Sparkles size={10} />
                      CLI / Protocol Launch
                    </span>
                  )}

                  {imagesDir && (
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 10,
                        fontWeight: 700,
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#34D399',
                      }}
                    >
                      ✓ {ecosystemStatus?.totalImages || 'Live'} Images Ready
                    </span>
                  )}
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
                    marginTop: 3,
                  }}
                  title={imagesDir || 'Not configured'}
                >
                  {imagesDir || '⚠️ No path linked — Click "Link Folder" or fetch from Anything.'}
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {imagesDir && (
                <>
                  <button
                    onClick={handleCopyImagesPath}
                    title="Copy path to clipboard"
                    style={{
                      padding: '6px 10px',
                      borderRadius: 7,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      color: isCopiedPath ? '#34D399' : 'var(--label)',
                      fontSize: 11,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'pointer',
                    }}
                  >
                    {isCopiedPath ? <Check size={12} /> : <Copy size={12} />}
                    {isCopiedPath ? 'Copied' : 'Copy'}
                  </button>

                  <button
                    onClick={() => window.electronAPI?.openPath(imagesDir)}
                    title="Open folder in File Explorer"
                    style={{
                      padding: '6px 10px',
                      borderRadius: 7,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      color: 'var(--label)',
                      fontSize: 11,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'pointer',
                    }}
                  >
                    <ExternalLink size={12} />
                    Open
                  </button>
                </>
              )}

              {/* Sync from Anything */}
              <button
                onClick={handleSyncFromAnything}
                disabled={isSyncingWithAnything}
                title="Fetch updated event images link from Anything Hub Files page"
                style={{
                  padding: '6px 12px',
                  borderRadius: 7,
                  background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(99, 102, 241, 0.2) 100%)',
                  border: '1px solid rgba(14, 165, 233, 0.4)',
                  color: '#38BDF8',
                  fontSize: 11.5,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: isSyncingWithAnything ? 'wait' : 'pointer',
                }}
              >
                <RefreshCw size={12} className={isSyncingWithAnything ? 'spin-anim' : ''} />
                {isSyncingWithAnything ? 'Syncing...' : 'Fetch from Anything'}
              </button>

              {/* Set / Change Link */}
              <button
                onClick={() => {
                  setSetupImagesPath(imagesDir);
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
                  boxShadow: imagesDir ? 'none' : '0 2px 10px rgba(99, 102, 241, 0.3)',
                }}
              >
                {imagesDir ? '⚙ Change Link' : 'Link Folder →'}
              </button>
            </div>
          </div>

          {/* Sample Badge Chips Strip if badges detected */}
          {ecosystemStatus?.sampleBadges && ecosystemStatus.sampleBadges.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                overflowX: 'auto',
                paddingTop: 4,
                paddingBottom: 2,
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--secondary-label)', whiteSpace: 'nowrap' }}>
                Detected Badges:
              </span>
              {ecosystemStatus.sampleBadges.slice(0, 15).map((badge: any, idx: number) => (
                <span
                  key={idx}
                  title={`${badge.name} (${badge.token || 'Badge'})`}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#A5B4FC',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {badge.token || badge.name.replace(/\.[^.]+$/, '')}
                </span>
              ))}
              {ecosystemStatus.sampleBadges.length > 15 && (
                <span style={{ fontSize: 10, color: 'var(--secondary-label)', whiteSpace: 'nowrap' }}>
                  +{ecosystemStatus.sampleBadges.length - 15} more
                </span>
              )}
            </div>
          )}
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

          {/* Execution Summary Banner */}
          {executionSummary && (
            <div
              className="glass-card"
              style={{
                padding: '14px 18px',
                borderRadius: 12,
                backgroundColor: executionSummary.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: `1px solid ${executionSummary.success ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CheckCircle2 size={20} color={executionSummary.success ? '#10B981' : '#EF4444'} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--label)' }}>
                    {executionSummary.success ? 'Event Placard Distribution Complete!' : 'Distribution Completed with Warnings'}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--secondary-label)', marginTop: 2 }}>
                    Successfully placed {executionSummary.totalImagesCopied} placards across {executionSummary.totalFoldersProcessed} event folders
                    {executionSummary.skippedExisting > 0 ? ` (${executionSummary.skippedExisting} already existed)` : ''}.
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <StudioButton
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      unlockStatsPage();
                      setIsAddToStatsOpen(true);
                    }}
                    icon={<BarChart3 size={15} />}
                    style={{
                      background: 'linear-gradient(135deg, #00F2FE 0%, #3B82F6 100%)',
                      color: '#000',
                      fontWeight: 800,
                      boxShadow: '0 0 15px rgba(0, 242, 254, 0.35)',
                    }}
                  >
                    + Add to Stats
                  </StudioButton>
                {onNavigate && (
                  <StudioButton
                    variant="secondary"
                    size="sm"
                    onClick={() => onNavigate('excelMerger')}
                    style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      color: '#F59E0B',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                    }}
                  >
                    Skip to Report Merger (Stage 08) →
                  </StudioButton>
                )}
              </div>
            </div>
          )}

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
                        <div style={{ fontWeight: 600 }}>{item.matchedEventName || '—'}</div>
                        {item.expectedPlacardFile && (
                          <div style={{ fontSize: 10.5, color: '#94A3B8', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                            Placard: {item.expectedPlacardFile}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--secondary-label)', fontFamily: 'var(--font-mono)' }}>
                        {item.seq || '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {item.matchedImages.length === 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ color: 'var(--system-orange)', fontSize: 11, fontWeight: 600 }}>
                              ⚠️ Missing in Reference Folder
                            </span>
                            {item.expectedPlacardFile && (
                              <span style={{ color: 'var(--secondary-label)', fontSize: 10.5, fontFamily: 'var(--font-mono)' }}>
                                Expected: {item.expectedPlacardFile}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {item.matchedImages.map((img, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <ImageIcon size={13} color="var(--system-cyan)" />
                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{img.fileName}</span>
                                {img.alreadyExists ? (
                                  <span style={{ fontSize: 10, color: 'var(--system-green)', fontWeight: 600 }}>
                                    ✓ Already present
                                  </span>
                                ) : (
                                  <span style={{ fontSize: 10, color: '#818CF8', fontWeight: 600 }}>
                                    ➔ Will copy
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
      {/* Master Reference Badges Path Setup Modal */}
      {isPathSetupOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(5, 8, 14, 0.75)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
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
              width: 540,
              maxWidth: '92vw',
              background: 'var(--surface-base, #131722)',
              border: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
              borderRadius: 16,
              boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.6), 0 0 24px rgba(99, 102, 241, 0.15)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ImageIcon size={18} color="#6366F1" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--label)' }}>
                    Master Reference Badges Folder
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: 11.5, color: 'var(--label-secondary)' }}>
                    Permanent path for event instructions and placards
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPathSetupOpen(false)}
                className="btn-tactile"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--label-secondary)',
                  cursor: 'pointer',
                  padding: 6,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <StudioFolderInput
                label="Master Badges Directory"
                value={setupImagesPath}
                onChange={setSetupImagesPath}
                onBrowse={handleBrowseSetupImages}
                placeholder="e.g. C:\Users\Burhanuddin\Downloads\Warning and iltemas"
                description="Directory containing instruction placards (__01 Ziyafat..., __03 Qadam..., etc.)"
              />

              {/* Bidirectional Sync Banner */}
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  backgroundColor: 'rgba(14, 165, 233, 0.08)',
                  border: '1px solid rgba(14, 165, 233, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Link size={16} color="#38BDF8" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, color: 'var(--label-secondary)', lineHeight: 1.4 }}>
                  <strong style={{ color: '#38BDF8' }}>Both-Way Ecosystem Sync:</strong> Saving here updates MediaFlow Studio and broadcasts directly to Anything Hub (Files Page). Anything can also link or launch this folder remotely.
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setSetupImagesPath('D:\\APP_DATA\\EVENT_BADGES')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: 'var(--label)',
                    cursor: 'pointer',
                  }}
                >
                  ⚡ Preset: D:\APP_DATA\EVENT_BADGES
                </button>
                {ecosystemStatus?.path && ecosystemStatus.path !== setupImagesPath && (
                  <button
                    type="button"
                    onClick={() => setSetupImagesPath(ecosystemStatus.path)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      background: 'rgba(99, 102, 241, 0.15)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      color: '#A5B4FC',
                      cursor: 'pointer',
                    }}
                  >
                    🔗 Use Anything Linked Path
                  </button>
                )}
              </div>

              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  backgroundColor: 'rgba(16, 231, 157, 0.08)',
                  border: '1px solid rgba(16, 231, 157, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <CheckCircle2 size={16} color="#10E79D" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, color: 'var(--label-secondary)', lineHeight: 1.4 }}>
                  Built-in 34-code event dictionary is pre-configured. Placards match folders with exact whole-token precision.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
              }}
            >
              <StudioButton variant="secondary" size="sm" onClick={() => setIsPathSetupOpen(false)}>
                Cancel
              </StudioButton>
              <StudioButton
                variant="primary"
                size="sm"
                onClick={handleSaveFixedPath}
                disabled={!setupImagesPath.trim()}
              >
                Save Path
              </StudioButton>
            </div>
          </div>
        </div>
      )}

      {/* Production Stats Integration Modals */}
      <AddToStatsModal
        isOpen={isAddToStatsOpen}
        onClose={() => setIsAddToStatsOpen(false)}
        onShowToast={onShowToast}
        initialPath={targetDir || uploadStructure.mainDataPath || ''}
        onOpenStatsManager={() => setIsStatsLedgerOpen(true)}
      />

      <SafarStatsModal
        isOpen={isStatsLedgerOpen}
        onClose={() => setIsStatsLedgerOpen(false)}
        onShowToast={onShowToast}
        onOpenAddModal={() => setIsAddToStatsOpen(true)}
      />

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
