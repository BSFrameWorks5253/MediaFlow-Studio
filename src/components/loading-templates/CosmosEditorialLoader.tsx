import React from 'react';
import { LoadingTemplateProps } from './types';

export const CosmosEditorialLoader: React.FC<LoadingTemplateProps> = ({
  progress,
  currentStepIndex,
  statusLabel,
  isLight,
}) => {
  const steps = [
    'INITIALIZING STUDIO CORE',
    'CALIBRATING FILE ARRAYS',
    'CONFIGURING WORKFLOW ENGINE',
    'ENVIRONMENT VERIFIED',
  ];

  const bgColor = isLight ? '#eceff5' : '#121622';
  const textColor = isLight ? '#0f172a' : '#f8fafc';
  const monoMuted = isLight ? '#64748b' : '#94a3b8';
  const bracketColor = isLight ? '#94a3b8' : '#475569';
  const accentColor = isLight ? '#0284C7' : '#00F2FE';
  const lineBg = isLight ? 'rgba(148, 163, 184, 0.25)' : 'rgba(255, 255, 255, 0.1)';

  // Format progress as 2-3 digits: "04", "45", "100"
  const formattedPct = progress < 10 ? `0${progress}` : `${progress}`;

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
        padding: 40,
        overflow: 'hidden',
      }}
    >
      {/* 4 Architectural Corner Framing Crosshairs */}
      <div
        style={{
          position: 'absolute',
          top: 32,
          left: 36,
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          color: bracketColor,
          userSelect: 'none',
        }}
      >
        [+] 01 / NW
      </div>

      <div
        style={{
          position: 'absolute',
          top: 32,
          right: 36,
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          color: bracketColor,
          userSelect: 'none',
        }}
      >
        NE / 02 [+]
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 32,
          left: 36,
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          color: bracketColor,
          userSelect: 'none',
        }}
      >
        [+] 03 / SW
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 32,
          right: 36,
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          color: bracketColor,
          userSelect: 'none',
        }}
      >
        SE / 04 [+]
      </div>

      {/* Main Architectural Column */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 580,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 32,
          textAlign: 'center',
        }}
      >
        {/* Top Minimal Stage Tracker */}
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.24em',
            color: monoMuted,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <span>INDEX &bull; 0{currentStepIndex + 1}</span>
          <span style={{ color: accentColor }}>//</span>
          <span>PHASE 04</span>
        </div>

        {/* Monolithic Number Readout */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 72,
              fontWeight: 300,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              color: textColor,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formattedPct}
            <span style={{ fontSize: 24, fontWeight: 300, color: accentColor }}>%</span>
          </div>

          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: textColor,
              marginTop: 12,
            }}
          >
            DATAFLOW &mdash; CREATIVE PRODUCTION
          </div>

          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.14em',
              color: accentColor,
              marginTop: 4,
            }}
          >
            {steps[currentStepIndex] || statusLabel}
          </div>
        </div>

        {/* Minimal Hairline Progress Rule */}
        <div
          style={{
            width: '100%',
            height: 1,
            backgroundColor: lineBg,
            position: 'relative',
            marginTop: 8,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -1,
              left: 0,
              height: 3,
              width: `${progress}%`,
              backgroundColor: accentColor,
              transition: 'width 0.1s linear',
              boxShadow: `0 0 12px ${accentColor}`,
            }}
          />
        </div>

        {/* Subtle Bottom Technical Footnote */}
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            letterSpacing: '0.16em',
            color: monoMuted,
          }}
        >
          [ AWWWARDS COSMOS EDITORIAL SPECIFICATION &bull; REVISION 4.1.0 ]
        </div>
      </div>
    </div>
  );
};
