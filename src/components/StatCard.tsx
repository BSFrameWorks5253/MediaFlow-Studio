import React, { useState } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  accentColor?: string;
  tag?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  icon,
  accentColor = '#00F2FE',
  tag,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="glass-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 12,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 14,
        borderColor: isHovered ? `${accentColor}40` : 'var(--border)',
        boxShadow: isHovered ? `0 8px 24px ${accentColor}12` : 'var(--shadow-card)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Background ambient radial glow for icon */}
      <div
        style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 90,
          height: 90,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}18 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Header Row: Icon + Label + Tag */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              backgroundColor: `${accentColor}14`,
              border: `1px solid ${accentColor}28`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: accentColor,
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--secondary-label)',
              letterSpacing: '0.01em',
            }}
          >
            {label}
          </span>
        </div>

        {tag && (
          <span
            style={{
              padding: '2px 7px',
              borderRadius: 6,
              fontSize: 9.5,
              fontWeight: 700,
              color: accentColor,
              backgroundColor: `${accentColor}12`,
              border: `1px solid ${accentColor}28`,
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
            }}
          >
            {tag}
          </span>
        )}
      </div>

      {/* Value & Subtitle */}
      <div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: 'var(--label)',
            letterSpacing: '-0.02em',
            lineHeight: 1.25,
          }}
        >
          {value}
        </div>
        {subValue && (
          <div
            style={{
              fontSize: 11.5,
              color: 'var(--tertiary-label)',
              marginTop: 3,
              fontWeight: 500,
              lineHeight: 1.4,
            }}
          >
            {subValue}
          </div>
        )}
      </div>
    </div>
  );
};
