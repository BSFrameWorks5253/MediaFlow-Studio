import React, { useMemo, useState, useEffect, useRef } from 'react';
import { LoadingTemplateProps } from './types';
import { Layers, Video, Database, ArrowDown, CheckCircle2, Sparkles, HardDrive } from 'lucide-react';

/**
 * High-frequency numeric roll-up counter hook
 * Rolls smoothly from 0 to target value with ease-out cubic curve
 * and triggers a luminous lock-in pulse when complete.
 */
function useRollUpNumber(target: number, isTriggered: boolean, durationMs: number = 1100) {
  const [value, setValue] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (!isTriggered) {
      setValue(0);
      setIsLocked(false);
      return;
    }

    const startTime = performance.now();
    let animId: number;

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      setValue(current);

      if (progress < 1) {
        animId = requestAnimationFrame(frame);
      } else {
        setValue(target);
        setIsLocked(true);
      }
    };

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [target, isTriggered, durationMs]);

  return { value, isLocked };
}

export const OntoKineticStudioLoader: React.FC<LoadingTemplateProps> = ({
  progress,
  currentStepIndex,
  statusLabel,
  isLight,
  isFadingOut,
  onComplete,
}) => {
  // Theme-adaptive luxury design tokens with crisp contrast
  const bgColor = isLight ? '#F8FAFC' : '#07090E';
  const fgColor = isLight ? '#0B0F19' : '#F8FAFC';
  const subColor = isLight ? '#475569' : '#94A3B8';
  const accentColor = isLight ? '#007AFF' : '#00F2FE';
  const cardBg = isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.76)';
  const cardBorder = isLight ? 'rgba(226, 232, 240, 0.95)' : 'rgba(255, 255, 255, 0.12)';
  const cardTopBorder = isLight ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.35)';
  const cardShadow = isLight
    ? '0 18px 38px -12px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.03)'
    : '0 28px 65px -14px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.15)';
  const launchBtnBg = isLight ? '#0B0F19' : 'rgba(15, 23, 42, 0.9)';
  const launchBtnFg = '#FFFFFF';

  // Prevent any progress or phase regression (e.g. during exit/dismiss)
  const maxProgressRef = useRef(progress);
  if (progress > maxProgressRef.current) {
    maxProgressRef.current = progress;
  }
  const effectiveProgress = isFadingOut ? 100 : Math.max(progress, maxProgressRef.current);

  // 2 Master High-Precision Cinematic Phases:
  // Phase 1 (0% - 35%): The Signature Cutout Wordmark Intro (Blank Black -> White Inversion)
  // Phase 2 (35% - 100%): Pristine Executive Studio Deck & Shimmering Launch Capsule
  const phase = useMemo(() => {
    if (isFadingOut) return 2;
    if (effectiveProgress < 35) return 1;
    return 2;
  }, [effectiveProgress, isFadingOut]);

  const phaseProgress = useMemo(() => {
    if (isFadingOut) return 1;
    if (phase === 1) return Math.min(1, effectiveProgress / 35);
    return Math.min(1, (effectiveProgress - 35) / 65);
  }, [phase, effectiveProgress, isFadingOut]);

  // Rolling numbers for Phase 2
  const isCardShowcaseActive = phase >= 2;
  const numPv = useRollUpNumber(842, isCardShowcaseActive, 1000);
  const numMatch = useRollUpNumber(100, isCardShowcaseActive, 900);
  const numStreams = useRollUpNumber(102, isCardShowcaseActive, 1100);

  // Inversion calculations for Phase 1
  const invertProgress = useMemo(() => {
    if (phase > 1) return 1;
    if (phaseProgress < 0.40) return 0;
    return Math.min(1, (phaseProgress - 0.40) / 0.30);
  }, [phase, phaseProgress]);

  const easedInvert = 1 - Math.pow(1 - invertProgress, 3);

  const currentCanvasBg = useMemo(() => {
    if (!isLight) return bgColor;
    if (phase > 1) return bgColor;
    // Invert from #07090E to #F8FAFC
    const r = Math.round(7 + easedInvert * (248 - 7));
    const g = Math.round(9 + easedInvert * (250 - 9));
    const b = Math.round(14 + easedInvert * (252 - 14));
    return `rgb(${r}, ${g}, ${b})`;
  }, [isLight, phase, bgColor, easedInvert]);

  const phase1TextColor = useMemo(() => {
    if (!isLight) return fgColor;
    if (phase > 1) return fgColor;
    // Invert from pure white to #0B0F19
    const r = Math.round(255 - easedInvert * (255 - 11));
    const g = Math.round(255 - easedInvert * (255 - 15));
    const b = Math.round(255 - easedInvert * (255 - 25));
    return `rgb(${r}, ${g}, ${b})`;
  }, [isLight, phase, fgColor, easedInvert]);

  return (
    <div
      onClick={onComplete}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: currentCanvasBg,
        color: fgColor,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        overflow: 'hidden',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'background-color 0.2s ease',
      }}
      title="Click or press Space to launch studio immediately"
    >
      {/* =================================================================== */}
      {/* 1. HIGH-CONTRAST AMBIENT MESH AURA (NON-WASHED-OUT)                 */}
      {/* =================================================================== */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 0,
          opacity: phase === 1 ? easedInvert : 1,
          transition: 'opacity 0.3s ease',
        }}
      >
        {/* Soft Indigo Studio Light */}
        <div
          style={{
            position: 'absolute',
            width: '60vw',
            height: '60vw',
            maxWidth: 750,
            maxHeight: 750,
            borderRadius: '50%',
            top: '-15%',
            left: '-10%',
            background: isLight
              ? 'radial-gradient(circle, rgba(0, 122, 255, 0.07) 0%, rgba(56, 189, 248, 0.02) 60%, transparent 80%)'
              : 'radial-gradient(circle, rgba(0, 122, 255, 0.18) 0%, rgba(14, 165, 233, 0.06) 60%, transparent 80%)',
            filter: 'blur(80px)',
            animation: 'plasmaDrift1 14s infinite alternate ease-in-out',
          }}
        />

        {/* Soft Cyan Studio Fill Light */}
        <div
          style={{
            position: 'absolute',
            width: '50vw',
            height: '50vw',
            maxWidth: 650,
            maxHeight: 650,
            borderRadius: '50%',
            bottom: '-10%',
            right: '-8%',
            background: isLight
              ? 'radial-gradient(circle, rgba(0, 242, 254, 0.06) 0%, rgba(99, 102, 241, 0.03) 60%, transparent 75%)'
              : 'radial-gradient(circle, rgba(0, 242, 254, 0.16) 0%, rgba(99, 102, 241, 0.07) 60%, transparent 75%)',
            filter: 'blur(90px)',
            animation: 'plasmaDrift2 16s infinite alternate ease-in-out',
          }}
        />

        {/* Subtle Ambient Vignette */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: isLight
              ? 'radial-gradient(ellipse at center, transparent 55%, rgba(241, 245, 249, 0.8) 100%)'
              : 'radial-gradient(ellipse at center, transparent 45%, rgba(7, 9, 14, 0.85) 100%)',
          }}
        />
      </div>

      {/* Top Left Header Brand Pill */}
      <div
        style={{
          position: 'absolute',
          top: 32,
          left: 36,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          zIndex: 10,
          opacity: phase >= 2 ? 1 : easedInvert * 0.7,
          transition: 'opacity 0.4s ease',
        }}
      >
        <div
          style={{
            fontSize: 11.5,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: fgColor,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <span style={{ color: accentColor, fontSize: 13 }}>✦</span>
          <span>MEDIAFLOW STUDIO</span>
        </div>
      </div>

      {/* Top Right Telemetry Engine Pip */}
      <div
        style={{
          position: 'absolute',
          top: 32,
          right: 36,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          zIndex: 10,
          opacity: phase >= 2 ? 1 : easedInvert * 0.7,
          transition: 'opacity 0.4s ease',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: subColor,
          }}
        >
          CORE ENGINE // V5.2
        </span>
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: '#10B981',
            boxShadow: '0 0 10px rgba(16, 185, 129, 0.8)',
            animation: 'asymmetricBreathe 2.4s infinite ease-in-out',
          }}
        />
      </div>

      {/* Main Center Stage */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 980,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          pointerEvents: isFadingOut ? 'none' : 'auto',
          padding: '0 24px',
        }}
      >
        {/* =================================================================== */}
        {/* PHASE 1: HIGH-IMPACT ONTO CUTOUT TYPOGRAPHY (0% - 35%)              */}
        {/* =================================================================== */}
        {phase === 1 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              position: 'relative',
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
                letterSpacing: '0.34em',
                textTransform: 'uppercase',
                color: isLight ? `rgba(71, 85, 105, ${easedInvert})` : subColor,
                marginBottom: 28,
                opacity: easedInvert > 0.3 ? Math.min(1, (easedInvert - 0.3) * 2.5) : 0,
                transform: `translateY(${(1 - easedInvert) * 12}px)`,
                transition: 'opacity 0.2s ease, transform 0.2s ease',
              }}
            >
              The Next-Gen Creative Pipeline
            </div>

            {/* Master Cutout Wordmark: MEDIA FLOW */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'clamp(12px, 2.2vw, 32px)',
                position: 'relative',
                minHeight: 'clamp(64px, 8.5vw, 100px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(4px, 0.6vw, 8px)' }}>
                {['M', 'E', 'D', 'I', 'A'].map((char, idx) => {
                  const riseStart = idx * 0.04;
                  const riseRaw = Math.min(1, Math.max(0, (phaseProgress - riseStart) / 0.22));
                  const easedRise = 1 - Math.pow(1 - riseRaw, 3);

                  return (
                    <span
                      key={idx}
                      style={{
                        display: 'inline-block',
                        fontSize: 'clamp(52px, 7.8vw, 88px)',
                        fontWeight: 900,
                        fontFamily: "'Syne', 'Inter', -apple-system, sans-serif",
                        lineHeight: 1,
                        letterSpacing: '-0.03em',
                        textTransform: 'uppercase',
                        color: phase1TextColor,
                        transform: `translateY(${(1 - easedRise) * 35}px) scale(${0.9 + easedRise * 0.1})`,
                        opacity: easedRise,
                      }}
                    >
                      {char}
                    </span>
                  );
                })}
              </div>

              {/* Glowing Beacon */}
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: accentColor,
                  boxShadow: `0 0 16px 4px ${accentColor}`,
                  opacity: Math.min(1, Math.max(0, (phaseProgress - 0.2) * 4)),
                  transform: `scale(${Math.min(1, Math.max(0, (phaseProgress - 0.2) * 4))})`,
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(4px, 0.6vw, 8px)' }}>
                {['F', 'L', 'O', 'W'].map((char, idx) => {
                  const globalIdx = 5 + idx;
                  const riseStart = globalIdx * 0.04;
                  const riseRaw = Math.min(1, Math.max(0, (phaseProgress - riseStart) / 0.22));
                  const easedRise = 1 - Math.pow(1 - riseRaw, 3);

                  return (
                    <span
                      key={idx}
                      style={{
                        display: 'inline-block',
                        fontSize: 'clamp(52px, 7.8vw, 88px)',
                        fontWeight: 900,
                        fontFamily: "'Syne', 'Inter', -apple-system, sans-serif",
                        lineHeight: 1,
                        letterSpacing: '-0.03em',
                        textTransform: 'uppercase',
                        color: phase1TextColor,
                        transform: `translateY(${(1 - easedRise) * 35}px) scale(${0.9 + easedRise * 0.1})`,
                        opacity: easedRise,
                      }}
                    >
                      {char}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* PHASE 2: HIGH-END EXECUTIVE STUDIO DECK (35% - 100%)                */}
        {/* =================================================================== */}
        {phase >= 2 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              position: 'relative',
              animation: isFadingOut
                ? 'deckExitSmooth 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                : 'deckEntranceSmooth 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            {/* Top Luminous Eyebrow Pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 14px',
                borderRadius: 20,
                backgroundColor: isLight ? 'rgba(0, 122, 255, 0.08)' : 'rgba(0, 242, 254, 0.1)',
                border: `1px solid ${isLight ? 'rgba(0, 122, 255, 0.22)' : 'rgba(0, 242, 254, 0.25)'}`,
                marginBottom: 16,
              }}
            >
              <Sparkles size={12} color={accentColor} />
              <span
                style={{
                  fontSize: 10.5,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: accentColor,
                }}
              >
                AUTONOMOUS PRODUCTION WORKSTATION
              </span>
            </div>

            {/* Master Studio Headline */}
            <h1
              style={{
                fontSize: 'clamp(34px, 4.6vw, 54px)',
                fontWeight: 900,
                fontFamily: "'Syne', 'Outfit', -apple-system, sans-serif",
                letterSpacing: '-0.035em',
                margin: '0 0 10px 0',
                textAlign: 'center',
                lineHeight: 1.12,
                color: fgColor,
                background: isLight
                  ? 'linear-gradient(180deg, #090D16 0%, #1E293B 100%)'
                  : 'linear-gradient(180deg, #FFFFFF 0%, #E2E8F0 65%, #94A3B8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              MediaFlow Studio
            </h1>

            {/* High-Contrast Subtitle */}
            <p
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: subColor,
                margin: '0 0 32px 0',
                textAlign: 'center',
                maxWidth: 580,
                lineHeight: 1.5,
                letterSpacing: '-0.01em',
              }}
            >
              Autonomous photo & video separation, sequence pairing, and multi-sheet report fusion.
            </p>

            {/* =============================================================== */}
            {/* 3 BALANCED HORIZONTAL GLASS POWER CARDS (NO AWKWARD TILT)       */}
            {/* =============================================================== */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 16,
                width: '100%',
                maxWidth: 820,
                marginBottom: 34,
              }}
            >
              {/* Card 1: P/V Separator */}
              <div
                style={{
                  borderRadius: 18,
                  backgroundColor: cardBg,
                  backdropFilter: 'blur(24px) saturate(190%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(190%)',
                  border: `1px solid ${cardBorder}`,
                  borderTop: `1px solid ${cardTopBorder}`,
                  padding: '20px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: cardShadow,
                  minHeight: 146,
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      backgroundColor: isLight ? 'rgba(0, 122, 255, 0.1)' : 'rgba(0, 242, 254, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Layers size={15} color={accentColor} />
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: fgColor,
                    }}
                  >
                    P/V SEPARATOR
                  </span>
                </div>

                {/* Rolling Number */}
                <div style={{ margin: '14px 0 10px' }}>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 900,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: numPv.isLocked ? accentColor : fgColor,
                      lineHeight: 1,
                    }}
                  >
                    {numPv.value}{' '}
                    <span style={{ fontSize: 12, fontWeight: 600, color: subColor }}>MB/s</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: subColor, fontWeight: 500 }}>
                  <CheckCircle2 size={13} color="#10B981" />
                  <span>32 Workers Ready</span>
                </div>
              </div>

              {/* Card 2: Sequence Sync (Centerpiece Focal Card) */}
              <div
                style={{
                  borderRadius: 20,
                  backgroundColor: cardBg,
                  backdropFilter: 'blur(28px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(28px) saturate(200%)',
                  border: isLight ? '1.5px solid #007AFF' : '1.5px solid #00F2FE',
                  borderTop: `1.5px solid ${cardTopBorder}`,
                  padding: '20px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isLight
                    ? '0 22px 42px -10px rgba(0, 122, 255, 0.14), 0 2px 8px rgba(0, 0, 0, 0.04)'
                    : '0 30px 70px -12px rgba(0, 242, 254, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
                  minHeight: 146,
                  transform: 'translateY(-6px)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        backgroundColor: isLight ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 242, 254, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Video size={15} color={accentColor} />
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: fgColor,
                      }}
                    >
                      SEQUENCE SYNC
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: 4,
                      backgroundColor: isLight ? 'rgba(0, 122, 255, 0.1)' : 'rgba(0, 242, 254, 0.15)',
                      color: accentColor,
                    }}
                  >
                    AI CORE
                  </span>
                </div>

                {/* Rolling Number */}
                <div style={{ margin: '14px 0 10px' }}>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 900,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: numMatch.isLocked ? accentColor : fgColor,
                      lineHeight: 1,
                    }}
                  >
                    {numMatch.value}%{' '}
                    <span style={{ fontSize: 12, fontWeight: 600, color: subColor }}>MATCH</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: subColor, fontWeight: 500 }}>
                  <CheckCircle2 size={13} color="#10B981" />
                  <span>Timecode & Photo Align</span>
                </div>
              </div>

              {/* Card 3: Report Fusion */}
              <div
                style={{
                  borderRadius: 18,
                  backgroundColor: cardBg,
                  backdropFilter: 'blur(24px) saturate(190%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(190%)',
                  border: `1px solid ${cardBorder}`,
                  borderTop: `1px solid ${cardTopBorder}`,
                  padding: '20px 22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: cardShadow,
                  minHeight: 146,
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      backgroundColor: isLight ? 'rgba(124, 58, 237, 0.1)' : 'rgba(167, 139, 250, 0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Database size={15} color={isLight ? '#7C3AED' : '#A78BFA'} />
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: fgColor,
                    }}
                  >
                    REPORT FUSION
                  </span>
                </div>

                {/* Rolling Number */}
                <div style={{ margin: '14px 0 10px' }}>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 900,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: numStreams.isLocked ? (isLight ? '#7C3AED' : '#A78BFA') : fgColor,
                      lineHeight: 1,
                    }}
                  >
                    {numStreams.value}{' '}
                    <span style={{ fontSize: 12, fontWeight: 600, color: subColor }}>STREAMS</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: subColor, fontWeight: 500 }}>
                  <CheckCircle2 size={13} color="#10B981" />
                  <span>Zero-Loss Excel Matrix</span>
                </div>
              </div>
            </div>

            {/* =============================================================== */}
            {/* 3. SHIMMERING LAUNCH STUDIO CAPSULE WITH FLUID PROGRESS TRACK    */}
            {/* =============================================================== */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                onComplete?.();
              }}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '13px 34px',
                borderRadius: 32,
                backgroundColor: launchBtnBg,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: isLight ? '1px solid rgba(11, 15, 25, 0.12)' : '1px solid rgba(255, 255, 255, 0.22)',
                color: launchBtnFg,
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: '0.04em',
                boxShadow: isLight
                  ? '0 12px 28px rgba(11, 15, 25, 0.16)'
                  : '0 16px 36px rgba(0, 0, 0, 0.55), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)';
                (e.currentTarget as HTMLElement).style.boxShadow = `0 16px 36px ${accentColor}40`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLElement).style.boxShadow = isLight
                  ? '0 12px 28px rgba(11, 15, 25, 0.16)'
                  : '0 16px 36px rgba(0, 0, 0, 0.55)';
              }}
            >
              {/* Shimmer Light Ray */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.25) 50%, transparent 100%)',
                  animation: 'shimmerSweep 2.8s infinite',
                  pointerEvents: 'none',
                }}
              />

              {/* Progress Line */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  height: 3,
                  width: `${effectiveProgress}%`,
                  background: isLight
                    ? 'linear-gradient(90deg, #007AFF 0%, #00F2FE 100%)'
                    : 'linear-gradient(90deg, #00F2FE 0%, #38BDF8 60%, #818CF8 100%)',
                  boxShadow: `0 0 10px ${accentColor}`,
                  transition: 'width 0.1s linear',
                }}
              />

              <span>Launch Studio</span>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.16)',
                }}
              >
                <ArrowDown size={12} color="#FFFFFF" />
              </span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12.5,
                  color: isLight ? '#38BDF8' : '#00F2FE',
                  fontWeight: 800,
                  marginLeft: 4,
                }}
              >
                [{effectiveProgress}%]
              </span>
            </div>

            {/* Live Subsystem Boot Status */}
            <div
              style={{
                marginTop: 18,
                fontSize: 11.5,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.06em',
                color: subColor,
                display: 'flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              <span style={{ color: accentColor }}>●</span>
              <span>{statusLabel}</span>
            </div>
          </div>
        )}
      </div>

      {/* Floating Keyboard Skip Hint */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          fontSize: 10,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: subColor,
          opacity: isFadingOut ? 0 : 0.65,
          cursor: 'pointer',
          padding: '4px 12px',
          borderRadius: 6,
          backgroundColor: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.04)',
          border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.08)',
          transition: 'opacity 0.25s ease',
        }}
      >
        [ PRESS SPACE OR CLICK TO SKIP ]
      </div>

      <style>{`
        @keyframes plasmaDrift1 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, 30px) scale(1.1); }
          100% { transform: translate(-20px, 50px) scale(0.95); }
        }
        @keyframes plasmaDrift2 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, -30px) scale(1.08); }
          100% { transform: translate(30px, -40px) scale(0.94); }
        }
        @keyframes asymmetricBreathe {
          0% { opacity: 0.4; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.15); }
          100% { opacity: 0.4; transform: scale(0.85); }
        }
        @keyframes shimmerSweep {
          0% { transform: translateX(-150%) skewX(-20deg); }
          60%, 100% { transform: translateX(250%) skewX(-20deg); }
        }
        @keyframes deckEntranceSmooth {
          0% {
            opacity: 0;
            transform: translateY(24px) scale(0.97);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes deckExitSmooth {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-20px) scale(1.02);
          }
        }
      `}</style>
    </div>
  );
};
