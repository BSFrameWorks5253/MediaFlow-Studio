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
    // Non-intrusive durations: quick 2.8s for success/info, 4s for warning, 5s for error
    const duration = toast.type === 'danger' ? 5000 : toast.type === 'warning' ? 4000 : 2800;
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
        minWidth: 260,
        maxWidth: 380,
        padding: '8px 11px',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        border: `1px solid ${border}`,
        backgroundColor: 'var(--surface-elevated)',
        boxShadow: `0 8px 24px rgba(0, 0, 0, 0.35), 0 0 12px ${glow}`,
        borderRadius: 8,
        animation: 'beaconPulse 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          backgroundColor: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: `1px solid ${color}40`,
        }}
      >
        <Icon size={13} color={color} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span
            style={{
              fontSize: 8.5,
              fontWeight: 800,
              letterSpacing: 0.6,
              padding: '1px 4px',
              borderRadius: 3,
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
            fontSize: 11.5,
            fontWeight: 500,
            lineHeight: 1.35,
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
