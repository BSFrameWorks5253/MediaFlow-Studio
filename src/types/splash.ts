export type SplashPresetId = 'abstract' | 'cosmic' | 'cyberpunk' | 'organic' | 'minimalist' | 'custom';
export type SplashSpeed = 'quick' | 'standard' | 'cinematic';

export interface AnythingLoaderConfig {
  appId?: string;
  productName?: string;
  versionText?: string;
  tagline?: string;
  artworkUrl?: string;
  artistName?: string;
  artworkTitle?: string;
  durationMs?: number;
  logoText?: string;
  badgeGradient?: string;
  artworkFit?: 'cover' | 'contain';
  artworkPosition?: 'center' | 'top' | 'bottom';
  steps?: string[];
  author?: string;
  contactPhone?: string;
}

export const cleanVersionText = (ver?: string): string => {
  if (!ver) return 'v26.10.26';
  const cleaned = ver
    .replace(/\s*\((?:x64|x86|x86_64|amd64|arm64|win32|ia32|64-bit|32-bit)\)/gi, '')
    .replace(/\s*[-_.]?\s*(?:x64|x86|x86_64|amd64|arm64|win32|ia32|64-bit|32-bit)\b/gi, '')
    .trim();
  return cleaned || 'v26.10.26';
};

export interface SplashSettings {
  presetId: SplashPresetId;
  imageUrl?: string;
  customImageUrl?: string;
  artistName: string;
  artworkTitle: string;
  productName?: string;
  versionText?: string;
  tagline?: string;
  speed: SplashSpeed;
}

export const DEFAULT_SPLASH_SETTINGS: SplashSettings = {
  presetId: 'abstract',
  imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1400&q=85',
  artistName: 'Adobe Creative Collective',
  artworkTitle: 'Refractive Glass in Motion',
  productName: 'MediaFlow Studio',
  versionText: '2026.1 Release • v26.10.26 (x64)',
  tagline: 'Professional Media Ingestion, Synchronization and Report Fusion Desktop Suite',
  speed: 'standard'
};

export const SPLASH_STORAGE_KEY = 'mediaflow_studio_splash_settings';

export function getStoredSplashSettings(): SplashSettings {
  try {
    const raw = localStorage.getItem(SPLASH_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_SPLASH_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_SPLASH_SETTINGS;
}

export function saveStoredSplashSettings(settings: SplashSettings): void {
  try {
    localStorage.setItem(SPLASH_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}
