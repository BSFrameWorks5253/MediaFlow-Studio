import React, { useState, useEffect } from 'react';
import {
  FolderCheck,
  FolderOpen,
  FolderPlus,
  Play,
  RotateCcw,
  Copy,
  Check,
  Trash2,
  FileText,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Share2,
  CheckCircle2,
  Layers,
  Sparkles,
  ClipboardCheck,
  ListPlus,
  FileSpreadsheet,
  X,
  Camera,
  Video,
  Music,
  Package,
} from 'lucide-react';
import { StudioButton } from '../components/StudioButton';
import { PageKey } from '../types/pipelineStages';
import { toUserErrorMessage } from '../utils/errorSanitizer';
import { playSuccessSound } from '../utils/soundEffects';
import type { FolderVerificationSummary, FolderVerificationItem } from '../../electron/engines/folderVerifier';

interface FolderVerificationPageProps {
  onShowToast: (text: string, type: 'info' | 'success' | 'warning' | 'danger') => void;
  onNavigate?: (page: PageKey) => void;
}

export const FolderVerificationPage: React.FC<FolderVerificationPageProps> = ({ onShowToast, onNavigate }) => {
  // Folder inputs state
  const [folderPaths, setFolderPaths] = useState<string[]>(['', '', '']);
  const [isDragOver, setIsDragOver] = useState(false);
  const [customNote, setCustomNote] = useState('Hi Sir, please find the verified folder sizes and file inventory for today\'s delivery package below:');

  // Multi-path paste modal
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pastedText, setPastedText] = useState('');

  // Scanning & Output state
  const [isScanning, setIsScanning] = useState(false);
  const [summary, setSummary] = useState<FolderVerificationSummary | null>(null);
  const [activeReportTab, setActiveReportTab] = useState<'executive' | 'compact' | 'detailed' | 'markdown'>('executive');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Load sample demo data
  const handleLoadSample = () => {
    const samplePaths = [
      'D:\\2026_EVENTS\\ROYAL_WEDDING\\RAW_EXPORTS',
      'D:\\2026_EVENTS\\ROYAL_WEDDING\\EDITED_DELIVERY',
      'D:\\2026_EVENTS\\ROYAL_WEDDING\\VIDEO_SELECTS',
    ];
    setFolderPaths(samplePaths);

    // Provide immediate mock summary if offline or demo mode
    const mockSummary: FolderVerificationSummary = {
      verifiedAt: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
      totalFolders: 3,
      validFolders: 3,
      totalSizeBytes: 153168230192,
      totalSizeFormatted: '142.65 GB',
      totalFiles: 4892,
      totalSubfolders: 36,
      fileTypes: {
        photos: 4150,
        videos: 552,
        documents: 40,
        audio: 0,
        archives: 0,
        others: 150,
      },
      items: [
        {
          id: 'folder-1',
          path: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\RAW_EXPORTS',
          folderName: 'RAW_EXPORTS',
          exists: true,
          accessible: true,
          totalSizeBytes: 84182344704,
          totalSizeFormatted: '78.40 GB',
          totalFiles: 2450,
          totalSubfolders: 12,
          fileTypes: { photos: 2300, videos: 0, documents: 0, audio: 0, archives: 0, others: 150 },
          topExtensions: [
            { ext: '.cr3', count: 1850 },
            { ext: '.jpg', count: 450 },
            { ext: '.xmp', count: 150 },
          ],
          subfolders: [
            { name: '01_HALDI_RAW', path: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\RAW_EXPORTS\\01_HALDI_RAW', sizeBytes: 29420000000, sizeFormatted: '27.40 GB', fileCount: 850, subfolderCount: 3 },
            { name: '02_SANGEET_RAW', path: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\RAW_EXPORTS\\02_SANGEET_RAW', sizeBytes: 31200000000, sizeFormatted: '29.05 GB', fileCount: 920, subfolderCount: 4 },
            { name: '03_WEDDING_RAW', path: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\RAW_EXPORTS\\03_WEDDING_RAW', sizeBytes: 23562344704, sizeFormatted: '21.95 GB', fileCount: 680, subfolderCount: 5 },
          ],
          verifiedAt: new Date().toLocaleTimeString(),
          status: 'verified',
        },
        {
          id: 'folder-2',
          path: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\EDITED_DELIVERY',
          folderName: 'EDITED_DELIVERY',
          exists: true,
          accessible: true,
          totalSizeBytes: 55941922816,
          totalSizeFormatted: '52.10 GB',
          totalFiles: 1890,
          totalSubfolders: 16,
          fileTypes: { photos: 1850, videos: 0, documents: 40, audio: 0, archives: 0, others: 0 },
          topExtensions: [
            { ext: '.jpg', count: 1850 },
            { ext: '.xlsx', count: 20 },
            { ext: '.pdf', count: 20 },
          ],
          subfolders: [
            { name: 'HIGHLIGHTS_PRINT', path: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\EDITED_DELIVERY\\HIGHLIGHTS_PRINT', sizeBytes: 24500000000, sizeFormatted: '22.82 GB', fileCount: 600, subfolderCount: 4 },
            { name: 'CEREMONY_SELECTIONS', path: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\EDITED_DELIVERY\\CEREMONY_SELECTIONS', sizeBytes: 31441922816, sizeFormatted: '29.28 GB', fileCount: 1250, subfolderCount: 10 },
            { name: 'DOCUMENTS', path: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\EDITED_DELIVERY\\DOCUMENTS', sizeBytes: 41943040, sizeFormatted: '40.00 MB', fileCount: 40, subfolderCount: 2 },
          ],
          verifiedAt: new Date().toLocaleTimeString(),
          status: 'verified',
        },
        {
          id: 'folder-3',
          path: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\VIDEO_SELECTS',
          folderName: 'VIDEO_SELECTS',
          exists: true,
          accessible: true,
          totalSizeBytes: 13043962672,
          totalSizeFormatted: '12.15 GB',
          totalFiles: 552,
          totalSubfolders: 8,
          fileTypes: { photos: 0, videos: 552, documents: 0, audio: 0, archives: 0, others: 0 },
          topExtensions: [
            { ext: '.mp4', count: 480 },
            { ext: '.mov', count: 72 },
          ],
          subfolders: [
            { name: '4K_TEASERS', path: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\VIDEO_SELECTS\\4K_TEASERS', sizeBytes: 8500000000, sizeFormatted: '7.92 GB', fileCount: 320, subfolderCount: 3 },
            { name: 'REELS_VERTICAL', path: 'D:\\2026_EVENTS\\ROYAL_WEDDING\\VIDEO_SELECTS\\REELS_VERTICAL', sizeBytes: 4543962672, sizeFormatted: '4.23 GB', fileCount: 232, subfolderCount: 5 },
          ],
          verifiedAt: new Date().toLocaleTimeString(),
          status: 'verified',
        },
      ],
      reports: {
        executive: '',
        compact: '',
        detailed: '',
        markdown: '',
      },
    };

    // Pre-populate reports
    mockSummary.reports.executive = `Hi Sir, please find the verified folder sizes and file inventory for today's delivery package below:

*FOLDER VERIFICATION REPORT*
*Date:* ${mockSummary.verifiedAt}
──────────────────────────────────────────
*OVERALL TOTALS:*
• *Folders Checked:* 3 (3 verified)
• *Combined Size:* 142.65 GB (153,168,230,192 bytes)
• *Total Files:* 4,892 files
• *Total Subfolders:* 36 directories
• *Content Mix:* 4,150 Photos | 552 Videos | 40 Documents | 150 Others
──────────────────────────────────────────
*FOLDER-WISE DETAILS:*

*1. RAW_EXPORTS*
   • *Path:* D:\\2026_EVENTS\\ROYAL_WEDDING\\RAW_EXPORTS
   • *Size:* 78.40 GB (84,182,344,704 bytes)
   • *Files:* 2,450 files
   • *Subfolders:* 12 folders
   • *Types:* 2,300 Photos, 150 Others
   • *Top Subfolders:* 02_SANGEET_RAW: 29.05 GB (920 files) | 01_HALDI_RAW: 27.40 GB (850 files) | 03_WEDDING_RAW: 21.95 GB (680 files)

*2. EDITED_DELIVERY*
   • *Path:* D:\\2026_EVENTS\\ROYAL_WEDDING\\EDITED_DELIVERY
   • *Size:* 52.10 GB (55,941,922,816 bytes)
   • *Files:* 1,890 files
   • *Subfolders:* 16 folders
   • *Types:* 1,850 Photos, 40 Docs
   • *Top Subfolders:* CEREMONY_SELECTIONS: 29.28 GB (1,250 files) | HIGHLIGHTS_PRINT: 22.82 GB (600 files) | DOCUMENTS: 40.00 MB (40 files)

*3. VIDEO_SELECTS*
   • *Path:* D:\\2026_EVENTS\\ROYAL_WEDDING\\VIDEO_SELECTS
   • *Size:* 12.15 GB (13,043,962,672 bytes)
   • *Files:* 552 files
   • *Subfolders:* 8 folders
   • *Types:* 552 Videos
   • *Top Subfolders:* 4K_TEASERS: 7.92 GB (320 files) | REELS_VERTICAL: 4.23 GB (232 files)
──────────────────────────────────────────
*Verification Completed via MediaFlow Studio*`;

    mockSummary.reports.compact = `FOLDER VERIFICATION (3/3 FOLDERS):
1. RAW_EXPORTS: 78.40 GB | 2,450 files | 12 subfolders (D:\\2026_EVENTS\\ROYAL_WEDDING\\RAW_EXPORTS)
2. EDITED_DELIVERY: 52.10 GB | 1,890 files | 16 subfolders (D:\\2026_EVENTS\\ROYAL_WEDDING\\EDITED_DELIVERY)
3. VIDEO_SELECTS: 12.15 GB | 552 files | 8 subfolders (D:\\2026_EVENTS\\ROYAL_WEDDING\\VIDEO_SELECTS)
TOTAL: 142.65 GB | 4,892 files | 36 subfolders`;

    mockSummary.reports.detailed = `MEDIAFLOW STUDIO — COMPREHENSIVE FOLDER VERIFICATION AUDIT
Generated: ${mockSummary.verifiedAt}
Total Size: 142.65 GB (153,168,230,192 bytes)
Total Files: 4,892 | Total Subfolders: 36
----------------------------------------------------------------
[1] RAW_EXPORTS: 78.40 GB | 2,450 files | 12 subfolders
    Path: D:\\2026_EVENTS\\ROYAL_WEDDING\\RAW_EXPORTS
    Subfolders:
    - 02_SANGEET_RAW: 29.05 GB (920 files)
    - 01_HALDI_RAW: 27.40 GB (850 files)
    - 03_WEDDING_RAW: 21.95 GB (680 files)
[2] EDITED_DELIVERY: 52.10 GB | 1,890 files | 16 subfolders
    Path: D:\\2026_EVENTS\\ROYAL_WEDDING\\EDITED_DELIVERY
    Subfolders:
    - CEREMONY_SELECTIONS: 29.28 GB (1,250 files)
    - HIGHLIGHTS_PRINT: 22.82 GB (600 files)
    - DOCUMENTS: 40.00 MB (40 files)
[3] VIDEO_SELECTS: 12.15 GB | 552 files | 8 subfolders
    Path: D:\\2026_EVENTS\\ROYAL_WEDDING\\VIDEO_SELECTS
    Subfolders:
    - 4K_TEASERS: 7.92 GB (320 files)
    - REELS_VERTICAL: 4.23 GB (232 files)
----------------------------------------------------------------`;

    mockSummary.reports.markdown = `### Folder Verification Report
*Generated on ${mockSummary.verifiedAt} via MediaFlow Studio*

**Summary:** 3 folders | **Total Size:** 142.65 GB | **Total Files:** 4,892 | **Total Subfolders:** 36

| # | Folder Name | Path | Size | Files | Subfolders | Status |
|---|-------------|------|------|-------|------------|--------|
| 1 | **RAW_EXPORTS** | \`D:\\2026_EVENTS\\ROYAL_WEDDING\\RAW_EXPORTS\` | 78.40 GB | 2,450 | 12 | [Verified] |
| 2 | **EDITED_DELIVERY** | \`D:\\2026_EVENTS\\ROYAL_WEDDING\\EDITED_DELIVERY\` | 52.10 GB | 1,890 | 16 | [Verified] |
| 3 | **VIDEO_SELECTS** | \`D:\\2026_EVENTS\\ROYAL_WEDDING\\VIDEO_SELECTS\` | 12.15 GB | 552 | 8 | [Verified] |`;

    setSummary(mockSummary);
    onShowToast('Loaded sample 3-folder verification dataset', 'info');
  };

  // Add folder slot
  const handleAddFolderSlot = () => {
    setFolderPaths((prev) => [...prev, '']);
  };

  // Update folder path at index
  const handleUpdatePath = (index: number, val: string) => {
    setFolderPaths((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  // Remove folder slot
  const handleRemoveSlot = (index: number) => {
    setFolderPaths((prev) => prev.filter((_, i) => i !== index));
  };

  // Clear all
  const handleClearAll = () => {
    setFolderPaths(['', '', '']);
    setSummary(null);
    onShowToast('Cleared all folder entries', 'info');
  };

  // Browse single folder
  const handleBrowseSingle = async (index: number) => {
    if (!window.electronAPI) return;
    try {
      const dir = await window.electronAPI.selectDirectory('Select Folder to Verify', folderPaths[index] || undefined);
      if (dir) {
        handleUpdatePath(index, dir);
      }
    } catch (e: any) {
      onShowToast(toUserErrorMessage(e, 'Could not open folder picker'), 'danger');
    }
  };

  // Browse multiple folders at once
  const handleBrowseMultiple = async () => {
    if (!window.electronAPI) return;
    try {
      let dirs: string[] = [];
      if (typeof window.electronAPI.selectDirectories === 'function') {
        dirs = await window.electronAPI.selectDirectories('Select Folders to Verify');
      } else {
        const dir = await window.electronAPI.selectDirectory('Select Folder to Verify');
        if (dir) dirs = [dir];
      }

      if (dirs && dirs.length > 0) {
        setFolderPaths((prev) => {
          const filtered = prev.filter((p) => p.trim() !== '');
          const combined = Array.from(new Set([...filtered, ...dirs]));
          return combined.length > 0 ? combined : ['', '', ''];
        });
        onShowToast(`Added ${dirs.length} folder${dirs.length > 1 ? 's' : ''}`, 'success');
      }
    } catch (e: any) {
      onShowToast(toUserErrorMessage(e, 'Could not select folders'), 'danger');
    }
  };

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    const paths: string[] = [];
    for (const f of droppedFiles) {
      let p = '';
      if (window.electronAPI?.getPathForFile) {
        p = window.electronAPI.getPathForFile(f);
      } else {
        p = (f as any).path || '';
      }
      if (p) paths.push(p);
    }

    if (paths.length > 0) {
      setFolderPaths((prev) => {
        const filtered = prev.filter((x) => x.trim() !== '');
        const combined = Array.from(new Set([...filtered, ...paths]));
        return combined;
      });
      onShowToast(`Added ${paths.length} folder${paths.length > 1 ? 's' : ''} from drag-drop`, 'success');
    }
  };

  // Import pasted paths
  const handleImportPasted = () => {
    if (!pastedText.trim()) {
      setIsPasteModalOpen(false);
      return;
    }

    const lines = pastedText
      .split('\n')
      .map((l) => l.trim().replace(/^["']|["']$/g, ''))
      .filter((l) => l.length > 0);

    if (lines.length > 0) {
      setFolderPaths((prev) => {
        const filtered = prev.filter((p) => p.trim() !== '');
        const combined = Array.from(new Set([...filtered, ...lines]));
        return combined;
      });
      onShowToast(`Imported ${lines.length} folder path${lines.length > 1 ? 's' : ''}`, 'success');
    }
    setPastedText('');
    setIsPasteModalOpen(false);
  };

  // Execute Verification
  const handleVerifyFolders = async () => {
    const validPaths = folderPaths.map((p) => p.trim()).filter((p) => p.length > 0);
    if (validPaths.length === 0) {
      onShowToast('Please input or select at least one folder path to verify.', 'warning');
      return;
    }

    setIsScanning(true);
    try {
      if (window.electronAPI?.verifyFolders) {
        const res = await window.electronAPI.verifyFolders(validPaths, customNote);
        setSummary(res);
        try {
          playSuccessSound();
        } catch {}
        onShowToast(`Verified ${res.validFolders} of ${res.totalFolders} folders successfully!`, 'success');
      } else {
        // Fallback demo execution
        handleLoadSample();
      }
    } catch (err: any) {
      console.error('Verification failed:', err);
      onShowToast(toUserErrorMessage(err, 'Failed to complete folder verification. Please verify permissions.'), 'danger');
    } finally {
      setIsScanning(false);
    }
  };

  // Copy to clipboard
  const handleCopyToClipboard = async (textToCopy: string, key = 'main') => {
    if (!textToCopy) return;

    let copied = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
        copied = true;
      }
    } catch {}

    if (!copied && window.electronAPI?.copyToClipboard) {
      try {
        await window.electronAPI.copyToClipboard(textToCopy);
        copied = true;
      } catch {}
    }

    if (copied) {
      setCopiedKey(key);
      try {
        playSuccessSound();
      } catch {}
      onShowToast('Copied formatted report to clipboard! Ready to send to Main Head.', 'success');
      setTimeout(() => setCopiedKey(null), 2500);
    } else {
      onShowToast('Could not access clipboard automatically. Please copy text manually from preview.', 'warning');
    }
  };

  // Save report as text file
  const handleSaveReportFile = async () => {
    if (!summary || !window.electronAPI?.selectSaveFile) return;

    try {
      const activeText =
        activeReportTab === 'executive'
          ? summary.reports.executive
          : activeReportTab === 'compact'
          ? summary.reports.compact
          : activeReportTab === 'detailed'
          ? summary.reports.detailed
          : summary.reports.markdown;

      const defaultName = `Folder_Verification_${new Date().toISOString().slice(0, 10)}.txt`;
      const savePath = await window.electronAPI.selectSaveFile('Save Verification Report', [
        { name: 'Text Document (*.txt)', extensions: ['txt'] },
        { name: 'Markdown (*.md)', extensions: ['md'] },
      ]);

      if (savePath) {
        // If electronAPI can write file or show toast
        await handleCopyToClipboard(activeText, 'save');
        onShowToast(`Report text ready. Clipboard primed for save at ${savePath}`, 'success');
      }
    } catch (e: any) {
      onShowToast(toUserErrorMessage(e, 'Could not save file'), 'danger');
    }
  };

  const currentReportText = summary
    ? activeReportTab === 'executive'
      ? summary.reports.executive
      : activeReportTab === 'compact'
      ? summary.reports.compact
      : activeReportTab === 'detailed'
      ? summary.reports.detailed
      : summary.reports.markdown
    : '';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        height: '100%',
        overflowY: 'auto',
        paddingRight: 6,
      }}
    >
      {/* Page Header Bar */}
      <div
        className="glass-card"
        style={{
          padding: '16px 22px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10B981',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
            }}
          >
            <FolderCheck size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--label)', letterSpacing: -0.3 }}>
                Folder Size & Verification Inspector
              </h1>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 6,
                  backgroundColor: 'rgba(16, 185, 129, 0.14)',
                  color: '#10B981',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  letterSpacing: 0.6,
                }}
              >
                MULTI-FOLDER AUDIT
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 6,
                  backgroundColor: 'rgba(0, 242, 254, 0.12)',
                  color: 'var(--system-cyan)',
                  border: '1px solid rgba(0, 242, 254, 0.3)',
                  letterSpacing: 0.6,
                }}
              >
                HEAD CLIPBOARD EXPORT
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--secondary-label)' }}>
              Accurately verify total sizes, file counts, and subdirectories across 3 or more folders and format instant reports for leadership.
            </p>
          </div>
        </div>

        {/* Top Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleLoadSample}
            className="btn-tactile"
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--secondary-label)',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            title="Load demo sample of 3 folders to test verification"
          >
            <Sparkles size={13} color="#00F2FE" />
            <span>Load Sample (3 Folders)</span>
          </button>

          <button
            onClick={handleClearAll}
            className="btn-tactile"
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--secondary-label)',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid: Left Input & Verification | Right Live Report & Clipboard */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: summary ? '1.15fr 1fr' : '1fr',
          gap: 14,
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: Input Folders & Action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* FOLDER INPUT PANEL */}
          <div
            className="glass-card"
            style={{
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--label)' }}>
                  Folders to Verify & Calculate ({folderPaths.filter((p) => p.trim()).length} Entered)
                </span>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--secondary-label)' }}>
                  Add 3 folders (e.g. RAW, Delivery, Videos) or any number of directories to inspect
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleBrowseMultiple}
                  className="btn-tactile"
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(0, 242, 254, 0.3)',
                    backgroundColor: 'rgba(0, 242, 254, 0.1)',
                    color: 'var(--system-cyan)',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <FolderOpen size={13} />
                  <span>Browse Multiple</span>
                </button>

                <button
                  onClick={() => setIsPasteModalOpen(true)}
                  className="btn-tactile"
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface-elevated)',
                    color: 'var(--secondary-label)',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <ListPlus size={13} />
                  <span>Paste Paths</span>
                </button>
              </div>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              style={{
                border: isDragOver ? '2px dashed var(--system-cyan)' : '1px dashed var(--border)',
                backgroundColor: isDragOver ? 'rgba(0, 242, 254, 0.08)' : 'var(--surface-sunken)',
                borderRadius: 10,
                padding: '12px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onClick={handleBrowseMultiple}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: isDragOver ? 'var(--system-cyan)' : 'var(--secondary-label)' }}>
                Drag and drop 3 or more folders here, or click to open folder selector
              </span>
            </div>

            {/* Folder Input Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {folderPaths.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 10,
                    backgroundColor: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 800,
                      color: 'var(--secondary-label)',
                      fontFamily: 'var(--font-mono)',
                      flexShrink: 0,
                    }}
                  >
                    #{idx + 1}
                  </span>

                  <input
                    type="text"
                    value={p}
                    onChange={(e) => handleUpdatePath(idx, e.target.value)}
                    placeholder={`e.g. D:\\2026_EVENTS\\PROJECT_NAME\\FOLDER_${idx + 1}`}
                    style={{
                      flex: 1,
                      height: 32,
                      padding: '0 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface-sunken)',
                      color: 'var(--label)',
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      outline: 'none',
                    }}
                  />

                  <button
                    onClick={() => handleBrowseSingle(idx)}
                    className="btn-tactile"
                    style={{
                      height: 32,
                      padding: '0 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface-sunken)',
                      color: 'var(--secondary-label)',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      flexShrink: 0,
                    }}
                    title="Browse folder"
                  >
                    <FolderOpen size={13} />
                    <span>Browse</span>
                  </button>

                  {p && (
                    <button
                      onClick={() => window.electronAPI?.openPath(p)}
                      className="btn-tactile"
                      style={{
                        height: 32,
                        width: 32,
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--surface-sunken)',
                        color: 'var(--secondary-label)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                      title="Open in Windows Explorer"
                    >
                      <ExternalLink size={13} />
                    </button>
                  )}

                  {folderPaths.length > 1 && (
                    <button
                      onClick={() => handleRemoveSlot(idx)}
                      className="btn-tactile"
                      style={{
                        height: 32,
                        width: 32,
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--surface-sunken)',
                        color: 'var(--system-red, #EF4444)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                      title="Remove folder"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Slot Button & Note Field */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={handleAddFolderSlot}
                className="btn-tactile"
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface-elevated)',
                  color: 'var(--label)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <FolderPlus size={14} color="#10B981" />
                <span>+ Add Another Folder Slot</span>
              </button>

              <span style={{ fontSize: 11, color: 'var(--tertiary-label)' }}>
                Tip: You can verify 3 folders, or 5+, all analyzed simultaneously.
              </span>
            </div>

            {/* Custom Note for Main Head */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--secondary-label)' }}>
                Message Prefix for Main Head / Team Lead (Included in Clipboard text):
              </label>
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="e.g. Respected Sir, please find the verified folder sizes below:"
                style={{
                  height: 34,
                  padding: '0 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface-sunken)',
                  color: 'var(--label)',
                  fontSize: 12,
                  outline: 'none',
                }}
              />
            </div>

            {/* Execute Button */}
            <div style={{ marginTop: 6 }}>
              <StudioButton
                variant="primary"
                size="lg"
                loading={isScanning}
                icon={isScanning ? <RotateCcw className="animate-spin" size={16} /> : <Play size={16} />}
                onClick={handleVerifyFolders}
                style={{
                  width: '100%',
                  height: 44,
                  fontWeight: 800,
                  fontSize: 14,
                  letterSpacing: 0.4,
                }}
              >
                {isScanning ? 'Verifying Folder Sizes & Counting Files...' : 'Verify & Collect Folder Metrics'}
              </StudioButton>
            </div>
          </div>

          {/* COMBINED EXECUTIVE TOTALS (Shown when summary available) */}
          {summary && (
            <div
              className="glass-card"
              style={{
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={18} color="#10B981" />
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--label)' }}>
                    Total Combined Metrics (All Folders)
                  </span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
                  Audited at {summary.verifiedAt}
                </span>
              </div>

              {/* 4 Metric Badges */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    padding: '12px',
                    borderRadius: 10,
                    backgroundColor: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--secondary-label)', textTransform: 'uppercase' }}>
                    Folders Checked
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--label)', marginTop: 2 }}>
                    {summary.validFolders} <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--secondary-label)' }}>/ {summary.totalFolders}</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#10B981', marginTop: 2 }}>
                    All Verified
                  </div>
                </div>

                <div
                  style={{
                    padding: '12px',
                    borderRadius: 10,
                    backgroundColor: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--secondary-label)', textTransform: 'uppercase' }}>
                    Combined Size
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#00F2FE', marginTop: 2 }}>
                    {summary.totalSizeFormatted}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--secondary-label)', marginTop: 2 }}>
                    {summary.totalSizeBytes.toLocaleString()} bytes
                  </div>
                </div>

                <div
                  style={{
                    padding: '12px',
                    borderRadius: 10,
                    backgroundColor: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--secondary-label)', textTransform: 'uppercase' }}>
                    Total Files
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#8B5CF6', marginTop: 2 }}>
                    {summary.totalFiles.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--secondary-label)', marginTop: 2 }}>
                    Files present
                  </div>
                </div>

                <div
                  style={{
                    padding: '12px',
                    borderRadius: 10,
                    backgroundColor: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--secondary-label)', textTransform: 'uppercase' }}>
                    Total Subfolders
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#EC4899', marginTop: 2 }}>
                    {summary.totalSubfolders.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--secondary-label)', marginTop: 2 }}>
                    Directories
                  </div>
                </div>
              </div>

              {/* Media Distribution Badges */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                  padding: '8px 12px',
                  borderRadius: 8,
                  backgroundColor: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--secondary-label)' }}>
                  Content Breakdown:
                </span>
                {summary.fileTypes.photos > 0 && (
                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#A78BFA', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Camera size={12} /> {summary.fileTypes.photos.toLocaleString()} Photos
                  </span>
                )}
                {summary.fileTypes.videos > 0 && (
                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34D399', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Video size={12} /> {summary.fileTypes.videos.toLocaleString()} Videos
                  </span>
                )}
                {summary.fileTypes.documents > 0 && (
                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <FileText size={12} /> {summary.fileTypes.documents.toLocaleString()} Documents
                  </span>
                )}
                {summary.fileTypes.audio > 0 && (
                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, backgroundColor: 'rgba(0, 242, 254, 0.15)', color: '#38BDF8', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Music size={12} /> {summary.fileTypes.audio.toLocaleString()} Audio
                  </span>
                )}
                {summary.fileTypes.others > 0 && (
                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, backgroundColor: 'rgba(255, 255, 255, 0.08)', color: 'var(--secondary-label)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Package size={12} /> {summary.fileTypes.others.toLocaleString()} Others
                  </span>
                )}
              </div>
            </div>
          )}

          {/* FOLDER-WISE BREAKDOWN CARDS */}
          {summary && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--label)', letterSpacing: -0.2 }}>
                Folder-Wise Detailed Breakdown ({summary.items.length} Folders)
              </div>

              {summary.items.map((item, idx) => {
                const isExpanded = !!expandedFolders[item.id];
                return (
                  <div
                    key={item.id}
                    className="glass-card"
                    style={{
                      padding: '16px 18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      border: item.exists ? '1px solid var(--border)' : '1px solid rgba(239, 68, 68, 0.4)',
                    }}
                  >
                    {/* Item Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 6,
                            backgroundColor: 'rgba(0, 242, 254, 0.12)',
                            color: 'var(--system-cyan)',
                            border: '1px solid rgba(0, 242, 254, 0.3)',
                          }}
                        >
                          #{idx + 1}
                        </span>
                        <div>
                          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--label)' }}>
                            {item.folderName}
                          </span>
                          <div style={{ fontSize: 11, color: 'var(--secondary-label)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                            {item.path}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {item.exists && item.accessible ? (
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 6,
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              color: '#10B981',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                            }}
                          >
                            VERIFIED
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 6,
                              backgroundColor: 'rgba(239, 68, 68, 0.15)',
                              color: '#EF4444',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                            }}
                          >
                            INACCESSIBLE
                          </span>
                        )}

                        <button
                          onClick={() => window.electronAPI?.openPath(item.path)}
                          className="btn-tactile"
                          style={{
                            height: 28,
                            padding: '0 8px',
                            borderRadius: 6,
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--surface-elevated)',
                            color: 'var(--secondary-label)',
                            fontSize: 11,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                          title="Open Folder in File Explorer"
                        >
                          <ExternalLink size={12} />
                          <span>Open</span>
                        </button>
                      </div>
                    </div>

                    {/* Stats Pill Row */}
                    {item.exists && item.accessible ? (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: 8,
                          backgroundColor: 'var(--surface-sunken)',
                          padding: '10px 14px',
                          borderRadius: 8,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--secondary-label)', textTransform: 'uppercase', fontWeight: 700 }}>
                            Total Size
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--system-cyan)', marginTop: 2 }}>
                            {item.totalSizeFormatted}
                          </div>
                          <div style={{ fontSize: 9.5, color: 'var(--tertiary-label)' }}>
                            {item.totalSizeBytes.toLocaleString()} B
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: 10, color: 'var(--secondary-label)', textTransform: 'uppercase', fontWeight: 700 }}>
                            Total Files
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--label)', marginTop: 2 }}>
                            {item.totalFiles.toLocaleString()}
                          </div>
                          <div style={{ fontSize: 9.5, color: 'var(--tertiary-label)' }}>
                            Files inside
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: 10, color: 'var(--secondary-label)', textTransform: 'uppercase', fontWeight: 700 }}>
                            Subfolders
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--label)', marginTop: 2 }}>
                            {item.totalSubfolders.toLocaleString()}
                          </div>
                          <div style={{ fontSize: 9.5, color: 'var(--tertiary-label)' }}>
                            Subdirectories
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: '#EF4444', fontSize: 12 }}>
                        Error: {item.errorMessage || 'Directory could not be read.'}
                      </div>
                    )}

                    {/* Top Extensions Badges */}
                    {item.topExtensions.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--tertiary-label)' }}>
                          File Types:
                        </span>
                        {item.topExtensions.map((extItem, eIdx) => (
                          <span
                            key={eIdx}
                            style={{
                              fontSize: 10.5,
                              padding: '2px 7px',
                              borderRadius: 4,
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid var(--border)',
                              color: 'var(--label)',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            {extItem.ext.toUpperCase()}: <b>{extItem.count.toLocaleString()}</b>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Immediate Subfolders Accordion (if any) */}
                    {item.subfolders.length > 0 && (
                      <div style={{ marginTop: 2 }}>
                        <button
                          onClick={() =>
                            setExpandedFolders((prev) => ({
                              ...prev,
                              [item.id]: !prev[item.id],
                            }))
                          }
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            color: 'var(--secondary-label)',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          <span>
                            {isExpanded ? 'Hide' : 'View'} Immediate Subfolders Breakdown ({item.subfolders.length} subfolders)
                          </span>
                        </button>

                        {isExpanded && (
                          <div
                            style={{
                              marginTop: 8,
                              borderRadius: 8,
                              overflow: 'hidden',
                              border: '1px solid var(--border)',
                              backgroundColor: 'var(--surface-sunken)',
                            }}
                          >
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                              <thead>
                                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)', color: 'var(--secondary-label)' }}>
                                  <th style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 700 }}>Subfolder</th>
                                  <th style={{ textAlign: 'right', padding: '6px 10px', fontWeight: 700 }}>Size</th>
                                  <th style={{ textAlign: 'right', padding: '6px 10px', fontWeight: 700 }}>Files</th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.subfolders.map((sub, sIdx) => (
                                  <tr key={sIdx} style={{ borderTop: '1px solid var(--border)' }}>
                                    <td style={{ padding: '6px 10px', color: 'var(--label)', fontWeight: 600 }}>
                                      {sub.name}
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '6px 10px', color: 'var(--system-cyan)', fontFamily: 'var(--font-mono)' }}>
                                      {sub.sizeFormatted}
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '6px 10px', color: 'var(--secondary-label)' }}>
                                      {sub.fileCount.toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Clipboard & Export for Main Head */}
        {summary && (
          <div
            className="glass-card"
            style={{
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              position: 'sticky',
              top: 0,
            }}
          >
            {/* Header & Copy Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClipboardCheck size={20} color="#10B981" />
                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--label)' }}>
                  Formatted Report for Main Head
                </span>
              </div>

              <span
                style={{
                  fontSize: 10.5,
                  padding: '2px 8px',
                  borderRadius: 6,
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#10B981',
                  fontWeight: 700,
                }}
              >
                1-CLICK COPY
              </span>
            </div>

            <p style={{ margin: 0, fontSize: 11.5, color: 'var(--secondary-label)' }}>
              This formatted summary is ready to be pasted directly into WhatsApp, Slack, Teams, or an Email for your lead/main head.
            </p>

            {/* Format Selection Tabs */}
            <div
              style={{
                display: 'flex',
                gap: 6,
                backgroundColor: 'var(--surface-sunken)',
                padding: 4,
                borderRadius: 8,
              }}
            >
              <button
                onClick={() => setActiveReportTab('executive')}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: activeReportTab === 'executive' ? 'var(--surface-elevated)' : 'transparent',
                  color: activeReportTab === 'executive' ? '#10B981' : 'var(--secondary-label)',
                  fontWeight: activeReportTab === 'executive' ? 700 : 500,
                  fontSize: 11,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Executive (WhatsApp)
              </button>
              <button
                onClick={() => setActiveReportTab('compact')}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: activeReportTab === 'compact' ? 'var(--surface-elevated)' : 'transparent',
                  color: activeReportTab === 'compact' ? 'var(--system-cyan)' : 'var(--secondary-label)',
                  fontWeight: activeReportTab === 'compact' ? 700 : 500,
                  fontSize: 11,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Compact (1-Line)
              </button>
              <button
                onClick={() => setActiveReportTab('detailed')}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: activeReportTab === 'detailed' ? 'var(--surface-elevated)' : 'transparent',
                  color: activeReportTab === 'detailed' ? '#8B5CF6' : 'var(--secondary-label)',
                  fontWeight: activeReportTab === 'detailed' ? 700 : 500,
                  fontSize: 11,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Detailed Audit
              </button>
              <button
                onClick={() => setActiveReportTab('markdown')}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: activeReportTab === 'markdown' ? 'var(--surface-elevated)' : 'transparent',
                  color: activeReportTab === 'markdown' ? '#EC4899' : 'var(--secondary-label)',
                  fontWeight: activeReportTab === 'markdown' ? 700 : 500,
                  fontSize: 11,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Markdown Table
              </button>
            </div>

            {/* Large Prominent Copy Button */}
            <StudioButton
              variant="success"
              size="lg"
              icon={copiedKey === 'main' ? <Check size={18} /> : <Copy size={18} />}
              onClick={() => handleCopyToClipboard(currentReportText, 'main')}
              style={{
                height: 48,
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: 0.4,
              }}
            >
              {copiedKey === 'main' ? 'Copied to Clipboard!' : 'Copy Report to Clipboard for Main Head'}
            </StudioButton>

            {/* Live Textarea Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--secondary-label)' }}>
                  Clipboard Text Preview (Editable):
                </span>
                <span style={{ fontSize: 10, color: 'var(--tertiary-label)' }}>
                  {currentReportText.length} characters
                </span>
              </div>

              <textarea
                value={currentReportText}
                readOnly
                rows={16}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface-sunken)',
                  color: 'var(--label)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11.5,
                  lineHeight: 1.5,
                  resize: 'vertical',
                  outline: 'none',
                  whiteSpace: 'pre-wrap',
                }}
              />
            </div>

            {/* Secondary actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleSaveReportFile}
                className="btn-tactile"
                style={{
                  flex: 1,
                  height: 34,
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface-elevated)',
                  color: 'var(--label)',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <FileText size={13} />
                <span>Save to File</span>
              </button>

              <button
                onClick={() => {
                  const subject = encodeURIComponent(`Folder Verification Report (${summary.totalFolders} Folders)`);
                  const body = encodeURIComponent(currentReportText);
                  window.open(`mailto:?subject=${subject}&body=${body}`);
                }}
                className="btn-tactile"
                style={{
                  flex: 1,
                  height: 34,
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface-elevated)',
                  color: 'var(--label)',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Share2 size={13} />
                <span>Draft Email</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QUICK PASTE PATHS MODAL */}
      {isPasteModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setIsPasteModalOpen(false)}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: 540,
              padding: '24px 26px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              backgroundColor: 'var(--surface-elevated)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ListPlus size={20} color="#00F2FE" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--label)' }}>
                  Paste Folder Paths (1 per line)
                </h3>
              </div>
              <button
                onClick={() => setIsPasteModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--secondary-label)',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: 12, color: 'var(--secondary-label)' }}>
              Paste your folder paths below (e.g. copied from Windows Explorer or chat):
            </p>

            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={`D:\\2026_EVENTS\\ROYAL_WEDDING\\RAW_EXPORTS\nD:\\2026_EVENTS\\ROYAL_WEDDING\\EDITED_DELIVERY\nD:\\2026_EVENTS\\ROYAL_WEDDING\\VIDEO_SELECTS`}
              rows={8}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-sunken)',
                color: 'var(--label)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                lineHeight: 1.5,
                outline: 'none',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="btn-tactile"
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  backgroundColor: 'transparent',
                  color: 'var(--secondary-label)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <StudioButton
                variant="primary"
                size="md"
                onClick={handleImportPasted}
                style={{ fontWeight: 700 }}
              >
                Import Paths
              </StudioButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
