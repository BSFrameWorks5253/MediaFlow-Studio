import React from 'react';
import { LoadingTemplateProps } from './types';

export const AstralFrontierLoader: React.FC<LoadingTemplateProps> = ({
  progress,
  currentStepIndex,
  statusLabel,
  isLight,
}) => {
  const steps = [
    'ALIGNING QUANTUM IPC ORBITS',
    'CALIBRATING MEDIA SECTOR VECTORS',
    'SYNCHRONIZING AUTOMATION FLUX',
    'DATAFLOW TELEMETRY LOCKED',
  ];

  const bgColor = isLight ? '#eceff5' : '#10141f';
  const ringPrimary = isLight ? '#6366F1' : '#8B5CF6';
  const ringCyan = isLight ? '#0284C7' : '#00F2FE';
  const textColor = isLight ? '#1e293b' : '#f8fafc';
  const monoColor = isLight ? '#475569' : '#94a3b8';
  const accentGlow = isLight ? 'rgba(99, 102, 241, 0.2)' : 'rgba(139, 92, 246, 0.4)';

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
      {/* Background Reticle Grid Lines */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: isLight
            ? 'linear-gradient(rgba(99, 102, 241, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.05) 1px, transparent 1px)'
            : 'linear-gradient(rgba(139, 92, 246, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.8,
        }}
      />

      {/* Crosshair Coordinate Markers in Corners */}
      <div
        style={{
          position: 'absolute',
          top: 32,
          left: 36,
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.18em',
          color: monoColor,
        }}
      >
        SYS.SEC // 04.1 <br />
        <span style={{ color: ringPrimary }}>ORBIT // 48.219° N</span>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 32,
          right: 36,
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          textAlign: 'right',
          letterSpacing: '0.18em',
          color: monoColor,
        }}
      >
        IPC.SYNC // ACTIVE <br />
        <span style={{ color: ringCyan }}>BUFFERS // 100% OK</span>
      </div>

      {/* Central Cosmic Orbit Apparatus */}
      <div
        style={{
          position: 'relative',
          width: 220,
          height: 220,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Outermost Segmented Dial Ring */}
        <div
          style={{
            position: 'absolute',
            width: 210,
            height: 210,
            borderRadius: '50%',
            border: `1px dashed ${isLight ? 'rgba(99, 102, 241, 0.35)' : 'rgba(139, 92, 246, 0.4)'}`,
            animation: 'cosmicOrbit 30s linear infinite',
          }}
        />

        {/* Orbit Ring 1 (Clockwise) with glowing satellite node */}
        <div
          style={{
            position: 'absolute',
            width: 176,
            height: 176,
            borderRadius: '50%',
            border: `2px solid transparent`,
            borderTopColor: ringPrimary,
            borderBottomColor: ringCyan,
            animation: 'cosmicOrbit 3.2s linear infinite',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -4,
              left: '50%',
              width: 8,
              height: 8,
              marginLeft: -4,
              borderRadius: '50%',
              backgroundColor: ringPrimary,
              boxShadow: `0 0 12px ${ringPrimary}`,
            }}
          />
        </div>

        {/* Orbit Ring 2 (Counter-Clockwise) */}
        <div
          style={{
            position: 'absolute',
            width: 136,
            height: 136,
            borderRadius: '50%',
            border: `2px solid transparent`,
            borderLeftColor: ringCyan,
            borderRightColor: isLight ? '#0284C7' : '#00F2FE',
            animation: 'cosmicOrbitReverse 2.2s linear infinite',
          }}
        />

        {/* Orbit Ring 3: Inner Fast Pulse Reticle */}
        <div
          style={{
            position: 'absolute',
            width: 96,
            height: 96,
            borderRadius: '50%',
            border: `1px solid ${isLight ? 'rgba(2, 132, 199, 0.4)' : 'rgba(0, 242, 254, 0.5)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isLight ? 'rgba(255, 255, 255, 0.8)' : 'rgba(19, 23, 34, 0.7)',
            backdropFilter: 'blur(10px)',
            boxShadow: `0 0 25px ${accentGlow}`,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 22,
              fontWeight: 800,
              color: textColor,
              letterSpacing: '-0.02em',
            }}
          >
            {progress}
            <span style={{ fontSize: 13, color: ringCyan }}>%</span>
          </span>
        </div>
      </div>

      {/* Astral Telemetry Readout */}
      <div
        style={{
          marginTop: 28,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          textAlign: 'center',
          maxWidth: 420,
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: '0.2em',
            color: textColor,
            fontFamily: 'var(--font-display)',
          }}
        >
          ASTRAL FRONTIER // PRELOADER
        </div>

        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.16em',
            color: ringCyan,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {steps[currentStepIndex] || statusLabel}
        </div>

        {/* Fine Linear Precision Bar */}
        <div
          style={{
            width: 280,
            height: 3,
            backgroundColor: isLight ? 'rgba(99, 102, 241, 0.15)' : 'rgba(139, 92, 246, 0.2)',
            borderRadius: 999,
            overflow: 'hidden',
            marginTop: 6,
            position: 'relative',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${ringPrimary}, ${ringCyan})`,
              boxShadow: `0 0 10px ${ringCyan}`,
              transition: 'width 0.1s linear',
            }}
          />
        </div>

        <div
          style={{
            fontSize: 9.5,
            fontFamily: 'var(--font-mono)',
            color: monoColor,
            letterSpacing: '0.12em',
            marginTop: 4,
          }}
        >
          COORDINATES // VECTOR AZ 294.12 &bull; DEC -04.1
        </div>
      </div>
    </div>
  );
};
