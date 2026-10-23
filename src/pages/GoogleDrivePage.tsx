import React, { useState, useEffect } from 'react';
import { Cloud, ExternalLink, LogOut } from 'lucide-react';
import { StudioButton } from '../components/StudioButton';

interface GoogleDrivePageProps {
  onShowToast: (text: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
}

export const GoogleDrivePage: React.FC<GoogleDrivePageProps> = ({ onShowToast }) => {
  const [activeTab, setActiveTab] = useState<'main' | 'ref'>('main');
  const [mainUrl, setMainUrl] = useState('https://drive.google.com/drive/my-drive');
  const [refUrl, setRefUrl] = useState('https://drive.google.com/drive/my-drive');

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getDriveConfig().then((cfg: any) => {
        if (cfg) {
          if (cfg.mainDataUrl) setMainUrl(cfg.mainDataUrl);
          if (cfg.thumbnailsUrl) setRefUrl(cfg.thumbnailsUrl);
        }
      });
    }
  }, []);

  const handleClearSession = async () => {
    if (window.electronAPI) {
      await window.electronAPI.clearDriveSession(activeTab);
      onShowToast(`Session purged for ${activeTab === 'main' ? 'Main Drive' : 'Reference Drive'}.`, 'success');
    }
  };

  const handleOpenExternal = () => {
    const targetUrl = activeTab === 'main' ? mainUrl : refUrl;
    if (window.electronAPI) {
      window.electronAPI.openDriveExternal(targetUrl);
    } else {
      window.open(targetUrl, '_blank');
    }
  };

  const currentUrl = activeTab === 'main' ? mainUrl : refUrl;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Top Workspace Bar with Dual Isolated Drive Tabs */}
      <div
        className="glass-card"
        style={{
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        {/* Drive Selection Tabs & Scope */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setActiveTab('main')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: activeTab === 'main' ? '1px solid var(--system-blue)' : '1px solid var(--border)',
              backgroundColor: activeTab === 'main' ? 'var(--accent-soft)' : 'transparent',
              color: activeTab === 'main' ? 'var(--system-blue)' : 'var(--secondary-label)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all var(--transition-fast)',
            }}
          >
            <Cloud size={15} />
            <span>MAIN DRIVE (Account 1)</span>
          </button>

          <button
            onClick={() => setActiveTab('ref')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: activeTab === 'ref' ? '1px solid var(--system-purple)' : '1px solid var(--border)',
              backgroundColor: activeTab === 'ref' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
              color: activeTab === 'ref' ? 'var(--system-purple)' : 'var(--secondary-label)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all var(--transition-fast)',
            }}
          >
            <Cloud size={15} />
            <span>REFERENCE DRIVE (Account 2)</span>
          </button>

          {/* Scope Badge */}
          <div
            style={{
              padding: '4px 12px',
              borderRadius: 12,
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              fontSize: 11,
              color: 'var(--secondary-label)',
              fontWeight: 500,
              marginLeft: 6,
            }}
          >
            {activeTab === 'main'
              ? '🔒 Account 1: Master Video & RAW Archives'
              : '🔒 Account 2: Reference Photos & Previews'}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StudioButton variant="secondary" size="sm" icon={<LogOut size={13} />} onClick={handleClearSession}>
            Switch Account
          </StudioButton>
          <StudioButton variant="glass" size="sm" icon={<ExternalLink size={13} />} onClick={handleOpenExternal}>
            Open in Browser
          </StudioButton>
        </div>
      </div>

      {/* Embedded Webview Container */}
      <div
        className="glass-card"
        style={{
          flex: 1,
          borderRadius: 14,
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          position: 'relative',
        }}
      >
        <webview
          key={activeTab}
          src={currentUrl}
          partition={activeTab === 'main' ? 'persist:main_drive' : 'persist:ref_drive'}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
};
