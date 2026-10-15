export interface LoadingTemplateProps {
  progress: number;
  currentStepIndex: number;
  statusLabel: string;
  isLight: boolean;
  isFadingOut?: boolean;
  onComplete?: () => void;
  interactiveMode?: boolean;
}

export type LoadingTemplateId =
  | 'flagship'
  | 'astral'
  | 'walbi'
  | 'cosmos'
  | 'aircord'
  | 'mobbin-pill'
  | 'mobbin-sheet';

export interface LoadingTemplateInfo {
  id: LoadingTemplateId;
  name: string;
  subtitle: string;
  inspiration: string;
  description: string;
  accentColor: string;
  badge: string;
}

export const LOADING_TEMPLATES_CATALOG: LoadingTemplateInfo[] = [
  {
    id: 'flagship',
    name: 'DataFlow Flagship Studio',
    subtitle: 'The Ultimate Hybrid Master Preloader',
    inspiration: 'Cyber Glassmorphism + Kinetic Fluid Precision',
    description: 'Bespoke high-performance desktop preloader blending glowing dual orbital rings, live hardware diagnostics, step badges, and soothing off-white light/dark adaptation.',
    accentColor: '#00F2FE',
    badge: 'FLAGSHIP DEFAULT',
  },
  {
    id: 'astral',
    name: 'Astral Frontier',
    subtitle: 'Cosmic HUD & Orbital Coordinates',
    inspiration: 'Awwwards Astral Frontier Preloader',
    description: 'Sci-fi orbital trajectory rings, precision compass reticles, floating quantum telemetry particles, and cinematic sub-millisecond status readouts.',
    accentColor: '#8B5CF6',
    badge: 'AWWWARDS SCI-FI',
  },
  {
    id: 'walbi',
    name: 'Walbi Kinetic',
    subtitle: 'Fluid Fintech & Dynamic Gradient Wave',
    inspiration: 'Awwwards Walbi Intro Animation',
    description: 'High-energy liquid morphing badge, oversized typography percentage counter, dynamic multi-stop gradient wave, and pulsating energy glow.',
    accentColor: '#00F2FE',
    badge: 'AWWWARDS KINETIC',
  },
  {
    id: 'cosmos',
    name: 'Cosmos Studio / Spasoje',
    subtitle: 'Architectural Editorial Minimalism',
    inspiration: 'Awwwards Cosmos Studio & Spasoje Perovic',
    description: 'Minimalist editorial composition with precision corner brackets [+], hairline expanding progress rule, mono index counter [01 // 04], and haute-couture typography.',
    accentColor: '#10B981',
    badge: 'EDITORIAL MINIMAL',
  },
  {
    id: 'aircord',
    name: 'Aircord Cyber Grid',
    subtitle: 'Audio-Visualizer & Reactive Grid',
    inspiration: 'Awwwards Aircord Creative Tech Preloader',
    description: 'Dynamic 24-channel frequency equalizer bars dancing algorithmically, hex memory diagnostics, radar telemetry ping, and laser scan line.',
    accentColor: '#EC4899',
    badge: 'CREATIVE TECH',
  },
  {
    id: 'mobbin-pill',
    name: 'Mobbin Dynamic Pill',
    subtitle: 'Mobile Dynamic Island Adapted for Desktop',
    inspiration: 'Mobbin Mobile Screen 2847f828',
    description: 'Mobile-first floating frosted island pill adapted into an ultra-smooth desktop experience. Spring-expanded pill with spinning glyph and haptic dots.',
    accentColor: '#3B82F6',
    badge: 'MOBILE ISLAND',
  },
  {
    id: 'mobbin-sheet',
    name: 'Mobbin Studio Sheet',
    subtitle: 'Floating Card & Live Step Checklist',
    inspiration: 'Mobbin Mobile Screen 3573c390',
    description: 'Elevated mobile sheet card on desktop canvas featuring circular SVG radial progress, animated step checkmarks as subsystems initialize, and tactile footer badge.',
    accentColor: '#10E79D',
    badge: 'MOBILE ONBOARDING',
  },
];
