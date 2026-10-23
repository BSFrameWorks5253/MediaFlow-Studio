import React, { useState, useEffect, useMemo } from 'react';
import { X, Loader2 } from 'lucide-react';
import { MediaFlowLogo } from './MediaFlowLogo';

export interface AnythingLoaderConfig {
  appId?: string;
  productName?: string;
  versionText?: string;
  tagline?: string;
  artworkUrl?: string;
  artistName?: string;
  artworkTitle?: string;
  durationMs?: number;
  logoText?: string;
  badgeGradient?: string;
  steps?: string[];
  author?: string;
  contactPhone?: string;
}

interface AdobeSplashScreenProps {
  isStandaloneWindow?: boolean;
  onFinish?: () => void;
  onClose?: () => void;
}

const DEFAULT_STEPS = [
  'Initializing Direct3D media acceleration engine...',
  'Loading RAW ingestion pipelines & camera profiles...',
  'Verifying PV separation & thumbnail caches...',
  'Syncing with Anything Ecosystem...',
  'Starting MediaFlow Studio...'
];

export const AdobeSplashScreen: React.FC<AdobeSplashScreenProps> = ({
  isStandaloneWindow = false,
  onFinish,
  onClose
}) => {
  const [loaderConfig, setLoaderConfig] = useState<AnythingLoaderConfig | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [isDone, setIsDone] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchConfig = async () => {
      try {
        if ((window as any).api?.getSplashLoaderConfig) {
          const cfg = await (window as any).api.getSplashLoaderConfig();
          if (isMounted && cfg) setLoaderConfig(cfg);
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
    return () => {
      isMounted = false;
    };
  }, []);

  const diagnosticSteps = useMemo(() => {
    if (loaderConfig?.steps && Array.isArray(loaderConfig.steps) && loaderConfig.steps.length > 0) {
      return loaderConfig.steps;
    }
    return DEFAULT_STEPS;
  }, [loaderConfig]);

  const totalDurationMs = useMemo(() => {
    if (loaderConfig?.durationMs && typeof loaderConfig.durationMs === 'number' && loaderConfig.durationMs > 0) {
      return loaderConfig.durationMs;
    }
    return 2800;
  }, [loaderConfig]);

  const handleFinish = () => {
    if (isDone) return;
    setIsDone(true);
    setIsFadingOut(true);

    setTimeout(() => {
      if (onFinish) {
        onFinish();
      } else if (isStandaloneWindow) {
        if ((window as any).api?.notifySplashDone) {
          (window as any).api.notifySplashDone();
        }
      } else if (onClose) {
        onClose();
      }
    }, 250);
  };

  // Progress Bar & Step progression
  useEffect(() => {
    const startTime = performance.now();
    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const currentProgress = Math.min(100, (elapsed / totalDurationMs) * 100);
      setProgress(currentProgress);

      const targetStep = Math.min(
        diagnosticSteps.length - 1,
        Math.floor((currentProgress / 100) * diagnosticSteps.length)
      );
      setStepIndex(targetStep);

      if (elapsed >= totalDurationMs) {
        clearInterval(interval);
        handleFinish();
      }
    }, 16);

    return () => clearInterval(interval);
  }, [totalDurationMs, diagnosticSteps]);

  const artworkUrl =
    loaderConfig?.artworkUrl ||
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1400&q=85';

  return (
    <div
      style={
        {
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isStandaloneWindow ? '#07090E' : 'rgba(0, 0, 0, 0.75)',
          backdropFilter: isStandaloneWindow ? 'none' : 'blur(20px)',
          zIndex: 99999,
          opacity: isFadingOut ? 0 : 1,
          transition: 'opacity 250ms ease-out',
          userSelect: 'none',
          WebkitAppRegion: 'drag'
        } as React.CSSProperties
      }
    >
      {/* 740x480 Glass Window Shell */}
      <div
        style={
          {
            width: '740px',
            height: '480px',
            position: 'relative',
            borderRadius: '24px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#090D1A',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(0, 242, 254, 0.3)',
            WebkitAppRegion: 'no-drag'
          } as React.CSSProperties
        }
      >
        {/* Background Artwork Image with Subtle Zoom Animation */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${artworkUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.65) saturate(1.2)',
            transform: 'scale(1.04)',
            transition: 'transform 4s ease-out'
          }}
        />

        {/* Ambient Gradient Glass Overlays */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, rgba(9, 13, 26, 0.92) 0%, rgba(13, 33, 73, 0.75) 50%, rgba(0, 242, 254, 0.25) 100%)'
          }}
        />

        {/* Top Header Bar */}
        <div
          style={
            {
              position: 'relative',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '24px 28px 12px 28px',
              WebkitAppRegion: 'drag'
            } as React.CSSProperties
          }
        >
          {/* Brand Insignia & Titles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <MediaFlowLogo size={52} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    color: '#F8FAFC',
                    fontSize: '20px',
                    fontWeight: 800,
                    letterSpacing: '-0.5px',
                    fontFamily: 'Inter, system-ui, sans-serif'
                  }}
                >
                  {loaderConfig?.productName || 'MediaFlow Studio'}
                </span>
                <span
                  style={{
                    backgroundColor: 'rgba(0, 242, 254, 0.15)',
                    color: '#00F2FE',
                    border: '1px solid rgba(0, 242, 254, 0.3)',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontFamily: 'JetBrains Mono, monospace'
                  }}
                >
                  {loaderConfig?.versionText || 'v6.0.0 (x64)'}
                </span>
              </div>
              <p
                style={{
                  color: '#94A3B8',
                  fontSize: '12px',
                  marginTop: '2px',
                  fontWeight: 500,
                  maxWidth: '460px'
                }}
              >
                {loaderConfig?.tagline ||
                  'Professional Media Ingestion, Synchronization and Report Fusion Desktop Suite'}
              </p>
            </div>
          </div>

          {/* Close / Skip Button */}
          {!isStandaloneWindow && (
            <button
              onClick={handleFinish}
              style={
                {
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#CBD5E1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  WebkitAppRegion: 'no-drag'
                } as React.CSSProperties
              }
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Center Space */}
        <div style={{ flex: 1 }} />

        {/* Bottom Section: Progress Bar & Diagnostics */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            padding: '24px 28px 28px 28px',
            background:
              'linear-gradient(to top, rgba(7, 9, 14, 0.95) 0%, rgba(7, 9, 14, 0.6) 80%, transparent 100%)'
          }}
        >
          {/* Diagnostics Step Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Loader2 size={14} className="animate-spin" style={{ color: '#00F2FE' }} />
              <span
                style={{
                  color: '#E2E8F0',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  fontFamily: 'Inter, system-ui, sans-serif'
                }}
              >
                {diagnosticSteps[stepIndex] || 'Initializing system...'}
              </span>
            </div>
            <span
              style={{
                color: '#00F2FE',
                fontSize: '12px',
                fontWeight: 700,
                fontFamily: 'JetBrains Mono, monospace'
              }}
            >
              {Math.round(progress)}%
            </span>
          </div>

          {/* Progress Track */}
          <div
            style={{
              width: '100%',
              height: '5px',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              borderRadius: '999px',
              overflow: 'hidden',
              marginBottom: '16px'
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #007AFF 0%, #00F2FE 100%)',
                boxShadow: '0 0 12px rgba(0, 242, 254, 0.8)',
                transition: 'width 100ms linear'
              }}
            />
          </div>

          {/* Bottom Credits & Ecosystem Info */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: '#64748B'
            }}
          >
            <div>
              <span>Artwork: </span>
              <strong style={{ color: '#94A3B8' }}>
                {loaderConfig?.artworkTitle || 'Prismatic Flow & Refraction'}
              </strong>
              <span> by </span>
              <span style={{ color: '#00F2FE' }}>
                {loaderConfig?.artistName || 'Anything Creation'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>
                Architect:{' '}
                <strong style={{ color: '#E2E8F0' }}>
                  {loaderConfig?.author || 'Burhanuddin Sounasath'}
                </strong>
              </span>
              <span>•</span>
              <span style={{ color: '#38BDF8' }}>Anything Creative Suite</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdobeSplashScreen;
