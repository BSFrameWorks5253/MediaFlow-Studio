import React, { useState, useEffect } from 'react';
import { Clock, FileText, ExternalLink, FolderOpen, CheckCircle2 } from 'lucide-react';
import { StudioButton } from '../components/StudioButton';
import { ActivityItem, ReportItem } from '../../electron/managers/activityReportsManager';

export const ActivityPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'activity' | 'reports'>('activity');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getActivities().then(setActivities);
      window.electronAPI.getReports().then(setReports);
    }
  }, []);

  const handleOpenFile = (filePath: string) => {
    if (window.electronAPI) {
      window.electronAPI.openPath(filePath);
    }
  };

  const handleReveal = (filePath: string) => {
    if (window.electronAPI) {
      window.electronAPI.showItemInFolder(filePath);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        height: '100%',
        overflowY: 'auto',
        paddingRight: 6,
      }}
    >
      {/* Tab Header Bar */}
      <div
        className="glass-card"
        style={{
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setActiveTab('activity')}
            style={{
              padding: '6px 16px',
              borderRadius: 8,
              border: activeTab === 'activity' ? '1px solid var(--system-blue)' : '1px solid var(--border)',
              backgroundColor: activeTab === 'activity' ? 'var(--accent-soft)' : 'transparent',
              color: activeTab === 'activity' ? 'var(--system-blue)' : 'var(--secondary-label)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Clock size={15} />
            <span>Activity Journal ({activities.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            style={{
              padding: '6px 16px',
              borderRadius: 8,
              border: activeTab === 'reports' ? '1px solid var(--system-orange)' : '1px solid var(--border)',
              backgroundColor: activeTab === 'reports' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              color: activeTab === 'reports' ? 'var(--system-orange)' : 'var(--secondary-label)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <FileText size={15} />
            <span>Delivery Reports Manifest ({reports.length})</span>
          </button>
        </div>
      </div>

      {/* Tab Body */}
      <div
        className="glass-card"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minHeight: 320,
        }}
      >
        {activeTab === 'activity' ? (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activities.length === 0 ? (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--tertiary-label)',
                  fontSize: 13,
                  fontStyle: 'italic',
                  padding: 40,
                }}
              >
                No logged activity yet. Operations across all engines will record here.
              </div>
            ) : (
              activities.map((act) => (
                <div
                  key={act.id}
                  style={{
                    padding: '12px 18px',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 10,
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: 'var(--system-blue)',
                        backgroundColor: 'var(--accent-soft)',
                      }}
                    >
                      {act.stage}
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--label)' }}>
                        {act.action}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
                        {act.summary}
                      </div>
                    </div>
                  </div>

                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--tertiary-label)' }}>
                    {new Date(act.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {reports.length === 0 ? (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--tertiary-label)',
                  fontSize: 13,
                  fontStyle: 'italic',
                  padding: 40,
                }}
              >
                No exported reports cataloged yet.
              </div>
            ) : (
              reports.map((rep) => (
                <div
                  key={rep.id}
                  style={{
                    padding: '12px 18px',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--label)' }}>
                      {rep.title}
                    </div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--secondary-label)' }}>
                      {rep.path}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <StudioButton variant="glass" size="sm" icon={<ExternalLink size={12} />} onClick={() => handleOpenFile(rep.path)}>
                      Open
                    </StudioButton>
                    <StudioButton variant="glass" size="sm" icon={<FolderOpen size={12} />} onClick={() => handleReveal(rep.path)}>
                      Reveal
                    </StudioButton>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
