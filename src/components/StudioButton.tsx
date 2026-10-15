import React from 'react';

interface StudioButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'glass' | 'danger' | 'success' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
}

export const StudioButton: React.FC<StudioButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled,
  style,
  ...props
}) => {
  const getStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: 'linear-gradient(135deg, #00F2FE 0%, #0A84FF 100%)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 4px 18px rgba(0, 242, 254, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
        };
      case 'success':
        return {
          background: 'linear-gradient(135deg, #10E79D 0%, #059669 100%)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 4px 18px rgba(16, 231, 157, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
        };
      case 'danger':
        return {
          background: 'linear-gradient(135deg, #FF453A 0%, #DC2626 100%)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 4px 18px rgba(255, 69, 58, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
        };
      case 'glass':
        return {
          background: 'var(--surface-elevated)',
          color: 'var(--label)',
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        };
      case 'secondary':
      default:
        return {
          background: 'var(--surface-card)',
          color: 'var(--secondary-label)',
          border: '1px solid var(--border)',
          boxShadow: 'none',
        };
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return { height: 32, padding: '0 12px', fontSize: 11, borderRadius: 8 };
      case 'lg':
        return { height: 46, padding: '0 22px', fontSize: 13.5, borderRadius: 12 };
      case 'md':
      default:
        return { height: 38, padding: '0 16px', fontSize: 12.5, borderRadius: 10 };
    }
  };

  const btnStyle = getStyles();
  const pad = getPadding();

  return (
    <button
      disabled={disabled || loading}
      className="btn-tactile"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: pad.height,
        padding: pad.padding,
        fontSize: pad.fontSize,
        fontWeight: 700,
        fontFamily: 'inherit',
        letterSpacing: 0.2,
        borderRadius: pad.borderRadius,
        background: btnStyle.background,
        color: btnStyle.color,
        border: btnStyle.border,
        boxShadow: btnStyle.boxShadow,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        outline: 'none',
        position: 'relative',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          if (variant === 'glass') {
            e.currentTarget.style.borderColor = 'var(--border-hover)';
            e.currentTarget.style.backgroundColor = 'var(--surface-card-hover)';
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.transform = 'translateY(0px)';
          if (variant === 'glass') {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
          }
        }
      }}
      {...props}
    >
      {loading ? (
        <div
          style={{
            width: 14,
            height: 14,
            border: '2px solid rgba(255,255,255,0.3)',
            borderTopColor: '#ffffff',
            borderRadius: '50%',
            animation: 'beaconPulse 0.8s infinite linear',
          }}
        />
      ) : (
        icon
      )}
      {children}
    </button>
  );
};
