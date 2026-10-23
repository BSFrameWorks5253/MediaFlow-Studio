import React, { useEffect, useState, useMemo } from 'react';
import { HardDrive, AlertTriangle, AlertOctagon, CheckCircle2, Zap } from 'lucide-react';
import { DiskHeadroom } from '../../electron/engines/pvSeparator';

export interface StorageHeadroomBarProps {
  headroom?: DiskHeadroom | null;
  payloadBytes?: number;
  transferMode?: 'copy' | 'move' | 'delete';
  sourcePath?: string;
  destPath?: string;
  payloadFileCount?: number;
  onCanProceedChange?: (canProceed: boolean) => void;
}

export const StorageHeadroomBar: React.FC<StorageHeadroomBarProps> = ({
  headroom: propHeadroom,
  payloadBytes = 0,
  transferMode = 'copy',
  sourcePath = '',
  destPath = '',
  payloadFileCount,
  onCanProceedChange,
}) => {
  const [internalHeadroom, setInternalHeadroom] = useState<DiskHeadroom | null>(null);

  // Probe headroom if not provided directly but destPath exists
  useEffect(() => {
    if (propHeadroom) {
      setInternalHeadroom(propHeadroom);
      return;
    }

    if (destPath && destPath.trim() && (window as any).electronAPI?.checkStorageHeadroom) {
      (window as any).electronAPI
        .checkStorageHeadroom(destPath.trim())
        .then((res: any) => {
          if (res && res.valid) {
            setInternalHeadroom(res);
          }
        })
        .catch(() => {});
    }
  }, [propHeadroom, destPath]);

  const headroom = propHeadroom || internalHeadroom;

  // Extract clean drive letters (e.g. "D:", "C:")
  const getDriveLetter = (p?: string): string => {
    if (!p) return '';
    const match = p.match(/^([a-zA-Z]):/);
    return match ? `${match[1].toUpperCase()}:` : '';
  };

  const sourceDrive = getDriveLetter(sourcePath);
  const destDrive = getDriveLetter(destPath) || (headroom?.drive ? headroom.drive.toUpperCase() : '');
  const isSameDrive = Boolean(sourceDrive && destDrive && sourceDrive === destDrive);
  const isAtomicSameDriveMove = Boolean(isSameDrive && transferMode === 'move');

  // Payload calculations in GB
  const payloadGB = useMemo(() => {
    return +(payloadBytes / (1024 ** 3)).toFixed(2);
  }, [payloadBytes]);

  const effectivePayloadGB = isAtomicSameDriveMove ? 0 : payloadGB;

  // Real-time space analysis
  const spaceAnalysis = useMemo(() => {
    if (!headroom || !headroom.valid) {
      return {
        status: 'unknown' as const,
        canProceed: true,
        freeAfterGB: 0,
        freeAfterPct: 0,
        deficitGB: 0,
        usedGB: 0,
        totalGB: 0,
        usedPct: 0,
        payloadPct: 0,
      };
    }

    const totalGB = headroom.total_gb || 1;
    const freeGB = headroom.free_gb || 0;
    const usedGB = +(totalGB - freeGB).toFixed(1);
    const usedPct = (usedGB / totalGB) * 100;
    const payloadPct = (effectivePayloadGB / totalGB) * 100;

    if (isAtomicSameDriveMove) {
      return {
        status: 'safe' as const,
        canProceed: true,
        freeAfterGB: freeGB,
        freeAfterPct: (freeGB / totalGB) * 100,
        deficitGB: 0,
        usedGB,
        totalGB,
        usedPct,
        payloadPct: 0,
      };
    }

    const freeAfterGB = +(freeGB - effectivePayloadGB).toFixed(2);
    const freeAfterPct = (freeAfterGB / totalGB) * 100;

    // Deficit: payload will NOT fit on target disk
    if (effectivePayloadGB > freeGB || freeAfterGB <= 0) {
      const deficitGB = +(effectivePayloadGB - freeGB).toFixed(2);
      return {
        status: 'danger' as const,
        canProceed: false,
        freeAfterGB: 0,
        freeAfterPct: 0,
        deficitGB,
        usedGB,
        totalGB,
        usedPct,
        payloadPct,
      };
    }

    // Cut-to-cut warning: less than 12 GB buffer or less than 10% disk headroom remaining
    if (freeAfterGB < 12.0 || freeAfterPct < 10) {
      return {
        status: 'warning' as const,
        canProceed: true,
        freeAfterGB,
        freeAfterPct,
        deficitGB: 0,
        usedGB,
        totalGB,
        usedPct,
        payloadPct,
      };
    }

    // Safe headroom
    return {
      status: 'safe' as const,
      canProceed: true,
      freeAfterGB,
      freeAfterPct,
      deficitGB: 0,
      usedGB,
      totalGB,
      usedPct,
      payloadPct,
    };
  }, [headroom, effectivePayloadGB, isAtomicSameDriveMove]);

  // Notify parent component of block status
  useEffect(() => {
    if (onCanProceedChange) {
      onCanProceedChange(spaceAnalysis.canProceed);
    }
  }, [spaceAnalysis.canProceed, onCanProceedChange]);

  if (!headroom || !headroom.valid) {
    return (
      <div
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: 'var(--tertiary-label)',
          fontSize: 12,
          borderRadius: 10,
          border: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--surface-elevated)',
          fontFamily: 'var(--font-system)',
        }}
      >
        <HardDrive size={15} style={{ opacity: 0.6 }} />
        <span>Select destination directory to probe storage headroom</span>
      </div>
    );
  }

  // Adaptive palette using Dataflow studio system tokens
  const themeTokens = {
    safe: {
      color: 'var(--system-green)',
      softBg: 'var(--success-soft)',
      border: 'rgba(16, 185, 129, 0.28)',
      glow: 'rgba(16, 185, 129, 0.25)',
      title: isAtomicSameDriveMove ? 'SAFE: ATOMIC SAME-DRIVE MOVE' : 'SAFE: AMPLE HEADROOM',
      badgeText: isAtomicSameDriveMove ? 'INSTANT MOVE' : 'HEADROOM OK',
      subtitle: isAtomicSameDriveMove
        ? `Instant rename on ${destDrive} (0 extra bytes consumed)`
        : `+${spaceAnalysis.freeAfterGB} GB safe buffer after transfer`,
    },
    warning: {
      color: 'var(--system-orange)',
      softBg: 'var(--warning-soft)',
      border: 'rgba(245, 158, 11, 0.32)',
      glow: 'rgba(245, 158, 11, 0.25)',
      title: 'CUT-TO-CUT: TIGHT FIT',
      badgeText: 'TIGHT BUFFER',
      subtitle: `Only ${spaceAnalysis.freeAfterGB} GB buffer remaining (Critical Buffer)`,
    },
    danger: {
      color: 'var(--system-red)',
      softBg: 'var(--danger-soft)',
      border: 'rgba(239, 68, 68, 0.38)',
      glow: 'rgba(239, 68, 68, 0.3)',
      title: 'DANGER: WILL NOT FIT',
      badgeText: 'STORAGE DEFICIT',
      subtitle: `Deficit: -${spaceAnalysis.deficitGB} GB shortage on target drive`,
    },
    unknown: {
      color: 'var(--accent)',
      softBg: 'var(--accent-soft)',
      border: 'var(--border)',
      glow: 'transparent',
      title: 'STORAGE INSPECTION',
      badgeText: 'PROBING',
      subtitle: 'Evaluating disk headroom...',
    },
  };

  const activeTheme = themeTokens[spaceAnalysis.status];

  return (
    <div
      style={{
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        borderRadius: 12,
        border: `1px solid ${activeTheme.border}`,
        backgroundColor: 'var(--surface-elevated)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        transition: 'border-color var(--transition-smooth)',
      }}
    >
      {/* Specular Top Glow Line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent 0%, ${activeTheme.color} 50%, transparent 100%)`,
          boxShadow: `0 0 10px ${activeTheme.glow}`,
        }}
      />

      {/* Row 1: Drive Identity, Badges & Signal Status Pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        {/* Left: Drive Hardware Badge & Metadata */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              backgroundColor: activeTheme.softBg,
              border: `1px solid ${activeTheme.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              flexShrink: 0,
            }}
          >
            {isAtomicSameDriveMove ? (
              <Zap size={16} color="var(--accent)" />
            ) : (
              <HardDrive size={16} color={activeTheme.color} />
            )}
            <span
              style={{
                position: 'absolute',
                bottom: -4,
                right: -4,
                fontSize: 8,
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                backgroundColor: 'var(--surface-card)',
                border: '1px solid var(--border)',
                color: 'var(--label)',
                borderRadius: 3,
                padding: '0.5px 3.5px',
                lineHeight: 1.1,
              }}
            >
              {destDrive || headroom.drive}
            </span>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: 'var(--label)',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.02em',
                }}
              >
                DRIVE {destDrive || headroom.drive}
              </span>

              {payloadGB > 0 && (
                <span
                  style={{
                    fontSize: 10.5,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--secondary-label)',
                    backgroundColor: 'var(--surface-glass)',
                    padding: '1.5px 6px',
                    borderRadius: 4,
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  Payload: <strong style={{ color: 'var(--label)' }}>{payloadGB} GB</strong>
                  {payloadFileCount !== undefined ? ` (${payloadFileCount} files)` : ''}
                </span>
              )}

              {isAtomicSameDriveMove && (
                <span
                  style={{
                    fontSize: 9.5,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    color: 'var(--accent)',
                    backgroundColor: 'var(--accent-soft)',
                    padding: '1.5px 6px',
                    borderRadius: 4,
                    border: '1px solid var(--border-subtle)',
                    textTransform: 'uppercase',
                  }}
                >
                  ⚡ Fast In-Place Move
                </span>
              )}
            </div>

            <div style={{ fontSize: 11, color: 'var(--secondary-label)', marginTop: 2 }}>
              {isAtomicSameDriveMove ? (
                <span>Source and destination on same disk. Relocates instantaneously without rewriting data.</span>
              ) : (
                <span>
                  <strong style={{ color: 'var(--label)', fontFamily: 'var(--font-mono)' }}>
                    {headroom.free_gb} GB
                  </strong>{' '}
                  free of{' '}
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{headroom.total_gb} GB</span> total capacity
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Studio Status Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '4px 10px',
            borderRadius: 8,
            backgroundColor: activeTheme.softBg,
            border: `1px solid ${activeTheme.border}`,
          }}
        >
          {spaceAnalysis.status === 'safe' && <CheckCircle2 size={14} color={activeTheme.color} />}
          {spaceAnalysis.status === 'warning' && <AlertTriangle size={14} color={activeTheme.color} />}
          {spaceAnalysis.status === 'danger' && <AlertOctagon size={14} color={activeTheme.color} />}

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: 10.5,
                fontFamily: 'var(--font-mono)',
                fontWeight: 800,
                color: activeTheme.color,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {activeTheme.title}
            </span>
            <span style={{ fontSize: 9.5, color: 'var(--secondary-label)' }}>
              {activeTheme.subtitle}
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Multi-Segmented Capacity Simulation Track */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div
          style={{
            width: '100%',
            height: 9,
            borderRadius: 999,
            backgroundColor: 'var(--tertiary-system-bg)',
            overflow: 'hidden',
            display: 'flex',
            position: 'relative',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {/* 1. Currently Used Space */}
          <div
            style={{
              width: `${Math.min(100, spaceAnalysis.usedPct)}%`,
              height: '100%',
              backgroundColor: 'var(--quaternary-label)',
              opacity: 0.6,
              transition: 'width var(--transition-smooth)',
            }}
            title={`Currently Used: ${spaceAnalysis.usedGB} GB (${Math.round(spaceAnalysis.usedPct)}%)`}
          />

          {/* 2. Incoming Payload Segment */}
          {spaceAnalysis.payloadPct > 0 && !isAtomicSameDriveMove && (
            <div
              style={{
                width: `${Math.min(100 - spaceAnalysis.usedPct, spaceAnalysis.payloadPct)}%`,
                height: '100%',
                backgroundColor: activeTheme.color,
                boxShadow: `0 0 8px ${activeTheme.glow}`,
                transition: 'width var(--transition-smooth)',
              }}
              title={`Incoming Transfer: +${payloadGB} GB`}
            />
          )}

          {/* 3. Red Hazard Overhang if Deficit */}
          {spaceAnalysis.status === 'danger' && (
            <div
              style={{
                flex: 1,
                height: '100%',
                background:
                  'repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.4), rgba(239, 68, 68, 0.4) 6px, rgba(239, 68, 68, 0.8) 6px, rgba(239, 68, 68, 0.8) 12px)',
              }}
              title={`Deficit: -${spaceAnalysis.deficitGB} GB`}
            />
          )}
        </div>

        {/* Legend Metrics */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            color: 'var(--tertiary-label)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 2,
                  backgroundColor: 'var(--quaternary-label)',
                  display: 'inline-block',
                }}
              />
              Used: {spaceAnalysis.usedGB} GB ({Math.round(spaceAnalysis.usedPct)}%)
            </span>

            {payloadGB > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: activeTheme.color }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 2,
                    backgroundColor: activeTheme.color,
                    display: 'inline-block',
                  }}
                />
                Transfer: {isAtomicSameDriveMove ? '0.0 GB (Instant Move)' : `+${payloadGB} GB`}
              </span>
            )}
          </div>

          <div>
            {spaceAnalysis.status === 'danger' ? (
              <span style={{ color: 'var(--system-red)', fontWeight: 800 }}>
                DEFICIT: -{spaceAnalysis.deficitGB} GB (WILL NOT FIT)
              </span>
            ) : (
              <span style={{ color: activeTheme.color, fontWeight: 700 }}>
                {spaceAnalysis.freeAfterGB} GB free after transfer
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Diagnostic Callouts */}
      {spaceAnalysis.status === 'danger' && (
        <div
          style={{
            padding: '7px 11px',
            borderRadius: 8,
            backgroundColor: 'var(--danger-soft)',
            border: '1px solid rgba(239, 68, 68, 0.28)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11,
            color: 'var(--system-red)',
            lineHeight: 1.4,
          }}
        >
          <AlertOctagon size={14} style={{ flexShrink: 0 }} />
          <span>
            <strong>Transfer Blocked:</strong> Target Drive {destDrive || headroom.drive} has only {headroom.free_gb}{' '}
            GB free space, but the transfer requires {payloadGB} GB. Free up space on the destination drive to proceed.
          </span>
        </div>
      )}

      {spaceAnalysis.status === 'warning' && (
        <div
          style={{
            padding: '7px 11px',
            borderRadius: 8,
            backgroundColor: 'var(--warning-soft)',
            border: '1px solid rgba(245, 158, 11, 0.28)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11,
            color: 'var(--system-orange)',
            lineHeight: 1.4,
          }}
        >
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          <span>
            <strong>Storage Warning:</strong> Target drive will only have {spaceAnalysis.freeAfterGB} GB buffer
            remaining. Low disk headroom may slow down system performance.
          </span>
        </div>
      )}
    </div>
  );
};
