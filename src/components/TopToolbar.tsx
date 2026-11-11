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
  onOpenSettings?: () => void;
  onPlayBootLoader?: () => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  activePage,
  onOpenSettings,
  onPlayBootLoader,
}) => {
  const activeMeta = getStageMeta(activePage);
  const [isMaximized, setIsMaximized] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; username: string; avatar?: string | null }>(() => {
    try {
      const saved = localStorage.getItem('anything_last_signed_in_account') || localStorage.getItem('anything_ecosystem_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        const user = parsed.user || parsed;
        if (user && (user.name || user.username || user.email)) {
          return {
            name: user.name || 'Master Architect',
            username: user.username || (user.email ? user.email.split('@')[0] : 'admin'),
            avatar: user.avatar || user.avatarBase64 || null
          };
        }
      }
    } catch {}
    return {
      name: 'Master Architect',
      username: 'admin',
      avatar: null
    };
  });

  useEffect(() => {
    if (window.electronAPI && typeof window.electronAPI.isWindowMaximized === 'function') {
      window.electronAPI.isWindowMaximized().then((max: boolean) => setIsMaximized(max));
    }

    const loadProfile = () => {
      const api = (window as any).electronAPI || (window as any).api;
      if (api?.userProfile?.load) {
        api.userProfile.load().then((p: any) => {
          if (p && (p.name || p.username || p.email)) {
            setUserProfile({
              name: p.name || 'Creator',
              username: p.username || (p.email ? p.email.split('@')[0] : 'creator'),
              avatar: p.avatar || p.avatarBase64 || null
            });
          }
        }).catch(() => {});
      }
    };
    loadProfile();
    const interval = setInterval(loadProfile, 3000);
    window.addEventListener('storage', loadProfile);
    window.addEventListener('anything:ecosystem-auth-change', loadProfile);
    window.addEventListener('focus', loadProfile);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', loadProfile);
      window.removeEventListener('anything:ecosystem-auth-change', loadProfile);
      window.removeEventListener('focus', loadProfile);
    };
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

      {/* Right: User Profile Chip + Window Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {userProfile && (
          <div
            className="window-no-drag"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '3px 10px 3px 5px',
              borderRadius: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(0, 242, 254, 0.25)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
            title={`${userProfile.name} (@${userProfile.username})`}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                padding: 1,
                background: 'linear-gradient(135deg, #00F2FE 0%, #8B5CF6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {userProfile.avatar ? (
                <img
                  src={userProfile.avatar}
                  alt={userProfile.name}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: '#0f172a',
                    color: '#00F2FE',
                    fontSize: 9,
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {(userProfile.name || 'MA').slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: 'var(--label)',
                  maxWidth: 120,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {userProfile.name}
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  color: '#00F2FE',
                  opacity: 0.9,
                }}
              >
                @{userProfile.username}
              </span>
            </div>
          </div>
        )}

        {/* Window Controls */}
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
      </div>
    </header>
  );
};
