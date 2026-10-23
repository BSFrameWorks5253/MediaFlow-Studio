import React, { useEffect, useState } from 'react';
import { X, Sparkles, Download, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { toUserErrorMessage } from '../utils/errorSanitizer';
import './UpdateModal.css';

export interface UpdatePayload {
  version: string;
  downloadUrl: string;
  sha256?: string;
  releaseNotes: string[];
  mandatory?: boolean;
  publishedAt?: string;
  fileName?: string;
  source?: 'anything-local' | 'anything-catalog' | 'github-api';
  localInstallerPath?: string;
  sizeFormatted?: string;
}

interface UpdateModalProps {
  forcedUpdate?: UpdatePayload | null;
  onClose?: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ forcedUpdate, onClose }) => {
  const [update, setUpdate] = useState<UpdatePayload | null>(forcedUpdate || null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [receivedMB, setReceivedMB] = useState('0.0');
  const [totalMB, setTotalMB] = useState('0.0');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (forcedUpdate) {
      setUpdate(forcedUpdate);
    }
  }, [forcedUpdate]);

  useEffect(() => {
    if (!window.electronAPI) return;

    // Listen to background update checks
    const unbindAvailable = window.electronAPI.onUpdateAvailable?.((info: UpdatePayload) => {
      setUpdate(info);
    });

    // Listen to streaming download progress
    const unbindProgress = window.electronAPI.onUpdateProgress?.((data) => {
      setProgress(data.pct);
      setReceivedMB(data.receivedMB);
      setTotalMB(data.totalMB);
    });

    return () => {
      unbindAvailable?.();
      unbindProgress?.();
    };
  }, []);

  const handleStartUpdate = async () => {
    if (!update || !window.electronAPI) return;
    setIsDownloading(true);
    setErrorMsg(null);

    try {
      const res = await window.electronAPI.installUpdate(update);
      if (res && !res.success) {
        console.error('Update install error:', res.error);
        setErrorMsg(toUserErrorMessage(res.error, 'Failed to install update. Please check network connection and try again.'));
        setIsDownloading(false);
      }
    } catch (e: any) {
      console.error('Update install exception:', e);
      setErrorMsg(toUserErrorMessage(e, 'Error occurred during update installation. Please try again later.'));
      setIsDownloading(false);
    }
  };

  const handleDismiss = () => {
    if (isDownloading) return; // Do not cancel while streaming install
    setUpdate(null);
    onClose?.();
  };

  if (!update) return null;

  return (
    <div className="update-modal-backdrop" role="dialog" aria-modal="true">
      <div className="update-modal-card">
        {/* Header */}
        <div className="update-modal-header">
          <div className="update-badge-pill">
            <span className="update-pulse-dot" />
            <span>UPDATE AVAILABLE // v{update.version}</span>
          </div>

          {!isDownloading && (
            <button className="update-close-btn" onClick={handleDismiss} title="Dismiss">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="update-modal-body">
          <div className="update-title-group">
            <h3>
              <Sparkles size={20} color="#00F2FE" />
              MediaFlow Studio Update Ready
            </h3>
            <p>
              {update.source === 'anything-local'
                ? '⚡ Verified local update detected in Anything Ecosystem releases. Instant installation with zero download wait time.'
                : update.source === 'anything-catalog'
                ? '📦 Verified release ready from Anything Ecosystem Hub. Seamless upgrade preserves your active configuration and workspace cache.'
                : 'A new high-performance verified release is ready for installation. Silent upgrade preserves your active configuration.'}
            </p>
          </div>

          {/* Release Notes */}
          {update.releaseNotes && update.releaseNotes.length > 0 && (
            <div className="update-notes-box">
              <div className="update-notes-label">What's New in v{update.version}</div>
              <ul className="update-notes-list">
                {update.releaseNotes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Download Progress Bar */}
          {isDownloading ? (
            <div className="update-progress-wrap">
              <div className="update-progress-track">
                <div className="update-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="update-progress-meta">
                <span>
                  {progress === 100
                    ? 'Verifying SHA-256 Checksum & Launching Silent Installer...'
                    : `Streaming update package... (${receivedMB} MB / ${totalMB} MB)`}
                </span>
                <strong>{progress}%</strong>
              </div>
            </div>
          ) : null}

          {/* Error Banner */}
          {errorMsg && (
            <div className="update-error-banner">
              <AlertCircle size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="update-modal-footer">
          {!isDownloading && (
            <button className="btn-update-cancel" onClick={handleDismiss}>
              Remind Me Later
            </button>
          )}

          <button
            className="btn-update-primary"
            onClick={handleStartUpdate}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <>
                <RefreshCw size={14} className="spin-slow" />
                <span>Upgrading Studio...</span>
              </>
            ) : (
              <>
                <Download size={14} />
                <span>Update &amp; Restart Now</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateModal;
