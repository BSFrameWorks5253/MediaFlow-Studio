import React from 'react';

interface MediaFlowLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Clean flat Adobe CC mnemonic squircle logo for MediaFlow Studio ("Ms")
 * Matches Anything App and Adobe CC design standards.
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
        boxShadow: `0 ${Math.max(2, size * 0.06)}px ${Math.max(4, size * 0.15)}px rgba(0, 102, 238, 0.3)`,
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
        {/* Flat Solid Background */}
        <rect width="100" height="100" rx="20" fill="#0066EE" />

        {/* Clean Bold Mnemonic "Ms" */}
        <text
          x="50"
          y="68"
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
          fontWeight="800"
          fontSize="50"
          letterSpacing="-1.5"
        >
          Ms
        </text>
      </svg>
    </div>
  );
};

export default MediaFlowLogo;
