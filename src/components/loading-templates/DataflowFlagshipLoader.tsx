import React from 'react';
import { LoadingTemplateProps } from './types';

export const DataflowFlagshipLoader: React.FC<LoadingTemplateProps> = ({
  progress,
  currentStepIndex,
  statusLabel,
  isLight,
}) => {
  const steps = [
    'Engine Bridge & High-Speed IPC',
    'Media Drive & Headroom Telemetry',
    'Creative Automation Presets',
    'DataFlow Studio 4.1 Ready',
  ];

  const bgColor = isLight ? '#eceff5' : '#131722';
  const cardBg = isLight ? 'rgba(252, 253, 255, 0.94)' : 'rgba(26, 34, 50, 0.88)';
  const borderColor = isLight ? 'rgba(203, 213, 225, 0.85)' : 'rgba(255, 255, 255, 0.12)';
  const textColor = isLight ? '#1e293b' : '#f1f5f9';
  const subTextColor = isLight ? '#475569' : '#94a3b8';
  const trackBg = isLight ? 'rgba(148, 163, 184, 0.22)' : 'rgba(255, 255, 255, 0.08)';

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bgColor,
        padding: 24,
      }}
    >
      {/* Background Soft Glow Orbs */}
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: isLight
            ? 'radial-gradient(circle, rgba(2, 132, 199, 0.1) 0%, rgba(99, 102, 241, 0.05) 50%, transparent 70%)'
            : 'radial-gradient(circle, rgba(0, 242, 254, 0.14) 0%, rgba(139, 92, 246, 0.07) 50%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />

      {/* Main Elevated Glass Card */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 460,
          background: cardBg,
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          border: `1px solid ${borderColor}`,
          borderRadius: 24,
          padding: '36px 32px 30px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 26,
          boxShadow: isLight
            ? '0 20px 45px -12px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.8) inset'
            : '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08) inset',
        }}
      >
        {/* Animated Brand Emblem with Dual Spinners */}
        <div
          style={{
            position: 'relative',
            width: 92,
            height: 92,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Pulsing Aura */}
          <div
            style={{
              position: 'absolute',
              inset: -6,
              borderRadius: '50%',
              background: isLight
                ? 'radial-gradient(circle, rgba(2, 132, 199, 0.25) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(0, 242, 254, 0.35) 0%, transparent 70%)',
              animation: 'studioPulse 2.4s infinite ease-in-out',
            }}
          />

          {/* Outer Orbit Ring */}
          <div
            style={{
              position: 'absolute',
              width: 88,
              height: 88,
              borderRadius: '50%',
              border: '2px solid transparent',
              borderTopColor: isLight ? '#0284C7' : '#00F2FE',
              borderRightColor: '#8B5CF6',
              animation: 'cosmicOrbit 2s linear infinite',
            }}
          />

          {/* Inner Counter-Ring */}
          <div
            style={{
              position: 'absolute',
              width: 66,
              height: 66,
              borderRadius: '50%',
              border: '2px solid transparent',
              borderBottomColor: isLight ? '#6366F1' : '#00F2FE',
              borderLeftColor: '#EC4899',
              animation: 'cosmicOrbitReverse 1.6s linear infinite',
            }}
          />

          {/* Center Brand Tile */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              background: isLight
                ? 'linear-gradient(135deg, rgba(2, 132, 199, 0.15), rgba(99, 102, 241, 0.15))'
                : 'linear-gradient(135deg, rgba(0, 242, 254, 0.22), rgba(139, 92, 246, 0.22))',
              border: `1px solid ${isLight ? 'rgba(2, 132, 199, 0.4)' : 'rgba(0, 242, 254, 0.5)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isLight
                ? '0 4px 16px rgba(2, 132, 199, 0.2)'
                : '0 0 24px rgba(0, 242, 254, 0.35)',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
                fill="url(#dfLightning)"
                stroke={isLight ? '#0284C7' : '#00F2FE'}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="dfLightning" x1="3" y1="2" x2="21" y2="22">
                  <stop stopColor={isLight ? '#0284C7' : '#00F2FE'} />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Title & Micro Hardware Telemetry Badges */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              fontSize: 21,
              fontWeight: 800,
              letterSpacing: '0.12em',
              color: textColor,
              fontFamily: 'var(--font-display)',
            }}
          >
            DATAFLOW STUDIO
          </div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.22em',
              color: isLight ? '#0284C7' : '#00F2FE',
              fontFamily: 'var(--font-mono)',
            }}
          >
            CREATIVE PRODUCTION SUITE &bull; v4.1
          </div>

          {/* Subsystem Readiness Indicators */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginTop: 6,
              alignItems: 'center',
            }}
          >
            {['HIGH-SPEED IPC', '32 THREADS', 'HARDWARE ACCEL'].map((tag, idx) => (
              <span
                key={tag}
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  padding: '2px 8px',
                  borderRadius: 6,
                  backgroundColor: isLight ? 'rgba(2, 132, 199, 0.08)' : 'rgba(0, 242, 254, 0.08)',
                  color: isLight ? '#0369A1' : '#38BDF8',
                  border: `1px solid ${isLight ? 'rgba(2, 132, 199, 0.2)' : 'rgba(0, 242, 254, 0.2)'}`,
                  opacity: progress > idx * 25 ? 1 : 0.45,
                  transition: 'opacity 0.25s',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Dynamic Progress Bar & Diagnostics */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Progress Track */}
          <div
            style={{
              width: '100%',
              height: 6,
              borderRadius: 999,
              backgroundColor: trackBg,
              overflow: 'hidden',
              position: 'relative',
              boxShadow: isLight
                ? 'inset 0 1px 2px rgba(0, 0, 0, 0.06)'
                : 'inset 0 1px 3px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                borderRadius: 999,
                background: isLight
                  ? 'linear-gradient(90deg, #0284C7, #6366F1, #8B5CF6)'
                  : 'linear-gradient(90deg, #00F2FE, #8B5CF6, #EC4899)',
                boxShadow: isLight
                  ? '0 0 12px rgba(2, 132, 199, 0.4)'
                  : '0 0 16px rgba(0, 242, 254, 0.7)',
                transition: 'width 0.1s linear',
              }}
            />
          </div>

          {/* Active Step & Percentage */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 11.5,
              fontFamily: 'var(--font-system)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: subTextColor }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: isLight ? '#0284C7' : '#00F2FE',
                  animation: 'beaconPulse 1.4s infinite ease-in-out',
                }}
              />
              <span style={{ fontWeight: 500 }}>
                {steps[currentStepIndex] || statusLabel}
              </span>
            </div>

            <span
              style={{
                color: isLight ? '#0284C7' : '#00F2FE',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                fontSize: 12.5,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {progress}%
            </span>
          </div>

          {/* 4 Discrete Segment Dots */}
          <div style={{ display: 'flex', gap: 6, width: '100%', marginTop: 2 }}>
            {[0, 1, 2, 3].map((stepIdx) => {
              const active = currentStepIndex >= stepIdx;
              return (
                <div
                  key={stepIdx}
                  style={{
                    flex: 1,
                    height: 2.5,
                    borderRadius: 999,
                    backgroundColor: active
                      ? (isLight ? '#0284C7' : '#00F2FE')
                      : trackBg,
                    transition: 'background-color 0.3s ease',
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
