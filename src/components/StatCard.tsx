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
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 14,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 16,
        border: `1px solid ${isHovered ? `${accentColor}55` : 'var(--border)'}`,
        background: `radial-gradient(circle at 90% 10%, ${accentColor}12 0%, var(--surface-card) 65%)`,
        boxShadow: isHovered
          ? `0 14px 30px -4px ${accentColor}18, var(--shadow-card)`
          : 'var(--shadow-card)',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Specular top glow line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent 0%, ${accentColor} 50%, transparent 100%)`,
          opacity: isHovered ? 0.9 : 0.4,
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* Ambient background glow orb */}
      <div
        style={{
          position: 'absolute',
          top: -25,
          right: -25,
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}20 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Header Row: Icon + Label + Tag */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: `${accentColor}18`,
              border: `1px solid ${accentColor}35`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: accentColor,
              flexShrink: 0,
              boxShadow: `0 2px 10px ${accentColor}20`,
              transform: isHovered ? 'scale(1.05)' : 'scale(1)',
              transition: 'transform 0.2s ease',
            }}
          >
            {icon}
          </div>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: 'var(--secondary-label)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {label}
          </span>
        </div>

        {tag && (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 6,
              fontSize: 9.5,
              fontWeight: 800,
              color: accentColor,
              backgroundColor: `${accentColor}15`,
              border: `1px solid ${accentColor}35`,
              letterSpacing: '0.05em',
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'nowrap',
              boxShadow: isHovered ? `0 0 10px ${accentColor}30` : 'none',
              transition: 'box-shadow 0.2s ease',
            }}
          >
            {tag}
          </span>
        )}
      </div>

      {/* Value & Subtitle */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            fontFamily: 'var(--font-display)',
            color: 'var(--label)',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}
        >
          {value}
        </div>
        {subValue && (
          <div
            style={{
              fontSize: 11.5,
              color: 'var(--secondary-label)',
              marginTop: 4,
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
