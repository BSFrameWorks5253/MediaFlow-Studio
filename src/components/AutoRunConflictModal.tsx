import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  ArrowRight,
  Square,
  Video,
  FolderOpen,
  Folder,
} from 'lucide-react';
import { useAutoRun } from '../context/AutoRunContext';
import { StudioButton } from './StudioButton';

interface AutoRunConflictModalProps {
  onShowToast: (text: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
}

export const AutoRunConflictModal: React.FC<AutoRunConflictModalProps> = ({ onShowToast }) => {
  const {
    status,
    unmatchedVideos,
    matchedPairs,
    allCandidateFolders,
    resolveConflictPairings,
    skipConflictsAndFinish,
    stopAutoRun,
  } = useAutoRun();

  // Map of videoPath -> selected targetFolder
  const [selectedPairings, setSelectedPairings] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const item of unmatchedVideos) {
      if (item.suggestedFolder?.path) {
        init[item.videoPath] = item.suggestedFolder.path;
      }
    }
    return init;
  });

  const [isResolving, setIsResolving] = useState(false);

  if (status !== 'PAUSED_CONFLICT') return null;

  const handleSelectTarget = (videoPath: string, targetPath: string) => {
    setSelectedPairings((prev) => ({ ...prev, [videoPath]: targetPath }));
  };

  const handlePairAndResume = async () => {
    const manualPairs: { videoPath: string; targetFolder: string }[] = [];
    for (const [vPath, tPath] of Object.entries(selectedPairings)) {
      if (tPath && tPath.trim()) {
        manualPairs.push({ videoPath: vPath, targetFolder: tPath });
      }
    }

    if (manualPairs.length === 0) {
      onShowToast('Please select at least one photo folder to pair, or choose "Skip Unmatched".', 'warning');
      return;
    }

    setIsResolving(true);
    try {
      await resolveConflictPairings(manualPairs);
      onShowToast(`Resolved ${manualPairs.length} pairing(s) and completed Auto Run!`, 'success');
    } catch (e: any) {
      onShowToast('Failed to resolve pairings.', 'danger');
    } finally {
      setIsResolving(false);
    }
  };

  const handleSkipAndFinish = async () => {
    setIsResolving(true);
    try {
      await skipConflictsAndFinish();
      onShowToast(`Completed Auto Run. (${unmatchedVideos.length} unmatched videos preserved)`, 'info');
    } catch (e: any) {
      onShowToast('Failed to complete pipeline.', 'danger');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 16, 0.82)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: 820,
          maxHeight: '90vh',
          borderRadius: 20,
          background: 'var(--surface-card)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(245, 158, 11, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 26px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(239, 68, 68, 0.08) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                backgroundColor: 'rgba(245, 158, 11, 0.18)',
                border: '1px solid rgba(245, 158, 11, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F59E0B',
              }}
            >
              <AlertTriangle size={22} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    color: 'var(--label)',
                    fontFamily: 'var(--font-display)',
                    margin: 0,
                  }}
                >
                  Auto Run Paused — Action Required
                </h2>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    color: '#F59E0B',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    padding: '2px 7px',
                    borderRadius: 999,
                  }}
                >
                  STAGE 6 CONFLICT
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--secondary-label)', margin: 0 }}>
                Found {unmatchedVideos.length} video clip(s) without an exact photo event match. Pair them below or skip to finish.
              </p>
            </div>
          </div>

          <div
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10B981',
              fontSize: 11.5,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
            }}
          >
            {matchedPairs.length} Matched Pairs Ready
          </div>
        </div>

        {/* Scrollable Unmatched List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 26px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {unmatchedVideos.map((item, idx) => {
            const currentSelection = selectedPairings[item.videoPath] || '';
            return (
              <div
                key={item.videoPath || idx}
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  backgroundColor: 'var(--surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                    <Video size={16} color="#F59E0B" />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--label)',
                        fontFamily: 'var(--font-mono)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={item.videoFile}
                    >
                      {item.videoFile}
                    </span>
                    {item.dateFolder && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          padding: '1px 6px',
                          borderRadius: 4,
                          backgroundColor: 'rgba(56, 189, 248, 0.12)',
                          color: '#38BDF8',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                        }}
                      >
                        {item.dateFolder}
                      </span>
                    )}
                  </div>
                </div>

                {/* Target Dropdown Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: 'var(--secondary-label)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Folder size={13} color="#00F2FE" />
                    <span>Target Photo Event:</span>
                  </label>

                  <select
                    value={currentSelection}
                    onChange={(e) => handleSelectTarget(item.videoPath, e.target.value)}
                    style={{
                      flex: 1,
                      height: 36,
                      borderRadius: 8,
                      padding: '0 10px',
                      backgroundColor: 'var(--surface-card)',
                      border: currentSelection ? '1.5px solid #10B981' : '1px solid var(--border)',
                      color: currentSelection ? 'var(--label)' : 'var(--secondary-label)',
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      outline: 'none',
                    }}
                  >
                    <option value="">-- Leave Unmatched / Skip --</option>
                    {allCandidateFolders.map((cand) => (
                      <option key={cand.path} value={cand.path}>
                        {cand.dateFolder ? `[${cand.dateFolder}] ` : ''}{cand.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Footer */}
        <div
          style={{
            padding: '16px 26px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <button
            onClick={stopAutoRun}
            disabled={isResolving}
            className="btn-tactile"
            style={{
              height: 38,
              padding: '0 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--secondary-label)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Square size={13} />
            <span>Cancel Auto Run</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={handleSkipAndFinish}
              disabled={isResolving}
              className="btn-tactile"
              style={{
                height: 38,
                padding: '0 16px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-elevated)',
                color: 'var(--label)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>Skip Unmatched & Complete</span>
              <ArrowRight size={13} />
            </button>

            <button
              onClick={handlePairAndResume}
              disabled={isResolving}
              className="btn-tactile"
              style={{
                height: 38,
                padding: '0 18px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #10E79D 0%, #059669 100%)',
                color: '#ffffff',
                fontSize: 12.5,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 3px 12px rgba(16, 231, 157, 0.3)',
              }}
            >
              <Check size={14} />
              <span>{isResolving ? 'Transferring...' : 'Pair Selected & Finish'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
