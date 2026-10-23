import React from 'react';

interface MediaFlowLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Adobe CC inspired mnemonic squircle logo for MediaFlow Studio ("Mf")
 * Matches Tap Studio & Anything App ecosystem aesthetics.
 */
export const MediaFlowLogo: React.FC<MediaFlowLogoProps> = ({
  size = 36,
  className = '',
  style = {}
}) => {
  return (
    <div
      className={`mediaflow-studio-logo ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        borderRadius: `${Math.round(size * 0.2)}px`,
        overflow: 'hidden',
        boxShadow: `0 ${Math.max(2, size * 0.08)}px ${Math.max(6, size * 0.2)}px rgba(0, 242, 254, 0.35)`,
        ...style
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', width: '100%', height: '100%' }}
      >
        <defs>
          <linearGradient id="adobeMfBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0B132B" />
            <stop offset="40%" stopColor="#0D2149" />
            <stop offset="80%" stopColor="#0066EE" />
            <stop offset="100%" stopColor="#00F2FE" />
          </linearGradient>

          <linearGradient id="adobeMfSpecular" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#00F2FE" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Squircle Adobe CC Mnemonic Background */}
        <rect width="100" height="100" rx="20" fill="url(#adobeMfBg)" />

        {/* Specular Inner Rim */}
        <rect
          x="1"
          y="1"
          width="98"
          height="98"
          rx="19"
          stroke="url(#adobeMfSpecular)"
          strokeWidth="2"
          fill="none"
        />

        {/* Specular Glass Sheen */}
        <path
          d="M0 25C15 23 35 30 50 22C65 14 85 20 100 17V0H0V25Z"
          fill="#FFFFFF"
          opacity="0.25"
        />

        {/* Adobe CC Bold Typographic Mnemonic "Mf" */}
        <text
          x="50"
          y="68"
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
          fontWeight="900"
          fontSize="48"
          letterSpacing="-1.8"
        >
          Mf
        </text>

        {/* Satellite Cyan Glow Dot */}
        <circle cx="78" cy="24" r="4.5" fill="#00F2FE" />
        <circle cx="78" cy="24" r="2" fill="#FFFFFF" />
      </svg>
    </div>
  );
};

export default MediaFlowLogo;
