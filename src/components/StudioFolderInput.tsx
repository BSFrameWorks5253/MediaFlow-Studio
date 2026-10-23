import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  X,
  Clipboard,
  Check,
  AlertCircle,
  HardDrive,
} from 'lucide-react';

interface StudioFolderInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBrowse: () => void;
  placeholder?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
}

export const StudioFolderInput: React.FC<StudioFolderInputProps> = ({
  label,
  value,
  onChange,
  onBrowse,
  placeholder = 'Select or drop directory path...',
  description,
  error,
  disabled = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0] as any;
      const path = droppedFile.path;
      if (path) {
        onChange(path);
      }
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        onChange(text.trim());
      }
    } catch {}
  };

  const handleExplore = () => {
    if (!value || !value.trim() || !window.electronAPI) return;
    window.electronAPI.openPath(value.trim());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Label & Meta Info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--label)', letterSpacing: 0.2 }}>
          {label}
        </label>
        {description && (
          <span style={{ fontSize: 10.5, color: 'var(--tertiary-label)' }}>
            {description}
          </span>
        )}
      </div>

      {/* Input Shell with Drag-and-Drop Target */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 6px',
          borderRadius: 12,
          backgroundColor: isDragOver ? 'rgba(0, 242, 254, 0.12)' : 'var(--surface-elevated)',
          border: isDragOver
            ? '1.5px dashed #00F2FE'
            : error
            ? '1px solid #FF453A'
            : '1px solid var(--border)',
          boxShadow: isDragOver ? '0 0 16px rgba(0, 242, 254, 0.3)' : 'var(--shadow-sm)',
          transition: 'all var(--transition-fast)',
        }}
      >
        {/* Leading Folder Icon */}
        <div style={{ paddingLeft: 6, display: 'flex', alignItems: 'center', color: value ? 'var(--accent)' : 'var(--tertiary-label)' }}>
          <Folder size={16} />
        </div>

        {/* Text Input */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isDragOver ? 'Release to drop folder path here...' : placeholder}
          disabled={disabled}
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            border: 'none',
            padding: '7px 6px',
            fontSize: 13,
            fontFamily: 'var(--font-system)',
            fontWeight: 500,
            color: 'var(--label)',
            outline: 'none',
          }}
        />

        {/* Trailing Quick Utility Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Clear Button */}
          {value && (
            <button
              onClick={() => onChange('')}
              className="btn-tactile"
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--tertiary-label)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Clear folder path"
            >
              <X size={13} />
            </button>
          )}

          {/* Paste Clipboard Button */}
          {!value && (
            <button
              onClick={handlePaste}
              className="btn-tactile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                borderRadius: 6,
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--surface-card)',
                color: 'var(--secondary-label)',
                cursor: 'pointer',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
              }}
              title="Paste path from clipboard"
            >
              <Clipboard size={11} />
              <span>Paste</span>
            </button>
          )}

          {/* Explore Folder Button */}
          {value && (
            <button
              onClick={handleExplore}
              className="btn-tactile"
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-card)',
                color: 'var(--accent)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Open folder in Windows Explorer"
            >
              <FolderOpen size={13} />
            </button>
          )}

          {/* Primary Browse Button */}
          <button
            onClick={onBrowse}
            disabled={disabled}
            className="btn-tactile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 30,
              padding: '0 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface-card)',
              color: 'var(--label)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontSize: 11.5,
              fontWeight: 700,
              fontFamily: 'inherit',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              if (!disabled) {
                e.currentTarget.style.backgroundColor = 'var(--surface-card-hover)';
                e.currentTarget.style.borderColor = 'var(--border-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (!disabled) {
                e.currentTarget.style.backgroundColor = 'var(--surface-card)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }
            }}
          >
            <span>Browse</span>
          </button>
        </div>
      </div>

      {/* Validation Error Message */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#FF453A', fontSize: 11 }}>
          <AlertCircle size={12} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
