import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Play,
  Upload,
  Image,
  Clock,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import {
  SplashSettings,
  SplashPresetId,
  SplashSpeed,
  getStoredSplashSettings,
  saveStoredSplashSettings
} from '../types/splash';
import { SPLASH_PRESETS } from './splashPresets';
import { AdobeSplashScreen } from './AdobeSplashScreen';

export const SplashScreenSection: React.FC = () => {
  const [settings, setSettings] = useState<SplashSettings>(getStoredSplashSettings);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<boolean>(false);

  useEffect(() => {
    saveStoredSplashSettings(settings);
    setSaveToast(true);
    const t = setTimeout(() => setSaveToast(false), 2000);
    return () => clearTimeout(t);
  }, [settings]);

  const handleSelectPreset = (presetId: SplashPresetId) => {
    const found = SPLASH_PRESETS.find((p) => p.id === presetId);
    setSettings((prev) => ({
      ...prev,
      presetId,
      customImageUrl: '',
      artistName: found ? found.artist : prev.artistName,
      artworkTitle: found ? found.title : prev.artworkTitle
    }));
  };

  const handlePickLocalImage = async () => {
    const anyWin = window as any;
    const picker = anyWin.api?.pickCustomSplashArtwork || anyWin.electronAPI?.pickCustomSplashArtwork;
    if (!picker) return;
    try {
      const filePath = await picker();
      if (filePath) {
        // Format path as file URL for local loading
        const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
        setSettings((prev) => ({
          ...prev,
          presetId: 'custom',
          customImageUrl: fileUrl,
          artworkTitle: prev.artworkTitle || 'Custom Desktop Artwork',
          artistName: prev.artistName || 'User Studio Asset'
        }));
      }
    } catch (err) {
      console.error('Error picking custom artwork:', err);
    }
  };

  const handleSpeedChange = (speed: SplashSpeed) => {
    setSettings((prev) => ({ ...prev, speed }));
  };

  return (
    <>
      <div
        className="glass-card"
        style={{
          padding: '20px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '14px'
        }}
      >
        {/* Card Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--label)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: 0
              }}
            >
              <Sparkles size={16} color="#0066EE" />
              <span>Adobe Splash Screen & Cold-Boot Engine</span>
            </h3>
            <p style={{ color: 'var(--secondary-label)', fontSize: '12px', marginTop: '4px', margin: '4px 0 0 0' }}>
              Configure the standalone Adobe-style cold-boot window, artwork curation, and initialization duration.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {saveToast && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--system-green)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}
              >
                <CheckCircle2 size={12} />
                <span>Saved</span>
              </span>
            )}
            <button
              onClick={() => setIsPreviewOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 700,
                backgroundColor: 'rgba(0, 102, 238, 0.12)',
                border: '1px solid #0066EE',
                color: '#0066EE',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <Play size={13} fill="#0066EE" />
              <span>Live Preview</span>
            </button>
          </div>
        </div>

        {/* 1. Curated Artwork Presets Carousel */}
        <div>
          <label
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--secondary-label)',
              display: 'block',
              marginBottom: '10px'
            }}
          >
            Curated Artwork Presets
          </label>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '10px'
            }}
          >
            {SPLASH_PRESETS.map((p) => {
              const isSelected = settings.presetId === p.id && !settings.customImageUrl;
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectPreset(p.id)}
                  style={{
                    position: 'relative',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    border: isSelected ? '2px solid #0066EE' : '1px solid var(--border)',
                    boxShadow: isSelected ? '0 0 12px rgba(0, 102, 238, 0.35)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    backgroundColor: 'var(--surface-elevated)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '6px'
                  }}
                >
                  <div
                    style={{
                      height: '70px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      position: 'relative',
                      marginBottom: '6px'
                    }}
                  >
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        fontSize: '8px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        background: 'rgba(0,0,0,0.7)',
                        color: '#FFF',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        backdropFilter: 'blur(4px)'
                      }}
                    >
                      {p.badge}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--label)' }}>
                      {p.name}
                    </span>
                    <span
                      style={{
                        fontSize: '9.5px',
                        color: 'var(--secondary-label)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {p.artist.split('/')[0]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Custom Image Upload or URL */}
        <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
          <label
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--secondary-label)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '8px'
            }}
          >
            <Upload size={13} color="#0066EE" />
            <span>Custom Local Artwork or Image URL</span>
          </label>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={handlePickLocalImage}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                fontSize: '11.5px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--label)',
                cursor: 'pointer'
              }}
            >
              <Image size={14} color="#0066EE" />
              <span>Browse Local Image...</span>
            </button>

            <input
              type="text"
              placeholder="Or paste image URL (e.g., https://... or file:///...)"
              value={settings.customImageUrl || ''}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  presetId: e.target.value ? 'custom' : prev.presetId,
                  customImageUrl: e.target.value
                }))
              }
              style={{
                flex: 1,
                fontSize: '11.5px',
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: 'var(--label)',
                outline: 'none'
              }}
            />

            {settings.customImageUrl && (
              <button
                onClick={() => setSettings((prev) => ({ ...prev, customImageUrl: '', presetId: 'minimalist' }))}
                style={{
                  fontSize: '11px',
                  padding: '8px 10px',
                  color: '#DC2626',
                  backgroundColor: 'rgba(220, 38, 38, 0.1)',
                  border: '1px solid rgba(220, 38, 38, 0.3)',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Clear Custom
              </button>
            )}
          </div>
        </div>

        {/* 3. Artist Credit & Artwork Title Edit */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '14px',
            paddingTop: '6px'
          }}
        >
          <div>
            <label
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--secondary-label)',
                marginBottom: '4px',
                display: 'block'
              }}
            >
              Artwork Title
            </label>
            <input
              type="text"
              value={settings.artworkTitle}
              onChange={(e) => setSettings((prev) => ({ ...prev, artworkTitle: e.target.value }))}
              placeholder="Artwork Title"
              style={{
                width: '100%',
                fontSize: '11.5px',
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '7px 10px',
                color: 'var(--label)',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--secondary-label)',
                marginBottom: '4px',
                display: 'block'
              }}
            >
              Artist Name / Studio
            </label>
            <input
              type="text"
              value={settings.artistName}
              onChange={(e) => setSettings((prev) => ({ ...prev, artistName: e.target.value }))}
              placeholder="Artist Name"
              style={{
                width: '100%',
                fontSize: '11.5px',
                backgroundColor: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '7px 10px',
                color: 'var(--label)',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* 4. Duration Speed Selector */}
        <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
          <label
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--secondary-label)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '10px'
            }}
          >
            <Clock size={13} color="#0066EE" />
            <span>Cold-Boot Loader Duration Speed</span>
          </label>

          <div style={{ display: 'flex', gap: '10px' }}>
            {[
              { id: 'quick', label: 'Quick', duration: '1.4s', desc: 'Fast diagnostic check' },
              { id: 'standard', label: 'Standard', duration: '2.8s', desc: 'Balanced Adobe cold boot (Recommended)' },
              { id: 'cinematic', label: 'Cinematic', duration: '4.2s', desc: 'Full diagnostic sequence' }
            ].map((spd) => {
              const isSelected = settings.speed === spd.id;
              return (
                <button
                  key={spd.id}
                  onClick={() => handleSpeedChange(spd.id as SplashSpeed)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #0066EE' : '1px solid var(--border)',
                    backgroundColor: isSelected ? 'rgba(0, 102, 238, 0.08)' : 'var(--surface-elevated)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--label)' }}>
                      {spd.label}
                    </span>
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 700,
                        color: isSelected ? '#0066EE' : 'var(--secondary-label)',
                        background: isSelected ? 'rgba(0, 102, 238, 0.12)' : 'rgba(0,0,0,0.06)',
                        padding: '1px 6px',
                        borderRadius: '4px'
                      }}
                    >
                      {spd.duration}
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--secondary-label)', marginTop: '2px' }}>
                    {spd.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Preview Modal */}
      {isPreviewOpen && (
        <AdobeSplashScreen
          isModalPreview={true}
          onClose={() => setIsPreviewOpen(false)}
          onFinish={() => setIsPreviewOpen(false)}
          overrideSettings={settings}
        />
      )}
    </>
  );
};
