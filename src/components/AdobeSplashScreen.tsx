import React, { useState, useEffect, useMemo } from 'react';
import { X, Loader2 } from 'lucide-react';
import {
  getStoredSplashSettings,
  SplashSettings,
  AnythingLoaderConfig,
  cleanVersionText,
} from '../types/splash';
import { getPresetById } from './splashPresets';

export interface AdobeSplashScreenProps {
  isStandaloneWindow?: boolean;
  isStandaloneSplash?: boolean;
  isModalPreview?: boolean;
  isPreview?: boolean;
  isBootScreen?: boolean;
  isOpen?: boolean;
  settings?: SplashSettings;
  onFinish?: () => void;
  onComplete?: () => void;
  onClose?: () => void;
  overrideSettings?: Partial<SplashSettings>;
}

// Inlined Brand Emblem Squircle Logo Badge matching Anything Ecosystem specifications
export const AnythingBrandEmblem: React.FC<{
  size?: number;
  className?: string;
  letters?: string;
  gradientFrom?: string;
  gradientTo?: string;
  glow?: boolean;
}> = ({
  size = 56,
  className = '',
  letters = 'Ms',
  gradientFrom,
  gradientTo,
  glow = true,
}) => {
  const lower = letters.toLowerCase();
  const isTap = lower === 'ts';
  const isMediaFlow = lower === 'ms' || lower === 'mf' || lower === 'me';

  const defaultFrom = isTap ? '#06B6D4' : isMediaFlow ? '#0066EE' : '#FF2A2A';
  const defaultTo = isTap ? '#4F46E5' : isMediaFlow ? '#003399' : '#BA0000';
  const fromColor = gradientFrom || defaultFrom;
  const toColor = gradientTo || defaultTo;
  const shadowColor = isTap
    ? 'rgba(6, 182, 212, 0.45)'
    : isMediaFlow
    ? 'rgba(0, 102, 238, 0.45)'
    : 'rgba(224, 2, 1, 0.45)';

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28) + 'px',
        overflow: 'hidden',
        userSelect: 'none',
        flexShrink: 0,
        boxShadow: glow ? `0 8px 28px ${shadowColor}` : undefined,
        position: 'relative',
      }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <defs>
          <linearGradient
            id={`emblemGrad_${letters}`}
            x1="0"
            y1="0"
            x2="100"
            y2="100"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={fromColor} />
            <stop offset="100%" stopColor={toColor} />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="22" fill={`url(#emblemGrad_${letters})`} />
        {/* Specular glass highlight rim */}
        <rect
          x="1.5"
          y="1.5"
          width="97"
          height="97"
          rx="20.5"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1.5"
        />
        <text
          x="50"
          y="67"
          textAnchor="middle"
          fill="#FFFFFF"
          style={{
            fontFamily:
              "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            fontWeight: 800,
            fontSize: letters.length > 2 ? '42px' : '52px',
            letterSpacing: '-1.5px',
          }}
        >
          {letters}
        </text>
      </svg>
    </div>
  );
};

export const MediaFlowBrandEmblem = AnythingBrandEmblem;

const DEFAULT_DIAGNOSTIC_STEPS = [
  'Initializing Direct3D 12 media ingestion pipeline...',
  'Verifying storage volume headroom and I/O threads...',
  'Loading multi-camera sync & PV separation engine...',
  'Syncing with Anything Ecosystem...',
  'Starting MediaFlow Studio...'
];

