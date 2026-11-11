import React from 'react';
import {
  Zap,
  Play,
  Pause,
  Square,
  AlertTriangle,
  CheckCircle2,
  Check,
  Eye,
  Loader2,
  Activity,
  Layers,
} from 'lucide-react';
import { useAutoRun } from '../context/AutoRunContext';
import { PageKey, getStageMeta } from '../types/pipelineStages';

interface TopBarAutoRunProps {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
}

export const TopBarAutoRun: React.FC<TopBarAutoRunProps> = ({ activePage, onNavigate }) => {
  const {
    status,
    progress,
    unmatchedVideos,
    openSetup,
    pauseAutoRun,
    resumeAutoRun,
    stopAutoRun,
    dismissComplete,
  } = useAutoRun();

  const currentMeta = getStageMeta(activePage);

  return (
    <header
      className="glass-panel drag-header-zone window-drag-region"
      style={{
        height: 48,
        minHeight: 48,
        borderRadius: 14,
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 8,
        border: '0.5px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(16, 16, 16, 0.45)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        zIndex: 5,
        boxShadow: '0 4px 18px -2px rgba(0, 0, 0, 0.35)',
      }}
    >
      {/* Left: Active Section Breadcrumb */}
      <div className="window-no-drag interactive-no-drag" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            backgroundColor: `${currentMeta.color}15`,
            border: `1px solid ${currentMeta.color}35`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: currentMeta.color,
          }}
        >
          {React.createElement(currentMeta.icon, { size: 13 })}
        </div>
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 700,
            color: 'var(--label)',
            letterSpacing: '-0.01em',
          }}
        >
          {currentMeta.label}
        </span>
        <span style={{ fontSize: 11, color: 'var(--tertiary-label)' }}>•</span>
        <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
          {currentMeta.desc}
        </span>
      </div>

      {/* Right: Dynamic Auto Run Pipeline Controller */}
      <div className="window-no-drag interactive-no-drag" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* State 1: IDLE */}
        {status === 'IDLE' && (
          <button
            onClick={openSetup}
            className="btn-tactile"
            style={{
              height: 32,
              padding: '0 14px',
              borderRadius: 8,
              border: '1px solid rgba(0, 242, 254, 0.4)',
              background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.18) 0%, rgba(139, 92, 246, 0.14) 100%)',
              color: 'var(--label)',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 10px rgba(0, 242, 254, 0.15)',
              transition: 'all 0.15s ease',
            }}
            title="Launch automated execution for Stages 2 to 6"
          >
            <Zap size={13} color="#00F2FE" />
            <span>Auto Run (Stages 2–6)</span>
          </button>
        )}

        {/* State 2: CONFIGURING (Setup Modal is active) */}
        {status === 'CONFIGURING' && (
          <div
            style={{
              height: 32,
              padding: '0 12px',
              borderRadius: 8,
              border: '1px solid rgba(0, 242, 254, 0.35)',
              backgroundColor: 'rgba(0, 242, 254, 0.1)',
              color: '#00F2FE',
              fontSize: 11.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Zap size={13} />
            <span>Configuring Pipeline...</span>
          </div>
        )}

        {/* State 3: RUNNING */}
        {status === 'RUNNING' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '3px 6px',
              borderRadius: 8,
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid rgba(0, 242, 254, 0.3)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '0 8px',
                fontSize: 11.5,
                fontWeight: 700,
                color: 'var(--label)',
              }}
            >
              <Loader2 size={13} color="#00F2FE" className="spin" />
              <span>
                Auto Run: Stage {progress.currentStageIndex}/6 • {progress.currentStageTitle} ({progress.overallProgressPct}%)
              </span>
            </div>

            {/* Mini Progress Track */}
            <div
              style={{
                width: 70,
                height: 4,
                borderRadius: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progress.overallProgressPct}%`,
                  background: 'linear-gradient(90deg, #00F2FE, #8B5CF6)',
                  borderRadius: 2,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>

            <button
              onClick={pauseAutoRun}
              className="btn-tactile"
              style={{
                height: 26,
                padding: '0 8px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-card)',
                color: 'var(--secondary-label)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
              }}
              title="Pause Pipeline"
            >
              <Pause size={11} />
              <span>Pause</span>
            </button>

            <button
              onClick={stopAutoRun}
              className="btn-tactile"
              style={{
                height: 26,
                padding: '0 8px',
                borderRadius: 6,
                border: '1px solid rgba(244, 63, 94, 0.3)',
                backgroundColor: 'rgba(244, 63, 94, 0.1)',
                color: '#F43F5E',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
              }}
              title="Stop Pipeline"
            >
              <Square size={11} />
              <span>Stop</span>
            </button>
          </div>
        )}

        {/* State 4: PAUSED_MANUAL */}
        {status === 'PAUSED_MANUAL' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '3px 8px',
              borderRadius: 8,
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#F59E0B', fontWeight: 700 }}>
              <Pause size={12} />
              <span>Paused: Stage {progress.currentStageIndex}/6 ({progress.currentStageTitle})</span>
            </div>

            <button
              onClick={resumeAutoRun}
              className="btn-tactile"
              style={{
                height: 26,
                padding: '0 10px',
                borderRadius: 6,
                border: 'none',
                background: '#F59E0B',
                color: '#0f172a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              <Play size={11} fill="#0f172a" />
              <span>Resume</span>
            </button>

            <button
              onClick={stopAutoRun}
              className="btn-tactile"
              style={{
                height: 26,
                padding: '0 8px',
                borderRadius: 6,
                border: '1px solid rgba(244, 63, 94, 0.3)',
                backgroundColor: 'transparent',
                color: '#F43F5E',
                cursor: 'pointer',
              }}
            >
              <Square size={11} />
            </button>
          </div>
        )}

        {/* State 5: PAUSED_CONFLICT (Option B: Conflict Prompt) */}
        {status === 'PAUSED_CONFLICT' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '3px 8px',
              borderRadius: 8,
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.5)',
              animation: 'pulse 2s infinite',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#F59E0B', fontWeight: 800 }}>
              <AlertTriangle size={13} />
              <span>Paused: Action Required ({unmatchedVideos.length} Unmatched)</span>
            </div>

            <button
              onClick={() => {
                // Clicking opens the conflict dialog (rendered by AutoRunConflictModal)
              }}
              className="btn-tactile"
              style={{
                height: 26,
                padding: '0 10px',
                borderRadius: 6,
                border: 'none',
                background: '#F59E0B',
                color: '#0f172a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              <Eye size={12} />
              <span>Review & Resume</span>
            </button>
          </div>
        )}

        {/* State 6: COMPLETED */}
        {status === 'COMPLETED' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '3px 8px',
              borderRadius: 8,
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#10B981', fontWeight: 800 }}>
              <CheckCircle2 size={13} />
              <span>Auto Run Completed (All 5 Stages Synced)</span>
            </div>

            <button
              onClick={dismissComplete}
              className="btn-tactile"
              style={{
                height: 24,
                padding: '0 8px',
                borderRadius: 5,
                border: '1px solid rgba(16, 185, 129, 0.4)',
                backgroundColor: 'transparent',
                color: '#10B981',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                fontSize: 10.5,
                fontWeight: 700,
              }}
            >
              <Check size={11} />
              <span>Dismiss</span>
            </button>
          </div>
        )}

        {/* State 7: ERROR */}
        {status === 'ERROR' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '3px 8px',
              borderRadius: 8,
              backgroundColor: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#F43F5E', fontWeight: 700 }}>
              <AlertTriangle size={13} />
              <span>Auto Run Failed</span>
            </div>

            <button
              onClick={openSetup}
              className="btn-tactile"
              style={{
                height: 24,
                padding: '0 8px',
                borderRadius: 5,
                border: '1px solid rgba(244, 63, 94, 0.4)',
                backgroundColor: 'transparent',
                color: '#F43F5E',
                cursor: 'pointer',
                fontSize: 10.5,
                fontWeight: 700,
              }}
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
