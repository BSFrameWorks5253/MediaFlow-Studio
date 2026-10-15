import React, { useMemo, useState, useEffect, useRef } from 'react';
import { LoadingTemplateProps } from './types';
import { Layers, Cpu, Database, ArrowDown, CheckCircle2 } from 'lucide-react';

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
  // Theme-adaptive luxury design tokens
  const bgColor = isLight ? '#FFFFFF' : '#06080F';
  const blockColor = isLight ? '#000000' : '#FFFFFF';
  const cutoutBg = bgColor;
  const fgColor = isLight ? '#0A0D14' : '#F8FAFC';
  const subColor = isLight ? '#64748B' : '#94A3B8';
  const accentColor = isLight ? '#007AFF' : '#00F2FE';
  const cardBg = isLight ? 'rgba(255, 255, 255, 0.88)' : 'rgba(15, 23, 42, 0.55)';
  const cardBorder = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.16)';
  const cardTopBorder = isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.45)';
  const cardShadow = isLight
    ? '0 20px 45px -10px rgba(0, 0, 0, 0.09), 0 4px 14px rgba(0, 0, 0, 0.03)'
    : '0 30px 70px -10px rgba(0, 0, 0, 0.85), inset 0 1px 2px rgba(255, 255, 255, 0.2)';
  const launchBtnBg = isLight ? '#0A0D14' : 'rgba(15, 23, 42, 0.85)';
  const launchBtnFg = '#FFFFFF';

  // Prevent any progress or phase regression (e.g. during exit/dismiss)
  const maxProgressRef = useRef(progress);
  if (progress > maxProgressRef.current) {
    maxProgressRef.current = progress;
  }
  const effectiveProgress = isFadingOut ? 100 : Math.max(progress, maxProgressRef.current);

  // 3 Master Cinematic Phases:
  // Phase 1 (0% - 50%): The Signature ONTO Wordmark (Blank Black Space -> Inversion to White)
  // Phase 2 (50% - 92%): Liquid Glass Showcase with Staggered Cards & Rolling Numbers
  // Phase 3 (92% - 100%): Iris Aperture Horizon Expansion & Exit
  const phase = useMemo(() => {
    if (isFadingOut) return 3;
    if (effectiveProgress < 50) return 1;
    if (effectiveProgress < 92) return 2;
    return 3;
  }, [effectiveProgress, isFadingOut]);

  const phaseProgress = useMemo(() => {
    if (isFadingOut) return 1;
    if (phase === 1) return Math.min(1, effectiveProgress / 50);
    if (phase === 2) return Math.min(1, (effectiveProgress - 50) / 42);
    return Math.min(1, (effectiveProgress - 92) / 8);
  }, [phase, effectiveProgress, isFadingOut]);

  // Rolling numbers for Phase 2 (Liquid Glass Cards Showcase)
  const isCardShowcaseActive = phase >= 2;
  const numPv = useRollUpNumber(842, isCardShowcaseActive, 1200);
  const numMatch = useRollUpNumber(100, isCardShowcaseActive, 1000);
  const numStreams = useRollUpNumber(102, isCardShowcaseActive, 1300);

  // Inversion calculations for Phase 1:
  // Starts in pure blank black space with white cutout text
  // Then smoothly inverts: background turns white, text turns black!
  const invertProgress = useMemo(() => {
    if (phase > 1) return 1;
    if (phaseProgress < 0.42) return 0;
    return Math.min(1, (phaseProgress - 0.42) / 0.24);
  }, [phase, phaseProgress]);

  const easedInvert = 1 - Math.pow(1 - invertProgress, 3);

  const currentCanvasBg = useMemo(() => {
    if (!isLight) return bgColor;
    if (phase > 1) return bgColor;
    // Invert from #06080F (rgb 6, 8, 15) to #FFFFFF (rgb 255, 255, 255)
    const r = Math.round(6 + easedInvert * (255 - 6));
    const g = Math.round(8 + easedInvert * (255 - 8));
    const b = Math.round(15 + easedInvert * (255 - 15));
    return `rgb(${r}, ${g}, ${b})`;
  }, [isLight, phase, bgColor, easedInvert]);

  const phase1TextColor = useMemo(() => {
    if (!isLight) return fgColor;
    if (phase > 1) return fgColor;
    // Invert from white (rgb 255, 255, 255) to black (rgb 10, 13, 20)
    const r = Math.round(255 - easedInvert * (255 - 10));
    const g = Math.round(255 - easedInvert * (255 - 13));
    const b = Math.round(255 - easedInvert * (255 - 20));
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
        transition: 'background-color 0.15s ease',
      }}
      title="Click or press Space to launch studio immediately"
    >
      {/* =================================================================== */}
      {/* 1. FLUID SHIFTING PLASMA AURA BACKGROUND (ADAPTS TO LIGHT/DARK)    */}
      {/* =================================================================== */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 0,
          opacity: phase === 1 ? easedInvert : 1,
          transition: 'opacity 0.2s ease',
        }}
      >
        {/* Soft Azure Plasma Orb */}
        <div
          style={{
            position: 'absolute',
            width: '65vw',
            height: '65vw',
            maxWidth: 850,
            maxHeight: 850,
            borderRadius: '50%',
            top: '-20%',
            left: '-15%',
            background: isLight
              ? 'radial-gradient(circle, rgba(0, 122, 255, 0.09) 0%, rgba(56, 189, 248, 0.03) 50%, transparent 75%)'
              : 'radial-gradient(circle, rgba(0, 122, 255, 0.24) 0%, rgba(14, 165, 233, 0.08) 50%, transparent 75%)',
            filter: 'blur(90px)',
            animation: 'plasmaDrift1 14s infinite alternate ease-in-out',
          }}
        />

        {/* Electric Cyan Plasma Orb */}
        <div
          style={{
            position: 'absolute',
            width: '55vw',
            height: '55vw',
            maxWidth: 750,
            maxHeight: 750,
            borderRadius: '50%',
            bottom: '-15%',
            right: '-10%',
            background: isLight
              ? 'radial-gradient(circle, rgba(0, 242, 254, 0.08) 0%, rgba(99, 102, 241, 0.03) 50%, transparent 70%)'
              : 'radial-gradient(circle, rgba(0, 242, 254, 0.2) 0%, rgba(99, 102, 241, 0.09) 50%, transparent 70%)',
            filter: 'blur(100px)',
            animation: 'plasmaDrift2 18s infinite alternate ease-in-out',
          }}
        />

        {/* Liquid Ambient Core */}
        <div
          style={{
            position: 'absolute',
            width: '50vw',
            height: '50vw',
            maxWidth: 650,
            maxHeight: 650,
            borderRadius: '50%',
            top: '25%',
            left: '25%',
            background: isLight
              ? 'radial-gradient(circle, rgba(14, 165, 233, 0.06) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(56, 189, 248, 0.16) 0%, rgba(30, 58, 138, 0.12) 60%, transparent 80%)',
            filter: 'blur(110px)',
            animation: 'plasmaDrift3 22s infinite alternate ease-in-out',
          }}
        />

        {/* Ambient Vignette */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: isLight
              ? 'radial-gradient(ellipse at center, transparent 40%, rgba(240, 243, 248, 0.5) 100%)'
              : 'radial-gradient(ellipse at center, transparent 35%, rgba(6, 8, 15, 0.8) 100%)',
          }}
        />
      </div>

      {/* Editorial Corner Crosshairs [+] & Metadata */}
      <div
        style={{
          position: 'absolute',
          top: 32,
          left: 40,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          zIndex: 10,
          opacity: phase >= 2 ? 1 : (phase === 1 ? easedInvert * 0.45 : 0.45),
          transition: 'opacity 0.5s ease',
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: fgColor,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ color: accentColor, fontSize: 13 }}>✦</span>
          <span>MEDIAFLOW STUDIO</span>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 32,
          right: 40,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          zIndex: 10,
          opacity: phase >= 2 ? 1 : (phase === 1 ? easedInvert * 0.45 : 0.45),
          transition: 'opacity 0.5s ease',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: subColor,
          }}
        >
          CORE ENGINE // V5.0
        </span>
        {/* Asymmetric Organic Breathing Dot */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: '#10E79D',
            boxShadow: '0 0 10px rgba(16, 231, 157, 0.8)',
            animation: 'asymmetricBreathe 2.3s infinite ease-in-out',
          }}
        />
      </div>

      {/* Main Kinetic Center Stage */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 1100,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          pointerEvents: isFadingOut ? 'none' : 'auto',
        }}
      >
{/* =================================================================== */}
        {/* PHASE 1: BLANK BLACK SPACE CUTOUT -> INVERSION TO WHITE (ONTO STYLE)*/}
        {/* =================================================================== */}
        {phase === 1 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '0 24px',
              position: 'relative',
            }}
          >
            {/* Top Micro Eyebrow */}
            <div
              style={{
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
                letterSpacing: '0.36em',
                textTransform: 'uppercase',
                color: isLight ? `rgba(100, 116, 139, ${easedInvert})` : subColor,
                marginBottom: 32,
                opacity: easedInvert > 0.35 ? Math.min(1, (easedInvert - 0.35) * 2.2) : 0,
                transform: `translateY(${(1 - easedInvert) * 14}px)`,
                transition: 'opacity 0.25s ease, transform 0.25s ease',
                userSelect: 'none',
              }}
            >
              The Autonomous Creative Pipeline
            </div>

            {/* MASTER TYPOGRAPHIC WORDMARK: MEDIA FLOW */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'clamp(14px, 2.4vw, 36px)',
                position: 'relative',
                minHeight: 'clamp(70px, 9.5vw, 110px)',
              }}
            >
              {/* MEDIA Word Group */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'clamp(4px, 0.7vw, 10px)',
                }}
              >
                {['M', 'E', 'D', 'I', 'A'].map((char, idx) => {
                  const riseStart = idx * 0.038;
                  const riseRaw = Math.min(1, Math.max(0, (phaseProgress - riseStart) / 0.20));
                  const easedRise = 1 - Math.pow(1 - riseRaw, 3);

                  return (
                    <span
                      key={idx}
                      style={{
                        display: 'inline-block',
                        fontSize: 'clamp(54px, 8.2vw, 92px)',
                        fontWeight: 900,
                        fontFamily: "'Syne', 'Inter', -apple-system, sans-serif",
                        lineHeight: 1,
                        letterSpacing: '-0.02em',
                        textTransform: 'uppercase',
                        color: phase1TextColor,
                        transform: `translateY(${(1 - easedRise) * 45}px) scale(${0.88 + easedRise * 0.12})`,
                        opacity: easedRise,
                        userSelect: 'none',
                        textShadow: isLight && easedInvert < 0.5 ? '0 0 24px rgba(255, 255, 255, 0.45)' : 'none',
                        transition: 'color 0.08s linear, text-shadow 0.2s ease',
                      }}
                    >
                      {char}
                    </span>
                  );
                })}
              </div>

              {/* Optical Glowing Cyan Beacon between MEDIA and FLOW */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 'clamp(16px, 2.2vw, 32px)',
                  height: 'clamp(16px, 2.2vw, 32px)',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: accentColor,
                    boxShadow: `0 0 16px 4px ${accentColor}`,
                    opacity: Math.min(1, Math.max(0, (phaseProgress - 0.20) * 4)),
                    transform: `scale(${Math.min(1, Math.max(0, (phaseProgress - 0.20) * 4))})`,
                    animation: phaseProgress > 0.4 ? 'asymmetricBreathe 2s infinite ease-in-out' : 'none',
                  }}
                />
              </div>

              {/* FLOW Word Group */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'clamp(4px, 0.7vw, 10px)',
                }}
              >
                {['F', 'L', 'O', 'W'].map((char, idx) => {
                  const globalIdx = 5 + idx;
                  const riseStart = globalIdx * 0.038;
                  const riseRaw = Math.min(1, Math.max(0, (phaseProgress - riseStart) / 0.20));
                  const easedRise = 1 - Math.pow(1 - riseRaw, 3);

                  return (
                    <span
                      key={idx}
                      style={{
                        display: 'inline-block',
                        fontSize: 'clamp(54px, 8.2vw, 92px)',
                        fontWeight: 900,
                        fontFamily: "'Syne', 'Inter', -apple-system, sans-serif",
                        lineHeight: 1,
                        letterSpacing: '-0.02em',
                        textTransform: 'uppercase',
                        color: phase1TextColor,
                        transform: `translateY(${(1 - easedRise) * 45}px) scale(${0.88 + easedRise * 0.12})`,
                        opacity: easedRise,
                        userSelect: 'none',
                        textShadow: isLight && easedInvert < 0.5 ? '0 0 24px rgba(255, 255, 255, 0.45)' : 'none',
                        transition: 'color 0.08s linear, text-shadow 0.2s ease',
                      }}
                    >
                      {char}
                    </span>
                  );
                })}
              </div>

              {/* Shimmer Light Beam Across Letters (once inverted on white) */}
              {phaseProgress > 0.65 && (
                <div
                  style={{
                    position: 'absolute',
                    inset: '-12px -24px',
                    pointerEvents: 'none',
                    background: isLight
                      ? 'linear-gradient(105deg, transparent 35%, rgba(0, 122, 255, 0.28) 50%, transparent 65%)'
                      : 'linear-gradient(105deg, transparent 35%, rgba(255, 255, 255, 0.45) 50%, transparent 65%)',
                    mixBlendMode: isLight ? 'multiply' : 'screen',
                    animation: 'shimmerSweep 2.2s infinite',
                  }}
                />
              )}
            </div>

            {/* Architectural Baseline Progress Rule */}
            <div
              style={{
                marginTop: 36,
                width: '100%',
                maxWidth: 540,
                height: 2,
                backgroundColor: isLight
                  ? `rgba(0, 0, 0, ${easedInvert * 0.08})`
                  : 'rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
                overflow: 'hidden',
                position: 'relative',
                opacity: easedInvert > 0.45 ? Math.min(1, (easedInvert - 0.45) * 2.2) : 0,
                transform: `translateY(${(1 - easedInvert) * 12}px)`,
                transition: 'opacity 0.25s ease, transform 0.25s ease',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, phaseProgress * 100)}%`,
                  background: isLight
                    ? 'linear-gradient(90deg, #0A0D14 0%, #007AFF 70%, #00F2FE 100%)'
                    : 'linear-gradient(90deg, #00F2FE, #38BDF8)',
                  borderRadius: 2,
                  boxShadow: `0 0 14px ${accentColor}`,
                  transition: 'width 0.05s linear',
                }}
              />
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* PHASE 2 & 3: LIQUID GLASS SHOWCASE WITH STAGGERED FLUID CARDS        */}
        {/* =================================================================== */}
        {(phase === 2 || phase === 3) && (
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'ontoDeckSlideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              transform: phase === 4 && !isFadingOut ? `scale(${1 + phaseProgress * 0.08})` : 'scale(1)',
              transition: 'transform 0.4s ease',
            }}
          >
            {/* Top Kinetic MediaFlow Crest */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 16,
                padding: '6px 14px 6px 10px',
                borderRadius: 24,
                backgroundColor: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)',
                border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.12)',
                boxShadow: isLight
                  ? '0 2px 10px rgba(0, 0, 0, 0.04)'
                  : '0 4px 20px rgba(0, 0, 0, 0.4)',
                animation: isFadingOut ? 'studioHeaderExit 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'none',
              }}
            >
              {/* Dual-Stream Icon Token */}
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: isLight
                    ? 'linear-gradient(135deg, #0A0D14 0%, #007AFF 100%)'
                    : 'linear-gradient(135deg, #00F2FE 0%, #38BDF8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 0 12px ${accentColor}80`,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    border: '2px solid #FFFFFF',
                    transform: 'rotate(45deg)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 900,
                    fontFamily: "'Syne', -apple-system, sans-serif",
                    letterSpacing: '0.24em',
                    textTransform: 'uppercase',
                    color: fgColor,
                  }}
                >
                  MEDIAFLOW
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: '0.08em',
                    padding: '2px 6px',
                    borderRadius: 4,
                    backgroundColor: isLight ? 'rgba(0, 122, 255, 0.1)' : 'rgba(0, 242, 254, 0.15)',
                    color: accentColor,
                    border: `1px solid ${accentColor}40`,
                  }}
                >
                  STUDIO SUITE V3.0
                </span>
              </div>
            </div>

            {/* World-Class Modern Studio Title */}
            <h1
              style={{
                fontSize: 'clamp(32px, 4.4vw, 52px)',
                fontWeight: 800,
                fontFamily: "'Syne', 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
                letterSpacing: '-0.035em',
                margin: '0 0 10px 0',
                color: fgColor,
                textAlign: 'center',
                lineHeight: 1.15,
                background: isLight
                  ? 'linear-gradient(180deg, #0A0D14 0%, #1E293B 100%)'
                  : 'linear-gradient(180deg, #FFFFFF 0%, #E2E8F0 60%, #94A3B8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: isLight ? 'none' : 'drop-shadow(0 4px 24px rgba(0, 242, 254, 0.2))',
                animation: isFadingOut ? 'studioHeaderExit 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'none',
              }}
            >
              The Creative Pipeline Studio
            </h1>

            {/* Subtext lightened to slate gray for high contrast */}
            <p
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: subColor,
                margin: '0 0 34px 0',
                textAlign: 'center',
                maxWidth: 520,
                lineHeight: 1.55,
                letterSpacing: '-0.01em',
                animation: isFadingOut ? 'studioHeaderExit 0.4s 0.04s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'none',
              }}
            >
              Autonomous photo & video separation, biometric pairing, and multi-sheet report fusion.
            </p>

            {/* FANNED LIQUID GLASS CARDS WITH NUMERIC ROLL-UP (RESPONSIVE & UNBLOCKED) */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 880,
                height: 165,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 36,
              }}
            >
              {/* Left Fanned Card: Photo & Video Separator */}
              <div
                style={{
                  position: 'absolute',
                  width: 236,
                  height: 140,
                  borderRadius: 18,
                  backgroundColor: cardBg,
                  backdropFilter: 'blur(28px) saturate(190%)',
                  WebkitBackdropFilter: 'blur(28px) saturate(190%)',
                  border: `1px solid ${cardBorder}`,
                  borderTop: `1px solid ${cardTopBorder}`,
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: cardShadow,
                  transform: 'translateX(-240px) rotate(-4.5deg)',
                  zIndex: 1,
                  animation: isFadingOut
                    ? 'fluidCardExit1 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                    : 'fluidCardEntrance1 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={16} color={accentColor} />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: fgColor }}>
                    P/V SEPARATOR
                  </span>
                </div>

                {/* Rolling Number Display */}
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: numPv.isLocked ? accentColor : fgColor,
                    textShadow: numPv.isLocked ? `0 0 14px ${accentColor}80` : 'none',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {numPv.value}{' '}
                  <span style={{ fontSize: 11, fontWeight: 500, color: subColor }}>MB/s</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: subColor }}>
                  <CheckCircle2 size={12} color="#10E79D" />
                  <span>32 Workers Ready</span>
                </div>
              </div>

              {/* Center Fanned Card: Biometric Matcher (Elevated & Focal) */}
              <div
                style={{
                  position: 'absolute',
                  width: 258,
                  height: 154,
                  borderRadius: 20,
                  backgroundColor: cardBg,
                  backdropFilter: 'blur(32px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(32px) saturate(200%)',
                  border: `1.5px solid ${accentColor}60`,
                  borderTop: `1.5px solid ${cardTopBorder}`,
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: cardShadow,
                  transform: 'translateY(-14px) scale(1.02)',
                  zIndex: 3,
                  animation: isFadingOut
                    ? 'fluidCardExit2 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                    : 'fluidCardEntrance2 0.85s 0.08s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Cpu size={18} color={accentColor} />
                    <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: fgColor }}>
                      PHOTO MATCHER
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: 4,
                      backgroundColor: `${accentColor}18`,
                      border: `1px solid ${accentColor}40`,
                      color: accentColor,
                      boxShadow: `0 0 8px ${accentColor}30`,
                    }}
                  >
                    AI CORE
                  </span>
                </div>

                {/* Rolling Number Display */}
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: numMatch.isLocked ? accentColor : fgColor,
                    textShadow: numMatch.isLocked ? `0 0 20px ${accentColor}90` : 'none',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {numMatch.value}%{' '}
                  <span style={{ fontSize: 12, fontWeight: 500, color: subColor }}>MATCH</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: subColor }}>
                  <CheckCircle2 size={12} color="#10E79D" />
                  <span>Timecode & Facial Alignment</span>
                </div>
              </div>

              {/* Right Fanned Card: Excel Fusion Matrix */}
              <div
                style={{
                  position: 'absolute',
                  width: 236,
                  height: 140,
                  borderRadius: 18,
                  backgroundColor: cardBg,
                  backdropFilter: 'blur(28px) saturate(190%)',
                  WebkitBackdropFilter: 'blur(28px) saturate(190%)',
                  border: `1px solid ${cardBorder}`,
                  borderTop: `1px solid ${cardTopBorder}`,
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: cardShadow,
                  transform: 'translateX(240px) rotate(4.5deg)',
                  zIndex: 1,
                  animation: isFadingOut
                    ? 'fluidCardExit3 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                    : 'fluidCardEntrance3 0.8s 0.16s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Database size={16} color={isLight ? '#7C3AED' : '#818CF8'} />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: fgColor }}>
                    REPORT FUSION
                  </span>
                </div>

                {/* Rolling Number Display */}
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: numStreams.isLocked ? (isLight ? '#7C3AED' : '#A5B4FC') : fgColor,
                    textShadow: numStreams.isLocked ? `0 0 14px ${isLight ? '#7C3AED' : '#A5B4FC'}80` : 'none',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {numStreams.value}{' '}
                  <span style={{ fontSize: 11, fontWeight: 500, color: subColor }}>STREAMS</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: subColor }}>
                  <CheckCircle2 size={12} color="#10E79D" />
                  <span>Zero-Loss Matrix Engine</span>
                </div>
              </div>
            </div>

            {/* =============================================================== */}
            {/* 2. THE SHIMMERING LIQUID GLASS "LAUNCH STUDIO" BUTTON            */}
            {/* =============================================================== */}
            <div
              className="premium-launch-btn"
              onClick={(e) => {
                e.stopPropagation();
                onComplete?.();
              }}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '13px 32px',
                borderRadius: 30,
                backgroundColor: launchBtnBg,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: isLight ? '1px solid rgba(0, 0, 0, 0.2)' : '1px solid rgba(255, 255, 255, 0.22)',
                borderTop: isLight ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.45)',
                color: launchBtnFg,
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: '0.05em',
                boxShadow: isLight
                  ? '0 12px 28px rgba(0, 0, 0, 0.2)'
                  : '0 15px 35px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.3)',
                overflow: 'hidden',
                cursor: 'pointer',
                animation: isFadingOut ? 'studioBtnExit 0.38s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'none',
                transition: 'transform 0.15s ease, box-shadow 0.2s ease',
              }}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)';
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)';
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)';
                (e.currentTarget as HTMLElement).style.boxShadow = `0 18px 40px ${accentColor}40`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLElement).style.boxShadow = isLight
                  ? '0 12px 28px rgba(0, 0, 0, 0.2)'
                  : '0 15px 35px rgba(0, 0, 0, 0.5)';
              }}
            >
              {/* Shimmer Light-Ray Sweep */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.28) 50%, transparent 100%)',
                  animation: 'shimmerSweep 2.8s infinite',
                  pointerEvents: 'none',
                }}
              />

              {/* Internal Smooth Filling Horizontal Progress Line */}
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
                <ArrowDown size={12} color={isLight ? '#FFFFFF' : '#00F2FE'} />
              </span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  color: isLight ? '#38BDF8' : '#00F2FE',
                  fontWeight: 700,
                  marginLeft: 4,
                }}
              >
                [{effectiveProgress}%]
              </span>
            </div>

            {/* Micro Live Subsystem Caption below Pill */}
            <div
              style={{
                marginTop: 18,
                fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.08em',
                color: subColor,
                opacity: 0.85,
                animation: isFadingOut ? 'studioHeaderExit 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'none',
              }}
            >
              {statusLabel}
            </div>
          </div>
        )}
      </div>

      {/* Cinematic Warp Horizon & Optical Shutter Beam on Exit or Phase 4 */}
      {(phase === 3 || isFadingOut) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 100,
          }}
        >
          {/* Anamorphic Laser Flare Beam (Horizontal Expansion) */}
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: 3,
              background: isLight
                ? 'linear-gradient(90deg, transparent 0%, rgba(0, 122, 255, 0.95) 50%, transparent 100%)'
                : 'linear-gradient(90deg, transparent 0%, rgba(0, 242, 254, 0.95) 50%, transparent 100%)',
              boxShadow: isLight
                ? '0 0 30px rgba(0, 122, 255, 0.8), 0 0 60px rgba(0, 122, 255, 0.4)'
                : '0 0 40px #00F2FE, 0 0 80px #38BDF8',
              animation: 'anamorphicWarpSweep 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          />

          {/* Expanding Optical Iris Aperture Ring */}
          <div
            style={{
              width: 140,
              height: 70,
              borderRadius: 70,
              border: `4px solid ${accentColor}`,
              boxShadow: `0 0 60px ${accentColor}`,
              animation: 'irisApertureExplode 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          />
        </div>
      )}

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
          50% { transform: translate(60px, 40px) scale(1.15); }
          100% { transform: translate(-30px, 70px) scale(0.95); }
        }
        @keyframes plasmaDrift2 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-50px, -40px) scale(1.12); }
          100% { transform: translate(40px, -60px) scale(0.92); }
        }
        @keyframes plasmaDrift3 {
          0% { transform: translate(0, 0) scale(0.95); }
          50% { transform: translate(40px, -50px) scale(1.18); }
          100% { transform: translate(-50px, 30px) scale(1.02); }
        }
        @keyframes asymmetricBreathe {
          0% { opacity: 0.3; transform: scale(0.85); }
          65% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0.3; transform: scale(0.85); }
        }
        @keyframes ontoBlockDrop {
          0% {
            opacity: 0;
            transform: translateY(-50px) scale(0.85);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes ontoMorphPop {
          0% {
            opacity: 0;
            transform: scale(1.12) translateY(14px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes ontoDeckSlideUp {
          0% {
            opacity: 0;
            transform: translateY(28px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shimmerSweep {
          0% { transform: translateX(-150%) skewX(-20deg); }
          60%, 100% { transform: translateX(250%) skewX(-20deg); }
        }
        @keyframes fluidCardEntrance1 {
          0% {
            opacity: 0;
            transform: translateX(-240px) translateY(45px) rotate(-10deg) scale(0.88);
          }
          100% {
            opacity: 1;
            transform: translateX(-240px) translateY(0) rotate(-4.5deg) scale(1);
          }
        }
        @keyframes fluidCardEntrance2 {
          0% {
            opacity: 0;
            transform: translateY(35px) scale(0.88);
          }
          100% {
            opacity: 1;
            transform: translateY(-14px) scale(1.02);
          }
        }
        @keyframes fluidCardEntrance3 {
          0% {
            opacity: 0;
            transform: translateX(240px) translateY(45px) rotate(10deg) scale(0.88);
          }
          100% {
            opacity: 1;
            transform: translateX(240px) translateY(0) rotate(4.5deg) scale(1);
          }
        }
        @keyframes fluidCardExit1 {
          0% {
            opacity: 1;
            transform: translateX(-240px) translateY(0) rotate(-4.5deg) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateX(-380px) translateY(90px) rotate(-16deg) scale(0.78);
          }
        }
        @keyframes fluidCardExit2 {
          0% {
            opacity: 1;
            transform: translateY(-14px) scale(1.02);
          }
          100% {
            opacity: 0;
            transform: translateY(70px) scale(0.88);
          }
        }
        @keyframes fluidCardExit3 {
          0% {
            opacity: 1;
            transform: translateX(240px) translateY(0) rotate(4.5deg) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateX(380px) translateY(90px) rotate(16deg) scale(0.78);
          }
        }
        @keyframes studioHeaderExit {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0px);
          }
          100% {
            opacity: 0;
            transform: translateY(-40px) scale(1.06);
            filter: blur(8px);
          }
        }
        @keyframes studioBtnExit {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(35px) scale(0.88);
          }
        }
        @keyframes anamorphicWarpSweep {
          0% {
            opacity: 0;
            transform: scaleX(0.05);
          }
          30% {
            opacity: 1;
            transform: scaleX(1);
          }
          100% {
            opacity: 0;
            transform: scaleX(1.5) scaleY(4);
          }
        }
        @keyframes irisApertureExplode {
          0% {
            opacity: 0.95;
            transform: scale(0.2);
          }
          50% {
            opacity: 0.85;
            transform: scale(8);
          }
          100% {
            opacity: 0;
            transform: scale(28);
          }
        }
      `}</style>
    </div>
  );
};
