import { SplashPresetId } from '../types/splash';

export interface PresetDefinition {
  id: SplashPresetId;
  name: string;
  artist: string;
  title: string;
  category: string;
  accentColor: string;
  badge: string;
  imageUrl: string;
}

export const SPLASH_PRESETS: PresetDefinition[] = [
  {
    id: 'abstract',
    name: 'Liquid Spectrum 2026',
    artist: 'Adobe Creative Collective',
    title: 'Refractive Glass in Motion',
    category: 'Abstract 3D',
    accentColor: '#0066EE',
    badge: '3D Refraction',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1400&q=85'
  },
  {
    id: 'cosmic',
    name: 'Cosmic Nebula Core',
    artist: 'Elena Rostova',
    title: 'Interstellar Luminescence',
    category: 'Cosmic & Fluid',
    accentColor: '#818CF8',
    badge: 'Astrophotography',
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1400&q=85'
  },
  {
    id: 'cyberpunk',
    name: 'Neo Shinjuku Pulse',
    artist: 'Kenji Takahashi',
    title: 'Bioluminescent Architecture',
    category: 'Digital Futurism',
    accentColor: '#06B6D4',
    badge: 'Sci-Fi Cyberpunk',
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1400&q=85'
  },
  {
    id: 'organic',
    name: 'Chromatic Flora',
    artist: 'Maya Lin Studios',
    title: 'Bioluminescent Petals & Glass',
    category: 'Botanical & Organic',
    accentColor: '#10B981',
    badge: 'Generative Nature',
    imageUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1400&q=85'
  },
  {
    id: 'minimalist',
    name: 'Geometric Horizon',
    artist: 'Studio Bauhaus Digital',
    title: 'Monolith in Titanium Fog',
    category: 'Minimalist 3D',
    accentColor: '#E2E8F0',
    badge: 'Minimalist 3D',
    imageUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1400&q=85'
  }
];

export function getPresetById(id: SplashPresetId): PresetDefinition {
  return SPLASH_PRESETS.find((p) => p.id === id) || SPLASH_PRESETS[0];
}
