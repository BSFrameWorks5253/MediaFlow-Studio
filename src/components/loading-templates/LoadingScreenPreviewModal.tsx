import React, { useState, useEffect } from 'react';
import { X, Play, RotateCcw, Check, Sparkles, Moon, Sun, Monitor, Smartphone } from 'lucide-react';
import {
  LoadingTemplateId,
  LOADING_TEMPLATES_CATALOG,
  LoadingTemplateInfo,
} from './types';
import { renderLoadingTemplate } from './index';

interface LoadingScreenPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSelectedId: LoadingTemplateId;
  onSelectTemplate: (id: LoadingTemplateId) => void;
  appTheme: 'light' | 'dark';
}

export const LoadingScreenPreviewModal: React.FC<LoadingScreenPreviewModalProps> = ({
  isOpen,
  onClose,
  currentSelectedId,
  onSelectTemplate,
  appTheme,
}) => {
  const [activePreviewId, setActivePreviewId] = useState<LoadingTemplateId>(currentSelectedId);
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>(appTheme);
  const [simulatedProgress, setSimulatedProgress] = useState<number>(45);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Sync theme when modal opens
  useEffect(() => {
    if (isOpen) {
      setActivePreviewId(currentSelectedId);
      setPreviewTheme(appTheme);
      setSimulatedProgress(10);
      setIsPlaying(true);
    }
  }, [isOpen, currentSelectedId, appTheme]);

  // Simulation loop for live animation preview
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    const interval = setInterval(() => {
      setSimulatedProgress((prev) => {
        if (prev >= 100) return 0;
        return Math.min(100, prev + 2);
      });
    }, 45);

    return () => clearInterval(interval);
  }, [isOpen, isPlaying]);

  if (!isOpen) return null;

  const currentTemplate =
    LOADING_TEMPLATES_CATALOG.find((t) => t.id === activePreviewId) ||
    LOADING_TEMPLATES_CATALOG[0];

  const currentStepIndex =
    simulatedProgress >= 85
      ? 3
      : simulatedProgress >= 55
      ? 2
      : simulatedProgress >= 25
      ? 1
      : 0;

  const handleApply = () => {
    onSelectTemplate(activePreviewId);
    onClose();
  };

  const isLight = previewTheme === 'light';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '94vw',
          maxWidth: 1180,
          height: '88vh',
          maxHeight: 760,
          borderRadius: 22,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 65px -15px rgba(0, 0, 0, 0.65)',
          border: '1px solid var(--border-glass)',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-elevated)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #00F2FE 0%, #8B5CF6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(0, 242, 254, 0.4)',
              }}
            >
              <Sparkles size={18} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--label)' }}>
                Loading Screen Studio & Template Selector
              </div>
              <div style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
                Inspired by Awwwards & Mobbin &bull; Accurate to your light and dark modes
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Theme Toggle for Preview */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 3,
                gap: 2,
              }}
            >
              <button
                onClick={() => setPreviewTheme('light')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 10px',
                  borderRadius: 7,
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: previewTheme === 'light' ? 'var(--accent)' : 'transparent',
                  color: previewTheme === 'light' ? '#FFFFFF' : 'var(--secondary-label)',
                  transition: 'all 0.2s',
                }}
              >
                <Sun size={13} />
                Soft Off-White
              </button>
              <button
                onClick={() => setPreviewTheme('dark')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 10px',
                  borderRadius: 7,
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: previewTheme === 'dark' ? 'var(--accent)' : 'transparent',
                  color: previewTheme === 'dark' ? '#000000' : 'var(--secondary-label)',
                  transition: 'all 0.2s',
                }}
              >
                <Moon size={13} />
                Slate Dark
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--secondary-label)',
                cursor: 'pointer',
                padding: 8,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body split: Sidebar list of 7 templates (left) + Live Interactive Viewport (right) */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left: Template Catalog Picker */}
          <div
            style={{
              width: 360,
              borderRight: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--surface)',
              overflowY: 'auto',
            }}
          >
            <div style={{ padding: '14px 16px 8px', fontSize: 11, fontWeight: 700, color: 'var(--tertiary-label)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Select Template ({LOADING_TEMPLATES_CATALOG.length})
            </div>

            <div style={{ padding: '0 12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {LOADING_TEMPLATES_CATALOG.map((tpl) => {
                const isSelected = tpl.id === activePreviewId;
                const isCurrentActive = tpl.id === currentSelectedId;

                return (
                  <div
                    key={tpl.id}
                    onClick={() => {
                      setActivePreviewId(tpl.id);
                      setSimulatedProgress(0);
                    }}
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      cursor: 'pointer',
                      border: isSelected
                        ? '1.5px solid var(--accent)'
                        : '1px solid var(--border)',
                      backgroundColor: isSelected
                        ? 'var(--surface-elevated)'
                        : 'transparent',
                      transition: 'all 0.18s ease',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          fontFamily: 'var(--font-mono)',
                          padding: '2px 7px',
                          borderRadius: 6,
                          backgroundColor: `${tpl.accentColor}20`,
                          color: tpl.accentColor,
                          border: `1px solid ${tpl.accentColor}40`,
                        }}
                      >
                        {tpl.badge}
                      </span>

                      {isCurrentActive && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: 'var(--success)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Check size={12} /> Active
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--label)' }}>
                      {tpl.name}
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--secondary-label)', lineHeight: 1.4 }}>
                      {tpl.subtitle}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Live Interactive Sandbox Viewport */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: previewTheme === 'light' ? '#eceff5' : '#10141f',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Viewport Header Controls */}
            <div
              style={{
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: previewTheme === 'light' ? '1px solid rgba(203, 213, 225, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
                zIndex: 10,
                background: previewTheme === 'light' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(18, 24, 36, 0.7)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: previewTheme === 'light' ? '#0f172a' : '#f8fafc',
                  }}
                >
                  {currentTemplate.name}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: previewTheme === 'light' ? '#64748b' : '#94a3b8',
                  }}
                >
                  &bull; {currentTemplate.inspiration}
                </span>
              </div>

              {/* Simulation Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => setIsPlaying((p) => !p)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface)',
                      color: 'var(--label)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Play size={11} fill={isPlaying ? 'currentColor' : 'none'} />
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>

                  <button
                    onClick={() => setSimulatedProgress(0)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface)',
                      color: 'var(--label)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <RotateCcw size={11} />
                    Reset
                  </button>
                </div>

                {/* Progress Scrubber Slider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={simulatedProgress}
                    onChange={(e) => {
                      setIsPlaying(false);
                      setSimulatedProgress(parseInt(e.target.value, 10));
                    }}
                    style={{ width: 100, accentColor: currentTemplate.accentColor, cursor: 'pointer' }}
                  />
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      fontWeight: 700,
                      color: currentTemplate.accentColor,
                      minWidth: 34,
                    }}
                  >
                    {simulatedProgress}%
                  </span>
                </div>
              </div>
            </div>

            {/* The Live Render Container */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              {renderLoadingTemplate(activePreviewId, {
                progress: simulatedProgress,
                currentStepIndex,
                statusLabel: 'Initializing Components...',
                isLight,
                interactiveMode: true,
              })}
            </div>

            {/* Bottom Actions Bar */}
            <div
              style={{
                padding: '14px 20px',
                borderTop: previewTheme === 'light' ? '1px solid rgba(203, 213, 225, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
                background: previewTheme === 'light' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(18, 24, 36, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 10,
              }}
            >
              <div style={{ fontSize: 11.5, color: previewTheme === 'light' ? '#475569' : '#94a3b8' }}>
                {currentTemplate.description}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={onClose}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    backgroundColor: 'transparent',
                    color: 'var(--label)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  onClick={handleApply}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'linear-gradient(135deg, #00F2FE 0%, #8B5CF6 100%)',
                    color: '#000000',
                    fontSize: 12.5,
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(0, 242, 254, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Check size={14} />
                  Select & Apply "{currentTemplate.name}"
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
