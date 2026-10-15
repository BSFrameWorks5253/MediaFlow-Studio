import React from 'react';
import {
  ChevronRight,
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

export type { PageKey };
export { PIPELINE_NAV_ORDER, SYSTEM_NAV_ORDER };

interface SidebarProps {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, onOpenSettings }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <aside
      className="glass-panel"
      style={{
        width: 250,
        minWidth: 250,
        maxWidth: 250,
        height: '100%',
        borderRadius: 16,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 2,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: 60,
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #00F2FE 0%, #8B5CF6 100%)',
            padding: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 8.5,
              backgroundColor: 'var(--system-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <img
              src="./assets/icon.png"
              alt="MediaFlow"
              style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover' }}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 13.5,
              letterSpacing: 1.2,
              color: 'var(--label)',
            }}
          >
            MEDIAFLOW
          </span>
          <span
            style={{
              padding: '1.5px 5px',
              borderRadius: 4,
              fontSize: 8.5,
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              color: '#00F2FE',
              background: 'rgba(0, 242, 254, 0.12)',
              border: '1px solid rgba(0, 242, 254, 0.3)',
            }}
          >
            v5.0
          </span>
        </div>
      </div>

      {/* Navigation Links Scroll Container */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px 8px',
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
            padding: '4px 8px 6px',
          }}
        >
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              color: 'var(--tertiary-label)',
              letterSpacing: 1.2,
              fontFamily: 'var(--font-mono)',
            }}
          >
            PIPELINE
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              color: '#00F2FE',
              backgroundColor: 'rgba(0, 242, 254, 0.12)',
              border: '1px solid rgba(0, 242, 254, 0.25)',
              padding: '1.5px 6px',
              borderRadius: 999,
              fontFamily: 'var(--font-mono)',
            }}
          >
            9 STAGES
          </span>
        </div>

        {/* Dynamic Pipeline Stages Render */}
        {PIPELINE_NAV_ORDER.map((key, index) => {
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
                gap: 9,
                height: 40,
                padding: '0 8px',
                borderRadius: 10,
                border: isActive ? `1.5px solid ${meta.color}75` : '1px solid transparent',
                background: isActive
                  ? `linear-gradient(90deg, ${meta.color}22 0%, ${meta.color}08 100%)`
                  : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = `${meta.color}12`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              title={shortcutKey ? `${meta.label} (${shortcutKey})` : meta.label}
            >
              {/* Vibrant Colored Icon Container */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: isActive ? `${meta.color}28` : `${meta.color}16`,
                  border: `1px solid ${isActive ? meta.color : meta.color + '35'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: meta.color,
                  boxShadow: isActive ? `0 0 10px ${meta.color}40` : 'none',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={15} />
              </div>

              {/* Title */}
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 12.5,
                  fontWeight: isActive ? 700 : 500,
                  color: 'var(--label)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {meta.label}
              </span>

              {/* Vibrant Stage Number Badge */}
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: meta.color,
                  padding: '2px 6px',
                  borderRadius: 5,
                  backgroundColor: isActive ? `${meta.color}25` : `${meta.color}14`,
                  border: `1px solid ${isActive ? meta.color + '55' : meta.color + '30'}`,
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
            fontSize: 9.5,
            fontWeight: 700,
            color: 'var(--tertiary-label)',
            letterSpacing: 1.2,
            padding: '14px 8px 4px',
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
                gap: 9,
                height: 38,
                padding: '0 8px',
                borderRadius: 9,
                border: isActive ? `1.5px solid ${meta.color}70` : '1px solid transparent',
                backgroundColor: isActive ? `${meta.color}18` : 'transparent',
                color: 'var(--label)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = `${meta.color}12`;
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 7,
                  backgroundColor: isActive ? `${meta.color}25` : `${meta.color}15`,
                  border: `1px solid ${isActive ? meta.color : meta.color + '30'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: meta.color,
                  flexShrink: 0,
                }}
              >
                <Icon size={14} />
              </div>
              <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {meta.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer System Dock: Settings & Theme Toggle */}
      <div
        style={{
          padding: '8px 10px',
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
            height: 34,
            borderRadius: 8,
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface-card)',
            color: 'var(--label)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontSize: 11.5,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--surface-card-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--surface-card)';
          }}
        >
          <SettingsIcon size={14} style={{ color: 'var(--secondary-label)' }} />
          Preferences
        </button>

        <button
          onClick={toggleTheme}
          className="btn-tactile"
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface-card)',
            color: 'var(--label)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? <Sun size={14} color="#FF9F0A" /> : <Moon size={14} color="#007AFF" />}
        </button>
      </div>
    </aside>
  );
};
