import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'danger' | 'warning' | 'info';
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastNotificationProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        zIndex: 99999,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    // Increase duration slightly for danger/warning so user can read numerical diagnostics
    const duration = toast.type === 'danger' ? 7000 : toast.type === 'warning' ? 5500 : 4000;
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const getConfig = () => {
    switch (toast.type) {
      case 'success':
        return {
          icon: CheckCircle2,
          color: 'var(--system-green)',
          bg: 'var(--success-soft)',
          border: 'rgba(52, 199, 89, 0.35)',
          glow: 'rgba(52, 199, 89, 0.15)',
          badgeText: 'SUCCESS',
        };
      case 'danger':
        return {
          icon: AlertCircle,
          color: 'var(--system-red)',
          bg: 'var(--danger-soft)',
          border: 'rgba(255, 69, 58, 0.45)',
          glow: 'rgba(255, 69, 58, 0.2)',
          badgeText: 'ERROR',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'var(--system-orange)',
          bg: 'var(--warning-soft)',
          border: 'rgba(255, 159, 10, 0.4)',
          glow: 'rgba(255, 159, 10, 0.18)',
          badgeText: 'WARNING',
        };
      case 'info':
      default:
        return {
          icon: Info,
          color: 'var(--system-cyan)',
          bg: 'var(--info-soft)',
          border: 'rgba(112, 215, 255, 0.35)',
          glow: 'rgba(112, 215, 255, 0.15)',
          badgeText: 'NOTICE',
        };
    }
  };

  const { icon: Icon, color, bg, border, glow, badgeText } = getConfig();

  // Highlight numerical statistics or code tokens if present in text
  const renderFormattedText = (text: string) => {
    return text;
  };

  return (
    <div
      className="glass-card"
      style={{
        pointerEvents: 'auto',
        minWidth: 320,
        maxWidth: 460,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        border: `1px solid ${border}`,
        backgroundColor: 'var(--surface-elevated)',
        boxShadow: `0 12px 32px rgba(0, 0, 0, 0.25), 0 0 16px ${glow}`,
        borderRadius: 12,
        animation: 'beaconPulse 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: `1px solid ${color}40`,
        }}
      >
        <Icon size={17} color={color} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 800,
              letterSpacing: 0.8,
              padding: '1px 5px',
              borderRadius: 4,
              backgroundColor: bg,
              color: color,
              border: `1px solid ${color}50`,
            }}
          >
            {badgeText}
          </span>
        </div>
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 500,
            lineHeight: 1.45,
            color: 'var(--label)',
            wordBreak: 'break-word',
          }}
        >
          {renderFormattedText(toast.text)}
        </span>

        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick();
              onDismiss(toast.id);
            }}
            style={{
              alignSelf: 'flex-start',
              marginTop: 4,
              padding: '3px 8px',
              borderRadius: 6,
              border: `1px solid ${color}60`,
              backgroundColor: bg,
              color: color,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--tertiary-label)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 4,
          borderRadius: 4,
        }}
        title="Dismiss Alert"
      >
        <X size={15} />
      </button>
    </div>
  );
};
