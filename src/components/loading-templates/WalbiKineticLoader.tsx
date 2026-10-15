import React from 'react';
import { LoadingTemplateProps } from './types';

export const WalbiKineticLoader: React.FC<LoadingTemplateProps> = ({
  progress,
  currentStepIndex,
  statusLabel,
  isLight,
}) => {
  const steps = [
    'Connecting Subsystems',
    'Allocating Ingestion Stream',
    'Priming Automation Flow',
    'DataFlow Ready',
  ];

  const bgColor = isLight ? '#eceff5' : '#111520';
  const pillBg = isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(24, 31, 46, 0.9)';
  const borderPill = isLight ? 'rgba(203, 213, 225, 0.9)' : 'rgba(255, 255, 255, 0.14)';
  const textColor = isLight ? '#0f172a' : '#f8fafc';
  const subTextColor = isLight ? '#475569' : '#94a3b8';

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
        overflow: 'hidden',
      }}
    >
      {/* Background Kinetic Fluid Mesh */}
      <div
        style={{
          position: 'absolute',
          width: 550,
          height: 550,
          borderRadius: '50%',
          background: isLight
            ? 'radial-gradient(circle, rgba(2, 132, 199, 0.16) 0%, rgba(236, 72, 153, 0.08) 40%, transparent 70%)'
            : 'radial-gradient(circle, rgba(0, 242, 254, 0.22) 0%, rgba(236, 72, 153, 0.12) 45%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'studioPulse 3.5s infinite ease-in-out',
          pointerEvents: 'none',
        }}
      />

      {/* Main Kinetic Container */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          maxWidth: 440,
          width: '90%',
          textAlign: 'center',
        }}
      >
        {/* Top Status Capsule Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '7px 18px',
            borderRadius: 999,
            backgroundColor: pillBg,
            border: `1px solid ${borderPill}`,
            boxShadow: isLight
              ? '0 4px 14px rgba(15, 23, 42, 0.06)'
              : '0 8px 24px rgba(0, 0, 0, 0.35)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: isLight ? '#0284C7' : '#00F2FE',
              boxShadow: `0 0 10px ${isLight ? '#0284C7' : '#00F2FE'}`,
              animation: 'beaconPulse 1.2s infinite ease-in-out',
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: isLight ? '#0284C7' : '#00F2FE',
              fontFamily: 'var(--font-mono)',
            }}
          >
            WALBI KINETIC &bull; SYSTEM BOOT
          </span>
        </div>

        {/* Big Bold Typographic Percentage Counter */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <span
            style={{
              fontSize: 88,
              fontWeight: 900,
              lineHeight: 0.9,
              letterSpacing: '-0.04em',
              fontFamily: 'var(--font-display)',
              color: textColor,
              textShadow: isLight
                ? '0 4px 20px rgba(0, 0, 0, 0.06)'
                : '0 4px 30px rgba(0, 242, 254, 0.25)',
            }}
          >
            {progress}
          </span>
          <span
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: isLight ? '#0284C7' : '#00F2FE',
              fontFamily: 'var(--font-display)',
            }}
          >
            %
          </span>
        </div>

        {/* Fluid Kinetic Progress Wave Bar */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            style={{
              width: '100%',
              height: 8,
              borderRadius: 999,
              backgroundColor: isLight ? 'rgba(148, 163, 184, 0.25)' : 'rgba(255, 255, 255, 0.09)',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: isLight
                ? 'inset 0 1px 2px rgba(0, 0, 0, 0.08)'
                : 'inset 0 1px 3px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                borderRadius: 999,
                background: isLight
                  ? 'linear-gradient(90deg, #0284C7, #8B5CF6, #EC4899)'
                  : 'linear-gradient(90deg, #00F2FE, #8B5CF6, #FF2E93)',
                boxShadow: isLight
                  ? '0 0 16px rgba(2, 132, 199, 0.5)'
                  : '0 0 20px rgba(0, 242, 254, 0.7)',
                transition: 'width 0.08s ease-out',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 12,
              fontFamily: 'var(--font-system)',
            }}
          >
            <span style={{ color: subTextColor, fontWeight: 600 }}>
              {steps[currentStepIndex] || statusLabel}
            </span>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: isLight ? '#0284C7' : '#00F2FE',
                fontFamily: 'var(--font-mono)',
              }}
            >
              STAGE 0{currentStepIndex + 1} / 04
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
