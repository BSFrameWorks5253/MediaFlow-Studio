import React, { useState, useEffect } from 'react';
import {
  FolderPlus,
  Folder,
  FolderOpen,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Layers,
  FolderArchive,
  HardDrive,
  Sparkles,
} from 'lucide-react';
import { StudioButton } from '../components/StudioButton';
import { usePipeline } from '../context/PipelineContext';
import { PageKey } from '../types/pipelineStages';
import { toUserErrorMessage } from '../utils/errorSanitizer';

interface UploadStructurePageProps {
  onNavigate: (page: PageKey) => void;
  onShowToast: (text: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
}

export const UploadStructurePage: React.FC<UploadStructurePageProps> = ({
  onNavigate,
  onShowToast,
}) => {
  const { uploadStructure, setUploadStructure } = usePipeline();

  const [baseDir, setBaseDir] = useState(uploadStructure.baseDir || '');
  const [safarName, setSafarName] = useState(uploadStructure.safarName || '');
  const [isCreating, setIsCreating] = useState(false);
  const [createdResult, setCreatedResult] = useState<{
    safarRoot: string;
    mainDataPath: string;
    thumbnailsPath: string;
    remainingPath: string;
  } | null>(uploadStructure.safarRoot ? uploadStructure : null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === 'true') {
        const demoBase = 'D:\\FINAL_CLIENT_DELIVERIES';
        const demoName = '2026-02-14_ROYAL_WEDDING';
        setBaseDir(demoBase);
        setSafarName(demoName);
        setCreatedResult({
          safarRoot: `${demoBase}\\${demoName}`,
          mainDataPath: `${demoBase}\\${demoName}\\Main Data\\${demoName}`,
          thumbnailsPath: `${demoBase}\\${demoName}\\Thumbnails\\${demoName}`,
          remainingPath: `${demoBase}\\${demoName}\\Remaining\\${demoName}`,
        });
      }
    }
  }, []);

  const cleanSafar = (safarName || '').trim().replace(/[<>:"/\\|?*]/g, '_');

  const handleBrowseBase = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory('Select Base Destination Drive / Folder', baseDir);
    if (dir) {
      setBaseDir(dir);
      setUploadStructure({ baseDir: dir });
    }
  };

  const handleCreate = async () => {
    if (!baseDir.trim()) {
      onShowToast('Please select a base destination directory.', 'warning');
      return;
    }
    if (!cleanSafar) {
      onShowToast('Please provide a valid Safar / Event name.', 'warning');
      return;
    }

    if (!window.electronAPI || typeof window.electronAPI.createUploadStructure !== 'function') {
      const mockRoot = `${baseDir || 'D:\\DATAFLOW_WORKSPACE'}\\${cleanSafar}`;
      const mockResult = {
        safarRoot: mockRoot,
        mainDataPath: `${mockRoot}\\Main Data\\${cleanSafar}`,
        thumbnailsPath: `${mockRoot}\\Thumbnails\\${cleanSafar}`,
        remainingPath: `${mockRoot}\\Remaining\\${cleanSafar}`,
      };
      setCreatedResult(mockResult);
      setUploadStructure({
        baseDir: baseDir || 'D:\\DATAFLOW_WORKSPACE',
        safarName: cleanSafar,
        ...mockResult,
      });
      onShowToast(`Structure created for "${cleanSafar}"! (Pipeline Context Linked)`, 'success');
      return;
    }

    setIsCreating(true);
    try {
      const res = await window.electronAPI.createUploadStructure(baseDir, cleanSafar);
      if (res && res.success) {
        setCreatedResult({
          safarRoot: res.safarRoot,
          mainDataPath: res.mainDataPath,
          thumbnailsPath: res.thumbnailsPath,
          remainingPath: res.remainingPath,
        });

        // Wire into shared Pipeline context
        setUploadStructure({
          baseDir,
          safarName: cleanSafar,
          safarRoot: res.safarRoot,
          mainDataPath: res.mainDataPath,
          thumbnailsPath: res.thumbnailsPath,
          remainingPath: res.remainingPath,
        });

        onShowToast(`Upload structure created for "${cleanSafar}"! Outputs are auto-linked.`, 'success');
      }
    } catch (e: any) {
      console.error('Failed to create upload structure:', e);
      onShowToast(toUserErrorMessage(e, 'Failed to create upload folder structure. Please check drive permissions and free space.'), 'danger');
    } finally {
      setIsCreating(false);
    }
  };

  const handleReveal = (path: string) => {
    if (window.electronAPI && path) {
      window.electronAPI.showItemInFolder(path);
    }
  };

  const handleOpenPath = (path: string) => {
    if (window.electronAPI && path) {
      window.electronAPI.openPath(path);
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
      {/* Top Banner */}
      <div
        className="glass-card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderLeft: '4px solid #38BDF8',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FolderPlus size={22} color="#38BDF8" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--label)', letterSpacing: 0.3 }}>
              Upload Folder Structure Generator
            </div>
            <div style={{ fontSize: 12, color: 'var(--secondary-label)' }}>
              Creates the 3 standardized upload folders and automatically wires outputs to Thumbnail Shifter & Remaining Shifter.
            </div>
          </div>
        </div>
      </div>

      {/* Input Configuration Card */}
      <div
        className="glass-card"
        style={{
          padding: '18px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--label)' }}>
          Destination & Project Settings
        </div>

        {/* Base Folder Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--secondary-label)' }}>
            Base Destination Folder / Storage Drive:
          </label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 8,
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                fontSize: 13,
                fontWeight: 500,
                color: baseDir ? 'var(--label)' : 'var(--tertiary-label)',
                fontFamily: 'var(--font-system)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {baseDir || 'Select root destination folder (e.g., D:\\Uploads or external drive)...'}
            </div>
            <StudioButton variant="secondary" onClick={handleBrowseBase}>
              <HardDrive size={15} style={{ marginRight: 6 }} />
              Browse Drive...
            </StudioButton>
          </div>
        </div>

        {/* Safar Name Input & Quick Generation Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--secondary-label)' }}>
              Safar / Event Name:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--tertiary-label)' }}>Quick Presets:</span>
              <button
                type="button"
                onClick={() => setSafarName('1448-09-Morbi Atraf')}
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  borderRadius: 4,
                  padding: '2px 8px',
                  color: '#38BDF8',
                  fontSize: 10.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                1448-09-Morbi Atraf
              </button>
              <button
                type="button"
                onClick={() => setSafarName('1448-03 Mumbai')}
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: 4,
                  padding: '2px 8px',
                  color: '#10E79D',
                  fontSize: 10.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                1448-03 Mumbai
              </button>
              <button
                type="button"
                onClick={() => {
                  const today = new Date().toISOString().slice(0, 10);
                  setSafarName(`${today}_SAFAR`);
                }}
                style={{
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  padding: '2px 6px',
                  color: 'var(--label)',
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                + Today's Date
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="text"
              value={safarName}
              onChange={(e) => setSafarName(e.target.value)}
              placeholder="e.g. 1448-09-Morbi Atraf, 1448-03 Mumbai, or Custom Project Name"
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 8,
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--label)',
                outline: 'none',
                fontFamily: 'var(--font-system)',
              }}
            />
          </div>
          <span style={{ fontSize: 11, color: 'var(--tertiary-label)' }}>
            Creates standardized root: <b>{baseDir ? `${baseDir}\\${cleanSafar || '1448-09-Morbi Atraf'}` : `[Base]\\${cleanSafar || '1448-09-Morbi Atraf'}`}</b> with <b>Main Data\{cleanSafar || '...'}\</b>, <b>Thumbnails\{cleanSafar || '...'}\</b>, and <b>Remaining\{cleanSafar || '...'}\</b> trees.
          </span>
        </div>
      </div>

      {/* Live Folder Hierarchy Visualization */}
      <div
        className="glass-card"
        style={{
          padding: '18px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--label)' }}>
              2. Live Folder Structure Preview
            </span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 700,
                color: baseDir && cleanSafar ? 'var(--system-green)' : 'var(--secondary-label)',
                backgroundColor: baseDir && cleanSafar ? 'rgba(16, 185, 129, 0.15)' : 'var(--border-subtle)',
                border: `1px solid ${baseDir && cleanSafar ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)'}`,
              }}
            >
              {baseDir && cleanSafar ? 'READY TO GENERATE' : 'CONFIGURATION INCOMPLETE'}
            </span>
          </div>

          <div style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
            Structure A • 1:1 Matching Subfolders
          </div>
        </div>

        {/* High-Contrast Professional Terminal Treeview */}
        <div
          style={{
            backgroundColor: '#0B0F19',
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
          }}
        >
          {/* Terminal Window Header Bar */}
          <div
            style={{
              height: 32,
              backgroundColor: '#111726',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#EF4444' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#F59E0B' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#10B981' }} />
            </div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10.5,
                fontWeight: 600,
                color: '#94A3B8',
                letterSpacing: 0.6,
              }}
            >
              DIRECTORY ARCHITECTURE BLUEPRINT
            </span>
            <div style={{ width: 38 }} />
          </div>

          {/* Terminal Code Body */}
          <div
            style={{
              padding: '16px 20px',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              lineHeight: 1.85,
              color: '#F8FAFC',
            }}
          >
            {/* Root Drive */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94A3B8' }}>
              <HardDrive size={15} color="#94A3B8" />
              <span style={{ fontWeight: 600 }}>{baseDir || '[Selected Base Drive / Directory]'}\</span>
            </div>

            {/* Safar Root */}
            <div style={{ marginLeft: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#38BDF8', fontWeight: 700 }}>
              <span style={{ color: '#475569' }}>└──</span>
              <FolderOpen size={15} color="#38BDF8" />
              <span>{cleanSafar || '[Safar Name]'}\</span>
            </div>

            {/* 1. Main Data */}
            <div style={{ marginLeft: 44, display: 'flex', alignItems: 'center', gap: 8, color: '#10B981' }}>
              <span style={{ color: '#475569' }}>├──</span>
              <Folder size={14} color="#10B981" />
              <span style={{ fontWeight: 600 }}>Main Data\</span>
            </div>
            <div style={{ marginLeft: 72, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#475569' }}>└──</span>
              <FolderOpen size={13} color="#6EE7B7" />
              <span style={{ color: '#6EE7B7', fontWeight: 600 }}>{cleanSafar || '[Safar Name]'}\</span>
              <span style={{ color: '#94A3B8', fontSize: 10.5 }}>
                (Actual Master Production Footage & Photos)
              </span>
            </div>

            {/* 2. Thumbnails */}
            <div style={{ marginLeft: 44, display: 'flex', alignItems: 'center', gap: 8, color: '#0D9488' }}>
              <span style={{ color: '#475569' }}>├──</span>
              <Folder size={14} color="#0D9488" />
              <span style={{ fontWeight: 600 }}>Thumbnails\</span>
            </div>
            <div style={{ marginLeft: 72, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#475569' }}>└──</span>
              <FolderArchive size={13} color="#2DD4BF" />
              <span style={{ color: '#2DD4BF', fontWeight: 600 }}>{cleanSafar || '[Safar Name]'}\</span>
              <span style={{ color: '#2DD4BF', fontSize: 10.5, fontWeight: 600 }}>
                ➔ Connected to Thumbnail Shifter (Stage 05)
              </span>
            </div>

            {/* 3. Remaining */}
            <div style={{ marginLeft: 44, display: 'flex', alignItems: 'center', gap: 8, color: '#EC4899' }}>
              <span style={{ color: '#475569' }}>└──</span>
              <Folder size={14} color="#EC4899" />
              <span style={{ fontWeight: 600 }}>Remaining\</span>
            </div>
            <div style={{ marginLeft: 72, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#475569' }}>└──</span>
              <Layers size={13} color="#F472B6" />
              <span style={{ color: '#F472B6', fontWeight: 600 }}>{cleanSafar || '[Safar Name]'}\</span>
              <span style={{ color: '#F472B6', fontSize: 10.5, fontWeight: 600 }}>
                ➔ Connected to Remaining Shifter (Stage 03)
              </span>
            </div>
          </div>
        </div>

        {/* Create Action Button Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <div style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
            {!baseDir.trim()
              ? 'Select base destination directory above to proceed.'
              : !cleanSafar
              ? 'Enter a valid Safar/Event name above to proceed.'
              : 'Directory blueprint validated. Click to create folder hierarchy.'}
          </div>

          <StudioButton
            variant={!baseDir.trim() || !cleanSafar ? 'secondary' : 'primary'}
            onClick={handleCreate}
            disabled={isCreating || !baseDir.trim() || !cleanSafar}
            style={{
              padding: '10px 24px',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: !baseDir.trim() || !cleanSafar ? 'not-allowed' : 'pointer',
              opacity: !baseDir.trim() || !cleanSafar ? 0.6 : 1,
            }}
          >
            {isCreating ? (
              'Creating Directories...'
            ) : (
              <>
                <FolderPlus size={15} style={{ marginRight: 8 }} />
                Create Folders & Auto-Link Pipeline
              </>
            )}
          </StudioButton>
        </div>
      </div>

      {/* Auto-Linked Pipeline Cards (Rendered when folders created) */}
      {createdResult && (
        <div
          className="glass-card"
          style={{
            padding: '18px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            border: '1px solid rgba(16, 185, 129, 0.4)',
            backgroundColor: 'rgba(16, 185, 129, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={20} color="#10B981" />
            <span style={{ fontSize: 14, fontWeight: 800, color: '#10B981' }}>
              Upload Structure Ready • Outputs Auto-Wired
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {/* Thumbnail Shifter Routing Card */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid rgba(13, 148, 136, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0D9488', fontWeight: 700, fontSize: 12.5 }}>
                <FolderArchive size={16} />
                <span>Thumbnail Shifter Output</span>
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--secondary-label)',
                  wordBreak: 'break-all',
                }}
              >
                {createdResult.thumbnailsPath}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 6 }}>
                <StudioButton
                  variant="primary"
                  onClick={() => onNavigate('thumbnailSeparator')}
                  style={{ flex: 1, fontSize: 11 }}
                >
                  Open Thumbnail Shifter
                  <ArrowRight size={13} style={{ marginLeft: 6 }} />
                </StudioButton>
                <StudioButton
                  variant="secondary"
                  onClick={() => handleOpenPath(createdResult.thumbnailsPath)}
                  style={{ padding: '0 10px' }}
                  title="Open in Explorer"
                >
                  <ExternalLink size={13} />
                </StudioButton>
              </div>
            </div>

            {/* Remaining Shifter Routing Card */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid rgba(236, 72, 153, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#EC4899', fontWeight: 700, fontSize: 12.5 }}>
                <Layers size={16} />
                <span>Remaining Shifter Output</span>
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--secondary-label)',
                  wordBreak: 'break-all',
                }}
              >
                {createdResult.remainingPath}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 6 }}>
                <StudioButton
                  variant="primary"
                  onClick={() => onNavigate('remainingCollector')}
                  style={{ flex: 1, fontSize: 11, backgroundColor: '#EC4899', color: '#FFF' }}
                >
                  Open Remaining Shifter
                  <ArrowRight size={13} style={{ marginLeft: 6 }} />
                </StudioButton>
                <StudioButton
                  variant="secondary"
                  onClick={() => handleOpenPath(createdResult.remainingPath)}
                  style={{ padding: '0 10px' }}
                  title="Open in Explorer"
                >
                  <ExternalLink size={13} />
                </StudioButton>
              </div>
            </div>

            {/* Main Data Card */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10B981', fontWeight: 700, fontSize: 12.5 }}>
                <FolderOpen size={16} />
                <span>Main Data Upload Target</span>
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--secondary-label)',
                  wordBreak: 'break-all',
                }}
              >
                {createdResult.mainDataPath}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 6 }}>
                <StudioButton
                  variant="secondary"
                  onClick={() => handleOpenPath(createdResult.mainDataPath)}
                  style={{ flex: 1, fontSize: 11 }}
                >
                  Open Folder
                  <ExternalLink size={13} style={{ marginLeft: 6 }} />
                </StudioButton>
                <StudioButton
                  variant="secondary"
                  onClick={() => handleOpenPath(createdResult.safarRoot)}
                  style={{ fontSize: 11 }}
                >
                  Open Safar Root
                </StudioButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
