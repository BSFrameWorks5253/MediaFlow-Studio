import React, { useState } from 'react';
import {
  Folder,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Check,
  ShieldCheck,
  FolderOpen,
  AlertCircle,
  Tag,
  Layers,
  Eye,
  EyeOff,
} from 'lucide-react';
import { StudioButton } from '../components/StudioButton';
import { PhotoMatchItem, PhotoMatchScanResult } from '../../electron/engines/photoMatcher';
import { usePipeline } from '../context/PipelineContext';
import { PageKey } from '../components/Sidebar';
import { StudioFolderInput } from '../components/StudioFolderInput';
import { OperationLoadingOverlay } from '../components/OperationLoadingOverlay';
import { toUserErrorMessage } from '../utils/errorSanitizer';

interface PhotoMatcherPageProps {
  onShowToast: (text: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
  onNavigate?: (page: PageKey) => void;
}

export const PhotoMatcherPage: React.FC<PhotoMatcherPageProps> = ({ onShowToast, onNavigate }) => {
  const { uploadStructure } = usePipeline();
  const [targetDir, setTargetDir] = useState('');
  const [scanResult, setScanResult] = useState<PhotoMatchScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [dryRun, setDryRun] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'MATCHED' | 'UNMATCHED' | 'IGNORED'>('ALL');
  const [isDirDragOver, setIsDirDragOver] = useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === 'true') {
        setTargetDir('D:\\2026_EVENTS\\ROYAL_WEDDING\\CLEAN_PHOTOS');
        setScanResult({
          all_items: [
            {
              filename: 'DSC04891.JPG',
              sourcePath: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\CLEAN_PHOTOS\\2026-02-14\\DSC04891.JPG',
              targetPath: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\CLEAN_PHOTOS\\2026-02-14\\0042_Bride_Arrival_U.JPG',
              targetFolder: '2026-02-14',
              dateFolder: '2026-02-14',
              baseClean: 'DSC04891',
              isUsed: true,
              status: 'Used',
              targetFilename: '0042_Bride_Arrival_U.JPG',
              extension: '.jpg',
              folderLabel: '0042_Bride_Arrival',
              willRename: true,
            },
            {
              filename: 'DSC04892.CR3',
              sourcePath: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\CLEAN_PHOTOS\\2026-02-14\\DSC04892.CR3',
              targetPath: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\CLEAN_PHOTOS\\2026-02-14\\0042_Bride_Arrival_R.CR3',
              targetFolder: '2026-02-14',
              dateFolder: '2026-02-14',
              baseClean: 'DSC04892',
              isUsed: false,
              status: 'Missing',
              targetFilename: '0042_Bride_Arrival_R.CR3',
              extension: '.cr3',
              folderLabel: '0042_Bride_Arrival',
              willRename: true,
            },
            {
              filename: 'DSC04893.JPG',
              sourcePath: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\CLEAN_PHOTOS\\2026-02-14\\DSC04893.JPG',
              targetPath: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\CLEAN_PHOTOS\\2026-02-14\\0043_Varmala_Exchange_U.JPG',
              targetFolder: '2026-02-14',
              dateFolder: '2026-02-14',
              baseClean: 'DSC04893',
              isUsed: true,
              status: 'Used',
              targetFilename: '0043_Varmala_Exchange_U.JPG',
              extension: '.jpg',
              folderLabel: '0043_Varmala_Exchange',
              willRename: true,
            },
            {
              filename: 'DSC04894.CR3',
              sourcePath: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\CLEAN_PHOTOS\\2026-02-14\\DSC04894.CR3',
              targetPath: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\CLEAN_PHOTOS\\2026-02-14\\0043_Varmala_Exchange_R.CR3',
              targetFolder: '2026-02-14',
              dateFolder: '2026-02-14',
              baseClean: 'DSC04894',
              isUsed: false,
              status: 'Missing',
              targetFilename: '0043_Varmala_Exchange_R.CR3',
              extension: '.cr3',
              folderLabel: '0043_Varmala_Exchange',
              willRename: true,
            },
            {
              filename: 'DSC04895.JPG',
              sourcePath: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\CLEAN_PHOTOS\\2026-02-14\\DSC04895.JPG',
              targetPath: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\CLEAN_PHOTOS\\2026-02-14\\0044_Pheras_Ritual_U.JPG',
              targetFolder: '2026-02-14',
              dateFolder: '2026-02-14',
              baseClean: 'DSC04895',
              isUsed: true,
              status: 'Used',
              targetFilename: '0044_Pheras_Ritual_U.JPG',
              extension: '.jpg',
              folderLabel: '0044_Pheras_Ritual',
              willRename: true,
            },
          ],
          totalRemaining: 1840,
          totalUsed: 1420,
          totalMissing: 420,
          totalIgnored: 84,
          totalOriginal: 2260,
          matchRate: 98.4,
        } as any);
      }
    }
  }, []);

  const setAndScanDir = async (dir: string) => {
    if (!dir) return;
    setTargetDir(dir);
    setScanResult(null);
  };

  const handleBrowseDir = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory(
      'Select Production Root Directory (contains Remaining subfolder)',
      targetDir
    );
    if (dir) {
      setAndScanDir(dir);
    }
  };

  const handleDirDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDirDragOver(true);
  };

  const handleDirDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDirDragOver(false);
  };

  const handleDirDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDirDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const p = (e.dataTransfer.files[0] as any).path;
      if (p) setAndScanDir(p);
    }
  };

  const handleScan = async () => {
    if (!targetDir.trim()) {
      onShowToast('Please select a production root directory first.', 'warning');
      return;
    }

    setIsScanning(true);
    try {
      const check = await window.electronAPI.checkPathExists(targetDir.trim());
      if (!check.exists) {
        onShowToast('The selected folder does not exist or cannot be reached. Please check the path and try again.', 'danger');
        setIsScanning(false);
        return;
      }

      // Use single-directory scan (SEQUORA mode)
      const res: PhotoMatchScanResult = await window.electronAPI.scanPhotoMatcher(targetDir.trim());
      setScanResult(res);
      onShowToast(
        `Scan complete: ${res.totalUsed} Matched (_U), ${res.totalMissing} Not Present (_R) out of ${res.totalRemaining} remaining photos.`,
        'success'
      );
    } catch (e: any) {
      console.error('Photo Matcher scan failed:', e);
      onShowToast(toUserErrorMessage(e, 'Scan failed. Please check folder permissions and try again.'), 'danger');
    } finally {
      setIsScanning(false);
    }
  };

  const handleExecuteRename = async () => {
    if (!scanResult || scanResult.all_items.length === 0) {
      onShowToast('No photo items ready to rename. Please run scan first.', 'warning');
      return;
    }

    setIsRenaming(true);
    try {
      const summary = await window.electronAPI.executePhotoRename(scanResult.all_items, dryRun);
      if (dryRun) {
        onShowToast(
          `Dry run validated: ${summary.success_count} files would be safely renamed.`,
          'info'
        );
      } else {
        onShowToast(
          `Renamed ${summary.success_count} files successfully!`,
          'success'
        );
        // Refresh scan to update status
        handleScan();
      }
    } catch (e: any) {
      console.error('Photo rename execution error:', e);
      onShowToast(toUserErrorMessage(e, 'Rename execution failed. Please verify files are not in use.'), 'danger');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleOpenDir = async () => {
    if (!targetDir || !window.electronAPI) return;
    try {
      await window.electronAPI.openPath(targetDir);
    } catch {}
  };

  const filteredItems = (scanResult?.all_items || []).filter((item) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        item.filename.toLowerCase().includes(q) ||
        item.baseClean.toLowerCase().includes(q) ||
        item.dateFolder.toLowerCase().includes(q) ||
        (item.folderLabel || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    if (statusFilter === 'MATCHED') return item.isUsed;
    if (statusFilter === 'UNMATCHED') return !item.isUsed && item.status !== 'Ignored';
    if (statusFilter === 'IGNORED') return item.status === 'Ignored';
    return true;
  });

  const hasFolderWarnings =
    scanResult?.folderPairs && scanResult.folderPairs.some((p) => !p.first || !p.second);

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
      {/* ── Hero Header ─────────────────────────────────────── */}
      <div
        className="glass-card"
        style={{
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background:
            'linear-gradient(135deg, rgba(191, 90, 242, 0.08) 0%, rgba(10, 132, 255, 0.04) 100%)',
          borderColor: 'rgba(191, 90, 242, 0.25)',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'rgba(191, 90, 242, 0.15)',
            border: '1px solid rgba(191, 90, 242, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Tag size={22} color="#BF5AF2" />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--label)' }}>
              Photo Status Tagger &amp; Sequence Renamer
            </span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 6,
                fontSize: 9.5,
                fontWeight: 800,
                letterSpacing: 0.8,
                color: '#BF5AF2',
                backgroundColor: 'rgba(191, 90, 242, 0.12)',
                border: '1px solid rgba(191, 90, 242, 0.35)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              _U &amp; _R TAGGER
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--secondary-label)', marginTop: 2 }}>
            Automated sequence matching between Remaining photos and Original client folders
          </div>
        </div>

        {/* Live Stats Row */}
        {scanResult && (
          <div
            style={{
              display: 'flex',
              gap: 16,
              fontSize: 11.5,
              fontFamily: 'var(--font-mono)',
              flexShrink: 0,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: 'var(--label)', fontSize: 18 }}>
                {scanResult.totalRemaining}
              </div>
              <div style={{ color: 'var(--tertiary-label)', fontSize: 10 }}>TOTAL</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: '#10E79D', fontSize: 18 }}>
                {scanResult.totalUsed}
              </div>
              <div style={{ color: 'var(--tertiary-label)', fontSize: 10 }}>MATCHED</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: '#EF4444', fontSize: 18 }}>
                {scanResult.totalMissing}
              </div>
              <div style={{ color: 'var(--tertiary-label)', fontSize: 10 }}>MISSING</div>
            </div>
            {(scanResult.totalIgnored ?? 0) > 0 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, color: 'var(--tertiary-label)', fontSize: 18 }}>
                  {scanResult.totalIgnored}
                </div>
                <div style={{ color: 'var(--tertiary-label)', fontSize: 10 }}>IGNORED</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Directory Selector ───────────────────────────────── */}
      <div
        className="glass-card"
        onDragOver={handleDirDragOver}
        onDragLeave={handleDirDragLeave}
        onDrop={handleDirDrop}
        style={{
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          border: isDirDragOver
            ? '2px dashed rgba(191, 90, 242, 0.9)'
            : targetDir
            ? '1px solid rgba(191, 90, 242, 0.35)'
            : '1px solid var(--border)',
          background: isDirDragOver
            ? 'rgba(191, 90, 242, 0.12)'
            : targetDir
            ? 'rgba(191, 90, 242, 0.03)'
            : undefined,
          boxShadow: isDirDragOver ? '0 0 20px rgba(191, 90, 242, 0.25)' : undefined,
          transition: 'all 0.2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: 1,
                color: '#BF5AF2',
                fontFamily: 'var(--font-mono)',
              }}
            >
              PRODUCTION ROOT DIRECTORY
            </div>
            <div style={{ fontSize: 11, color: 'var(--tertiary-label)', marginTop: 2 }}>
              Select the folder containing date subfolders — one should be the Remaining folder
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <StudioButton
              variant="glass"
              icon={<Folder size={14} />}
              onClick={handleBrowseDir}
            >
              Select Directory
            </StudioButton>
            {targetDir && (
              <StudioButton
                variant="glass"
                icon={<FolderOpen size={13} />}
                onClick={handleOpenDir}
                title="Open in Explorer"
              >
                Open
              </StudioButton>
            )}
          </div>
        </div>

        {/* Path display + scan button */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '0 14px',
              height: 40,
              gap: 10,
            }}
          >
            <Folder size={15} color={targetDir ? '#BF5AF2' : 'var(--tertiary-label)'} />
            <input
              value={targetDir}
              onChange={(e) => setTargetDir(e.target.value)}
              placeholder="No production folder selected — click Select Directory to scan..."
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
            {targetDir && <CheckCircle2 size={14} color="#BF5AF2" />}
          </div>

          <StudioButton
            variant="primary"
            loading={isScanning}
            icon={<RefreshCw size={14} />}
            onClick={handleScan}
            style={{
              background: targetDir
                ? 'linear-gradient(135deg, #BF5AF2, #9B59F5)'
                : undefined,
              boxShadow: targetDir ? '0 4px 16px rgba(191, 90, 242, 0.35)' : undefined,
              minWidth: 140,
            }}
          >
            {isScanning ? 'Scanning...' : 'Scan & Compare'}
          </StudioButton>
        </div>

        {/* Auto-ignore pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 10px',
              borderRadius: 6,
              backgroundColor: 'rgba(48, 209, 88, 0.08)',
              border: '1px solid rgba(48, 209, 88, 0.25)',
              fontSize: 10.5,
              color: 'var(--system-green)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <ShieldCheck size={12} color="var(--system-green)" />
            _P &amp; _V JPGs Auto-Ignored
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 10px',
              borderRadius: 6,
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              fontSize: 10.5,
              color: 'var(--tertiary-label)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <Layers size={12} />
            Remaining folder auto-detected
          </span>
        </div>
      </div>

      {/* ── Stat Cards ────────────────────────────────────────── */}
      {scanResult && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            {
              label: 'TOTAL REMAINING',
              value: scanResult.totalRemaining,
              color: 'var(--label)',
              bg: 'rgba(255, 255, 255, 0.04)',
              border: 'var(--border)',
            },
            {
              label: 'MATCHED (_U)',
              value: scanResult.totalUsed,
              color: '#10E79D',
              bg: 'rgba(16, 231, 157, 0.08)',
              border: 'rgba(16, 231, 157, 0.3)',
            },
            {
              label: 'NOT MATCHED (_R)',
              value: scanResult.totalMissing,
              color: '#EF4444',
              bg: 'rgba(239, 68, 68, 0.08)',
              border: 'rgba(239, 68, 68, 0.3)',
            },
            {
              label: 'DATE FOLDERS',
              value: scanResult.folderPairs?.length ?? 0,
              color: '#F59E0B',
              bg: 'rgba(245, 158, 11, 0.08)',
              border: 'rgba(245, 158, 11, 0.3)',
            },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                padding: '18px 16px',
                borderRadius: 14,
                background: card.bg,
                border: `1px solid ${card.border}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: 0.7,
                  color: 'var(--tertiary-label)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {card.label}
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: card.color,
                  fontFamily: 'var(--font-mono)',
                  lineHeight: 1,
                }}
              >
                {card.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Folder Warnings ──────────────────────────────────── */}
      {hasFolderWarnings && (
        <div
          className="glass-card"
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              fontWeight: 700,
              color: '#F59E0B',
            }}
          >
            <AlertTriangle size={15} />
            <span>Subfolder Pairing Warnings — Some Folders Do Not Exist on Both Sides</span>
          </div>

          {scanResult!.folderPairs!.map((p, idx) => {
            const missingFirst = !p.first;
            const missingSecond = !p.second;
            if (!missingFirst && !missingSecond) return null;
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: 8,
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  fontSize: 11,
                  color: 'var(--label)',
                }}
              >
                <span>
                  ⚠️ {p.label}{' '}
                  {missingFirst ? '(Missing in Selected Photos)' : '(Missing in All Photos)'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Filter & Action Toolbar ───────────────────────────── */}
      <div
        className="glass-card"
        style={{
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        {/* Search */}
        <div
          style={{
            flex: 1,
            maxWidth: 280,
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '0 12px',
            gap: 8,
            height: 36,
          }}
        >
          <Search size={14} color="var(--secondary-label)" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search filename, folder, date..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--label)',
              fontSize: 12,
            }}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: 6 }}>
          {(
            [
              { key: 'ALL', label: 'All', count: scanResult ? scanResult.totalRemaining : null, color: 'var(--system-blue)' },
              { key: 'MATCHED', label: 'Matched (_U)', count: scanResult ? scanResult.totalUsed : null, color: '#10E79D' },
              { key: 'UNMATCHED', label: 'Missing (_R)', count: scanResult ? scanResult.totalMissing : null, color: '#EF4444' },
              { key: 'IGNORED', label: 'Ignored (_P/_V)', count: scanResult ? (scanResult.totalIgnored || 0) : null, color: 'var(--tertiary-label)' },
            ] as const
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 7,
                border:
                  statusFilter === f.key
                    ? `1px solid ${f.color}`
                    : '1px solid var(--border)',
                backgroundColor:
                  statusFilter === f.key
                    ? `${f.color}18`
                    : 'transparent',
                color: statusFilter === f.key ? f.color : 'var(--secondary-label)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <span>{f.label}</span>
              {f.count !== null && (
                <span
                  style={{
                    padding: '1px 5px',
                    borderRadius: 999,
                    fontSize: 9.5,
                    fontWeight: 700,
                    backgroundColor: statusFilter === f.key ? f.color : 'rgba(255, 255, 255, 0.08)',
                    color: statusFilter === f.key ? '#000000' : 'var(--secondary-label)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Dry Run + Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              fontSize: 11.5,
              color: 'var(--secondary-label)',
            }}
          >
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Dry Run
          </label>

          <StudioButton
            variant={dryRun ? 'secondary' : 'success'}
            loading={isRenaming}
            icon={<Check size={14} />}
            onClick={handleExecuteRename}
            disabled={!scanResult || scanResult.all_items.length === 0}
            style={
              !dryRun
                ? {
                    background: 'linear-gradient(135deg, #10E79D, #0BC47C)',
                    boxShadow: '0 4px 16px rgba(16, 231, 157, 0.35)',
                  }
                : undefined
            }
          >
            {dryRun ? 'Validate Renaming' : 'Apply _U / _R Tags'}
          </StudioButton>
        </div>
      </div>

      {/* ── Pre-Rename Summary Banner ──────────────────── */}
      {scanResult && scanResult.all_items.length > 0 && (() => {
        const renameableCount = scanResult.all_items.filter((i) => i.willRename).length;
        return (
          <div
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              backgroundColor: renameableCount > 0 ? 'rgba(191, 90, 242, 0.08)' : 'rgba(16, 231, 157, 0.08)',
              border: `1px solid ${renameableCount > 0 ? 'rgba(191, 90, 242, 0.3)' : 'rgba(16, 231, 157, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 11.5,
              fontFamily: 'var(--font-mono)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={14} color={renameableCount > 0 ? '#BF5AF2' : '#10E79D'} />
              <span>
                {renameableCount > 0
                  ? `${renameableCount} file(s) queued for renaming (${scanResult.totalUsed} will be tagged _U, ${scanResult.totalMissing} will be tagged _R).`
                  : 'All remaining photos are already correctly tagged or ignored.'}
              </span>
            </div>
            <span style={{ fontSize: 10.5, color: 'var(--secondary-label)' }}>
              Report saved to: Document/ folder
            </span>
          </div>
        );
      })()}

      {/* ── Results Table ─────────────────────────────────────── */}
      <div
        className="glass-card"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minHeight: 300,
        }}
      >
        {/* Table Header */}
        <div
          style={{
            height: 40,
            backgroundColor: 'var(--surface-elevated)',
            borderBottom: '1px solid var(--border)',
            display: 'grid',
            gridTemplateColumns: '90px 2fr 1.5fr 2fr 0.8fr',
            alignItems: 'center',
            padding: '0 16px',
            fontSize: 10.5,
            fontWeight: 700,
            color: 'var(--tertiary-label)',
            letterSpacing: 0.6,
            fontFamily: 'var(--font-mono)',
            gap: 8,
          }}
        >
          <span>STATUS</span>
          <span>CURRENT FILENAME</span>
          <span>DATE FOLDER</span>
          <span>PROPOSED NEW NAME</span>
          <span style={{ textAlign: 'right' }}>LOCATE</span>
        </div>

        {/* Table Body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredItems.length === 0 ? (
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
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(59, 130, 246, 0.08)',
                }}
              >
                <Tag size={26} color="#3B82F6" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--label)' }}>
                  {scanResult ? 'No Photos Match Selected Filter' : 'Awaiting Photo Analysis'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--secondary-label)', maxWidth: 420, lineHeight: 1.5 }}>
                  {scanResult
                    ? 'No items matched the active filter. Click "All" above to view every scanned photo.'
                    : 'Select a production root directory above and click "Scan & Compare" to inspect sequence matching.'}
                </span>
              </div>
              {scanResult && statusFilter !== 'ALL' ? (
                <StudioButton variant="secondary" size="sm" onClick={() => setStatusFilter('ALL')}>
                  Show All Photos
                </StudioButton>
              ) : !targetDir.trim() ? (
                <StudioButton variant="secondary" size="sm" onClick={handleBrowseDir} icon={<Folder size={13} />}>
                  Browse Directory
                </StudioButton>
              ) : null}
            </div>
          ) : (
            filteredItems.map((item, idx) => (
              <ResultRow
                key={idx}
                item={item}
                idx={idx}
                onLocate={async (p) => {
                  if (window.electronAPI) window.electronAPI.showItemInFolder(p);
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Live Operation Loading Overlay */}
      <OperationLoadingOverlay
        isOpen={isScanning || isRenaming}
        title={isScanning ? 'Scanning & Comparing Media Directory...' : 'Applying Sequence Renaming...'}
        subtitle={
          isScanning
            ? 'Auditing photos across event date folders and matching sequence tokens...'
            : `Renaming matched files with _U and unmatched files with _R status tags...`
        }
        accentColor="#3B82F6"
      />
    </div>
  );
};

