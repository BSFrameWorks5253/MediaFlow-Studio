import React, { useState, useEffect, useMemo } from 'react';
import { X, Loader2 } from 'lucide-react';
import { getStoredSplashSettings, SplashSettings, AnythingLoaderConfig } from '../types/splash';
import { getPresetById } from './splashPresets';
import { MediaFlowLogo } from './MediaFlowLogo';

interface AdobeSplashScreenProps {
  isStandaloneWindow?: boolean;
  isModalPreview?: boolean;
  onFinish?: () => void;
  onClose?: () => void;
  overrideSettings?: Partial<SplashSettings>;
}

// Inlined Official Squircle Logo for MediaFlow Studio
export const MediaFlowBrandEmblem: React.FC<{ size?: number; className?: string }> = ({
  size = 56,
  className = ''
}) => (
  <MediaFlowLogo size={size} className={className} />
);

const DEFAULT_DIAGNOSTIC_STEPS = [
  'Initializing Direct3D media acceleration engine...',
  'Loading RAW ingestion pipelines & camera profiles...',
  'Verifying PV separation & thumbnail caches...',
  'Syncing with Anything Ecosystem...',
  'Starting MediaFlow Studio...'
];

export const AdobeSplashScreen: React.FC<AdobeSplashScreenProps> = ({
  isStandaloneWindow = false,
  isModalPreview = false,
  onFinish,
  onClose,
  overrideSettings
}) => {
  const [loaderConfig, setLoaderConfig] = useState<AnythingLoaderConfig | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchConfig = async () => {
      try {
        const anyWindow = window as any;
        if (anyWindow.api?.getSplashLoaderConfig) {
          const cfg = await anyWindow.api.getSplashLoaderConfig();
          if (isMounted && cfg) {
            setLoaderConfig(cfg);
          }
        } else if (anyWindow.electronAPI?.getSplashLoaderConfig) {
          const cfg = await anyWindow.electronAPI.getSplashLoaderConfig();
          if (isMounted && cfg) {
            setLoaderConfig(cfg);
          }
        } else {
          const res = await fetch('./loader-config.json');
          if (res.ok) {
            const data = await res.json();
            if (isMounted && data) setLoaderConfig(data);
          }
        }
      } catch (err) {
        // Fallback safely to defaults
      }
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

  const settings: SplashSettings = useMemo(() => {
    const stored = getStoredSplashSettings();
    return { ...stored, ...overrideSettings };
  }, [overrideSettings]);

  const preset = useMemo(() => getPresetById(settings.presetId), [settings.presetId]);

  const [progress, setProgress] = useState<number>(0);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [isDone, setIsDone] = useState<boolean>(false);

  // Dynamic steps from Anything loader-config.json or defaults
  const diagnosticSteps = useMemo(() => {
    if (loaderConfig?.steps && Array.isArray(loaderConfig.steps) && loaderConfig.steps.length > 0) {
      return loaderConfig.steps;
    }
    return DEFAULT_DIAGNOSTIC_STEPS;
  }, [loaderConfig]);

  // Determine total duration
  const totalDurationMs = useMemo(() => {
    if (loaderConfig?.durationMs && typeof loaderConfig.durationMs === 'number' && loaderConfig.durationMs > 0) {
      return loaderConfig.durationMs;
    }
    switch (settings.speed) {
      case 'quick':
        return 1400;
      case 'cinematic':
        return 4200;
      case 'standard':
      default:
        return 2800;
    }
  }, [loaderConfig, settings.speed]);

  const handleFinish = () => {
    if (isDone) return;
    setIsDone(true);
    setIsFadingOut(true);

    setTimeout(() => {
      if (onFinish) {
        onFinish();
      } else if (isStandaloneWindow) {
        const anyWindow = window as any;
        if (anyWindow.api?.notifySplashDone) {
          anyWindow.api.notifySplashDone();
        } else if (anyWindow.electronAPI?.notifySplashDone) {
          anyWindow.electronAPI.notifySplashDone();
        }
      } else if (onClose) {
        onClose();
      }
    }, 250);
  };

  useEffect(() => {
    const intervalTime = 35;
    const totalSteps = totalDurationMs / intervalTime;
    const increment = 100 / totalSteps;

    let currentProgress = 0;

    const timer = setInterval(() => {
      currentProgress += increment;

      if (currentProgress >= 100) {
        currentProgress = 100;
        setProgress(100);
        setStepIndex(diagnosticSteps.length - 1);
        clearInterval(timer);

        // Smooth micro-pause before handoff
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
  }, [totalDurationMs, diagnosticSteps]);

  const activeArtworkUrl =
    loaderConfig?.artworkUrl ||
    settings.customImageUrl ||
    preset.imageUrl ||
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1400&q=85';

  const artworkArtist = loaderConfig?.artistName || settings.artistName || preset.artist || 'Anything Creation';
  const artworkTitle = loaderConfig?.artworkTitle || settings.artworkTitle || preset.title || '-Designed by Burhanuddin';
  const productName = loaderConfig?.productName || settings.productName || 'MediaFlow Studio';
  const versionText = loaderConfig?.versionText || settings.versionText || 'v6.0.0 (x64)';
  const tagline = loaderConfig?.tagline || settings.tagline || 'Professional Media Ingestion, Synchronization and Report Fusion Desktop Suite';
  const artworkFit = (loaderConfig as any)?.artworkFit || 'cover';
  const artworkPosition = (loaderConfig as any)?.artworkPosition || 'center';

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
          '0 30px 90px -10px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.08), 0 0 40px rgba(0, 102, 238, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        userSelect: 'none',
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Outfit', 'Inter', sans-serif",
        color: '#F4F4F5',
        transition: 'transform 0.25s ease, opacity 0.25s ease',
        transform: isFadingOut ? 'scale(0.985)' : 'scale(1)',
        opacity: isFadingOut ? 0 : 1
      }}
    >
      {/* =========================================================================
          TOP CANVAS: HERO ARTWORK SECTION (~350px)
          ========================================================================= */}
      <div
        style={{
          height: '350px',
          width: '100%',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#090A10',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '24px 28px',
          WebkitAppRegion: isStandaloneWindow ? 'drag' : undefined
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
            filter: 'brightness(0.95) contrast(1.05)',
            transform: 'scale(1.01)',
            transition: 'all 0.5s ease-out'
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1400&q=85';
          }}
        />

        {/* Cinematic Studio Overlays (Vignette & Readability Gradient) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, #18181B 0%, rgba(0, 0, 0, 0.25) 50%, rgba(0, 0, 0, 0.65) 100%)',
            pointerEvents: 'none'
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to right, rgba(0, 0, 0, 0.65) 0%, transparent 50%, rgba(0, 0, 0, 0.45) 100%)',
            pointerEvents: 'none'
          }}
        />

        {/* Top Header Bar: Emblem, Title & Action */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <MediaFlowBrandEmblem size={56} />

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1
                  style={{
                    fontSize: '24px',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    margin: 0,
                    letterSpacing: '-0.02em',
                    textShadow: '0 2px 8px rgba(0,0,0,0.6)'
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
                    background: 'rgba(255, 255, 255, 0.12)',
                    border: '1px solid rgba(255, 255, 255, 0.22)',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                  }}
                >
                  {versionText}
                </span>
              </div>
              <p
                style={{
                  fontSize: '12px',
                  color: 'rgba(244, 244, 245, 0.85)',
                  margin: '4px 0 0 0',
                  fontWeight: 500,
                  textShadow: '0 1px 4px rgba(0,0,0,0.6)'
                }}
              >
                {tagline}
              </p>
            </div>
          </div>

          {/* Skip / Close Button */}
          <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            {isModalPreview ? (
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
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                }}
              >
                <X size={16} />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: 'rgba(0, 0, 0, 0.45)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '10px',
                  fontWeight: 600,
                  fontFamily: 'monospace',
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#FFFFFF';
                  e.currentTarget.style.background = 'rgba(0, 102, 238, 0.85)';
                  e.currentTarget.style.borderColor = '#0066EE';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.45)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                Skip ➔
              </button>
            )}
          </div>
        </div>

        {/* Bottom Right: Artist Credit Capsule */}
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
            padding: '7px 14px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)'
          }}
        >
          <span
            style={{
              fontSize: '9px',
              fontFamily: 'monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: '#0066EE',
              fontWeight: 800
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
              letterSpacing: '-0.01em'
            }}
          >
            {artworkArtist}
          </span>
          {artworkTitle && (
            <span
              style={{
                fontSize: '10.5px',
                color: 'rgba(228, 228, 231, 0.75)',
                fontStyle: 'italic',
                fontWeight: 500
              }}
            >
              {artworkTitle}
            </span>
          )}
        </div>
      </div>

      {/* =========================================================================
          LOWER CANVAS: HIGH-END ADOBE PROGRESS & DIAGNOSTICS (~130px)
          ========================================================================= */}
      <div
        style={{
          height: '130px',
          backgroundColor: '#18181B',
          padding: '18px 28px 16px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        {/* Progress Bar & Diagnostics Row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Loader2
                size={14}
                color="#0066EE"
                style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}
              />
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: '#E4E4E7',
                  fontWeight: 500,
                  letterSpacing: '0.02em'
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
                fontSize: '12px'
              }}
            >
              <span style={{ color: '#A1A1AA' }}>Loading</span>
              <span style={{ color: '#0066EE', fontWeight: 800 }}>
                {Math.round(progress)}%
              </span>
            </div>
          </div>

          {/* Glowing Segmented Loader Bar with Shimmer Beam */}
          <div
            style={{
              width: '100%',
              height: '7px',
              borderRadius: '9999px',
              backgroundColor: '#09090B',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.8)'
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                borderRadius: '9999px',
                background: 'linear-gradient(90deg, #0052CC 0%, #0066EE 50%, #38BDF8 100%)',
                boxShadow: '0 0 14px rgba(0, 102, 238, 0.65)',
                transition: 'width 0.08s linear',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Moving Shimmer Sheen */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.85) 50%, transparent 100%)',
                  animation: 'shimmerSweep 1.2s infinite linear'
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
            fontFamily: 'monospace'
          }}
        >
          <span>
            {loaderConfig?.author ? (
              <>
                © 1990–2026 MediaFlow Studio Systems • Architect:{' '}
                <strong style={{ color: '#E4E4E7' }}>{loaderConfig.author}</strong>
                {loaderConfig.contactPhone && (
                  <span style={{ color: '#A1A1AA' }}> ({loaderConfig.contactPhone})</span>
                )}
              </>
            ) : (
              '© 1990–2026 MediaFlow Studio Systems Inc. All rights reserved.'
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
                animation: 'pulse 1.8s infinite'
              }}
            />
            <span style={{ color: '#A1A1AA', fontWeight: 600 }}>
              {loaderConfig ? 'ANYTHING SYNCED' : 'DirectX 12 GPU'} • Build 2026.10
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Modal Preview Mode in Settings Page
  if (isModalPreview) {
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
          animation: 'fadeIn 0.2s ease'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) handleFinish();
        }}
      >
        {cardContent}
      </div>
    );
  }

  // Standalone Transparent Window Mode
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        backgroundColor: 'transparent',
        margin: 0,
        padding: 0
      }}
    >
      {cardContent}
    </div>
  );
};
