import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Sparkles,
  CheckCircle2,
  Folder,
} from 'lucide-react';
import { PageKey, PIPELINE_NAV_ORDER, getStageNumber, getStageMeta } from '../types/pipelineStages';
import { usePipeline } from '../context/PipelineContext';

interface PipelineStageNavigatorProps {
  currentStage: PageKey;
  onNavigate: (page: PageKey) => void;
  onAutoFillPaths?: () => void;
  canAutoFill?: boolean;
}

export const PipelineStageNavigator: React.FC<PipelineStageNavigatorProps> = ({
  currentStage,
  onNavigate,
  onAutoFillPaths,
  canAutoFill = false,
}) => {
  const { uploadStructure } = usePipeline();
  const currentIndex = PIPELINE_NAV_ORDER.indexOf(currentStage);

  if (currentIndex === -1) return null;

  const currentMeta = getStageMeta(currentStage);
  const currentStageNum = getStageNumber(currentStage);
  const prevStageKey = currentIndex > 0 ? PIPELINE_NAV_ORDER[currentIndex - 1] : null;
  const nextStageKey = currentIndex < PIPELINE_NAV_ORDER.length - 1 ? PIPELINE_NAV_ORDER[currentIndex + 1] : null;

  const prevMeta = prevStageKey ? getStageMeta(prevStageKey) : null;
  const prevStageNum = prevStageKey ? getStageNumber(prevStageKey) : null;
  const nextMeta = nextStageKey ? getStageMeta(nextStageKey) : null;
  const nextStageNum = nextStageKey ? getStageNumber(nextStageKey) : null;

  const handleOpenFolder = (path?: string) => {
    if (!path || !window.electronAPI) return;
    window.electronAPI.openPath(path);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        marginBottom: 16,
      }}
    >
      {/* Top Banner: Sequential Stepper & Next/Prev Controls */}
      <div
        className="glass-card"
        style={{
          padding: '8px 14px',
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          backgroundColor: 'rgba(12, 16, 26, 0.75)',
          border: '1px solid var(--border-glass)',
        }}
      >
        {/* Left: Previous Stage Button */}
        <button
          onClick={() => prevStageKey && onNavigate(prevStageKey)}
          disabled={!prevStageKey}
          className="btn-tactile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            height: 32,
            padding: '0 10px',
            borderRadius: 8,
            border: '1px solid var(--border-subtle)',
            backgroundColor: prevStageKey ? 'var(--surface-elevated)' : 'transparent',
            color: prevStageKey ? 'var(--label)' : 'var(--tertiary-label)',
            cursor: prevStageKey ? 'pointer' : 'not-allowed',
            opacity: prevStageKey ? 1 : 0.4,
            fontSize: 11,
            fontWeight: 700,
            fontFamily: 'inherit',
          }}
          title={prevMeta ? `Go back to Stage ${prevStageNum}: ${prevMeta.shortTitle}` : 'First Stage'}
        >
          <ChevronLeft size={14} />
          <span>{prevMeta ? `Stage ${prevStageNum}` : 'Start'}</span>
        </button>

        {/* Center: Mini Stage Dots Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', padding: '0 4px' }}>
          {PIPELINE_NAV_ORDER.map((stageKey, idx) => {
            const meta = getStageMeta(stageKey);
            const num = getStageNumber(stageKey);
            const isCurrent = idx === currentIndex;
            const isCompleted = idx < currentIndex;

            return (
              <button
                key={stageKey}
                onClick={() => onNavigate(stageKey)}
                className="btn-tactile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: isCurrent ? '4px 10px' : '4px 8px',
                  borderRadius: 8,
                  border: isCurrent
                    ? `1px solid ${meta.color}`
                    : isCompleted
                    ? '1px solid rgba(16, 231, 157, 0.35)'
                    : '1px solid transparent',
                  backgroundColor: isCurrent
                    ? `${meta.color}20`
                    : isCompleted
                    ? 'rgba(16, 231, 157, 0.1)'
                    : 'transparent',
                  color: isCurrent
                    ? meta.color
                    : isCompleted
                    ? '#10E79D'
                    : 'var(--tertiary-label)',
                  cursor: 'pointer',
                  fontSize: 10.5,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: isCurrent ? 800 : 600,
                  transition: 'all var(--transition-fast)',
                  boxShadow: isCurrent ? `0 0 12px ${meta.color}30` : 'none',
                }}
                title={`Stage ${num}: ${meta.shortTitle}`}
              >
                {isCompleted ? (
                  <CheckCircle2 size={11} color="#10E79D" />
                ) : (
                  <span>{num}</span>
                )}
                {isCurrent && (
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-system)' }}>
                    {meta.shortTitle}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Next Stage Button */}
        <button
          onClick={() => nextStageKey && onNavigate(nextStageKey)}
          disabled={!nextStageKey}
          className="btn-tactile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            height: 32,
            padding: '0 12px',
            borderRadius: 8,
            border: nextStageKey ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid var(--border-subtle)',
            backgroundColor: nextStageKey ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
            color: nextStageKey ? '#00F2FE' : 'var(--tertiary-label)',
            cursor: nextStageKey ? 'pointer' : 'not-allowed',
            opacity: nextStageKey ? 1 : 0.4,
            fontSize: 11,
            fontWeight: 800,
            fontFamily: 'inherit',
            boxShadow: nextStageKey ? '0 0 14px rgba(0, 242, 254, 0.25)' : 'none',
          }}
          title={nextMeta ? `Advance to Stage ${nextStageNum}: ${nextMeta.shortTitle}` : 'Pipeline Completed'}
        >
          <span>{nextMeta ? `Next: Stage ${nextStageNum}` : 'Complete'}</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Project Status Strip & Auto-Fill Assist */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          borderRadius: 10,
          backgroundColor: 'var(--surface-elevated)',
          border: '1px solid var(--border-subtle)',
          fontSize: 11,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
          <Folder size={13} color="var(--accent)" />
          <span style={{ color: 'var(--secondary-label)' }}>Active Project:</span>
          <span
            style={{
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: uploadStructure.safarName ? 'var(--label)' : 'var(--tertiary-label)',
            }}
          >
            {uploadStructure.safarName || 'No Project Set'}
          </span>

          {uploadStructure.mainDataPath && (
            <>
              <div style={{ width: 1, height: 10, backgroundColor: 'var(--border)' }} />
              <button
                onClick={() => handleOpenFolder(uploadStructure.mainDataPath)}
                className="btn-tactile"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--secondary-label)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10.5,
                  padding: 0,
                }}
                title={`Open Main Data folder: ${uploadStructure.mainDataPath}`}
              >
                <FolderOpen size={12} color="var(--accent)" />
                <span style={{ textDecoration: 'underline' }}>Explore Main Data</span>
              </button>
            </>
          )}
        </div>

        {canAutoFill && onAutoFillPaths && (
          <button
            onClick={onAutoFillPaths}
            className="btn-tactile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 9px',
              borderRadius: 6,
              border: '1px solid rgba(0, 242, 254, 0.4)',
              backgroundColor: 'rgba(0, 242, 254, 0.14)',
              color: '#00F2FE',
              fontSize: 10.5,
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <Sparkles size={11} />
            <span>Auto-Fill From Stage 00</span>
          </button>
        )}
      </div>
    </div>
  );
};
