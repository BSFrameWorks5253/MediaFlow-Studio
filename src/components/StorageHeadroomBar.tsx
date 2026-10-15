import React from 'react';
import { HardDrive } from 'lucide-react';
import { DiskHeadroom } from '../../electron/engines/pvSeparator';

interface StorageHeadroomBarProps {
  headroom: DiskHeadroom | null;
}

export const StorageHeadroomBar: React.FC<StorageHeadroomBarProps> = ({ headroom }) => {
  if (!headroom || !headroom.valid) {
    return (
      <div
        className="glass-card"
        style={{
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: 'var(--tertiary-label)',
          fontSize: 12,
        }}
      >
        <HardDrive size={16} />
        <span>Select destination directory to probe storage headroom</span>
      </div>
    );
  }

  const getStatusColor = () => {
    if (headroom.status === 'warning') return '#FF453A';
    if (headroom.status === 'caution') return '#FF9F0A';
    return '#10E79D';
  };

  const statusColor = getStatusColor();

  return (
    <div
      className="glass-card"
      style={{
        padding: '14px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: `${statusColor}18`,
              border: `1px solid ${statusColor}35`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HardDrive size={15} color={statusColor} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--label)', fontFamily: 'var(--font-mono)' }}>
                DRIVE {headroom.drive}
              </span>
              <span style={{ fontSize: 11, color: 'var(--secondary-label)' }}>
                {headroom.free_gb} GB free of {headroom.total_gb} GB
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              color: statusColor,
            }}
          >
            {Math.round(headroom.used_pct)}% USED
          </span>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 6,
              fontSize: 9.5,
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: statusColor,
              backgroundColor: `${statusColor}18`,
              border: `1px solid ${statusColor}35`,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {headroom.status}
          </span>
        </div>
      </div>

      {/* Capacity Progress Bar with Glowing Head */}
      <div
        style={{
          width: '100%',
          height: 8,
          borderRadius: 999,
          backgroundColor: 'var(--border-subtle)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: `${Math.min(100, headroom.used_pct)}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${statusColor}99 0%, ${statusColor} 100%)`,
            borderRadius: 999,
            transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: `0 0 10px ${statusColor}80`,
          }}
        />
      </div>
    </div>
  );
};
