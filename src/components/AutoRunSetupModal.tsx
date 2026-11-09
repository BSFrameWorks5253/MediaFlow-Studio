import React, { useState } from 'react';
import {
  Zap,
  FolderTree,
  Folder,
  Calendar,
  Video,
  Play,
  X,
  Layers,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
} from 'lucide-react';
import { useAutoRun, AutoRunConfig } from '../context/AutoRunContext';
import { StudioButton } from './StudioButton';

interface AutoRunSetupModalProps {
  onShowToast: (text: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
}

export const AutoRunSetupModal: React.FC<AutoRunSetupModalProps> = ({ onShowToast }) => {
  const { status, config, closeSetup, startAutoRun } = useAutoRun();

  const [baseDir, setBaseDir] = useState(config.baseDir || '');
  const [safarName, setSafarName] = useState(config.safarName || '');
  const [dateFolderName, setDateFolderName] = useState(config.dateFolderName || '');
  const [incomingVideoDir, setIncomingVideoDir] = useState(config.incomingVideoDir || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (status !== 'CONFIGURING') return null;

  const handleBrowseBase = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory('Select Master Workspace Directory', baseDir);
    if (dir) setBaseDir(dir);
  };

  const handleBrowseVideo = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory('Select Incoming Video Files Folder', incomingVideoDir);
    if (dir) setIncomingVideoDir(dir);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseDir.trim()) {
      onShowToast('Please select a Master Workspace Directory.', 'warning');
      return;
    }
    if (!safarName.trim()) {
      onShowToast('Please enter a Safar project name.', 'warning');
      return;
    }

    const payload: AutoRunConfig = {
      baseDir: baseDir.trim(),
      safarName: safarName.trim(),
      dateFolderName: dateFolderName.trim(),
      incomingVideoDir: incomingVideoDir.trim(),
    };