export const AdobeSplashScreen: React.FC<AdobeSplashScreenProps> = ({
  isStandaloneWindow = false,
  isStandaloneSplash = false,
  isModalPreview = false,
  isPreview = false,
  isBootScreen = false,
  isOpen = true,
  settings: propSettings,
  onFinish,
  onComplete,
  onClose,
  overrideSettings,
}) => {
  const isStandalone = isStandaloneWindow || isStandaloneSplash;
  const isPreviewMode = isModalPreview || isPreview;

  const [loaderConfig, setLoaderConfig] = useState<AnythingLoaderConfig | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchConfig = async () => {
      try {
        const anyWin = window as any;
        const api = anyWin.api || anyWin.electronAPI;
        if (api?.getSplashLoaderConfig) {
          const cfg = await api.getSplashLoaderConfig();
          if (isMounted && cfg) {
            setLoaderConfig(cfg);
            return;
          }
        }
        const res = await fetch('./loader-config.json');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data) setLoaderConfig(data);
        }
      } catch {}
    };
    fetchConfig();

    const anyWin = window as any;
    const unsub = (anyWin.api?.onLoaderConfigUpdated || anyWin.electronAPI?.onLoaderConfigUpdated)?.(
      (newCfg: any) => {
        if (isMounted && newCfg) {
          setLoaderConfig(newCfg);
        }
      }
    );

    return () => {
      isMounted = false;
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const effectiveSettings: SplashSettings = useMemo(() => {
    if (propSettings) return { ...propSettings, ...overrideSettings };
    const stored = getStoredSplashSettings();
    return { ...stored, ...overrideSettings };
  }, [propSettings, overrideSettings]);

  const preset = useMemo(() => getPresetById(effectiveSettings.presetId), [effectiveSettings.presetId]);

  const [progress, setProgress] = useState<number>(0);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [isDone, setIsDone] = useState<boolean>(false);

  const diagnosticSteps = useMemo(() => {
    if (loaderConfig?.steps && Array.isArray(loaderConfig.steps) && loaderConfig.steps.length > 0) {
      return loaderConfig.steps;
    }
    return DEFAULT_DIAGNOSTIC_STEPS;
  }, [loaderConfig]);

  const totalDurationMs = useMemo(() => {
    if (loaderConfig?.durationMs && typeof loaderConfig.durationMs === 'number' && loaderConfig.durationMs > 0) {
      return loaderConfig.durationMs;
    }
    switch (effectiveSettings.speed) {
      case 'quick':
        return 1400;
      case 'cinematic':
        return 4200;
      case 'standard':
      default:
        return 2800;
    }
  }, [loaderConfig, effectiveSettings.speed]);

  const handleFinish = () => {
    if (isDone) return;
    setIsDone(true);
    setIsFadingOut(true);

    setTimeout(() => {
      if (onComplete) {
        onComplete();
      } else if (onFinish) {
        onFinish();
      } else if (isStandalone) {
        const anyWin = window as any;
        const api = anyWin.electronAPI || anyWin.api;
        if (api?.splashDone) {
          api.splashDone();
        } else if (api?.notifySplashDone) {
          api.notifySplashDone();
        }
      } else if (onClose) {
        onClose();
      }
    }, 250);
  };

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setStepIndex(0);
      setIsFadingOut(false);
      setIsDone(false);
      return;
    }

    const intervalTime = 35;
    const totalSteps = Math.max(20, totalDurationMs / intervalTime);
    const increment = 100 / totalSteps;

    let currentProgress = 0;

    const timer = setInterval(() => {
      currentProgress += increment;

      if (currentProgress >= 100) {
        currentProgress = 100;
        setProgress(100);
        setStepIndex(diagnosticSteps.length - 1);
        clearInterval(timer);

        setTimeout(() => {
          handleFinish();
        }, 180);
      } else {
        setProgress(currentProgress);
        const step = Math.min(
          diagnosticSteps.length - 2,
          Math.floor((currentProgress / 100) * (diagnosticSteps.length - 1))
        );
        setStepIndex(step);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isOpen, totalDurationMs, diagnosticSteps]);

  if (!isOpen) return null;

  const activeArtworkUrl =
    loaderConfig?.artworkUrl ||
    effectiveSettings.customImageUrl ||
    preset.imageUrl ||
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1400&q=85';

  const artworkArtist = loaderConfig?.artistName || effectiveSettings.artistName || preset.artist || 'Anything Creation';
  const artworkTitle = loaderConfig?.artworkTitle || effectiveSettings.artworkTitle || preset.title || '-Designed by Burhanuddin';
  const productName = loaderConfig?.productName || effectiveSettings.productName || 'MediaFlow Studio';
  const rawVersion = loaderConfig?.versionText || effectiveSettings.versionText || 'v6.0.0 (x64)';
  const versionText = cleanVersionText(rawVersion);
  const tagline = loaderConfig?.tagline || effectiveSettings.tagline || 'Professional Media Ingestion, Synchronization and Report Fusion Desktop Suite';
  const artworkFit = (loaderConfig?.artworkFit || 'cover') as any;
  const artworkPosition = (loaderConfig?.artworkPosition || 'center') as any;
  const emblemLetters = loaderConfig?.logoText || 'Ms';

  const cardContent = (
    <div
      style={{
        width: '740px',
        maxWidth: '740px',
        height: '480px',
        borderRadius: '16px',
        overflow: 'hidden',
        backgroundColor: '#18181B',
        border: '1px solid #2B2B30',
        boxShadow:
          '0 30px 90px -10px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.09)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        userSelect: 'none',
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Outfit', 'Inter', sans-serif",
        color: '#F4F4F5',
        transition: 'transform 0.28s ease, opacity 0.28s ease',
        transform: isFadingOut ? 'scale(0.985)' : 'scale(1)',
        opacity: isFadingOut ? 0 : 1,
        margin: 0,
      }}
    >
      {/* =========================================================================
          TOP CANVAS: HERO ARTWORK SECTION (340px)
          ========================================================================= */}
      <div
        style={{
          height: '340px',
          width: '100%',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#09090B',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '26px 28px',
          WebkitAppRegion: isStandalone ? 'drag' : undefined,
        } as React.CSSProperties}
      >
        {/* Background Artwork Canvas with subtle ambient scale */}
        <img
          src={activeArtworkUrl}
          alt="Splash Artwork"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: artworkFit,
            objectPosition: artworkPosition,
            filter: 'brightness(0.95) contrast(1.04)',
            transform: 'scale(1.0)',
            transition: 'all 0.5s ease-out',
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1400&q=85';
          }}
        />

        {/* Cinematic Studio Overlays (Vignette & Readability Gradients) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, #18181B 0%, rgba(0, 0, 0, 0.25) 50%, rgba(0, 0, 0, 0.60) 100%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to right, rgba(0, 0, 0, 0.65) 0%, transparent 50%, rgba(0, 0, 0, 0.45) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Top Header Bar: Emblem, Title & Skip Action */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <AnythingBrandEmblem size={56} letters={emblemLetters} />

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1
                  style={{
                    fontSize: '24px',
                    fontWeight: 900,
                    color: '#FFFFFF',
                    margin: 0,
                    letterSpacing: '-0.02em',
                    textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                  }}
                >
                  {productName}
                </h1>
                <span
                  style={{
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  }}
                >
                  {versionText}
                </span>
              </div>
              <p
                style={{
                  fontSize: '12px',
                  color: 'rgba(228, 228, 231, 0.9)',
                  margin: '3px 0 0 0',
                  fontWeight: 500,
                  textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                }}
              >
                {tagline}
              </p>
            </div>
          </div>

          {/* Skip / Close Button */}
          <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            {isPreviewMode ? (
              <button
                onClick={handleFinish}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  backdropFilter: 'blur(8px)',
                }}
                title="Close Preview"
              >
                <X size={16} />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.75)',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(8px)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#FFFFFF';
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)';
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
                }}
              >
                Skip ➔
              </button>
            )}
          </div>
        </div>

        {/* Bottom Right of Artwork: Artist Credit Capsule */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            alignSelf: 'flex-end',
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            padding: '6px 14px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
          }}
        >
          <span
            style={{
              fontSize: '9px',
              fontFamily: 'monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: '#38BDF8',
              fontWeight: 800,
            }}
          >
            Featured Artwork
          </span>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#FFFFFF',
              marginTop: '1px',
              letterSpacing: '-0.01em',
            }}
          >
            {artworkArtist}
          </span>
          {artworkTitle && (
            <span
              style={{
                fontSize: '10px',
                color: 'rgba(212, 212, 216, 0.8)',
                fontStyle: 'italic',
                fontWeight: 500,
              }}
            >
              {artworkTitle}
            </span>
          )}
        </div>
      </div>

      {/* =========================================================================
          LOWER CANVAS: HIGH-END ADOBE PROGRESS & DIAGNOSTICS (140px)
          ========================================================================= */}
      <div
        style={{
          height: '140px',
          backgroundColor: '#18181B',
          padding: '24px 28px 20px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Progress Bar & Diagnostics Row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Loader2
                size={14}
                color="#38BDF8"
                style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}
              />
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: '#E4E4E7',
                  fontWeight: 500,
                  letterSpacing: '0.02em',
                }}
              >
                {diagnosticSteps[stepIndex] || diagnosticSteps[0]}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'monospace',
                fontSize: '12px',
              }}
            >
              <span style={{ color: '#A1A1AA' }}>Loading</span>
              <span style={{ color: '#38BDF8', fontWeight: 800 }}>
                {Math.round(progress)}%
              </span>
            </div>
          </div>

          {/* Glowing Segmented Loader Bar with Shimmer Beam */}
          <div
            style={{
              width: '100%',
              height: '8px',
              borderRadius: '9999px',
              backgroundColor: '#09090B',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.8)',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                borderRadius: '9999px',
                background: 'linear-gradient(90deg, #06B6D4 0%, #0066EE 50%, #4F46E5 100%)',
                boxShadow: '0 0 14px rgba(6, 182, 212, 0.7)',
                transition: 'width 0.08s linear',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Moving Shimmer Sheen */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.45) 50%, transparent 100%)',
                  animation: 'shimmerSweep 1.2s infinite linear',
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer Metadata & Legal Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: '10px',
            color: '#71717A',
            fontFamily: 'monospace',
          }}
        >
          <span>
            {loaderConfig?.author ? (
              <>
                © 1990–2026 MediaFlow Studio Systems · Architect:{' '}
                <strong style={{ color: '#E4E4E7' }}>{loaderConfig.author}</strong>
                {loaderConfig.contactPhone && (
                  <span style={{ color: '#A1A1AA' }}> ({loaderConfig.contactPhone})</span>
                )}
              </>
            ) : (
              '© 1990–2026 MediaFlow Studio Systems · Architect: Burhanuddin Sounasath (8369811201)'
            )}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#10B981',
                boxShadow: '0 0 8px #10B981',
                animation: 'pulse 1.8s infinite',
              }}
            />
            <span style={{ color: '#A1A1AA', fontWeight: 600 }}>
              {loaderConfig ? 'ANYTHING SYNCED' : 'DirectX 12 GPU'} · Build 2026.10
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Modal Preview Mode in Settings Page
  if (isPreviewMode) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.2s ease',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) handleFinish();
        }}
      >
        {cardContent}
      </div>
    );
  }

  // Standalone Transparent Window Mode (Only the rectangle is visible on the desktop)
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        backgroundColor: 'transparent',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
      }}
    >
      {cardContent}
    </div>
  );
};