// ── Sub-component: Result Row ────────────────────────────────────────────────
interface ResultRowProps {
  item: PhotoMatchItem;
  idx: number;
  onLocate: (path: string) => void;
}

const ResultRow: React.FC<ResultRowProps> = ({ item, idx, onLocate }) => {
  const isIgnored = item.status === 'Ignored';
  const isUsed = item.isUsed;

  const statusColor = isIgnored
    ? 'var(--tertiary-label)'
    : isUsed
    ? '#10E79D'
    : '#EF4444';

  const statusBg = isIgnored
    ? 'rgba(255, 255, 255, 0.05)'
    : isUsed
    ? 'rgba(16, 231, 157, 0.12)'
    : 'rgba(239, 68, 68, 0.12)';

  const statusBorder = isIgnored
    ? 'var(--border)'
    : isUsed
    ? 'rgba(16, 231, 157, 0.4)'
    : 'rgba(239, 68, 68, 0.4)';

  return (
    <div
      style={{
        height: 42,
        display: 'grid',
        gridTemplateColumns: '90px 2fr 1.5fr 2fr 0.8fr',
        alignItems: 'center',
        padding: '0 16px',
        gap: 8,
        borderBottom: '1px solid var(--border-subtle)',
        fontSize: 11.5,
        fontFamily: 'var(--font-mono)',
        color: 'var(--label)',
        backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.012)',
        transition: 'background 0.1s',
      }}
    >
      {/* Status Badge */}
      <div>
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 700,
            color: statusColor,
            backgroundColor: statusBg,
            border: `1px solid ${statusBorder}`,
            whiteSpace: 'nowrap',
          }}
        >
          {isIgnored ? 'IGNORED' : isUsed ? '_U' : '_R'}
        </span>
      </div>

      {/* Filename */}
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: 'var(--label)',
        }}
      >
        {item.filename}
      </span>

      {/* Date Folder */}
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: 'var(--secondary-label)',
          fontSize: 11,
        }}
      >
        {item.folderLabel || item.dateFolder}
      </span>

      {/* Target Filename */}
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: statusColor,
          fontWeight: isIgnored ? 400 : 600,
        }}
      >
        {item.targetFilename}
      </span>

      {/* Locate Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => onLocate(item.sourcePath)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--system-blue)',
            fontSize: 10.5,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            padding: '4px 8px',
            borderRadius: 6,
            transition: 'background 0.1s',
          }}
          title="Locate file in Windows Explorer"
        >
          <FolderOpen size={11} />
          Locate
        </button>
      </div>
    </div>
  );
};
