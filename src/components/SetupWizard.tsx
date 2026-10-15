import React, { useState, useEffect } from 'react';
import { Folder, Cpu, ShieldCheck, Check, ArrowRight, Zap, HardDrive } from 'lucide-react';
import './SetupWizard.css';

interface SetupWizardProps {
  onDone: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onDone }) => {
  const [storageDir, setStorageDir] = useState('');
  const [concurrency, setConcurrency] = useState<number>(32);
  const [dryRunDefault, setDryRunDefault] = useState<boolean>(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getConfig().then((cfg: any) => {
        if (cfg) {
          if (cfg.storageDir) setStorageDir(cfg.storageDir);
          if (cfg.threadsActive) setConcurrency(cfg.threadsActive);
          if (typeof cfg.dryRun === 'boolean') setDryRunDefault(cfg.dryRun);
        }
      });
    }
  }, []);

  const handleBrowse = async () => {
    if (!window.electronAPI) return;
    try {
      const selected = await window.electronAPI.selectDirectory('Select Master Workspace / Storage Folder', storageDir);
      if (selected) {
        setStorageDir(selected);
        setError('');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to open directory browser');
    }
  };

  const handleConfirm = async () => {
    setBusy(true);
    setError('');

    try {
      if (window.electronAPI) {
        await window.electronAPI.saveConfig({
          storageDir: storageDir.trim(),
          threadsActive: concurrency,
          dryRun: dryRunDefault,
          firstRunCompleted: true,
        });
      }
      localStorage.setItem('mediaflow_first_run_done', 'true');
      onDone();
    } catch (e: any) {
      setError(e?.message || 'Error saving workstation configuration.');
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('mediaflow_first_run_done', 'true');
    if (window.electronAPI) {
      window.electronAPI.saveConfig({ firstRunCompleted: true });
    }
    onDone();
  };

  return (
    <div className="setup-overlay" role="dialog" aria-modal="true">
      <div className="setup-window">
        {/* Animated Cyber Workstation Hero Banner (Blueprint 04 & 05) */}
        <div className="setup-hero-banner-wrap">
          <img
            src="./assets/hero_animated.svg"
            alt="MediaFlow Studio Banner"
            className="setup-hero-banner-img"
          />
          <div className="setup-hero-live-pill">
            <span className="setup-pulse-dot" />
            <span>INITIAL WORKSTATION SETUP</span>
          </div>
        </div>

        {/* Card Body */}
        <div className="setup-card-body">
          <div className="setup-header-text">
            <h2>
              <HardDrive size={22} color="#00F2FE" />
              Welcome to MediaFlow Studio
            </h2>
            <p>
              Configure your default media workstation workspace and hardware acceleration preferences.
              These settings can be updated anytime in Preferences.
            </p>
          </div>

          {/* Master Storage Directory */}
          <div className="setup-section">
            <label className="setup-section-label">
              <Folder size={14} />
              Default Workspace Storage Directory
            </label>
            <div className="setup-input-row">
              <input
                type="text"
                value={storageDir}
                placeholder="e.g. D:\MEDIA_PRODUCTION\2026_PROJECTS"
                onChange={(e) => setStorageDir(e.target.value)}
              />
              <button className="setup-btn-browse" type="button" onClick={handleBrowse}>
                <Folder size={14} />
                Browse
              </button>
            </div>
          </div>

          {/* Hardware Concurrency Profile */}
          <div className="setup-section">
            <label className="setup-section-label">
              <Cpu size={14} />
              Hardware Thread Pool Concurrency
            </label>
            <div className="setup-options-grid">
              <div
                className={`setup-option-card ${concurrency === 32 ? 'active' : ''}`}
                onClick={() => setConcurrency(32)}
              >
                <Zap size={18} color={concurrency === 32 ? '#00F2FE' : '#64748B'} />
                <div className="setup-option-info">
                  <span className="setup-option-title">Extreme (32 Threads)</span>
                  <span className="setup-option-desc">NVMe SSDs &amp; Multi-Core CPUs</span>
                </div>
              </div>

              <div
                className={`setup-option-card ${concurrency === 16 ? 'active' : ''}`}
                onClick={() => setConcurrency(16)}
              >
                <Cpu size={18} color={concurrency === 16 ? '#00F2FE' : '#64748B'} />
                <div className="setup-option-info">
                  <span className="setup-option-title">Balanced (16 Threads)</span>
                  <span className="setup-option-desc">Recommended for standard PCs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Safety Verification Profile */}
          <div className="setup-section">
            <label className="setup-section-label">
              <ShieldCheck size={14} />
              Safety &amp; Audit Profile
            </label>
            <div
              className={`setup-option-card ${dryRunDefault ? 'active' : ''}`}
              onClick={() => setDryRunDefault(!dryRunDefault)}
              style={{ cursor: 'pointer' }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  border: `1.5px solid ${dryRunDefault ? '#00F2FE' : 'rgba(255,255,255,0.2)'}`,
                  background: dryRunDefault ? 'rgba(0,242,254,0.2)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {dryRunDefault && <Check size={14} color="#00F2FE" />}
              </div>
              <div className="setup-option-info">
                <span className="setup-option-title">Dry-Run Preview Enabled by Default</span>
                <span className="setup-option-desc">
                  Simulate rename/shift passes and verify manifests before touching physical disks.
                </span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && <div className="setup-error-msg">{error}</div>}

          {/* Footer Actions */}
          <div className="setup-actions">
            <button className="setup-skip-btn" type="button" onClick={handleSkip}>
              Skip Setup (Use Defaults)
            </button>

            <button
              className="btn-setup-confirm"
              type="button"
              disabled={busy}
              onClick={handleConfirm}
            >
              <span>{busy ? 'Configuring Studio...' : 'Initialize Workstation'}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;
