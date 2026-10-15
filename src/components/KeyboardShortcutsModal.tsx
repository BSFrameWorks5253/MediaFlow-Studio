import React, { useEffect } from 'react';
import { Keyboard, X, ArrowRight, Zap } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcutGroups = [
    {
      title: 'Global Navigation & Speed',
      shortcuts: [
        { keys: ['Ctrl', 'K'], label: 'Open Command Palette / Spotlight Search' },
        { keys: ['?'], label: 'Toggle Keyboard Shortcuts Reference' },
        { keys: ['Esc'], label: 'Close Modals, Overlays & Dialogs' },
        { keys: ['Ctrl', '['], label: 'Navigate to Previous Pipeline Stage' },
        { keys: ['Ctrl', ']'], label: 'Navigate to Next Pipeline Stage' },
      ],
    },
    {
      title: 'Instant Stage Jumps',
      shortcuts: [
        { keys: ['Alt', '1'], label: 'Stage 00 • PV Separator (32x RAW Ingestion)' },
        { keys: ['Alt', '2'], label: 'Stage 01 • Upload Structure (Folder Setup)' },
        { keys: ['Alt', '3'], label: 'Stage 02 • Photo Status Tagger (_U & _R)' },
        { keys: ['Alt', '4'], label: 'Stage 03 • Remaining Shifter (Consolidation)' },
        { keys: ['Alt', '5'], label: 'Stage 04 • Sync Photo Video (Sequence Transfer)' },
        { keys: ['Alt', '6'], label: 'Stage 05 • Thumbnail Shifter (_P & _V)' },
        { keys: ['Alt', '7'], label: 'Stage 06 • DO NOT UPLOAD Folder Isolator' },
        { keys: ['Alt', '8'], label: 'Stage 07 • Event Image Shifter (Placards & Badges)' },
        { keys: ['Alt', '9'], label: 'Stage 08 • Report Merger (Delivery Package)' },
      ],
    },
    {
      title: 'View & Interface Zoom',
      shortcuts: [
        { keys: ['Ctrl', '+'], label: 'Zoom In Interface' },
        { keys: ['Ctrl', '-'], label: 'Zoom Out Interface' },
        { keys: ['Ctrl', '0'], label: 'Reset Interface Zoom to 100%' },
        { keys: ['Ctrl', 'Shift', 'T'], label: 'Toggle Light / Dark Master Mode' },
        { keys: ['Ctrl', 'Shift', 'P'], label: 'Open Studio Preferences' },
      ],
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 99999,
        animation: 'beaconPulse 0.18s ease-out',
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: 680,
          maxHeight: '85vh',
          borderRadius: 20,
          border: '1px solid rgba(0, 242, 254, 0.35)',
          backgroundColor: 'rgba(12, 16, 26, 0.95)',
          boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.7), 0 0 35px rgba(0, 242, 254, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                backgroundColor: 'rgba(0, 242, 254, 0.15)',
                border: '1px solid rgba(0, 242, 254, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00F2FE',
              }}
            >
              <Keyboard size={16} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--label)', fontFamily: 'var(--font-display)' }}>
                DataFlow Studio Speed Keys
              </div>
              <div style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
                High-productivity keyboard shortcuts for media editors & engineers
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-tactile"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--tertiary-label)',
              cursor: 'pointer',
              display: 'flex',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {shortcutGroups.map((group, gIdx) => (
            <div key={gIdx} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: 1.2,
                  color: '#00F2FE',
                  textTransform: 'uppercase',
                }}
              >
                {group.title}
              </span>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  backgroundColor: 'var(--surface-elevated)',
                  borderRadius: 12,
                  padding: 8,
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {group.shortcuts.map((sc, sIdx) => (
                  <div
                    key={sIdx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 8,
                    }}
                  >
                    <span style={{ fontSize: 12.5, color: 'var(--label)', fontWeight: 500 }}>
                      {sc.label}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {sc.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          style={{
                            fontSize: 10.5,
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 800,
                            padding: '3px 7px',
                            borderRadius: 6,
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#ffffff',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                          }}
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 22px',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'var(--secondary-label)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={13} color="#00F2FE" />
            <span>Power Tip: Press <strong style={{ color: 'var(--label)' }}>Alt + 1-9</strong> anywhere to jump stages instantly</span>
          </div>

          <kbd
            style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              padding: '2px 6px',
              borderRadius: 4,
              backgroundColor: 'var(--border-subtle)',
              border: '1px solid var(--border)',
              color: 'var(--tertiary-label)',
            }}
          >
            ESC to close
          </kbd>
        </div>
      </div>
    </div>
  );
};
