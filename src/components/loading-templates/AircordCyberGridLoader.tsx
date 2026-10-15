import React from 'react';
import { LoadingTemplateProps } from './types';

export const AircordCyberGridLoader: React.FC<LoadingTemplateProps> = ({
  progress,
  currentStepIndex,
  statusLabel,
  isLight,
}) => {
  const steps = [
    'SAMPLING HARDWARE FREQUENCIES',
    'ALLOCATING SPECTRUM BUFFERS',
    'PARALLEL THREAD SYNCHRONIZATION',
    'CYBER MESH OPERATIONAL',
  ];

  const bgColor = isLight ? '#eceff5' : '#0e121a';
  const cardBg = isLight ? 'rgba(252, 253, 255, 0.92)' : 'rgba(20, 26, 38, 0.88)';
  const borderCard = isLight ? 'rgba(203, 213, 225, 0.85)' : 'rgba(255, 255, 255, 0.12)';
  const textColor = isLight ? '#0f172a' : '#f8fafc';
  const accentPink = '#EC4899';
  const accentCyan = isLight ? '#0284C7' : '#00F2FE';

  // 24 Equalizer Bars with animated heights
  const bars = Array.from({ length: 24 }, (_, i) => {
    // Generate organic pseudo-sine height based on index and progress
    const factor = Math.sin((i / 24) * Math.PI * 3 + progress * 0.1);
    const heightPct = Math.max(15, Math.min(95, Math.round(50 + factor * 42)));
    return { id: i, heightPct };
  });

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
      {/* Background Matrix Scanning Grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: isLight
            ? 'linear-gradient(rgba(236, 72, 153, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(2, 132, 199, 0.06) 1px, transparent 1px)'
            : 'linear-gradient(rgba(236, 72, 153, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 242, 254, 0.08) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Main Glass Deck */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          background: cardBg,
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: `1px solid ${borderCard}`,
          borderRadius: 20,
          padding: '30px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
          boxShadow: isLight
            ? '0 16px 40px -10px rgba(15, 23, 42, 0.07)'
            : '0 20px 50px -10px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header with Live Ticker */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: accentPink,
                boxShadow: `0 0 10px ${accentPink}`,
                animation: 'beaconPulse 1.5s infinite ease-in-out',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: textColor,
              }}
            >
              AIRCORD // DSP ENGINE
            </span>
          </div>

          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: accentCyan,
              letterSpacing: '0.12em',
            }}
          >
            0x7F_{progress.toString(16).toUpperCase()}
          </span>
        </div>

        {/* 24-Band Visualizer Equalizer Box */}
        <div
          style={{
            height: 90,
            width: '100%',
            backgroundColor: isLight ? 'rgba(238, 242, 246, 0.8)' : 'rgba(10, 14, 22, 0.75)',
            border: `1px solid ${borderCard}`,
            borderRadius: 14,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 4,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle Scanning Laser */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: `linear-gradient(90deg, transparent, ${accentPink}, transparent)`,
              animation: 'scanlineSweep 2.2s infinite ease-in-out',
            }}
          />

          {bars.map((bar) => (
            <div
              key={bar.id}
              style={{
                flex: 1,
                height: `${bar.heightPct}%`,
                borderRadius: 999,
                background: `linear-gradient(180deg, ${accentPink} 0%, ${accentCyan} 100%)`,
                transition: 'height 0.12s ease-out',
                boxShadow: bar.heightPct > 70 ? `0 0 8px ${accentPink}` : 'none',
              }}
            />
          ))}
        </div>

        {/* Progress & Diagnostics Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
            }}
          >
            <span style={{ color: isLight ? '#475569' : '#94a3b8' }}>
              {steps[currentStepIndex] || statusLabel}
            </span>
            <span style={{ fontWeight: 800, color: accentPink, fontSize: 13 }}>
              {progress}%
            </span>
          </div>

          {/* Stepped Cyber Bar */}
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
                background: `linear-gradient(90deg, ${accentCyan}, ${accentPink})`,
                boxShadow: `0 0 12px ${accentPink}`,
                transition: 'width 0.1s linear',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