    setIsSubmitting(true);
    try {
      await startAutoRun(payload);
      onShowToast('Auto Run pipeline started across Stages 2 through 6!', 'success');
    } catch (err: any) {
      onShowToast('Failed to initialize Auto Run pipeline.', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preview path calculations
  const cleanSafar = safarName.trim() || '[Safar Name]';
  const cleanBase = baseDir.trim() || '[Base Workspace]';
  const previewMainData = `${cleanBase}\\${cleanSafar}\\Main Data\\${cleanSafar}`;
  const previewRemaining = `${cleanBase}\\${cleanSafar}\\Remaining`;
  const previewThumbnail = `${cleanBase}\\${cleanSafar}\\Thumbnail\\${cleanSafar}`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 16, 0.78)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) closeSetup();
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: 780,
          maxHeight: '90vh',
          borderRadius: 20,
          background: 'var(--surface-card)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(0, 242, 254, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '22px 28px 18px 28px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.08) 0%, rgba(139, 92, 246, 0.06) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: 'rgba(0, 242, 254, 0.15)',
                border: '1px solid rgba(0, 242, 254, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00F2FE',
                boxShadow: '0 0 16px rgba(0, 242, 254, 0.25)',
              }}
            >
              <Zap size={22} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: 'var(--label)',
                    fontFamily: 'var(--font-display)',
                    margin: 0,
                  }}
                >
                  Auto Run Pipeline Setup
                </h2>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    color: '#00F2FE',
                    backgroundColor: 'rgba(0, 242, 254, 0.12)',
                    border: '1px solid rgba(0, 242, 254, 0.3)',
                    padding: '2px 7px',
                    borderRadius: 999,
                  }}
                >
                  STAGES 2 – 6
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--secondary-label)', margin: 0 }}>
                Unattended execution: Structure Creator, Photo Matcher, Remaining Shifter, Thumbnail Shifter, and Video Sync.
              </p>
            </div>
          </div>

          <button
            onClick={closeSetup}
            disabled={isSubmitting}
            className="btn-tactile"
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--secondary-label)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Card 1: Master Base Directory */}
          <div
            style={{
              padding: '16px 18px',
              borderRadius: 14,
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: 'var(--label)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                }}
              >
                <FolderTree size={15} color="#00F2FE" />
                <span>1. Master Project Workspace Directory</span>
              </label>
              <span style={{ fontSize: 11, color: 'var(--tertiary-label)', fontFamily: 'var(--font-mono)' }}>
                REQUIRED
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={baseDir}
                onChange={(e) => setBaseDir(e.target.value)}
                placeholder="e.g. D:\DATAFLOW_WORKSPACE or D:\2026_EVENTS"
                required
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 8,
                  padding: '0 12px',
                  backgroundColor: 'var(--surface-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--label)',
                  fontSize: 12.5,
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                }}
              />
              <StudioButton type="button" variant="glass" onClick={handleBrowseBase}>
                Browse
              </StudioButton>
            </div>
            <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
              The root destination folder where the Safar project, Main Data, Remaining, and Thumbnail folders are created.
            </span>
          </div>

          {/* Row 2: Safar Name & Date Folder */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Card 2: Safar Name */}
            <div
              style={{
                padding: '16px 18px',
                borderRadius: 14,
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <label
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: 'var(--label)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                }}
              >
                <Folder size={15} color="#8B5CF6" />
                <span>2. Safar Project Name</span>
              </label>

              <input
                type="text"
                value={safarName}
                onChange={(e) => setSafarName(e.target.value)}
                placeholder="e.g. Safar 1448 or ROYAL_WEDDING"
                required
                style={{
                  height: 38,
                  borderRadius: 8,
                  padding: '0 12px',
                  backgroundColor: 'var(--surface-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--label)',
                  fontSize: 12.5,
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
                Folder created inside Main Data and Thumbnail.
              </span>
            </div>

            {/* Card 3: Date Folder Name */}
            <div
              style={{
                padding: '16px 18px',
                borderRadius: 14,
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <label
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: 'var(--label)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                }}
              >
                <Calendar size={15} color="#10B981" />
                <span>3. Date Folder / Session Name</span>
              </label>

              <input
                type="text"
                value={dateFolderName}
                onChange={(e) => setDateFolderName(e.target.value)}
                placeholder="e.g. 1448-10-15_01M (Optional)"
                style={{
                  height: 38,
                  borderRadius: 8,
                  padding: '0 12px',
                  backgroundColor: 'var(--surface-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--label)',
                  fontSize: 12.5,
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
                Leaves blank to process all date folders automatically.
              </span>
            </div>
          </div>

          {/* Card 4: Incoming Video Files Folder */}
          <div
            style={{
              padding: '16px 18px',
              borderRadius: 14,
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: 'var(--label)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                }}
              >
                <Video size={15} color="#F59E0B" />
                <span>4. Incoming Video Files Folder</span>
              </label>
              <span style={{ fontSize: 11, color: '#F59E0B', fontFamily: 'var(--font-mono)' }}>
                STAGE 6 VIDEO SYNC
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={incomingVideoDir}
                onChange={(e) => setIncomingVideoDir(e.target.value)}
                placeholder="e.g. D:\CAMERA_CARD_A\VIDEOS or D:\INCOMING_VIDEOS"
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 8,
                  padding: '0 12px',
                  backgroundColor: 'var(--surface-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--label)',
                  fontSize: 12.5,
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                }}
              />
              <StudioButton type="button" variant="glass" onClick={handleBrowseVideo}>
                Browse
              </StudioButton>
            </div>
            <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
              Folder containing raw video clips. Clips will be paired with photo folders inside Main Data. If left blank, Stage 6 will be skipped.
            </span>
          </div>

          {/* Interactive Pipeline Wiring Preview */}
          <div
            style={{
              padding: '14px 18px',
              borderRadius: 14,
              backgroundColor: 'rgba(0, 242, 254, 0.04)',
              border: '1px solid rgba(0, 242, 254, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={14} color="#00F2FE" />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--label)' }}>
                Automated Pipeline Routing Preview
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, fontSize: 11 }}>
              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  backgroundColor: 'var(--surface-card)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ color: '#00F2FE', fontWeight: 700, marginBottom: 2 }}>Main Data Photos</div>
                <div style={{ color: 'var(--secondary-label)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                  {previewMainData}
                </div>
              </div>

              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  backgroundColor: 'var(--surface-card)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ color: '#EC4899', fontWeight: 700, marginBottom: 2 }}>Remaining Target</div>
                <div style={{ color: 'var(--secondary-label)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                  {previewRemaining}
                </div>
              </div>

              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  backgroundColor: 'var(--surface-card)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ color: '#10B981', fontWeight: 700, marginBottom: 2 }}>Thumbnail Target</div>
                <div style={{ color: 'var(--secondary-label)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                  {previewThumbnail}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 12,
              paddingTop: 8,
            }}
          >
            <StudioButton type="button" variant="glass" onClick={closeSetup} disabled={isSubmitting}>
              Cancel
            </StudioButton>

            <button
              type="submit"
              disabled={isSubmitting || !baseDir.trim() || !safarName.trim()}
              className="btn-tactile"
              style={{
                height: 42,
                padding: '0 24px',
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(135deg, #00F2FE 0%, #0284C7 100%)',
                color: '#0f172a',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 16px rgba(0, 242, 254, 0.35)',
                opacity: isSubmitting || !baseDir.trim() || !safarName.trim() ? 0.6 : 1,
              }}
            >
              <Play size={15} fill="#0f172a" />
              <span>{isSubmitting ? 'Initializing Auto Run...' : 'Start Auto Run Pipeline'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
