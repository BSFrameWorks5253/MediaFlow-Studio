import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart3,
  Calendar,
  FolderTree,
  Folder,
  HardDrive,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Download,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { StudioButton } from '../components/StudioButton';
import { StudioFolderInput } from '../components/StudioFolderInput';
import { PageKey } from '../types/pipelineStages';
import { usePipeline } from '../context/PipelineContext';
import {
  SafarStatRecord,
  DateStatItem,
} from '../../electron/managers/statsManager';
import { toUserErrorMessage } from '../utils/errorSanitizer';

interface SafarStatsPageProps {
  onNavigate?: (page: PageKey) => void;
  onShowToast: (text: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
}

export const SafarStatsPage: React.FC<SafarStatsPageProps> = ({ onNavigate, onShowToast }) => {
  const { uploadStructure } = usePipeline();

  // Mode selection: 'date' | 'safar'
  const [scopeMode, setScopeMode] = useState<'date' | 'safar'>('date');

  // Date Mode State
  const [dateFolderPath, setDateFolderPath] = useState('');
  const [safarSelectType, setSafarSelectType] = useState<'existing' | 'new'>('new');
  const [customSafarName, setCustomSafarName] = useState(uploadStructure.safarName || '');
  const [customSafarRoot, setCustomSafarRoot] = useState(uploadStructure.safarRoot || '');
  const [customRemainingPath, setCustomRemainingPath] = useState(uploadStructure.remainingPath || '');
  const [customThumbnailsPath, setCustomThumbnailsPath] = useState(uploadStructure.thumbnailsPath || '');
  const [isScanningDate, setIsScanningDate] = useState(false);
  const [scannedDateResult, setScannedDateResult] = useState<{
    dateStat: DateStatItem;
    detectedSafarName: string;
    detectedSafarRoot: string;
    detectedRemainingPath: string;
    detectedThumbnailsPath: string;
  } | null>(null);

  // Safar Mode State
  const [safarFolderPath, setSafarFolderPath] = useState(uploadStructure.safarRoot || '');
  const [isScanningSafar, setIsScanningSafar] = useState(false);
  const [scannedSafarRecord, setScannedSafarRecord] = useState<SafarStatRecord | null>(null);

  // Mac Spotlight State (for selecting existing Safar)
  const [spotlightQuery, setSpotlightQuery] = useState('');
  const [recentSafars, setRecentSafars] = useState<SafarStatRecord[]>([]);
  const [filteredSafars, setFilteredSafars] = useState<SafarStatRecord[]>([]);
  const [selectedSpotlightIndex, setSelectedSpotlightIndex] = useState(0);
  const [selectedExistingSafar, setSelectedExistingSafar] = useState<SafarStatRecord | null>(null);
  const spotlightInputRef = useRef<HTMLInputElement>(null);

  // Ledger Table State
  const [records, setRecords] = useState<SafarStatRecord[]>([]);
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');
  const [expandedSafarIds, setExpandedSafarIds] = useState<Set<string>>(new Set());
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initial Load
  useEffect(() => {
    loadLedger();
    loadRecents();

    // If mainDataPath or target directory is set in pipelineContext, try auto-scanning
    if (uploadStructure.mainDataPath) {
      setDateFolderPath(uploadStructure.mainDataPath);
    }
  }, []);

  // Auto-scan Date when dateFolderPath changes
  useEffect(() => {
    if (scopeMode === 'date' && dateFolderPath.trim()) {
      handleAutoScanDate(dateFolderPath.trim());
    }
  }, [dateFolderPath, scopeMode]);

  const loadRecents = async () => {
    if (window.electronAPI && typeof window.electronAPI.statsGetRecents === 'function') {
      try {
        const recents: SafarStatRecord[] = await window.electronAPI.statsGetRecents(8);
        setRecentSafars(recents || []);
        setFilteredSafars(recents || []);
      } catch (err) {
        console.error('Failed to load recent safars:', err);
      }
    }
  };

  const loadLedger = async () => {
    setIsLoadingLedger(true);
    try {
      if (window.electronAPI && typeof window.electronAPI.statsGetAll === 'function') {
        const stats = await window.electronAPI.statsGetAll();
        setRecords(stats || []);
        if (stats && stats.length > 0) {
          setExpandedSafarIds(new Set([stats[0].id]));
        }
      } else {
        // Dev fallback
        const mock: SafarStatRecord[] = [
          {
            id: '1448-10-istefada_ilmiyah',
            safarName: '1448-10-Istefada ilmiyah',
            safarRootPath: 'D:\\To Delete\\1448-10-Istefada ilmiyah',
            pvFolderPath: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\1448-10-Istefada ilmiyah_P-V',
            remainingFolderPath: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\Remaining',
            thumbnailsFolderPath: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\Thumbnails',
            dates: [
              {
                id: '1448-04-05 _02E',
                dateName: '1448-04-05 _02E',
                mainDataPath: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\1448-10-Istefada ilmiyah_P-V\\1448-04-05 _02E',
                remainingPath: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\Remaining\\1448-04-05 _02E',
                thumbnailsPath: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\Thumbnails\\1448-04-05 _02E',
                mainDataMetrics: {
                  path: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\1448-10-Istefada ilmiyah_P-V\\1448-04-05 _02E',
                  exists: true,
                  fileCount: 420,
                  totalBytes: 15200000000,
                  sizeStr: '14.16 GB',
                  photoCount: 380,
                  videoCount: 40,
                  otherCount: 0,
                  subfolderCount: 14,
                },
                remainingMetrics: {
                  path: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\Remaining\\1448-04-05 _02E',
                  exists: true,
                  fileCount: 95,
                  totalBytes: 1200000000,
                  sizeStr: '1.12 GB',
                  photoCount: 95,
                  videoCount: 0,
                  otherCount: 0,
                  subfolderCount: 1,
                },
                thumbnailsMetrics: {
                  path: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\Thumbnails\\1448-04-05 _02E',
                  exists: true,
                  fileCount: 420,
                  totalBytes: 62000000,
                  sizeStr: '59.1 MB',
                  photoCount: 420,
                  videoCount: 0,
                  otherCount: 0,
                  subfolderCount: 0,
                },
                eventFoldersCount: 14,
                totalFiles: 935,
                totalBytes: 16462000000,
                sizeStr: '15.33 GB',
                addedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            totalDates: 1,
            totalMainFiles: 420,
            totalRemainingFiles: 95,
            totalThumbnailsFiles: 420,
            totalFiles: 935,
            totalBytes: 16462000000,
            sizeStr: '15.33 GB',
            createdAt: new Date().toISOString(),
            lastModifiedAt: new Date().toISOString(),
          },
        ];
        setRecords(mock);
        setRecentSafars(mock);
        setFilteredSafars(mock);
        setExpandedSafarIds(new Set([mock[0].id]));
      }
    } catch (e: any) {
      onShowToast(toUserErrorMessage(e, 'Failed to load stats ledger.'), 'danger');
    } finally {
      setIsLoadingLedger(false);
    }
  };

  // Spotlight search filter
  useEffect(() => {
    if (!spotlightQuery.trim()) {
      setFilteredSafars(recentSafars);
      setSelectedSpotlightIndex(0);
      return;
    }
    const q = spotlightQuery.toLowerCase();
    const matches = recentSafars.filter(
      (s) =>
        s.safarName.toLowerCase().includes(q) ||
        s.safarRootPath.toLowerCase().includes(q) ||
        s.dates.some((d) => d.dateName.toLowerCase().includes(q))
    );
    setFilteredSafars(matches);
    setSelectedSpotlightIndex(0);
  }, [spotlightQuery, recentSafars]);

  const handleSpotlightKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSpotlightIndex((prev) => (prev + 1) % Math.max(1, filteredSafars.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSpotlightIndex((prev) => (prev - 1 + filteredSafars.length) % Math.max(1, filteredSafars.length));
    } else if (e.key === 'Enter' && filteredSafars[selectedSpotlightIndex]) {
      e.preventDefault();
      selectSpotlightSafar(filteredSafars[selectedSpotlightIndex]);
    }
  };

  const selectSpotlightSafar = (safar: SafarStatRecord) => {
    setSelectedExistingSafar(safar);
    setCustomSafarName(safar.safarName);
    setCustomSafarRoot(safar.safarRootPath);
    onShowToast(`Linked date to existing Safar "${safar.safarName}"`, 'info');
  };

  // Browsing Handlers
  const handleBrowseDateFolder = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory('Select Date Folder (Main Data / _P-V)', dateFolderPath);
    if (dir) setDateFolderPath(dir);
  };

  const handleBrowseSafarFolder = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory('Select Safar Master Root Directory', safarFolderPath);
    if (dir) {
      setSafarFolderPath(dir);
      handleScanSafar(dir);
    }
  };

  const handleBrowseRemainingFolder = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory('Select Companion Remaining Folder', customRemainingPath);
    if (dir) {
      setCustomRemainingPath(dir);
      if (dateFolderPath) {
        handleAutoScanDate(dateFolderPath, customSafarName, dir, customThumbnailsPath);
      }
    }
  };

