import React, { useMemo } from 'react';
import {
  Settings as SettingsIcon,
  Sun,
  Moon,
} from 'lucide-react';
import {
  PageKey,
  PIPELINE_NAV_ORDER,
  SYSTEM_NAV_ORDER,
  getStageNumber,
  getStageMeta,
} from '../types/pipelineStages';
import { useTheme } from '../context/ThemeContext';
import { MediaFlowLogo } from './MediaFlowLogo';

export type { PageKey };
export { PIPELINE_NAV_ORDER, SYSTEM_NAV_ORDER };

interface SidebarProps {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, onOpenSettings }) => {
  const [userProfile, setUserProfile] = React.useState<{ name: string; username: string; avatar?: string | null }>(() => {
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

  React.useEffect(() => {
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
    window.addEventListener('storage', loadProfile);
    window.addEventListener('anything:ecosystem-auth-change', loadProfile);
    window.addEventListener('focus', loadProfile);

    return () => {
      window.removeEventListener('storage', loadProfile);
      window.removeEventListener('anything:ecosystem-auth-change', loadProfile);
      window.removeEventListener('focus', loadProfile);
    };
  }, []);

  const { theme, toggleTheme } = useTheme();

  const pipelineNavItems = useMemo(() => {
    return PIPELINE_NAV_ORDER;
  }, []);

  return (
    <aside
      className="glass-panel glass-persistent-menu"
      style={{
        width: 240,
        minWidth: 240,
        maxWidth: 240,
        height: '100%',
        borderRadius: 16,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 2,
        border: '0.5px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(16, 16, 16, 0.45)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
        transition: 'all 450ms var(--ease-cinematic)',
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: 48,
          padding: '0 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #00F2FE 0%, #8B5CF6 100%)',
            padding: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 6.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              background: '#0f172a',
            }}
          >
            <MediaFlowLogo size={22} />
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 12.5,
              letterSpacing: 0.8,
              color: 'var(--label)',
            }}
          >
            MEDIAFLOW
          </span>
          <span
            style={{
              padding: '1px 5px',
              borderRadius: 4,
              fontSize: 8.5,
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              color: '#00F2FE',
              background: 'rgba(0, 242, 254, 0.1)',
              border: '1px solid rgba(0, 242, 254, 0.25)',
            }}
          >
            STUDIO PRO
          </span>
        </div>
      </div>

      {/* Navigation Links Scroll Container */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {/* SECTION: PIPELINE */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 6px 4px',
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: 'var(--tertiary-label)',
              letterSpacing: 1.1,
              fontFamily: 'var(--font-mono)',
            }}
          >
            STUDIO PIPELINE
          </span>
          <span
            style={{
              fontSize: 8.5,
              fontWeight: 800,
              color: '#00F2FE',
              backgroundColor: 'rgba(0, 242, 254, 0.1)',
              border: '1px solid rgba(0, 242, 254, 0.2)',
              padding: '1px 5px',
              borderRadius: 999,
              fontFamily: 'var(--font-mono)',
            }}
          >
            6 STAGES
          </span>
        </div>

        {/* Studio Pipeline Stages Render */}
        {pipelineNavItems.map((key, index) => {
          const meta = getStageMeta(key);
          const stageNum = getStageNumber(key);
          const isActive = activePage === key;
          const Icon = meta.icon;
          const shortcutKey = index < 9 ? `Alt+${index + 1}` : null;

          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              className="btn-tactile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                height: 34,
                padding: '0 8px',
                borderRadius: 8,
                border: isActive ? `1px solid ${meta.color}80` : '1px solid transparent',
                background: isActive
                  ? `linear-gradient(90deg, ${meta.color}20 0%, ${meta.color}06 100%)`
                  : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.12s ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = `${meta.color}10`;
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title={shortcutKey ? `${meta.label} (${shortcutKey})` : meta.label}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  backgroundColor: isActive ? `${meta.color}25` : `${meta.color}14`,
                  border: `1px solid ${isActive ? meta.color : meta.color + '30'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: meta.color,
                  boxShadow: isActive ? `0 0 8px ${meta.color}35` : 'none',
                  flexShrink: 0,
                }}
              >
                <Icon size={13} />
              </div>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 11.5,
                  fontWeight: isActive ? 700 : 500,
                  color: 'var(--label)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {meta.label}
              </span>
              <span
                style={{
                  fontSize: 8.5,
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: meta.color,
                  padding: '1.5px 5px',
                  borderRadius: 4,
                  backgroundColor: isActive ? `${meta.color}22` : `${meta.color}10`,
                  border: `1px solid ${isActive ? meta.color + '50' : meta.color + '25'}`,
                  flexShrink: 0,
                }}
              >
                {stageNum}
              </span>
            </button>
          );
        })}

        {/* SECTION: UTILITIES */}
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: 'var(--tertiary-label)',
            letterSpacing: 1.1,
            padding: '10px 6px 4px',
            fontFamily: 'var(--font-mono)',
          }}
        >
          UTILITIES
        </div>

        {/* Dynamic System & Workspace Nav Buttons */}
        {SYSTEM_NAV_ORDER.map((key) => {
          const meta = getStageMeta(key);
          const isActive = activePage === key;
          const Icon = meta.icon;
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              className="btn-tactile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                height: 32,
                padding: '0 8px',
                borderRadius: 7,
                border: isActive ? `1px solid ${meta.color}70` : '1px solid transparent',
                backgroundColor: isActive ? `${meta.color}16` : 'transparent',
                color: 'var(--label)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.12s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = `${meta.color}10`;
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  backgroundColor: isActive ? `${meta.color}22` : `${meta.color}12`,
                  border: `1px solid ${isActive ? meta.color : meta.color + '25'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: meta.color,
                  flexShrink: 0,
                }}
              >
                <Icon size={12} />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: isActive ? 700 : 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {meta.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sleek User Profile Chip */}
      <div
        style={{
          padding: '6px 8px',
          margin: '4px 6px',
          borderRadius: 8,
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            padding: 1,
            background: 'linear-gradient(135deg, #00F2FE 0%, #8B5CF6 100%)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {userProfile?.avatar ? (
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {(userProfile?.name || 'MA').slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--label)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={userProfile?.name}
          >
            {userProfile?.name || 'Master Architect'}
          </span>
          <span
            style={{
              fontSize: 9,
              fontFamily: 'var(--font-mono)',
              color: 'var(--secondary-label)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            @{userProfile?.username || 'admin'}
          </span>
        </div>
      </div>

      {/* Footer System Dock: Settings & Theme Toggle */}
      <div
        style={{
          padding: '6px 8px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
        }}
      >
        <button
          onClick={onOpenSettings}
          className="btn-tactile"
          style={{
            flex: 1,
            height: 28,
            borderRadius: 6,
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            color: 'var(--label)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
        >
          <SettingsIcon size={12} style={{ color: 'var(--secondary-label)' }} />
          Preferences
        </button>

        <button
          onClick={toggleTheme}
          className="btn-tactile"
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            color: 'var(--label)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? <Sun size={12} color="#FBBF24" /> : <Moon size={12} color="#818CF8" />}
        </button>
      </div>
    </aside>
  );
};
