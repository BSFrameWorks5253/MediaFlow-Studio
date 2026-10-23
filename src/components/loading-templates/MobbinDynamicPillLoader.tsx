import React from 'react';
import { LoadingTemplateProps } from './types';

export const MobbinDynamicPillLoader: React.FC<LoadingTemplateProps> = ({
  progress,
  currentStepIndex,
  statusLabel,
  isLight,
}) => {
  const steps = [
    'Initializing Engine',
    'Scanning Media Drives',
    'Loading Pipelines',
    'DataFlow Ready',
  ];

  const bgColor = isLight ? '#eceff5' : '#111520';
  const pillBg = isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(24, 30, 44, 0.94)';
  const borderColor = isLight ? 'rgba(203, 213, 225, 0.9)' : 'rgba(255, 255, 255, 0.15)';
  const textColor = isLight ? '#0f172a' : '#f8fafc';
  const subTextColor = isLight ? '#475569' : '#94a3b8';
  const accentColor = isLight ? '#0284C7' : '#00F2FE';

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
      {/* Background Soft Aura */}
      <div
        style={{
          position: 'absolute',
          width: 420,
          height: 420,
          borderRadius: '50%',
          background: isLight
            ? 'radial-gradient(circle, rgba(2, 132, 199, 0.12) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(0, 242, 254, 0.15) 0%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />

      {/* Mobile Dynamic Island Desktop Adapted Capsule */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '14px 24px 14px 16px',
          background: pillBg,
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          border: `1px solid ${borderColor}`,
          borderRadius: 999,
          boxShadow: isLight
            ? '0 20px 45px -10px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.8) inset'
            : '0 25px 60px -10px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
          minWidth: 360,
          maxWidth: 440,
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Animated App Glyph with Circular Progress Border */}
        <div
          style={{
            position: 'relative',
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {/* Circular SVG Progress */}
          <svg
            width="44"
            height="44"
            viewBox="0 0 44 44"
            style={{ position: 'absolute', transform: 'rotate(-90deg)' }}
          >
            <circle
              cx="22"
              cy="22"
              r="19"
              fill="none"
              stroke={isLight ? 'rgba(148, 163, 184, 0.25)' : 'rgba(255, 255, 255, 0.1)'}
              strokeWidth="2.5"
            />
            <circle
              cx="22"
              cy="22"
              r="19"
              fill="none"
              stroke={accentColor}
              strokeWidth="2.5"
              strokeDasharray={2 * Math.PI * 19}
              strokeDashoffset={2 * Math.PI * 19 * (1 - progress / 100)}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.12s linear' }}
            />
          </svg>

          {/* Center Mini Lightning */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              backgroundColor: isLight ? 'rgba(2, 132, 199, 0.1)' : 'rgba(0, 242, 254, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path
                d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
                fill={accentColor}
              />
            </svg>
          </div>
        </div>

        {/* Text Details */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: textColor,
              letterSpacing: '0.02em',
              fontFamily: 'var(--font-system)',
            }}
          >
            {steps[currentStepIndex] || statusLabel}
          </div>
          <div
            style={{
              fontSize: 11,
              color: subTextColor,
              fontFamily: 'var(--font-system)',
            }}
          >
            DataFlow Studio &bull; Step {currentStepIndex + 1} of 4
          </div>
        </div>

        {/* Numeric Badge */}
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 800,
            fontSize: 14,
            color: accentColor,
            fontVariantNumeric: 'tabular-nums',
            padding: '4px 10px',
            borderRadius: 999,
            backgroundColor: isLight ? 'rgba(2, 132, 199, 0.08)' : 'rgba(0, 242, 254, 0.1)',
          }}
        >
          {progress}%
        </div>
      </div>
    </div>
  );
};