  const handleBrowseThumbnailsFolder = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory('Select Companion Thumbnails Folder', customThumbnailsPath);
    if (dir) {
      setCustomThumbnailsPath(dir);
      if (dateFolderPath) {
        handleAutoScanDate(dateFolderPath, customSafarName, customRemainingPath, dir);
      }
    }
  };

  // Auto-scan Date
  const handleAutoScanDate = async (
    pathVal: string,
    safarNameVal?: string,
    remVal?: string,
    thumbVal?: string
  ) => {
    if (!pathVal.trim()) return;

    if (!window.electronAPI || typeof window.electronAPI.statsScanDate !== 'function') {
      const baseName = pathVal.split(/[\\/]/).pop() || '1448-04-05 _02E';
      const mockResult = {
        dateStat: {
          id: `${baseName}-demo`,
          dateName: baseName,
          mainDataPath: pathVal,
          remainingPath: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\Remaining\\1448-04-05 _02E',
          thumbnailsPath: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\Thumbnails\\1448-04-05 _02E',
          mainDataMetrics: {
            path: pathVal,
            exists: true,
            fileCount: 420,
            totalBytes: 15200000000,
            sizeStr: '14.16 GB',
            photoCount: 380,
            videoCount: 40,
            otherCount: 0,
            subfolderCount: 14,
          },
          remainingMetrics: {
            path: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\Remaining\\1448-04-05 _02E',
            exists: true,
            fileCount: 95,
            totalBytes: 1200000000,
            sizeStr: '1.12 GB',
            photoCount: 95,
            videoCount: 0,
            otherCount: 0,
            subfolderCount: 1,
          },
          thumbnailsMetrics: {
            path: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\Thumbnails\\1448-04-05 _02E',
            exists: true,
            fileCount: 420,
            totalBytes: 62000000,
            sizeStr: '59.1 MB',
            photoCount: 420,
            videoCount: 0,
            otherCount: 0,
            subfolderCount: 0,
          },
          eventFoldersCount: 14,
          totalFiles: 935,
          totalBytes: 16462000000,
          sizeStr: '15.33 GB',
          addedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        detectedSafarName: '1448-10-Istefada ilmiyah',
        detectedSafarRoot: 'D:\\To Delete\\1448-10-Istefada ilmiyah',
        detectedRemainingPath: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\Remaining\\1448-04-05 _02E',
        detectedThumbnailsPath: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\Thumbnails\\1448-04-05 _02E',
      };
      setScannedDateResult(mockResult);
      if (!customSafarName) setCustomSafarName(mockResult.detectedSafarName);
      if (!customSafarRoot) setCustomSafarRoot(mockResult.detectedSafarRoot);
      if (!customRemainingPath) setCustomRemainingPath(mockResult.detectedRemainingPath);
      if (!customThumbnailsPath) setCustomThumbnailsPath(mockResult.detectedThumbnailsPath);
      return;
    }

    setIsScanningDate(true);
    try {
      const res = await window.electronAPI.statsScanDate(
        pathVal,
        safarNameVal || customSafarName || undefined,
        remVal || customRemainingPath || undefined,
        thumbVal || customThumbnailsPath || undefined
      );

      setScannedDateResult(res);
      if (!customSafarName && res.detectedSafarName) {
        setCustomSafarName(res.detectedSafarName);
      }
      if (!customSafarRoot && res.detectedSafarRoot) {
        setCustomSafarRoot(res.detectedSafarRoot);
      }
      if (!customRemainingPath && res.detectedRemainingPath) {
        setCustomRemainingPath(res.detectedRemainingPath);
      }
      if (!customThumbnailsPath && res.detectedThumbnailsPath) {
        setCustomThumbnailsPath(res.detectedThumbnailsPath);
      }
    } catch (e: any) {
      onShowToast(toUserErrorMessage(e, 'Failed to scan Date folder metrics.'), 'danger');
    } finally {
      setIsScanningDate(false);
    }
  };

  // Scan Safar Folder
  const handleScanSafar = async (pathVal: string) => {
    if (!pathVal.trim()) return;

    if (!window.electronAPI || typeof window.electronAPI.statsScanSafar !== 'function') {
      const baseName = pathVal.split(/[\\/]/).pop() || '1448-10-Istefada ilmiyah';
      const mockRec: SafarStatRecord = {
        id: baseName.toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
        safarName: baseName,
        safarRootPath: pathVal,
        pvFolderPath: `${pathVal}\\${baseName}_P-V`,
        remainingFolderPath: `${pathVal}\\Remaining`,
        thumbnailsFolderPath: `${pathVal}\\Thumbnails`,
        dates: [],
        totalDates: 1,
        totalMainFiles: 420,
        totalRemainingFiles: 95,
        totalThumbnailsFiles: 420,
        totalFiles: 935,
        totalBytes: 16462000000,
        sizeStr: '15.33 GB',
        createdAt: new Date().toISOString(),
        lastModifiedAt: new Date().toISOString(),
      };
      setScannedSafarRecord(mockRec);
      return;
    }

    setIsScanningSafar(true);
    try {
      const rec = await window.electronAPI.statsScanSafar(pathVal);
      setScannedSafarRecord(rec);
      onShowToast(`Discovered ${rec.totalDates} date folders in Safar "${rec.safarName}"!`, 'success');
    } catch (e: any) {
      onShowToast(toUserErrorMessage(e, 'Failed to scan Safar folder tree.'), 'danger');
    } finally {
      setIsScanningSafar(false);
    }
  };

  // Save Handlers
  const handleSaveToStats = async () => {
    setIsSaving(true);
    try {
      if (scopeMode === 'date') {
        if (!scannedDateResult) {
          onShowToast('Please scan a valid Date folder first.', 'warning');
          setIsSaving(false);
          return;
        }

        const targetSafarName =
          safarSelectType === 'existing'
            ? selectedExistingSafar?.safarName || customSafarName
            : customSafarName.trim() || scannedDateResult.detectedSafarName;

        if (!targetSafarName) {
          onShowToast('Please specify a Safar name.', 'warning');
          setIsSaving(false);
          return;
        }

        const targetSafarRoot =
          customSafarRoot.trim() ||
          selectedExistingSafar?.safarRootPath ||
          scannedDateResult.detectedSafarRoot;

        if (window.electronAPI && typeof window.electronAPI.statsSaveDate === 'function') {
          await window.electronAPI.statsSaveDate(
            targetSafarName,
            targetSafarRoot,
            scannedDateResult.dateStat
          );
        }

        onShowToast(
          `✓ Date "${scannedDateResult.dateStat.dateName}" added to Safar "${targetSafarName}" stats!`,
          'success'
        );
      } else {
        if (!scannedSafarRecord) {
          onShowToast('Please scan a valid Safar folder first.', 'warning');
          setIsSaving(false);
          return;
        }

        if (window.electronAPI && typeof window.electronAPI.statsSaveSafar === 'function') {
          await window.electronAPI.statsSaveSafar(scannedSafarRecord);
        }

        onShowToast(
          `✓ Safar "${scannedSafarRecord.safarName}" with ${scannedSafarRecord.totalDates} dates saved to stats!`,
          'success'
        );
      }

      await loadLedger();
      await loadRecents();
    } catch (e: any) {
      onShowToast(toUserErrorMessage(e, 'Failed to save stats record.'), 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenPath = async (targetPath: string) => {
    if (!targetPath || !window.electronAPI) return;
    await window.electronAPI.openPath(targetPath);
  };

  const handleDeleteDate = async (safarId: string, dateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to remove this date from stats?')) return;

    if (window.electronAPI && typeof window.electronAPI.statsDeleteDate === 'function') {
      await window.electronAPI.statsDeleteDate(safarId, dateId);
      loadLedger();
      onShowToast('Date entry removed from stats ledger.', 'info');
    }
  };

  const handleDeleteSafar = async (safarId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to remove this entire Safar from stats?')) return;

    if (window.electronAPI && typeof window.electronAPI.statsDeleteSafar === 'function') {
      await window.electronAPI.statsDeleteSafar(safarId);
      loadLedger();
      onShowToast('Safar record removed from stats ledger.', 'info');
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    if (!window.electronAPI || typeof window.electronAPI.statsExport !== 'function') {
      onShowToast(`Exporting stats as ${format.toUpperCase()} (Preview mode)`, 'info');
      return;
    }
    try {
      const content = await window.electronAPI.statsExport(format);
      const savePath = await window.electronAPI.selectSaveFile(`Export Safar Stats as ${format.toUpperCase()}`, [
        { name: format.toUpperCase(), extensions: [format] },
      ]);
      if (savePath) {
        onShowToast(`Stats successfully exported to ${savePath}!`, 'success');
      }
    } catch (e: any) {
      onShowToast(toUserErrorMessage(e, 'Failed to export stats.'), 'danger');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedSafarIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredRecords = records.filter((r) => {
    if (!ledgerSearchQuery.trim()) return true;
    const q = ledgerSearchQuery.toLowerCase();
    return (
      r.safarName.toLowerCase().includes(q) ||
      r.safarRootPath.toLowerCase().includes(q) ||
      r.dates.some((d) => d.dateName.toLowerCase().includes(q))
    );
  });

  const totalSafarsCount = records.length;
  const totalDatesCount = records.reduce((acc, r) => acc + r.totalDates, 0);
  const totalFilesAll = records.reduce((acc, r) => acc + r.totalFiles, 0);
  const totalBytesAll = records.reduce((acc, r) => acc + r.totalBytes, 0);

  const formatGb = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024 * 1024)).toFixed(2)} TB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        height: '100%',
        overflowY: 'auto',
        paddingRight: 6,
      }}
    >
      {/* Top Banner (Unlocked via Stage 07) */}
      <div
        className="glass-card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderLeft: '4px solid #00F2FE',
          background: 'linear-gradient(90deg, rgba(0, 242, 254, 0.08) 0%, rgba(139, 92, 246, 0.05) 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              backgroundColor: 'rgba(0, 242, 254, 0.15)',
              border: '1px solid rgba(0, 242, 254, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00F2FE',
            }}
          >
            <BarChart3 size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--label)', letterSpacing: 0.3 }}>
                Safar &amp; Shoot Date Stats Manager
              </span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 800,
                  color: '#00F2FE',
                  backgroundColor: 'rgba(0, 242, 254, 0.12)',
                  border: '1px solid rgba(0, 242, 254, 0.35)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                UNLOCKED STEP (STAGE 07.5)
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--secondary-label)', marginTop: 2 }}>
              Catalog shoot folders, auto-detect external companion Remaining &amp; Thumbnails, and record master volume metrics before Report Merger.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {onNavigate && (
            <StudioButton
              variant="glass"
              size="sm"
              icon={<ArrowLeft size={13} />}
              onClick={() => onNavigate('eventDistributor')}
            >
              Stage 07
            </StudioButton>
          )}
          {onNavigate && (
            <StudioButton
              variant="primary"
              size="sm"
              icon={<ArrowRight size={13} />}
              onClick={() => onNavigate('excelMerger')}
              style={{ backgroundColor: '#F59E0B' }}
            >
              Proceed to Report Merger (Stage 08) →
            </StudioButton>
          )}
        </div>
      </div>

      {/* 4 Mission Critical Stat Counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <div className="glass-card" style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--secondary-label)', textTransform: 'uppercase' }}>Recorded Safars</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#00F2FE', marginTop: 2 }}>{totalSafarsCount}</div>
        </div>
        <div className="glass-card" style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--secondary-label)', textTransform: 'uppercase' }}>Shoot Dates</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#8B5CF6', marginTop: 2 }}>{totalDatesCount}</div>
        </div>
        <div className="glass-card" style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--secondary-label)', textTransform: 'uppercase' }}>Total Processed Assets</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--label)', marginTop: 2 }}>{totalFilesAll.toLocaleString()}</div>
        </div>
        <div className="glass-card" style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--secondary-label)', textTransform: 'uppercase' }}>Cumulative Disk Volume</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--system-green)', marginTop: 2 }}>{formatGb(totalBytesAll)}</div>
        </div>
      </div>

      {/* ── INTERACTIVE WORKSPACE CARD ── */}
      <div
        className="glass-card"
        style={{
          padding: '20px',
          borderRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--label)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Catalog Folders to Stats</span>
              <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>• Choose folder scope</span>
            </div>
          </div>

          {/* Scope Selector: Date Folder vs Safar Folder */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
              borderRadius: 10,
              padding: 3,
              border: '1px solid var(--border)',
            }}
          >
            <button
              type="button"
              onClick={() => setScopeMode('date')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: scopeMode === 'date' ? '#00F2FE' : 'transparent',
                color: scopeMode === 'date' ? '#000' : 'var(--secondary-label)',
                transition: 'all 0.15s',
              }}
            >
              <Calendar size={14} />
              <span>Date Folder</span>
            </button>
            <button
              type="button"
              onClick={() => setScopeMode('safar')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: scopeMode === 'safar' ? '#8B5CF6' : 'transparent',
                color: scopeMode === 'safar' ? '#fff' : 'var(--secondary-label)',
                transition: 'all 0.15s',
              }}
            >
              <FolderTree size={14} />
              <span>Safar Folder</span>
            </button>
          </div>
        </div>

        {/* ─────────────── DATE FOLDER MODE ─────────────── */}
        {scopeMode === 'date' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* 1. Date Folder Selector */}
            <StudioFolderInput
              label="1. Target Date Folder Path (Main Data / _P-V):"
              description="Folder inside _P-V, e.g. D:\To Delete\1448-10-Istefada ilmiyah\1448-10-Istefada ilmiyah_P-V\1448-04-05 _02E"
              value={dateFolderPath}
              onChange={(val) => setDateFolderPath(val)}
              onBrowse={handleBrowseDateFolder}
              placeholder="e.g. D:\To Delete\1448-10-Istefada ilmiyah\1448-10-Istefada ilmiyah_P-V\1448-04-05 _02E"
              accentColor="#00F2FE"
            />

            {/* 2. Name the Safar (Select Safar: Existing vs New) */}
            <div
              className="glass-card"
              style={{
                padding: '16px',
                borderRadius: 12,
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--label)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Folder size={15} color="#00F2FE" />
                  <span>2. Assign Safar Project:</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: 8,
                    padding: 2,
                    border: '1px solid var(--border)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSafarSelectType('existing')}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: safarSelectType === 'existing' ? '#00F2FE' : 'transparent',
                      color: safarSelectType === 'existing' ? '#000' : 'var(--secondary-label)',
                    }}
                  >
                    Existing Safar (Mac Spotlight)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSafarSelectType('new')}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: safarSelectType === 'new' ? '#00F2FE' : 'transparent',
                      color: safarSelectType === 'new' ? '#000' : 'var(--secondary-label)',
                    }}
                  >
                    Create New Safar
                  </button>
                </div>
              </div>

              {/* Sub-view: EXISTING SAFAR WITH MAC SPOTLIGHT */}
              {safarSelectType === 'existing' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 16px',
                      borderRadius: 12,
                      backgroundColor: 'rgba(10, 14, 23, 0.95)',
                      border: '1.5px solid rgba(0, 242, 254, 0.45)',
                      boxShadow: '0 4px 20px rgba(0, 242, 254, 0.15)',
                    }}
                  >
                    <Search size={18} color="#00F2FE" />
                    <input
                      ref={spotlightInputRef}
                      type="text"
                      placeholder="Search existing Safar (Mac Spotlight — type to find)..."
                      value={spotlightQuery}
                      onChange={(e) => setSpotlightQuery(e.target.value)}
                      onKeyDown={handleSpotlightKeyDown}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'var(--label)',
                        fontSize: 13.5,
                        fontWeight: 600,
                      }}
                    />
                    {spotlightQuery && (
                      <button
                        onClick={() => setSpotlightQuery('')}
                        style={{ background: 'transparent', border: 'none', color: 'var(--secondary-label)', cursor: 'pointer' }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Spotlight Results List */}
                  <div
                    style={{
                      maxHeight: 180,
                      overflowY: 'auto',
                      borderRadius: 10,
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      padding: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--tertiary-label)',
                        letterSpacing: 0.8,
                        padding: '4px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Clock size={11} />
                      <span>{spotlightQuery ? 'SEARCH RESULTS:' : 'RECENT SAFARS:'}</span>
                    </div>

                    {filteredSafars.length === 0 ? (
                      <div style={{ padding: '12px', textAlign: 'center', fontSize: 12, color: 'var(--secondary-label)' }}>
                        No existing Safars found matching your query. Switch to "Create New Safar" to name this Safar.
                      </div>
                    ) : (
                      filteredSafars.map((safar, idx) => {
                        const isSelected =
                          selectedExistingSafar?.id === safar.id ||
                          (!selectedExistingSafar && idx === selectedSpotlightIndex);

                        return (
                          <button
                            key={safar.id}
                            type="button"
                            onClick={() => selectSpotlightSafar(safar)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              borderRadius: 8,
                              border: isSelected ? '1px solid rgba(0, 242, 254, 0.5)' : '1px solid transparent',
                              backgroundColor: isSelected ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'all 0.12s',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <Folder size={15} color={isSelected ? '#00F2FE' : 'var(--secondary-label)'} />
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--label)' }}>
                                  {safar.safarName}
                                </div>
                                <div
                                  style={{
                                    fontSize: 10.5,
                                    color: 'var(--secondary-label)',
                                    fontFamily: 'var(--font-mono)',
                                    maxWidth: 420,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {safar.safarRootPath}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  fontFamily: 'var(--font-mono)',
                                  color: 'var(--system-cyan)',
                                  backgroundColor: 'rgba(0, 242, 254, 0.1)',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                }}
                              >
                                {safar.totalDates} dates
                              </span>
                              <span style={{ fontSize: 10.5, color: 'var(--secondary-label)', fontFamily: 'var(--font-mono)' }}>
                                {safar.sizeStr}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                /* Sub-view: CREATE NEW SAFAR */
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--secondary-label)', display: 'block', marginBottom: 4 }}>
                      Safar Name:
                    </label>
                    <input
                      type="text"
                      value={customSafarName}
                      onChange={(e) => setCustomSafarName(e.target.value)}
                      placeholder="e.g. 1448-10-Istefada ilmiyah"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        backgroundColor: 'rgba(0, 0, 0, 0.25)',
                        color: 'var(--label)',
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--secondary-label)', display: 'block', marginBottom: 4 }}>
                      Safar Root Folder (outside _P-V):
                    </label>
                    <input
                      type="text"
                      value={customSafarRoot}
                      onChange={(e) => setCustomSafarRoot(e.target.value)}
                      placeholder="e.g. D:\To Delete\1448-10-Istefada ilmiyah"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        backgroundColor: 'rgba(0, 0, 0, 0.25)',
                        color: 'var(--label)',
                        fontSize: 12,
                        fontFamily: 'var(--font-mono)',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Companion Trees Auto-Discovered Outside _P-V */}
            <div
              className="glass-card"
              style={{
                padding: '16px',
                borderRadius: 12,
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--label)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <HardDrive size={15} color="var(--system-green)" />
                <span>3. Auto-Discovered Outside Companion Folders (Outside _P-V):</span>
              </div>

              {/* Remaining */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--secondary-label)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>Remaining Folder:</span>
                    {scannedDateResult?.remainingMetrics.exists && (
                      <span style={{ color: 'var(--system-green)', fontSize: 10, fontWeight: 700 }}>
                        ✓ AUTO-DETECTED OUTSIDE _P-V
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: scannedDateResult?.remainingMetrics.exists ? 'var(--label)' : 'var(--tertiary-label)',
                      fontFamily: 'var(--font-mono)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={customRemainingPath}
                  >
                    {customRemainingPath || 'Not found automatically (Click Browse to customize)'}
                  </div>
                </div>
                <StudioButton size="sm" variant="glass" onClick={handleBrowseRemainingFolder}>
                  Browse
                </StudioButton>
              </div>

              {/* Thumbnails */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--secondary-label)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>Thumbnails Folder:</span>
                    {scannedDateResult?.thumbnailsMetrics.exists && (
                      <span style={{ color: 'var(--system-green)', fontSize: 10, fontWeight: 700 }}>
                        ✓ AUTO-DETECTED OUTSIDE _P-V
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: scannedDateResult?.thumbnailsMetrics.exists ? 'var(--label)' : 'var(--tertiary-label)',
                      fontFamily: 'var(--font-mono)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={customThumbnailsPath}
                  >
                    {customThumbnailsPath || 'Not found automatically (Click Browse to customize)'}
                  </div>
                </div>
                <StudioButton size="sm" variant="glass" onClick={handleBrowseThumbnailsFolder}>
                  Browse
                </StudioButton>
              </div>
            </div>

            {/* 4. Live Metrics Breakdown for this Date */}
            {scannedDateResult && (
              <div
                className="glass-card"
                style={{
                  padding: '16px',
                  borderRadius: 12,
                  border: '1px solid rgba(0, 242, 254, 0.35)',
                  backgroundColor: 'rgba(0, 242, 254, 0.05)',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800, color: '#00F2FE', marginBottom: 12, letterSpacing: 0.5 }}>
                  CALCULATED STATS BREAKDOWN FOR: {scannedDateResult.dateStat.dateName}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)', padding: '10px 12px', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--secondary-label)' }}>Main Shoot Files</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--label)' }}>
                      {scannedDateResult.dateStat.mainDataMetrics.fileCount}
                    </div>
                    <div style={{ fontSize: 10.5, color: '#00F2FE', marginTop: 2 }}>
                      {scannedDateResult.dateStat.mainDataMetrics.photoCount} Photos • {scannedDateResult.dateStat.mainDataMetrics.videoCount} Videos
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)', padding: '10px 12px', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--secondary-label)' }}>Remaining Assets</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--label)' }}>
                      {scannedDateResult.dateStat.remainingMetrics.fileCount}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--secondary-label)', marginTop: 2 }}>
                      {scannedDateResult.dateStat.remainingMetrics.sizeStr}
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)', padding: '10px 12px', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--secondary-label)' }}>Thumbnails</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--label)' }}>
                      {scannedDateResult.dateStat.thumbnailsMetrics.fileCount}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--secondary-label)', marginTop: 2 }}>
                      {scannedDateResult.dateStat.thumbnailsMetrics.sizeStr}
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)', padding: '10px 12px', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--secondary-label)' }}>Combined Volume</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--system-green)' }}>
                      {scannedDateResult.dateStat.sizeStr}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--secondary-label)', marginTop: 2 }}>
                      {scannedDateResult.dateStat.totalFiles} total files
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                  <StudioButton
                    variant="primary"
                    size="md"
                    onClick={handleSaveToStats}
                    disabled={isSaving}
                    style={{
                      backgroundColor: '#00F2FE',
                      color: '#000',
                      fontWeight: 800,
                    }}
                  >
                    {isSaving ? 'Recording Date...' : '✓ Add Date to Safar Stats'}
                  </StudioButton>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─────────────── SAFAR FOLDER MODE ─────────────── */}
        {scopeMode === 'safar' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <StudioFolderInput
              label="1. Safar Master Root Directory:"
              description="Folder structure, e.g. D:\To Delete\1448-10-Istefada ilmiyah"
              value={safarFolderPath}
              onChange={(val) => {
                setSafarFolderPath(val);
                handleScanSafar(val);
              }}
              onBrowse={handleBrowseSafarFolder}
              placeholder="e.g. D:\To Delete\1448-10-Istefada ilmiyah"
              accentColor="#8B5CF6"
            />

            {isScanningSafar && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#8B5CF6', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <RefreshCw size={16} className="spin" />
                <span>Scanning full Safar tree, date subfolders in _P-V, remaining and thumbnails...</span>
              </div>
            )}

            {scannedSafarRecord && !isScanningSafar && (
              <div
                className="glass-card"
                style={{
                  padding: '16px',
                  borderRadius: 12,
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  backgroundColor: 'rgba(139, 92, 246, 0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--label)' }}>
                      Safar: {scannedSafarRecord.safarName}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--secondary-label)', marginTop: 2 }}>
                      Identified {scannedSafarRecord.totalDates} Date folders inside <code>{scannedSafarRecord.pvFolderPath || 'Main Data'}</code>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--system-green)' }}>
                      {scannedSafarRecord.sizeStr}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
                      {scannedSafarRecord.totalFiles.toLocaleString()} files total
                    </div>
                  </div>
                </div>

                {/* Dates list preview */}
                <div
                  style={{
                    maxHeight: 200,
                    overflowY: 'auto',
                    borderRadius: 10,
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'rgba(0, 0, 0, 0.35)',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  {scannedSafarRecord.dates.map((d) => (
                    <div
                      key={d.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 8,
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Calendar size={14} color="#8B5CF6" />
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--label)' }}>{d.dateName}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--secondary-label)', display: 'flex', gap: 12 }}>
                        <span>{d.mainDataMetrics.fileCount} Master</span>
                        <span>{d.remainingMetrics.fileCount} Rem</span>
                        <span>{d.thumbnailsMetrics.fileCount} Thumbs</span>
                        <span style={{ color: 'var(--system-green)', fontWeight: 800 }}>{d.sizeStr}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <StudioButton
                    variant="primary"
                    size="md"
                    onClick={handleSaveToStats}
                    disabled={isSaving}
                    style={{ backgroundColor: '#8B5CF6', color: '#fff', fontWeight: 800 }}
                  >
                    {isSaving ? 'Saving Safar...' : '✓ Save Entire Safar to Stats'}
                  </StudioButton>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── PERSISTENT STATS REPOSITORY LEDGER ── */}
      <div
        className="glass-card"
        style={{
          padding: '20px',
          borderRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--label)' }}>
              Master Safar Repository Ledger
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--secondary-label)', marginTop: 2 }}>
              Catalog of all recorded Safars and their associated shoot dates
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StudioButton variant="glass" size="sm" icon={<RefreshCw size={13} />} onClick={loadLedger}>
              Refresh
            </StudioButton>
            <StudioButton variant="glass" size="sm" icon={<Download size={13} />} onClick={() => handleExport('csv')}>
              Export CSV
            </StudioButton>
            <StudioButton variant="glass" size="sm" icon={<FileSpreadsheet size={13} />} onClick={() => handleExport('json')}>
              Export JSON
            </StudioButton>
          </div>
        </div>

        {/* Spotlight Filter Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 16px',
            borderRadius: 12,
            backgroundColor: 'rgba(10, 14, 23, 0.95)',
            border: '1.5px solid rgba(0, 242, 254, 0.4)',
            boxShadow: '0 4px 20px rgba(0, 242, 254, 0.1)',
          }}
        >
          <Search size={18} color="#00F2FE" />
          <input
            type="text"
            placeholder="Search repository (Mac Spotlight: e.g. 1448-10, Mumbai, 04-05)..."
            value={ledgerSearchQuery}
            onChange={(e) => setLedgerSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--label)',
              fontSize: 13.5,
              fontWeight: 600,
            }}
          />
          {ledgerSearchQuery && (
            <button
              onClick={() => setLedgerSearchQuery('')}
              style={{ background: 'transparent', border: 'none', color: 'var(--secondary-label)', cursor: 'pointer' }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Safar Records Accordion */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredRecords.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--secondary-label)', fontSize: 13 }}>
              No Safars recorded in the ledger yet. Use the form above to add your first shoot date or Safar!
            </div>
          ) : (
            filteredRecords.map((safar) => {
              const isExpanded = expandedSafarIds.has(safar.id);

              return (
                <div
                  key={safar.id}
                  className="glass-card"
                  style={{
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    overflow: 'hidden',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  {/* Header row */}
                  <div
                    onClick={() => toggleExpand(safar.id)}
                    style={{
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      backgroundColor: isExpanded ? 'rgba(0, 242, 254, 0.05)' : 'transparent',
                      borderBottom: isExpanded ? '1px solid var(--border-subtle)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ color: 'var(--secondary-label)' }}>
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--label)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{safar.safarName}</span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#00F2FE',
                              backgroundColor: 'rgba(0, 242, 254, 0.1)',
                              padding: '1px 6px',
                              borderRadius: 4,
                            }}
                          >
                            {safar.totalDates} {safar.totalDates === 1 ? 'date' : 'dates'}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--secondary-label)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                          {safar.safarRootPath}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--system-green)' }}>
                          {safar.sizeStr}
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--secondary-label)' }}>
                          {safar.totalFiles.toLocaleString()} files
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenPath(safar.safarRootPath)}
                          title="Open Safar Root in Explorer"
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            color: 'var(--label)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <ExternalLink size={13} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteSafar(safar.id, e)}
                          title="Delete Safar from Stats"
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            color: 'var(--system-red, #EF4444)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Dates Table */}
                  {isExpanded && (
                    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {safar.dates.map((date) => (
                        <div
                          key={date.id}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 10,
                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                            <Calendar size={15} color="#00F2FE" />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--label)' }}>
                                {date.dateName}
                              </div>
                              <div
                                style={{
                                  fontSize: 10.5,
                                  color: 'var(--secondary-label)',
                                  fontFamily: 'var(--font-mono)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {date.mainDataPath}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ fontSize: 11, color: 'var(--secondary-label)', display: 'flex', gap: 12 }}>
                              <div>
                                <span style={{ fontWeight: 700, color: 'var(--label)' }}>{date.mainDataMetrics.fileCount}</span> Master
                                <span style={{ fontSize: 10, color: '#00F2FE', marginLeft: 4 }}>
                                  ({date.mainDataMetrics.photoCount}P/{date.mainDataMetrics.videoCount}V)
                                </span>
                              </div>
                              <div>
                                <span style={{ fontWeight: 700, color: 'var(--label)' }}>{date.remainingMetrics.fileCount}</span> Rem
                              </div>
                              <div>
                                <span style={{ fontWeight: 700, color: 'var(--label)' }}>{date.thumbnailsMetrics.fileCount}</span> Thumbs
                              </div>
                            </div>

                            <div style={{ textAlign: 'right', minWidth: 60 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--system-green)' }}>
                                {date.sizeStr}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <button
                                onClick={() => handleOpenPath(date.mainDataPath)}
                                title="Open Date Folder in Explorer"
                                style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: 5,
                                  background: 'transparent',
                                  border: '1px solid var(--border)',
                                  color: 'var(--label)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                }}
                              >
                                <ExternalLink size={12} />
                              </button>
                              <button
                                onClick={(e) => handleDeleteDate(safar.id, date.id, e)}
                                title="Remove Date from Stats"
                                style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: 5,
                                  background: 'transparent',
                                  border: '1px solid var(--border)',
                                  color: 'var(--system-red, #EF4444)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
