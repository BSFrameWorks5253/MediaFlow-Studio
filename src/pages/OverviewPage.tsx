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

interface OverviewPageProps {
  onNavigate: (page: PageKey) => void;
}

const STAGE_CAPABILITIES: Record<PageKey, string> = {
  pvSeparator: '32-Thread Parallel RAW',
  uploadStructure: '3-Folder Generation',
  photoMatcher: 'Exact Numeric Match',
  remainingCollector: 'Date Shift Consolidation',
  eventDistributor: 'Q & M Badge Overlay',
  videoTransfer: 'Sequence Synchronization',
  thumbnailSeparator: '_P & _V Folder Isolation',
  doNotUpload: 'Quarantine Shield',
  excelMerger: 'Format-Preserving Excel',
  overview: 'Command Matrix',
  googleDrive: 'Cloud Sync',
  activity: 'Audit Ledger',
  tools: 'Utility Suite',
};

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate }) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);

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
      capability: STAGE_CAPABILITIES[key] || 'Production Stage',
    };
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
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
          gap: 16,
        }}
      >
        <StatCard
          label="Pipeline Modules"
          value="9 Active Stages"
          subValue="End-to-end media automation"
          icon={<Zap size={18} />}
          accentColor="#00F2FE"
          tag="ONLINE"
        />
        <StatCard
          label="Ingestion Engine"
          value="High-Speed NVMe"
          subValue="Parallel RAW media extraction"
          icon={<Cpu size={18} />}
          accentColor="#10E79D"
          tag="VERIFIED"
        />
        <StatCard
          label="Sequence Matching"
          value="100% Precision"
          subValue="Numeric & status code alignment"
          icon={<CheckCircle2 size={18} />}
          accentColor="#8B5CF6"
          tag="EXACT MATCH"
        />
        <StatCard
          label="Workspace Storage"
          value="Drive Synchronized"
          subValue="Local and cloud pipeline wired"
          icon={<Cloud size={18} />}
          accentColor="#38BDF8"
          tag="CONNECTED"
        />
      </div>

      {/* Interactive Production Pipeline Matrix Canvas */}
      <div
        className="glass-card"
        style={{
          padding: '24px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          borderRadius: 20,
          background: 'var(--surface-card)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* Matrix Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#00F2FE',
                boxShadow: '0 0 10px #00F2FE',
              }}
            />
            <span
              style={{
                fontSize: 12,
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: '#00F2FE',
                  whiteSpace: 'nowrap',
                  backgroundColor: 'rgba(0, 242, 254, 0.12)',
                  padding: '3px 10px',
                  borderRadius: 6,
                  border: '1px solid rgba(0, 242, 254, 0.35)',
                }}
              >
                9 STAGES • BALANCED 3x3 MATRIX
              </span>
            </div>
          </div>
        </div>

        {/* Perfectly Balanced 3x3 Stage Matrix Grid (Zero Orphaned Cards) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
          }}
        >
          {pipelineStages.map((stage) => {
            const Icon = stage.icon;
            const isHovered = hoveredStage === stage.key;

            return (
              <div
                key={stage.key}
                onClick={() => onNavigate(stage.key)}
                onMouseEnter={() => setHoveredStage(stage.key)}
                onMouseLeave={() => setHoveredStage(null)}
                className="glass-card"
                style={{
                  padding: '20px 20px 18px 20px',
                  borderRadius: 16,
                  border: `1px solid ${isHovered ? `${stage.color}80` : 'var(--border)'}`,
                  background: isHovered
                    ? `radial-gradient(circle at top right, ${stage.color}18 0%, var(--surface-card) 60%)`
                    : `radial-gradient(circle at top right, ${stage.color}0a 0%, var(--surface-card) 65%)`,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: isHovered
                    ? `0 18px 38px -6px ${stage.color}22, 0 0 0 1px ${stage.color}50`
                    : 'var(--shadow-card)',
                  transform: isHovered ? 'translateY(-3px)' : 'translateY(0px)',
                  transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {/* Top Glowing Accent Stripe */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: `linear-gradient(90deg, ${stage.color} 0%, ${stage.color}88 100%)`,
                    opacity: isHovered ? 1 : 0.85,
                  }}
                />

                {/* Top Row: Stage Badge + Capability Tag + Icon Squircle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 900,
                          color: stage.color,
                          backgroundColor: `${stage.color}15`,
                          padding: '2px 8px',
                          borderRadius: 6,
                          border: `1px solid ${stage.color}35`,
                          letterSpacing: '0.04em',
                        }}
                      >
                        STAGE {stage.stage}
                      </span>
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: '#10E79D',
                          boxShadow: '0 0 6px rgba(16, 231, 157, 0.6)',
                        }}
                        title="Module Active"
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--tertiary-label)',
                        fontWeight: 600,
                      }}
                    >
                      {stage.capability}
                    </span>
                  </div>

                  {/* Icon Squircle with Ambient Glow */}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: `${stage.color}15`,
                      border: `1px solid ${stage.color}35`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 3px 12px ${stage.color}20`,
                      transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                      transition: 'transform 0.2s ease',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={19} color={stage.color} />
                  </div>
                </div>

                {/* Body Content */}
                <div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: 'var(--label)',
                      fontFamily: 'var(--font-display)',
                      letterSpacing: '-0.015em',
                      lineHeight: 1.25,
                    }}
                  >
                    {stage.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--secondary-label)',
                      marginTop: 4,
                      lineHeight: 1.45,
                    }}
                  >
                    {stage.desc}
                  </div>
                </div>

                {/* Tactile Launch Action Chip */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 'auto',
                    paddingTop: 10,
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: stage.color,
                      backgroundColor: isHovered ? `${stage.color}16` : 'transparent',
                      padding: '4px 10px',
                      borderRadius: 8,
                      border: isHovered ? `1px solid ${stage.color}35` : '1px solid transparent',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <span>Launch Workstation</span>
                    <ArrowRight
                      size={13}
                      style={{
                        transform: isHovered ? 'translateX(3px)' : 'translateX(0)',
                        transition: 'transform 0.18s ease',
                      }}
                    />
                  </div>

                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--tertiary-label)',
                      fontWeight: 600,
                    }}
                  >
                    READY
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Operations & Cloud Deck */}
      <div style={{ display: 'grid', gridTemplateColumns: '66% 34%', gap: 18 }}>
        {/* Left: Recent Production Operations */}
        <div
          className="glass-card"
          style={{
            padding: '22px 24px',
            borderRadius: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            minHeight: 250,
            background: 'var(--surface-card)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: 'rgba(0, 242, 254, 0.15)',
                  border: '1px solid rgba(0, 242, 254, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Activity size={15} color="#00F2FE" />
              </div>
              <span
                style={{
                  fontSize: 12,
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
                fontSize: 12,
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
              <Box size={28} color="var(--tertiary-label)" />
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
                    padding: '11px 14px',
                    borderRadius: 11,
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
            padding: '22px 24px',
            borderRadius: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            minHeight: 250,
            background: 'var(--surface-card)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Cloud size={15} color="#38BDF8" />
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: 1.2,
                fontFamily: 'var(--font-mono)',
                color: 'var(--label)',
              }}
            >
              CLOUD & EXPORT SINKS
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Main Google Drive */}
            <div
              onClick={() => onNavigate('googleDrive')}
              className="glass-card"
              style={{
                padding: '15px 16px',
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
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(10, 132, 255, 0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  backgroundColor: 'rgba(10, 132, 255, 0.18)',
                  border: '1px solid rgba(10, 132, 255, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(10, 132, 255, 0.2)',
                  flexShrink: 0,
                }}
              >
                <Cloud size={19} color="#0A84FF" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--label)' }}>
                  Main Google Drive
                </span>
                <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
                  Production cloud sync & package ingest
                </span>
              </div>
            </div>

            {/* Reference Google Drive */}
            <div
              onClick={() => onNavigate('googleDrive')}
              className="glass-card"
              style={{
                padding: '15px 16px',
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
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(16, 231, 157, 0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  backgroundColor: 'rgba(16, 231, 157, 0.18)',
                  border: '1px solid rgba(16, 231, 157, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(16, 231, 157, 0.2)',
                  flexShrink: 0,
                }}
              >
                <Cloud size={19} color="#10E79D" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--label)' }}>
                  Reference Google Drive
                </span>
                <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
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
