import React, { useState, useEffect } from 'react';
import {
  Box,
  Image as ImageIcon,
  Video,
  FolderArchive,
  Layers,
  FileSpreadsheet,
  ArrowRight,
  Cloud,
  FolderPlus,
  FolderX,
  Zap,
  Activity,
  Sparkles,
  Play,
  CheckCircle2,
  Cpu,
} from 'lucide-react';
import { PageKey, PIPELINE_NAV_ORDER, getStageMeta, getStageNumber } from '../types/pipelineStages';
import { ActivityItem } from '../../electron/managers/activityReportsManager';
import { StatCard } from '../components/StatCard';
import { StudioButton } from '../components/StudioButton';

interface OverviewPageProps {
  onNavigate: (page: PageKey) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate }) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const isDemo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === 'true';

    const now = Date.now();
    const sampleActs: ActivityItem[] = [
      { id: '1', timestamp: new Date(now - 8 * 60 * 1000).toISOString(), stage: 'Stage 00 • PV Separator', action: '32-Thread Parallel Extraction', count: 2420, summary: 'Ingested 2,420 RAW media files from D:\\DCIM\\CARD_A to D:\\RAW\\PV', type: 'success' },
      { id: '2', timestamp: new Date(now - 25 * 60 * 1000).toISOString(), stage: 'Stage 02 • Photo Tagger', action: '_U and _R Status Applied', count: 1840, summary: 'Tagged 1,840 photos with sequence numeric matching', type: 'success' },
      { id: '3', timestamp: new Date(now - 42 * 60 * 1000).toISOString(), stage: 'Stage 05 • Sequence Sync', action: 'Multi-Camera Alignment', count: 348, summary: 'Paired 348 video clips across 18 photo event subfolders', type: 'success' },
      { id: '4', timestamp: new Date(now - 65 * 60 * 1000).toISOString(), stage: 'Stage 07 • DO NOT UPLOAD', action: 'Quarantine Rules Executed', count: 12, summary: 'Isolated Contributor & Documents into DO NOT UPLOAD hierarchy', type: 'info' },
      { id: '5', timestamp: new Date(now - 110 * 60 * 1000).toISOString(), stage: 'Stage 08 • Report Merger', action: 'Excel Package Compiled', count: 1, summary: 'Compiled delivery workbook with full formatting preservation', type: 'success' },
    ];

    if (window.electronAPI && !isDemo) {
      window.electronAPI.getActivities().then((acts: ActivityItem[]) => {
        if (acts && Array.isArray(acts) && acts.length > 0) {
          setActivities(acts.slice(0, 8));
        } else {
          setActivities(sampleActs);
        }
      });
    } else {
      setActivities(sampleActs);
    }
  }, []);

  const pipelineStages = PIPELINE_NAV_ORDER.map((key) => {
    const meta = getStageMeta(key);
    const stage = getStageNumber(key);
    return {
      key,
      stage,
      title: meta.label,
      desc: meta.desc,
      color: meta.color,
      icon: meta.icon,
    };
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        height: '100%',
        overflowY: 'auto',
        paddingRight: 6,
      }}
    >
      {/* 4 Mission Critical Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14,
        }}
      >
        <StatCard
          label="Pipeline Modules"
          value="9 Active Stages"
          subValue="End-to-end media automation"
          icon={<Zap size={16} />}
          accentColor="#00F2FE"
          tag="ONLINE"
        />
        <StatCard
          label="Ingestion Engine"
          value="High-Speed NVMe"
          subValue="Parallel RAW media extraction"
          icon={<Cpu size={16} />}
          accentColor="#10E79D"
          tag="VERIFIED"
        />
        <StatCard
          label="Sequence Matching"
          value="100% Precision"
          subValue="Numeric & status code alignment"
          icon={<CheckCircle2 size={16} />}
          accentColor="#8B5CF6"
          tag="EXACT MATCH"
        />
        <StatCard
          label="Workspace Storage"
          value="Drive Synchronized"
          subValue="Local and cloud pipeline wired"
          icon={<Cloud size={16} />}
          accentColor="#38BDF8"
          tag="CONNECTED"
        />
      </div>

      {/* Interactive Production Pipeline Matrix Canvas */}
      <div
        className="glass-card"
        style={{
          padding: '22px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          borderRadius: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 1.4,
                fontFamily: 'var(--font-mono)',
                color: 'var(--label)',
                whiteSpace: 'nowrap',
              }}
            >
              PIPELINE EXECUTION MATRIX
            </span>
            <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border-subtle)' }} />
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                color: '#00F2FE',
                whiteSpace: 'nowrap',
                backgroundColor: 'rgba(0, 242, 254, 0.1)',
                padding: '2px 8px',
                borderRadius: 6,
                border: '1px solid rgba(0, 242, 254, 0.3)',
              }}
            >
              {pipelineStages.length} STAGES CONFIGURED
            </span>
          </div>
        </div>

        {/* 9 Stage Matrix Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 14,
          }}
        >
          {pipelineStages.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.key}
                onClick={() => onNavigate(stage.key)}
                className="glass-card glass-card-interactive"
                style={{
                  padding: '16px',
                  borderRadius: 16,
                  border: '1px solid var(--border-glass)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = stage.color;
                  e.currentTarget.style.boxShadow = `0 14px 34px -6px ${stage.color}35`;
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-glass)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                  e.currentTarget.style.transform = 'translateY(0px)';
                }}
              >
                {/* Top Accent Stripe */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    backgroundColor: stage.color,
                  }}
                />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 900,
                      color: stage.color,
                      backgroundColor: `${stage.color}18`,
                      padding: '2px 8px',
                      borderRadius: 6,
                      border: `1px solid ${stage.color}40`,
                    }}
                  >
                    STAGE {stage.stage}
                  </span>

                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      backgroundColor: `${stage.color}15`,
                      border: `1px solid ${stage.color}35`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 0 12px ${stage.color}20`,
                    }}
                  >
                    <Icon size={16} color={stage.color} />
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--label)', fontFamily: 'var(--font-display)' }}>
                    {stage.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--secondary-label)', marginTop: 3 }}>
                    {stage.desc}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    color: stage.color,
                    marginTop: 'auto',
                    paddingTop: 8,
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <span>Launch Workstation</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Operations & Cloud Deck */}
      <div style={{ display: 'grid', gridTemplateColumns: '66% 34%', gap: 16 }}>
        {/* Left: Recent Production Operations */}
        <div
          className="glass-card"
          style={{
            padding: '20px 22px',
            borderRadius: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            minHeight: 240,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={15} color="#00F2FE" />
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 900,
                  letterSpacing: 1.2,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--label)',
                }}
              >
                LIVE PRODUCTION AUDIT LOG
              </span>
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
                gap: 5,
              }}
            >
              <span>Full Audit Ledger</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Activity List */}
          {activities.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '28px 0',
              }}
            >
              <Box size={26} color="var(--tertiary-label)" />
              <span style={{ fontSize: 12, color: 'var(--tertiary-label)' }}>
                No operations recorded in this session.
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
              {activities.map((act) => (
                <div
                  key={act.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 10,
                    backgroundColor: 'var(--surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: 11.5,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--tertiary-label)',
                      fontSize: 10.5,
                      fontWeight: 600,
                    }}
                  >
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 5,
                      backgroundColor: 'rgba(0, 242, 254, 0.12)',
                      border: '1px solid rgba(0, 242, 254, 0.35)',
                      color: '#00F2FE',
                      textTransform: 'uppercase',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {act.stage}
                  </span>

                  <span style={{ color: 'var(--label)', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {act.action} — <span style={{ color: 'var(--secondary-label)' }}>{act.summary}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Cloud & Export Sinks */}
        <div
          className="glass-card"
          style={{
            padding: '20px 22px',
            borderRadius: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            minHeight: 240,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cloud size={15} color="#38BDF8" />
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 900,
                letterSpacing: 1.2,
                fontFamily: 'var(--font-mono)',
                color: 'var(--label)',
              }}
            >
              CLOUD & EXPORT SINKS
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Main Google Drive */}
            <div
              onClick={() => onNavigate('googleDrive')}
              className="glass-card"
              style={{
                padding: '14px 16px',
                borderRadius: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                border: '1px solid var(--border-subtle)',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--system-blue)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.transform = 'translateY(0px)';
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: 'rgba(10, 132, 255, 0.18)',
                  border: '1px solid rgba(10, 132, 255, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Cloud size={18} color="#0A84FF" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--label)' }}>
                  Main Google Drive
                </span>
                <span style={{ fontSize: 10.5, color: 'var(--secondary-label)' }}>
                  Production cloud sync & package ingest
                </span>
              </div>
            </div>

            {/* Reference Google Drive */}
            <div
              onClick={() => onNavigate('googleDrive')}
              className="glass-card"
              style={{
                padding: '14px 16px',
                borderRadius: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                border: '1px solid var(--border-subtle)',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#10E79D';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.transform = 'translateY(0px)';
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: 'rgba(16, 231, 157, 0.18)',
                  border: '1px solid rgba(16, 231, 157, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Cloud size={18} color="#10E79D" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--label)' }}>
                  Reference Google Drive
                </span>
                <span style={{ fontSize: 10.5, color: 'var(--secondary-label)' }}>
                  Reference photos, proofs & badges
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
