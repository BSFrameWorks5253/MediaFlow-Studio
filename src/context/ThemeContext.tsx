import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'dark' | 'light';
export type AuroraPreset = 'obsidian' | 'sunset' | 'aurora' | 'titanium' | 'stealth';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  auroraPreset: AuroraPreset;
  setAuroraPreset: (preset: AuroraPreset) => void;
  zoomLevel: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('theme');
      if (t === 'light' || t === 'dark') return t;
    }
    return 'dark';
  });
  const [auroraPreset, setAuroraPresetState] = useState<AuroraPreset>('obsidian');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  useEffect(() => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const urlTheme = params ? params.get('theme') : null;

    // Initial load from Electron app config if available
    if (window.electronAPI && window.electronAPI.getConfig) {
      window.electronAPI.getConfig().then((cfg: any) => {
        if (cfg) {
          if (cfg.theme && !urlTheme) setThemeState(cfg.theme);
          if (cfg.auroraPreset) setAuroraPresetState(cfg.auroraPreset);
          if (cfg.zoomLevel) setZoomLevel(cfg.zoomLevel);
        }
      });
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-aurora', auroraPreset);
  }, [auroraPreset]);

  useEffect(() => {
    if (window.electronAPI && typeof window.electronAPI.setZoomFactor === 'function') {
      window.electronAPI.setZoomFactor(zoomLevel);
    }
  }, [zoomLevel]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    if (window.electronAPI) window.electronAPI.saveConfig({ theme: newTheme });
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  const setAuroraPreset = (preset: AuroraPreset) => {
    setAuroraPresetState(preset);
    if (window.electronAPI) window.electronAPI.saveConfig({ auroraPreset: preset });
  };

  const zoomIn = () => {
    setZoomLevel((z) => {
      const nz = +(Math.min(1.4, z + 0.05)).toFixed(2);
      if (window.electronAPI) window.electronAPI.saveConfig({ zoomLevel: nz });
      return nz;
    });
  };

  const zoomOut = () => {
    setZoomLevel((z) => {
      const nz = +(Math.max(0.75, z - 0.05)).toFixed(2);
      if (window.electronAPI) window.electronAPI.saveConfig({ zoomLevel: nz });
      return nz;
    });
  };

  const resetZoom = () => {
    setZoomLevel(1.0);
    if (window.electronAPI) window.electronAPI.saveConfig({ zoomLevel: 1.0 });
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        auroraPreset,
        setAuroraPreset,
        zoomLevel,
        zoomIn,
        zoomOut,
        resetZoom,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
