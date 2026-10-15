import React, { useState, useEffect } from 'react';
import {
  Search,
  ArrowRight,
  X,
  Command,
  Layers,
  Settings,
  Sun,
  LayoutDashboard,
  Box,
  Image as ImageIcon,
  Video,
  FolderArchive,
  FolderX,
  FileSpreadsheet,
  Cloud,
  Clock,
  Wrench,
  FolderPlus,
} from 'lucide-react';
import { PageKey } from './Sidebar';
import { useTheme } from '../context/ThemeContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: PageKey) => void;
  onOpenSettings: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenSettings,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { toggleTheme } = useTheme();

  const actions = [
    { label: 'Command Overview — Mission Matrix', category: 'Navigation', icon: LayoutDashboard, color: '#00F2FE', action: () => onNavigate('overview') },
    { label: 'PV Separator — 32x RAW Ingestion & Split', category: 'Pipeline', icon: Box, color: '#06B6D4', action: () => onNavigate('pvSeparator') },
    { label: 'Upload Structure — Auto 3-Folder Setup & Routing', category: 'Pipeline', icon: FolderPlus, color: '#38BDF8', action: () => onNavigate('uploadStructure') },
    { label: 'Photo Status Tagger — _U & _R Renamer', category: 'Pipeline', icon: ImageIcon, color: '#8B5CF6', action: () => onNavigate('photoMatcher') },
    { label: 'Remaining Shifter — Date Consolidation', category: 'Pipeline', icon: Layers, color: '#EC4899', action: () => onNavigate('remainingCollector') },
    { label: 'Event Image Shifter — Auto Event Badges', category: 'Pipeline', icon: ImageIcon, color: '#6366F1', action: () => onNavigate('eventDistributor') },
    { label: 'Sync Photo Video — Sequence Alignment', category: 'Pipeline', icon: Video, color: '#10B981', action: () => onNavigate('videoTransfer') },
    { label: 'Thumbnail Shifter — _P & _V Isolator', category: 'Pipeline', icon: FolderArchive, color: '#0D9488', action: () => onNavigate('thumbnailSeparator') },
    { label: 'DO NOT UPLOAD — Contributor & Documents Isolator', category: 'Pipeline', icon: FolderX, color: '#F43F5E', action: () => onNavigate('doNotUpload') },
    { label: 'Report Merger — Master Inventory Delivery Package', category: 'Pipeline', icon: FileSpreadsheet, color: '#F59E0B', action: () => onNavigate('excelMerger') },
    { label: 'Activity & Delivery Reports Manifest', category: 'Workspace', icon: Clock, color: '#A855F7', action: () => onNavigate('activity') },
    { label: 'Production Automation Utilities', category: 'Tools', icon: Wrench, color: '#3B82F6', action: () => onNavigate('tools') },
    { label: 'Toggle Light / Dark Master Mode', category: 'Appearance', icon: Sun, color: '#FF9F0A', action: () => toggleTheme() },
    { label: 'Open Studio Preferences', category: 'Settings', icon: Settings, color: '#94A3B8', action: () => onOpenSettings() },
  ];

  const filtered = actions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase()) || a.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      } else if (isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
        } else if (e.key === 'Enter' && filtered[selectedIndex]) {
          e.preventDefault();
          filtered[selectedIndex].action();
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filtered, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        zIndex: 99999,
        animation: 'beaconPulse 0.18s ease-out',
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: 620,
          borderRadius: 20,
          border: '1px solid rgba(0, 242, 254, 0.35)',
          backgroundColor: 'rgba(13, 17, 28, 0.95)',
          boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.7), 0 0 35px rgba(0, 242, 254, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <Search size={20} color="#00F2FE" />
          <input
            type="text"
            placeholder="Type a command, stage name, or utility..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 15,
              fontWeight: 600,
              fontFamily: 'inherit',
              color: 'var(--label)',
            }}
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--tertiary-label)',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          ) : (
            <kbd
              style={{
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 6,
                backgroundColor: 'var(--border-subtle)',
                border: '1px solid var(--border)',
                color: 'var(--secondary-label)',
              }}
            >
              ESC
            </kbd>
          )}
        </div>

        {/* Action Results List */}
        <div
          style={{
            maxHeight: 380,
            overflowY: 'auto',
            padding: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--tertiary-label)', fontSize: 13 }}>
              No commands or tools found matching "{query}"
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className="btn-tactile"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 12,
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'rgba(0, 242, 254, 0.12)' : 'transparent',
                    border: isSelected ? '1px solid rgba(0, 242, 254, 0.35)' : '1px solid transparent',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 9,
                        backgroundColor: `${item.color}18`,
                        border: `1px solid ${item.color}35`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: item.color,
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 600, color: 'var(--label)' }}>
                        {item.label}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        fontSize: 9.5,
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: 6,
                        backgroundColor: 'var(--border-subtle)',
                        color: 'var(--secondary-label)',
                        border: '1px solid var(--border-subtle)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {item.category}
                    </span>
                    {isSelected && <ArrowRight size={14} color="#00F2FE" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Keyboard Footer Strip */}
        <div
          style={{
            padding: '10px 20px',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'var(--tertiary-label)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span style={{ color: '#00F2FE', fontWeight: 700 }}>DATAFLOW SPOTLIGHT</span>
        </div>
      </div>
    </div>
  );
};
