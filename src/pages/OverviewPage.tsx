import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Split,
  Tags,
  Clapperboard,
  FileSpreadsheet,
  Archive,
  FolderCheck,
  Wrench,
  ArrowRight,
  Activity,
  Inbox,
  CheckCircle2,
  FolderOpen,
} from 'lucide-react';
import { PageKey } from '../types/pipelineStages';
import { ActivityItem } from '../../electron/managers/activityReportsManager';

interface OverviewPageProps {
  onNavigate: (page: PageKey) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate }) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const isDemo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === 'true';

    const now = Date.now();
    const sampleActs: ActivityItem[] = [
      { id: '1', timestamp: new Date(now - 8 * 60 * 1000).toISOString(), stage: 'Ingest & Split', action: 'RAW Media Extracted', count: 2420, summary: 'Separated 2,420 photos and videos into structured folders', type: 'success' },
      { id: '2', timestamp: new Date(now - 25 * 60 * 1000).toISOString(), stage: 'Tag & Match', action: 'Photo Tagger Applied', count: 1840, summary: 'Matched 1,840 photos with sequence numbering', type: 'success' },
      { id: '3', timestamp: new Date(now - 42 * 60 * 1000).toISOString(), stage: 'Sync Video & Photo', action: 'AFM Dual Sync Ready', count: 348, summary: 'Paired video clips with photo event folders', type: 'success' },
      { id: '4', timestamp: new Date(now - 85 * 60 * 1000).toISOString(), stage: 'Multi-Zip Consolidator', action: 'Drive Zips Merged', count: 3, summary: 'Consolidated parts 001-003 into unified folder', type: 'success' },
    ];

    if (window.electronAPI && !isDemo) {
      window.electronAPI.getActivities().then((acts: ActivityItem[]) => {
        if (acts && Array.isArray(acts) && acts.length > 0) {
          setActivities(acts.slice(0, 5));
        } else {
          setActivities(sampleActs);
        }
      });
    } else {
      setActivities(sampleActs);
    }
  }, []);

  const coreWorkflowSteps = [
    {
      step: '1',
      title: 'Ingest & Split',
      desc: 'Separate RAW Photo and Video files from camera memory cards into organized folders.',
      pageKey: 'pvSeparator' as PageKey,
      color: '#06B6D4',
      icon: Split,
      badge: 'Step 1',
    },
    {
      step: '2',
      title: 'Tag & Match Photos',
      desc: 'Apply status tags (_U / _R), shift dates, and match sequences with numeric accuracy.',
      pageKey: 'photoMatcher' as PageKey,
      color: '#8B5CF6',
      icon: Tags,
      badge: 'Step 2',
    },
    {
      step: '3',
      title: 'Sync Video & Photo',
      desc: 'Pair multi-camera videos with photo events and open in Anything File Manager Dual View.',
      pageKey: 'videoTransfer' as PageKey,
      color: '#10B981',
      icon: Clapperboard,
      badge: 'Step 3',
    },
    {
      step: '4',
      title: 'Delivery Report',
      desc: 'Compile final client delivery spreadsheets with complete formatting preservation.',
      pageKey: 'excelMerger' as PageKey,
      color: '#F59E0B',
      icon: FileSpreadsheet,
      badge: 'Step 4',
    },
  ];

  const quickUtilities = [
    {
      title: 'Multi-Zip Consolidator',
      desc: 'Unzip multi-part Google Drive files (001, 002, 003) into one unified folder without manual organizing.',
      pageKey: 'multiZipExtractor' as PageKey,
      color: '#3B82F6',
      icon: Archive,
      tag: 'Google Drive',
    },
    {
      title: 'Folder Size & File Verifier',
      desc: 'Verify folder sizes, file and subfolder counts, and copy formatted summaries for the main head.',
      pageKey: 'folderVerifier' as PageKey,
      color: '#10B981',
      icon: FolderCheck,
      tag: 'Audit & Clipboard',
    },
    {
      title: 'All Standalone Tools',
      desc: 'Quick access to remaining collectors, thumbnail separators, and individual batch tools.',
      pageKey: 'tools' as PageKey,
      color: '#8B5CF6',
      icon: Wrench,
      tag: 'Utilities Suite',
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        height: '100%',
        overflowY: 'auto',
        paddingRight: 6,
        paddingBottom: 24,
      }}
    >
      {/* Welcome Banner */}
      <div
        className="glass-card"
        style={{
          padding: '24px 28px',
          borderRadius: 20,
          background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
          border: '1px solid rgba(0, 242, 254, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: '#00F2FE',
                backgroundColor: 'rgba(0, 242, 254, 0.15)',
                padding: '3px 9px',
                borderRadius: 999,
                fontFamily: 'var(--font-mono)',
                border: '1px solid rgba(0, 242, 254, 0.35)',
              }}
            >
              MEDIA PRODUCTION HUB
            </span>
            <span style={{ fontSize: 12, color: 'var(--secondary-label)' }}>• Clean & Calibrated</span>
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              color: 'var(--label)',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Welcome to MediaFlow Studio
          </h1>
          <p
            style={{
              fontSize: 13.5,
              color: 'var(--secondary-label)',
              margin: 0,
              maxWidth: 640,
              lineHeight: 1.5,
            }}
          >
            A calm, automated workflow for wedding and event media. Follow the 4-step pipeline or use dedicated utilities for Google Drive zips, folder verification, and video/photo sync.
          </p>
        </div>

        <button
          onClick={() => onNavigate('pvSeparator')}
          className="btn-tactile"
          style={{
            padding: '12px 22px',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #00F2FE 0%, #0284C7 100%)',
            color: '#0f172a',
            fontSize: 13,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 16px rgba(0, 242, 254, 0.3)',
            flexShrink: 0,
          }}
        >
          <span>Start Ingest</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* SECTION 1: Core 4-Step Workflow */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={16} color="#00F2FE" />
            <h2
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: 'var(--label)',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              Core 4-Step Pipeline
            </h2>
          </div>
          <span style={{ fontSize: 11, color: 'var(--tertiary-label)', fontFamily: 'var(--font-mono)' }}>
            RECOMMENDED STANDARD WORKFLOW
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 14,
          }}
        >
          {coreWorkflowSteps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.step}
                onClick={() => onNavigate(step.pageKey)}
                className="glass-card btn-tactile"
                style={{
                  padding: '20px 18px',
                  borderRadius: 16,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-card)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${step.color}80`;
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = `0 12px 24px -6px ${step.color}25`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'translateY(0px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    backgroundColor: step.color,
                  }}
                />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)',
                      color: step.color,
                      backgroundColor: `${step.color}18`,
                      border: `1px solid ${step.color}40`,
                      padding: '2px 7px',
                      borderRadius: 6,
                    }}
                  >
                    {step.badge}
                  </span>

                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      backgroundColor: `${step.color}15`,
                      border: `1px solid ${step.color}35`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: step.color,
                    }}
                  >
                    <Icon size={17} />
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 14.5,
                      fontWeight: 700,
                      color: 'var(--label)',
                      lineHeight: 1.3,
                    }}
                  >
                    {step.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--secondary-label)',
                      marginTop: 6,
                      lineHeight: 1.45,
                    }}
                  >
                    {step.desc}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: step.color,
                    marginTop: 6,
                  }}
                >
                  <span>Open Step</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Essential Quick Utilities */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FolderOpen size={16} color="#3B82F6" />
            <h2
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: 'var(--label)',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              Essential Utilities
            </h2>
          </div>
          <span style={{ fontSize: 11, color: 'var(--tertiary-label)', fontFamily: 'var(--font-mono)' }}>
            NEW ASSISTANTS
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14,
          }}
        >
          {quickUtilities.map((util) => {
            const Icon = util.icon;
            return (
              <div
                key={util.title}
                onClick={() => onNavigate(util.pageKey)}
                className="glass-card btn-tactile"
                style={{
                  padding: '20px 20px',
                  borderRadius: 16,
                  border: '1px solid var(--border)',
                  background: 'var(--surface-card)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${util.color}80`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 10px 20px -6px ${util.color}20`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'translateY(0px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: `${util.color}15`,
                    border: `1px solid ${util.color}35`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: util.color,
                    flexShrink: 0,
                  }}
                >
                  <Icon size={20} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: 'var(--label)',
                      }}
                    >
                      {util.title}
                    </span>
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: util.color,
                        backgroundColor: `${util.color}14`,
                        padding: '1.5px 6px',
                        borderRadius: 4,
                      }}
                    >
                      {util.tag}
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--secondary-label)',
                      margin: '6px 0 0 0',
                      lineHeight: 1.45,
                    }}
                  >
                    {util.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Recent Activity Deck */}
      <div
        className="glass-card"
        style={{
          padding: '20px 24px',
          borderRadius: 18,
          background: 'var(--surface-card)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={15} color="#00F2FE" />
            <h3
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: 'var(--label)',
                margin: 0,
              }}
            >
              Recent Session Operations
            </h3>
          </div>
          <button
            onClick={() => onNavigate('activity')}
            className="btn-tactile"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#00F2FE',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>View All Logs</span>
            <ArrowRight size={12} />
          </button>
        </div>

        {activities.length === 0 ? (
          <div
            style={{
              padding: '20px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              color: 'var(--tertiary-label)',
              fontSize: 12,
            }}
          >
            <Inbox size={22} />
            <span>No operations recorded yet in this session.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activities.map((act) => (
              <div
                key={act.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '9px 12px',
                  borderRadius: 10,
                  backgroundColor: 'var(--surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--tertiary-label)',
                    fontSize: 10.5,
                  }}
                >
                  {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: 4,
                    backgroundColor: 'rgba(0, 242, 254, 0.12)',
                    border: '1px solid rgba(0, 242, 254, 0.3)',
                    color: '#00F2FE',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {act.stage}
                </span>
                <span style={{ color: 'var(--label)', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {act.action} — <span style={{ color: 'var(--secondary-label)' }}>{act.summary}</span>
                </span>
                <CheckCircle2 size={13} color="#10B981" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
