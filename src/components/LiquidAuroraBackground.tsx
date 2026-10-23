import React from 'react';
import { useTheme } from '../context/ThemeContext';

export const LiquidAuroraBackground: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const orbOpacity = isLight ? 0.03 : 0.16;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
        backgroundColor: 'var(--system-bg)',
        contain: 'strict',
      }}
    >
      {/* Subtle Precision Matrix Grid Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: isLight
            ? `radial-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 1px)`
            : `radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
          opacity: 0.6,
        }}
      />

      {/* Orb 1: Violet Aurora Fluid Sphere (Top-Left) */}
      <div
        className="animate-orb-1"
        style={{
          position: 'absolute',
          width: '54vw',
          height: '54vw',
          minWidth: 480,
          minHeight: 480,
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--liquid-violet) 0%, transparent 70%)',
          opacity: orbOpacity,
          top: '-18%',
          left: '-12%',
          filter: 'blur(50px)',
          willChange: 'transform',
        }}
      />

      {/* Orb 2: Cyber Cyan Liquid Core (Bottom-Left) */}
      <div
        className="animate-orb-2"
        style={{
          position: 'absolute',
          width: '46vw',
          height: '46vw',
          minWidth: 420,
          minHeight: 420,
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--liquid-cyan) 0%, transparent 68%)',
          opacity: orbOpacity,
          bottom: '-15%',
          left: '8%',
          filter: 'blur(55px)',
          willChange: 'transform',
        }}
      />

      {/* Orb 3: Laser Rose Ethereal Light (Top-Right) */}
      <div
        className="animate-orb-3"
        style={{
          position: 'absolute',
          width: '48vw',
          height: '48vw',
          minWidth: 440,
          minHeight: 440,
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--liquid-rose) 0%, transparent 70%)',
          opacity: orbOpacity * 0.85,
          top: '-15%',
          right: '-10%',
          filter: 'blur(60px)',
          willChange: 'transform',
        }}
      />

      {/* Cinematic Vignette (Dark Mode only) */}
      {!isLight && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 50%, transparent 50%, rgba(0, 0, 0, 0.45) 100%)',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
};
