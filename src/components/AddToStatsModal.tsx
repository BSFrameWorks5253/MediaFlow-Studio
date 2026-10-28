import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  FolderTree,
  Calendar,
  Sparkles,
  Search,
  Clock,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  ExternalLink,
  BarChart3,
  Database,
  Image as ImageIcon,
  Video as VideoIcon,
  Layers,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { StudioButton } from './StudioButton';
import { StudioFolderInput } from './StudioFolderInput';
import {
  SafarStatRecord,
  DateStatItem,
} from '../../electron/managers/statsManager';
import { toUserErrorMessage } from '../utils/errorSanitizer';

interface AddToStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (text: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
  initialPath?: string; // Pre-filled from stage (targetDir or uploadStructure)
  onOpenStatsManager?: () => void;
}

export const AddToStatsModal: React.FC<AddToStatsModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  initialPath = '',
  onOpenStatsManager,
}) => {
  // Mode selection: 'safar' | 'date'
  const [scopeMode, setScopeMode] = useState<'safar' | 'date'>('date');

  // Safar Mode State
  const [safarFolderPath, setSafarFolderPath] = useState('');
  const [isScanningSafar, setIsScanningSafar] = useState(false);
  const [scannedSafarRecord, setScannedSafarRecord] = useState<SafarStatRecord | null>(null);

  // Date Mode State
  const [dateFolderPath, setDateFolderPath] = useState('');
  const [safarSelectType, setSafarSelectType] = useState<'existing' | 'new'>('new');
  const [customSafarName, setCustomSafarName] = useState('');
  const [customSafarRoot, setCustomSafarRoot] = useState('');
  const [customRemainingPath, setCustomRemainingPath] = useState('');
  const [customThumbnailsPath, setCustomThumbnailsPath] = useState('');
  const [isScanningDate, setIsScanningDate] = useState(false);
  const [scannedDateResult, setScannedDateResult] = useState<{
    dateStat: DateStatItem;
    detectedSafarName: string;
    detectedSafarRoot: string;
    detectedRemainingPath: string;
    detectedThumbnailsPath: string;
  } | null>(null);

  // Mac Spotlight Bar State (for existing Safar selection)
  const [spotlightQuery, setSpotlightQuery] = useState('');
  const [recentSafars, setRecentSafars] = useState<SafarStatRecord[]>([]);
  const [filteredSafars, setFilteredSafars] = useState<SafarStatRecord[]>([]);
  const [selectedSpotlightIndex, setSelectedSpotlightIndex] = useState(0);
  const [selectedExistingSafar, setSelectedExistingSafar] = useState<SafarStatRecord | null>(null);
  const spotlightInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);

  // Initialize or reload on open
  useEffect(() => {
    if (!isOpen) return;

    if (initialPath) {
      // Determine if initialPath looks like a Date folder or Safar folder
      // Date folders typically have format YYYY-MM-DD or contains _P-V in parent
      const clean = initialPath.replace(/[\\/]+$/, '');
      const base = clean.split(/[\\/]/).pop() || '';
      if (/^\d{4}[-_]\d{2}[-_]\d{2}/.test(base) || /_01M|_02E/i.test(base)) {
        setScopeMode('date');
        setDateFolderPath(clean);
      } else {
        // Could be Safar root or _P-V folder
        if (/_p-v$/i.test(base)) {
          const parent = clean.substring(0, clean.lastIndexOf('\\')) || clean.substring(0, clean.lastIndexOf('/'));
          setSafarFolderPath(parent || clean);
        } else {
          setSafarFolderPath(clean);
        }
      }
    }

    loadRecents();
  }, [isOpen, initialPath]);

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
    } else {
      // Mock recents for dev
      const mock: SafarStatRecord[] = [
        {
          id: '1448-10-istefada_ilmiyah',
          safarName: '1448-10-Istefada ilmiyah',
          safarRootPath: 'D:\\To Delete\\1448-10-Istefada ilmiyah',
          pvFolderPath: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\1448-10-Istefada ilmiyah_P-V',
          remainingFolderPath: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\Remaining',
          thumbnailsFolderPath: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\Thumbnails',
          dates: [],
          totalDates: 4,
          totalMainFiles: 1420,
          totalRemainingFiles: 380,
          totalThumbnailsFiles: 1420,
          totalFiles: 3220,
          totalBytes: 52428800000,
          sizeStr: '48.83 GB',
          createdAt: new Date().toISOString(),
          lastModifiedAt: new Date().toISOString(),
        },
      ];
      setRecentSafars(mock);
      setFilteredSafars(mock);
    }
  };

  // Search existing Safars in real time (Spotlight)
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

  // Browse Directory handlers
  const handleBrowseDateFolder = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory('Select Date Folder inside Main Data (_P-V)', dateFolderPath);
    if (dir) {
      setDateFolderPath(dir);
    }
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
      // Re-trigger date scan with customized remaining
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
      // Re-trigger date scan with customized thumbnails
      if (dateFolderPath) {
        handleAutoScanDate(dateFolderPath, customSafarName, customRemainingPath, dir);
      }
    }
  };

  // Scan Date Folder
  const handleAutoScanDate = async (
    pathVal: string,
    safarNameVal?: string,
    remVal?: string,
    thumbVal?: string
  ) => {
    if (!pathVal.trim()) return;

    if (!window.electronAPI || typeof window.electronAPI.statsScanDate !== 'function') {
      // Browser preview mock
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
            fileCount: 342,
            totalBytes: 12884901888,
            sizeStr: '12.00 GB',
            photoCount: 310,
            videoCount: 32,
            otherCount: 0,
            subfolderCount: 8,
          },
          remainingMetrics: {
            path: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\Remaining\\1448-04-05 _02E',
            exists: true,
            fileCount: 84,
            totalBytes: 1073741824,
            sizeStr: '1.00 GB',
            photoCount: 84,
            videoCount: 0,
            otherCount: 0,
            subfolderCount: 1,
          },
          thumbnailsMetrics: {
            path: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\Thumbnails\\1448-04-05 _02E',
            exists: true,
            fileCount: 342,
            totalBytes: 52428800,
            sizeStr: '50.0 MB',
            photoCount: 342,
            videoCount: 0,
            otherCount: 0,
            subfolderCount: 0,
          },
          eventFoldersCount: 8,
          totalFiles: 768,
          totalBytes: 14011072512,
          sizeStr: '13.05 GB',
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

  // Scan Entire Safar Folder
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
        dates: [
          {
            id: '1448-04-05 _02E',
            dateName: '1448-04-05 _02E',
            mainDataPath: `${pathVal}\\${baseName}_P-V\\1448-04-05 _02E`,
            remainingPath: `${pathVal}\\Remaining\\1448-04-05 _02E`,
            thumbnailsPath: `${pathVal}\\Thumbnails\\1448-04-05 _02E`,
            mainDataMetrics: {
              path: `${pathVal}\\${baseName}_P-V\\1448-04-05 _02E`,
              exists: true,
              fileCount: 420,
              totalBytes: 15000000000,
              sizeStr: '13.97 GB',
              photoCount: 380,
              videoCount: 40,
              otherCount: 0,
              subfolderCount: 12,
            },
            remainingMetrics: {
              path: `${pathVal}\\Remaining\\1448-04-05 _02E`,
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
              path: `${pathVal}\\Thumbnails\\1448-04-05 _02E`,
              exists: true,
              fileCount: 420,
              totalBytes: 62000000,
              sizeStr: '59.1 MB',
              photoCount: 420,
              videoCount: 0,
              otherCount: 0,
              subfolderCount: 0,
            },
            eventFoldersCount: 12,
            totalFiles: 935,
            totalBytes: 16262000000,
            sizeStr: '15.15 GB',
            addedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        totalDates: 1,
        totalMainFiles: 420,
        totalRemainingFiles: 95,
        totalThumbnailsFiles: 420,
        totalFiles: 935,
        totalBytes: 16262000000,
        sizeStr: '15.15 GB',
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
      onShowToast(`Discovered ${rec.totalDates} date folder(s) in Safar "${rec.safarName}"!`, 'success');
    } catch (e: any) {
      onShowToast(toUserErrorMessage(e, 'Failed to scan Safar folder tree.'), 'danger');
    } finally {
      setIsScanningSafar(false);
    }
  };

  // Rescan folder structure and persist for future reference
  const handleRescanStructure = async () => {
    if (scopeMode === 'date') {
      if (!dateFolderPath.trim()) {
        onShowToast('Please enter or browse to a valid Date folder.', 'warning');
        return;
      }
      onShowToast('Rescanning Date folder structure & outside companion directories...', 'info');
      await handleAutoScanDate(dateFolderPath.trim(), customSafarName, customRemainingPath, customThumbnailsPath);

      const targetSafarName =
        safarSelectType === 'existing'
          ? selectedExistingSafar?.safarName || customSafarName
          : customSafarName.trim() || scannedDateResult?.detectedSafarName;
      const targetSafarRoot =
        customSafarRoot.trim() ||
        selectedExistingSafar?.safarRootPath ||
        scannedDateResult?.detectedSafarRoot;

      if (targetSafarName && scannedDateResult?.dateStat && window.electronAPI?.statsSaveDate) {
        await window.electronAPI.statsSaveDate(targetSafarName, targetSafarRoot || '', scannedDateResult.dateStat);
        onShowToast(`✓ Rescanned & saved structure for "${targetSafarName}" for future reference!`, 'success');
      } else {
        onShowToast('✓ Date folder structure rescanned successfully.', 'success');
      }
    } else {
      if (!safarFolderPath.trim()) {
        onShowToast('Please enter or browse to a valid Safar folder.', 'warning');
        return;
      }
      onShowToast('Rescanning Safar directory tree, _P-V, Remaining & Thumbnails...', 'info');
      await handleScanSafar(safarFolderPath.trim());
      if (scannedSafarRecord && window.electronAPI?.statsSaveSafar) {
        await window.electronAPI.statsSaveSafar(scannedSafarRecord);
        onShowToast(`✓ Rescanned & saved "${scannedSafarRecord.safarName}" for future reference!`, 'success');
      } else {
        onShowToast('✓ Safar folder structure rescanned successfully.', 'success');
      }
    }
  };

  // Keyboard navigation for Mac Spotlight bar
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
    onShowToast(`Linked date to Safar "${safar.safarName}"`, 'info');
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
        // Safar mode
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

      onClose();
    } catch (e: any) {
      onShowToast(toUserErrorMessage(e, 'Failed to save stats record.'), 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 99999,
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: 720,
          maxHeight: '90vh',
          borderRadius: 20,
          border: '1px solid rgba(0, 242, 254, 0.35)',
          backgroundColor: 'rgba(13, 17, 28, 0.96)',
          boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.8), 0 0 35px rgba(0, 242, 254, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(0, 242, 254, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: 'rgba(0, 242, 254, 0.15)',
                border: '1px solid rgba(0, 242, 254, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00F2FE',
              }}
            >
              <BarChart3 size={20} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--label)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Add to Production Stats</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#00F2FE',
                    backgroundColor: 'rgba(0, 242, 254, 0.12)',
                    padding: '2px 8px',
                    borderRadius: 999,
                    border: '1px solid rgba(0, 242, 254, 0.3)',
                  }}
                >
                  AUDIT &amp; ANALYTICS
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--secondary-label)', marginTop: 2 }}>
                Catalog Main Data, Remaining, and Companion Thumbnails into the Safar registry
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {onOpenStatsManager && (
              <button
                onClick={() => {
                  onClose();
                  onOpenStatsManager();
                }}
                className="btn-tactile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid var(--border)',
                  color: 'var(--label)',
                  cursor: 'pointer',
                }}
                title="View All Recorded Stats"
              >
                <Database size={13} color="#00F2FE" />
                <span>View Stats Ledger</span>
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                color: 'var(--secondary-label)',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '20px 22px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            flex: 1,
          }}
        >
          {/* Step 1: Mode Selector (Safar Folder vs Date Folder) */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--secondary-label)', marginBottom: 8, letterSpacing: 0.5 }}>
              SELECT INPUT SCOPE:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Option A: Date Folder */}
              <button
                type="button"
                onClick={() => setScopeMode('date')}
                className="btn-tactile"
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: scopeMode === 'date' ? '2px solid #00F2FE' : '1px solid var(--border)',
                  backgroundColor: scopeMode === 'date' ? 'rgba(0, 242, 254, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    backgroundColor: scopeMode === 'date' ? '#00F2FE' : 'rgba(255, 255, 255, 0.05)',
                    color: scopeMode === 'date' ? '#000' : 'var(--secondary-label)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Calendar size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--label)' }}>
                    Date Folder
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--secondary-label)', marginTop: 2 }}>
                    Single shoot date inside <code>_P-V</code> with companion Remaining &amp; Thumbs
                  </div>
                </div>
              </button>

              {/* Option B: Safar Folder */}
              <button
                type="button"
                onClick={() => setScopeMode('safar')}
                className="btn-tactile"
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: scopeMode === 'safar' ? '2px solid #8B5CF6' : '1px solid var(--border)',
                  backgroundColor: scopeMode === 'safar' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    backgroundColor: scopeMode === 'safar' ? '#8B5CF6' : 'rgba(255, 255, 255, 0.05)',
                    color: scopeMode === 'safar' ? '#fff' : 'var(--secondary-label)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <FolderTree size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--label)' }}>
                    Safar Folder
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--secondary-label)', marginTop: 2 }}>
                    Complete Safar root containing all dates, Remaining, and Thumbnails
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* ────────────────── DATE FOLDER WORKFLOW ────────────────── */}
          {scopeMode === 'date' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Date Folder Path Picker */}
              <StudioFolderInput
                label="Date Folder Directory (Main Data / _P-V):"
                description="Path to specific date folder, e.g. D:\To Delete\1448-10-Istefada ilmiyah\1448-10-Istefada ilmiyah_P-V\1448-04-05 _02E"
                value={dateFolderPath}
                onChange={(val) => setDateFolderPath(val)}
                onBrowse={handleBrowseDateFolder}
                placeholder="e.g. D:\...\1448-10-Istefada ilmiyah_P-V\1448-04-05 _02E"
                accentColor="#00F2FE"
              />

              {/* Step 2: Name the Safar (Select Safar: Existing vs New) */}
              <div
                className="glass-card"
                style={{
                  padding: '16px',
                  borderRadius: 14,
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--label)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Folder size={14} color="#00F2FE" />
                    <span>Assign Safar Project:</span>
                  </div>

                  {/* Existing vs New Tabs */}
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
                        transition: 'all 0.15s',
                      }}
                    >
                      Existing Safar
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
                        transition: 'all 0.15s',
                      }}
                    >
                      Create New Safar
                    </button>
                  </div>
                </div>

                {/* Sub-View: EXISTING SAFAR (Mac Spotlight Bar + Recents) */}
                {safarSelectType === 'existing' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Mac Spotlight Search Bar */}
                    <div
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        borderRadius: 12,
                        backgroundColor: 'rgba(10, 14, 23, 0.9)',
                        border: '1.5px solid rgba(0, 242, 254, 0.4)',
                        boxShadow: '0 4px 20px rgba(0, 242, 254, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <Search size={16} color="#00F2FE" />
                      <input
                        ref={spotlightInputRef}
                        type="text"
                        placeholder="Search existing Safar (Mac Spotlight — type to filter)..."
                        value={spotlightQuery}
                        onChange={(e) => setSpotlightQuery(e.target.value)}
                        onKeyDown={handleSpotlightKeyDown}
                        style={{
                          flex: 1,
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: 'var(--label)',
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      />
                      {spotlightQuery && (
                        <button
                          onClick={() => setSpotlightQuery('')}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--secondary-label)',
                            cursor: 'pointer',
                          }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Recents / Search Results List */}
                    <div
                      style={{
                        maxHeight: 180,
                        overflowY: 'auto',
                        borderRadius: 10,
                        border: '1px solid var(--border-subtle)',
                        backgroundColor: 'rgba(0, 0, 0, 0.25)',
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
                        <span>{spotlightQuery ? 'MATCHING SAFARS:' : 'RECENT SAFARS:'}</span>
                      </div>

                      {filteredSafars.length === 0 ? (
                        <div style={{ padding: '12px', textAlign: 'center', fontSize: 12, color: 'var(--secondary-label)' }}>
                          No matching Safars found. Switch to "Create New Safar" above to register a new one.
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
                                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--label)' }}>
                                    {safar.safarName}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 10.5,
                                      color: 'var(--secondary-label)',
                                      fontFamily: 'var(--font-mono)',
                                      maxWidth: 360,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {safar.safarRootPath}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: 'var(--secondary-label)',
                                    fontFamily: 'var(--font-mono)',
                                  }}
                                >
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
                  /* Sub-View: CREATE NEW SAFAR */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--secondary-label)', display: 'block', marginBottom: 4 }}>
                        New Safar / Event Name:
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

              {/* Step 3: Companion Folders Auto-Discovered Outside _P-V */}
              <div
                className="glass-card"
                style={{
                  padding: '14px 16px',
                  borderRadius: 14,
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--label)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <HardDrive size={14} color="var(--system-green)" />
                  <span>Companion Trees (Outside _P-V Folder):</span>
                </div>

                {/* Remaining folder */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--secondary-label)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>Remaining Folder:</span>
                      {scannedDateResult?.remainingMetrics.exists && (
                        <span style={{ color: 'var(--system-green)', fontSize: 10, fontWeight: 700 }}>
                          ✓ AUTO-DETECTED
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

                {/* Thumbnails folder */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--secondary-label)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>Thumbnails Folder:</span>
                      {scannedDateResult?.thumbnailsMetrics.exists && (
                        <span style={{ color: 'var(--system-green)', fontSize: 10, fontWeight: 700 }}>
                          ✓ AUTO-DETECTED
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

              {/* Step 4: Live Calculated Metrics Preview */}
              {scannedDateResult && (
                <div
                  className="glass-card"
                  style={{
                    padding: '14px 16px',
                    borderRadius: 14,
                    border: '1px solid rgba(0, 242, 254, 0.3)',
                    backgroundColor: 'rgba(0, 242, 254, 0.05)',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#00F2FE', marginBottom: 10, letterSpacing: 0.5 }}>
                    CALCULATED STATS BREAKDOWN FOR: {scannedDateResult.dateStat.dateName}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    {/* Main Data */}
                    <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', padding: '8px 10px', borderRadius: 8 }}>
                      <div style={{ fontSize: 10.5, color: 'var(--secondary-label)' }}>Main Shoot Files</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--label)' }}>
                        {scannedDateResult.dateStat.mainDataMetrics.fileCount}
                      </div>
                      <div style={{ fontSize: 10, color: '#00F2FE' }}>
                        {scannedDateResult.dateStat.mainDataMetrics.photoCount}P • {scannedDateResult.dateStat.mainDataMetrics.videoCount}V
                      </div>
                    </div>

                    {/* Remaining */}
                    <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', padding: '8px 10px', borderRadius: 8 }}>
                      <div style={{ fontSize: 10.5, color: 'var(--secondary-label)' }}>Remaining Assets</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--label)' }}>
                        {scannedDateResult.dateStat.remainingMetrics.fileCount}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--secondary-label)' }}>
                        {scannedDateResult.dateStat.remainingMetrics.sizeStr}
                      </div>
                    </div>

                    {/* Thumbnails */}
                    <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', padding: '8px 10px', borderRadius: 8 }}>
                      <div style={{ fontSize: 10.5, color: 'var(--secondary-label)' }}>Thumbnails</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--label)' }}>
                        {scannedDateResult.dateStat.thumbnailsMetrics.fileCount}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--secondary-label)' }}>
                        {scannedDateResult.dateStat.thumbnailsMetrics.sizeStr}
                      </div>
                    </div>

                    {/* Total Size */}
                    <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', padding: '8px 10px', borderRadius: 8 }}>
                      <div style={{ fontSize: 10.5, color: 'var(--secondary-label)' }}>Combined Size</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--system-green)' }}>
                        {scannedDateResult.dateStat.sizeStr}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--secondary-label)' }}>
                        {scannedDateResult.dateStat.totalFiles} files
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ────────────────── SAFAR FOLDER WORKFLOW ────────────────── */}
          {scopeMode === 'safar' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <StudioFolderInput
                label="Safar Root Folder Directory:"
                description="Select master Safar folder, e.g. D:\To Delete\1448-10-Istefada ilmiyah"
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
                <div style={{ padding: '16px', textAlign: 'center', color: '#8B5CF6', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <RefreshCw size={16} className="spin" />
                  <span>Scanning Safar folder tree, date subfolders, remaining &amp; thumbnails...</span>
                </div>
              )}

              {scannedSafarRecord && !isScanningSafar && (
                <div
                  className="glass-card"
                  style={{
                    padding: '16px',
                    borderRadius: 14,
                    border: '1px solid rgba(139, 92, 246, 0.35)',
                    backgroundColor: 'rgba(139, 92, 246, 0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--label)' }}>
                        Safar: {scannedSafarRecord.safarName}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--secondary-label)', marginTop: 2 }}>
                        Discovered {scannedSafarRecord.totalDates} Date folders inside <code>{scannedSafarRecord.pvFolderPath || 'Main Data'}</code>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--system-green)' }}>
                        {scannedSafarRecord.sizeStr}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
                        {scannedSafarRecord.totalFiles.toLocaleString()} files
                      </div>
                    </div>
                  </div>

                  {/* Dates list preview */}
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
                    {scannedSafarRecord.dates.map((d) => (
                      <div
                        key={d.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          borderRadius: 6,
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Calendar size={13} color="#8B5CF6" />
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--label)' }}>{d.dateName}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--secondary-label)', display: 'flex', gap: 10 }}>
                          <span>{d.mainDataMetrics.fileCount} master</span>
                          <span>{d.remainingMetrics.fileCount} rem</span>
                          <span>{d.thumbnailsMetrics.fileCount} thumb</span>
                          <span style={{ color: 'var(--system-green)', fontWeight: 700 }}>{d.sizeStr}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
          }}
        >
          <div style={{ fontSize: 11.5, color: 'var(--secondary-label)' }}>
            {scopeMode === 'date'
              ? 'Catalog single date into selected Safar ledger.'
              : 'Record all detected date folders for this Safar.'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StudioButton variant="secondary" onClick={onClose}>
              Cancel
            </StudioButton>

            <StudioButton
              variant="secondary"
              onClick={handleRescanStructure}
              disabled={
                isScanningDate ||
                isScanningSafar ||
                isSaving ||
                (scopeMode === 'date' && !dateFolderPath.trim()) ||
                (scopeMode === 'safar' && !safarFolderPath.trim())
              }
              icon={<RefreshCw size={13} className={isScanningDate || isScanningSafar ? 'spin-anim' : ''} />}
              style={{
                borderColor: 'rgba(0, 242, 254, 0.4)',
                color: '#00F2FE',
                backgroundColor: 'rgba(0, 242, 254, 0.08)',
              }}
              title="Rescan folder tree from disk and save structure for future reference"
            >
              🔄 Rescan & Save Structure
            </StudioButton>

            <StudioButton
              variant="primary"
              onClick={handleSaveToStats}
              disabled={
                isSaving ||
                (scopeMode === 'date' && !scannedDateResult) ||
                (scopeMode === 'safar' && !scannedSafarRecord)
              }
              style={{
                backgroundColor: scopeMode === 'date' ? '#00F2FE' : '#8B5CF6',
                color: scopeMode === 'date' ? '#000' : '#fff',
                fontWeight: 700,
              }}
            >
              {isSaving ? 'Saving...' : '✓ Add to Stats'}
            </StudioButton>
          </div>
        </div>
      </div>
    </div>
  );
};

