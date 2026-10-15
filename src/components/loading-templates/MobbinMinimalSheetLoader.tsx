import React from 'react';
import { LoadingTemplateProps } from './types';

export const MobbinMinimalSheetLoader: React.FC<LoadingTemplateProps> = ({
  progress,
  currentStepIndex,
  statusLabel,
  isLight,
}) => {
  const steps = [
    { label: 'High-Speed Engine & IPC Bridge', threshold: 25 },
    { label: 'Storage Drive & Headroom Telemetry', threshold: 55 },
    { label: 'Creative Automation Presets', threshold: 85 },
    { label: 'DataFlow Studio 4.1 Initialized', threshold: 100 },
  ];

  const bgColor = isLight ? '#eceff5' : '#121622';
  const sheetBg = isLight ? 'rgba(252, 253, 255, 0.95)' : 'rgba(24, 30, 44, 0.9)';
  const borderSheet = isLight ? 'rgba(203, 213, 225, 0.85)' : 'rgba(255, 255, 255, 0.12)';
  const textColor = isLight ? '#0f172a' : '#f8fafc';
  const subTextColor = isLight ? '#475569' : '#94a3b8';
  const successColor = isLight ? '#16A34A' : '#10E79D';

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
      {/* Elevated Mobile Sheet Card */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 420,
          background: sheetBg,
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: `1px solid ${borderSheet}`,
          borderRadius: 24,
          padding: '32px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
          boxShadow: isLight
            ? '0 20px 45px -12px rgba(15, 23, 42, 0.09), 0 0 0 1px rgba(255, 255, 255, 0.8) inset'
            : '0 24px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08) inset',
        }}
      >
        {/* Header Icon + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: isLight
                ? 'linear-gradient(135deg, rgba(2, 132, 199, 0.15), rgba(99, 102, 241, 0.15))'
                : 'linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(139, 92, 246, 0.2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${isLight ? 'rgba(2, 132, 199, 0.3)' : 'rgba(0, 242, 254, 0.4)'}`,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
                fill={isLight ? '#0284C7' : '#00F2FE'}
              />
            </svg>
          </div>

          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: textColor,
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.04em',
              }}
            >
              Setting up DataFlow
            </div>
            <div
              style={{
                fontSize: 11,
                color: subTextColor,
                fontFamily: 'var(--font-system)',
              }}
            >
              Preparing environment &bull; {progress}% complete
            </div>
          </div>
        </div>

        {/* Minimal Progress Line */}
        <div
          style={{
            width: '100%',
            height: 4,
            borderRadius: 999,
            backgroundColor: isLight ? 'rgba(148, 163, 184, 0.2)' : 'rgba(255, 255, 255, 0.08)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              borderRadius: 999,
              backgroundColor: isLight ? '#0284C7' : '#00F2FE',
              transition: 'width 0.1s linear',
            }}
          />
        </div>

        {/* Checklist of System Stages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {steps.map((st, i) => {
            const isDone = progress >= st.threshold;
            const isCurrent = !isDone && (i === 0 || progress >= steps[i - 1].threshold);

            return (
              <div
                key={st.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 12px',
                  borderRadius: 12,
                  backgroundColor: isCurrent
                    ? (isLight ? 'rgba(2, 132, 199, 0.06)' : 'rgba(0, 242, 254, 0.07)')
                    : 'transparent',
                  transition: 'background-color 0.2s',
                }}
              >
                {/* Indicator Circle / Check */}
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isDone
                      ? (isLight ? 'rgba(22, 163, 74, 0.12)' : 'rgba(16, 231, 157, 0.15)')
                      : isCurrent
                      ? (isLight ? 'rgba(2, 132, 199, 0.12)' : 'rgba(0, 242, 254, 0.15)')
                      : (isLight ? 'rgba(148, 163, 184, 0.15)' : 'rgba(255, 255, 255, 0.06)'),
                    color: isDone ? successColor : (isLight ? '#0284C7' : '#00F2FE'),
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {isDone ? '✓' : isCurrent ? '•' : ''}
                </div>

                <span
                  style={{
                    fontSize: 12.5,
                    fontFamily: 'var(--font-system)',
                    fontWeight: isCurrent ? 600 : 500,
                    color: isDone ? textColor : isCurrent ? (isLight ? '#0284C7' : '#00F2FE') : subTextColor,
                    opacity: isDone || isCurrent ? 1 : 0.6,
                  }}
                >
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
