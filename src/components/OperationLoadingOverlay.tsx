import React from 'react';
import { StudioButton } from './StudioButton';
import { X, RefreshCw } from 'lucide-react';

interface OperationLoadingOverlayProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  accentColor?: string;
  progress?: {
    current: number;
    total: number;
    unit?: string;
  };
  onCancel?: () => void;
}

export const OperationLoadingOverlay: React.FC<OperationLoadingOverlayProps> = ({
  isOpen,
  title,
  subtitle,
  accentColor = '#00F2FE',
  progress,
  onCancel,
}) => {
  if (!isOpen) return null;

  const percent =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(5, 7, 12, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.2s ease-out',
        padding: 24,
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 20,
          padding: '32px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 18,
          border: `1px solid ${accentColor}40`,
          boxShadow: `0 24px 60px rgba(0, 0, 0, 0.45), 0 0 35px ${accentColor}18`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Specular Top Glow */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          }}
        />

        {/* Dual Orbital Concentric Spinner */}
        <div
          style={{
            position: 'relative',
            width: 72,
            height: 72,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Outer Ring */}
          <div
            style={{
              position: 'absolute',
              width: 70,
              height: 70,
              borderRadius: '50%',
              border: `2.5px solid transparent`,
              borderTopColor: accentColor,
              borderRightColor: `${accentColor}80`,
              animation: 'studioSpin 1.1s linear infinite',
            }}
          />

          {/* Inner Counter-Ring */}
          <div
            style={{
              position: 'absolute',
              width: 50,
              height: 50,
              borderRadius: '50%',
              border: `2px solid transparent`,
              borderBottomColor: accentColor,
              borderLeftColor: `${accentColor}60`,
              animation: 'studioSpinReverse 0.85s linear infinite',
            }}
          />

          {/* Core Pulsing Center */}
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: `${accentColor}25`,
              border: `1.5px solid ${accentColor}`,
              boxShadow: `0 0 16px ${accentColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: accentColor,
                animation: 'studioPulse 1.4s ease-in-out infinite',
              }}
            />
          </div>
        </div>

        {/* Labels & Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
          <div
            style={{
              fontSize: 15.5,
              fontWeight: 800,
              letterSpacing: 0.3,
              color: 'var(--label)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--secondary-label)',
                lineHeight: 1.5,
                padding: '0 8px',
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        {/* Progress Bar / Indeterminate Shimmer */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          <div
            style={{
              width: '100%',
              height: 6,
              borderRadius: 999,
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {percent !== null ? (
              <div
                style={{
                  height: '100%',
                  width: `${percent}%`,
                  borderRadius: 999,
                  background: `linear-gradient(90deg, ${accentColor}cc, ${accentColor})`,
                  boxShadow: `0 0 10px ${accentColor}`,
                  transition: 'width 0.25s ease-out',
                }}
              />
            ) : (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  width: '40%',
                  borderRadius: 999,
                  background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                  animation: 'shimmer 1.4s infinite linear',
                }}
              />
            )}
          </div>

          {percent !== null && progress && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                color: 'var(--tertiary-label)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <span>
                {progress.current.toLocaleString()} / {progress.total.toLocaleString()} {progress.unit || 'items'}
              </span>
              <span style={{ color: accentColor, fontWeight: 700 }}>{percent}%</span>
            </div>
          )}
        </div>

        {/* Cancel Action (if permitted) */}
        {onCancel && (
          <StudioButton
            variant="glass"
            size="sm"
            onClick={onCancel}
            icon={<X size={13} />}
            style={{ marginTop: 4, fontSize: 11.5 }}
          >
            Cancel Operation
          </StudioButton>
        )}
      </div>
    </div>
  );
};
