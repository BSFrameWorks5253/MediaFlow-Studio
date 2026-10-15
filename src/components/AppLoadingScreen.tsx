import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  LoadingTemplateId,
  renderLoadingTemplate,
} from './loading-templates';

interface AppLoadingScreenProps {
  onComplete?: () => void;
  minDurationMs?: number;
  forcedTemplateId?: LoadingTemplateId;
}

const BOOT_STEPS = [
  { label: 'Initializing High-Speed Engine Bridge & IPC...', threshold: 25 },
  { label: 'Calibrating Storage & Media Drive Monitors...', threshold: 55 },
  { label: 'Loading Sequence Automation Presets...', threshold: 85 },
  { label: 'MediaFlow Studio Environment Ready', threshold: 100 },
];

export const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({
  onComplete,
  minDurationMs = 5200,
  forcedTemplateId,
}) => {
  const [progress, setProgress] = useState(8);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [contentDismissed, setContentDismissed] = useState(false);
  const [curtainDismissed, setCurtainDismissed] = useState(false);
  const { theme } = useTheme();

  const dismissedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [selectedTemplateId, setSelectedTemplateId] = useState<LoadingTemplateId>(() => {
    if (forcedTemplateId) return forcedTemplateId;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dataflow_loading_screen_template') as LoadingTemplateId;
      if (saved) return saved;
    }
    return 'onto';
  });

  useEffect(() => {
    if (forcedTemplateId) {
      setSelectedTemplateId(forcedTemplateId);
    }
  }, [forcedTemplateId]);

  // Cinematic 3-Stage Studio Warp Entrance:
  // Stage 1: Loader executes 3D card separation, header elevation, and anamorphic flare sweep (0 - 240ms)
  // Stage 2: Background curtain smoothly expands and dissolves into workspace with subtle optical blur (240ms - 560ms)
  // Stage 3: Clean complete handoff to main studio shell (560ms)
  const triggerDismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setProgress(100);
    setCurrentStepIndex(3);
    setContentDismissed(true);

    setTimeout(() => {
      setCurtainDismissed(true);
      setTimeout(() => {
        onCompleteRef.current?.();
      }, 340);
    }, 240);
  }, []);

  // Keyboard instant skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Space' || e.key === 'Enter') {
        triggerDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerDismiss]);

  useEffect(() => {
    // Notify index.html splash to hide as React has taken over
    if (typeof window !== 'undefined' && (window as any).hideAppSplash) {
      (window as any).hideAppSplash();
    }

    if (dismissedRef.current) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      if (dismissedRef.current) {
        clearInterval(interval);
        return;
      }

      const elapsed = Date.now() - startTime;
      const rawPct = Math.min(100, Math.round((elapsed / minDurationMs) * 100));

      setProgress((prev) => Math.max(prev, rawPct));

      if (rawPct >= 85) setCurrentStepIndex(3);
      else if (rawPct >= 55) setCurrentStepIndex(2);
      else if (rawPct >= 25) setCurrentStepIndex(1);
      else setCurrentStepIndex(0);

      if (rawPct >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          triggerDismiss();
        }, 120);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [minDurationMs, triggerDismiss]);

  const isLight = theme === 'light';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: isLight ? '#FFFFFF' : '#06080F',
        transition: 'opacity 0.44s cubic-bezier(0.16, 1, 0.3, 1), transform 0.44s cubic-bezier(0.16, 1, 0.3, 1), filter 0.44s ease',
        opacity: curtainDismissed ? 0 : 1,
        transform: curtainDismissed ? 'scale(1.06)' : 'scale(1)',
        filter: curtainDismissed ? 'blur(12px)' : 'none',
        pointerEvents: contentDismissed ? 'none' : 'auto',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {renderLoadingTemplate(selectedTemplateId, {
        progress,
        currentStepIndex,
        statusLabel: BOOT_STEPS[currentStepIndex].label,
        isLight,
        isFadingOut: contentDismissed,
        onComplete: triggerDismiss,
      })}
    </div>
  );
};
