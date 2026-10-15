import React, { useState, useEffect } from 'react';
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
  { label: 'DataFlow Studio Environment Ready', threshold: 100 },
];

export const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({
  onComplete,
  minDurationMs = 1200,
  forcedTemplateId,
}) => {
  const [progress, setProgress] = useState(8);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const { theme } = useTheme();

  const [selectedTemplateId, setSelectedTemplateId] = useState<LoadingTemplateId>(() => {
    if (forcedTemplateId) return forcedTemplateId;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dataflow_loading_screen_template') as LoadingTemplateId;
      if (saved) return saved;
    }
    return 'flagship';
  });

  useEffect(() => {
    if (forcedTemplateId) {
      setSelectedTemplateId(forcedTemplateId);
    }
  }, [forcedTemplateId]);

  useEffect(() => {
    // Notify index.html splash to hide as React has taken over
    if (typeof window !== 'undefined' && (window as any).hideAppSplash) {
      (window as any).hideAppSplash();
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rawPct = Math.min(100, Math.round((elapsed / minDurationMs) * 100));

      setProgress(rawPct);

      if (rawPct >= 85) setCurrentStepIndex(3);
      else if (rawPct >= 55) setCurrentStepIndex(2);
      else if (rawPct >= 25) setCurrentStepIndex(1);
      else setCurrentStepIndex(0);

      if (rawPct >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            onComplete?.();
          }, 350);
        }, 150);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [minDurationMs, onComplete]);

  const isLight = theme === 'light';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: isLight ? '#eceff5' : '#131722',
        transition: 'opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isFadingOut ? 0 : 1,
        pointerEvents: isFadingOut ? 'none' : 'auto',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {renderLoadingTemplate(selectedTemplateId, {
        progress,
        currentStepIndex,
        statusLabel: BOOT_STEPS[currentStepIndex].label,
        isLight,
        isFadingOut,
        onComplete,
      })}
    </div>
  );
};
