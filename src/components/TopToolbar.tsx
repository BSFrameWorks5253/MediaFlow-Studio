import React, { useState, useEffect } from 'react';
import { Minus, Square, Copy as RestoreIcon, X } from 'lucide-react';
import { PageKey, getStageMeta } from '../types/pipelineStages';

export interface GlobalTelemetry {
  active: boolean;
  speedMbps: number;
  speedStr: string;
  threadsActive: number;
  etaSec: number;
  etaStr: string;
  driveLetter: string;
  driveFreeGB: number;
  driveUsedPct: number;
  progressPct: number;
}

interface TopToolbarProps {
  activePage: PageKey;
  telemetry?: GlobalTelemetry;
  onOpenCommandPalette?: () => void;
  onNavigate?: (page: PageKey) => void;
  onOpenKeyboardShortcuts?: () => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({ activePage }) => {
  const activeMeta = getStageMeta(activePage);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (window.electronAPI && typeof window.electronAPI.isWindowMaximized === 'function') {
      window.electronAPI.isWindowMaximized().then((max: boolean) => setIsMaximized(max));
    }
  }, []);

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow?.();
  };

  const handleMaximize = async () => {
    if (window.electronAPI?.maximizeWindow) {
      await window.electronAPI.maximizeWindow();
      const state = await window.electronAPI.isWindowMaximized?.();
      setIsMaximized(state ?? false);
    }
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow?.();
  };

  const hasElectron = typeof window !== 'undefined' && !!window.electronAPI;

  return (
    <header
      className="glass-panel window-drag-region"
      style={{
        height: 44,
        borderRadius: 12,
        padding: '0 8px 0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        zIndex: 10,
        userSelect: 'none',
      }}
    >
      {/* Page Name Only */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            fontSize: 14.5,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: 'var(--label)',
            letterSpacing: '0.01em',
          }}
        >
          {activeMeta.label}
        </span>
      </div>

      {/* Right: Window Controls */}
      {hasElectron && (
        <div
          className="window-no-drag"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <button
            onClick={handleMinimize}
            className="btn-tactile"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--secondary-label)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--border-subtle)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            title="Minimize"
          >
            <Minus size={13} />
          </button>

          <button
            onClick={handleMaximize}
            className="btn-tactile"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--secondary-label)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--border-subtle)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? <RestoreIcon size={12} /> : <Square size={11} />}
          </button>

          <button
            onClick={handleClose}
            className="btn-tactile"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--secondary-label)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#E11D48';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--secondary-label)';
            }}
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </header>
  );
};
