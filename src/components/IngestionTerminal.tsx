import React, { useEffect, useRef, useState } from 'react';
import { Terminal, Copy, Check, Trash2 } from 'lucide-react';

export interface LogLine {
  text: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  time: string;
}

interface IngestionTerminalProps {
  logs: LogLine[];
  onClear: () => void;
  title?: string;
}

export const IngestionTerminal: React.FC<IngestionTerminalProps> = ({
  logs,
  onClear,
  title = 'Activity & Execution Log',
}) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleCopyLogs = () => {
    const text = logs.map((l) => `[${l.time}] [${l.type.toUpperCase()}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getColor = (type: LogLine['type']) => {
    switch (type) {
      case 'success':
        return '#10E79D';
      case 'warning':
        return '#FF9F0A';
      case 'danger':
        return '#FF453A';
      case 'info':
      default:
        return 'var(--system-cyan)';
    }
  };

  return (
    <div
      className="glass-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 180,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--surface-elevated)',
        borderRadius: 12,
      }}
    >
      {/* Log Header */}
      <div
        style={{
          height: 36,
          padding: '0 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--surface-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Terminal size={14} style={{ color: 'var(--secondary-label)' }} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--label)',
              fontFamily: 'var(--font-system)',
            }}
          >
            {title}
          </span>
          {logs.length > 0 && (
            <span
              style={{
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                color: 'var(--tertiary-label)',
                backgroundColor: 'var(--border-subtle)',
                padding: '1px 6px',
                borderRadius: 4,
              }}
            >
              {logs.length} entries
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {logs.length > 0 && (
            <>
              <button
                onClick={handleCopyLogs}
                className="btn-tactile"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 6,
                  color: 'var(--secondary-label)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10.5,
                  padding: '2px 8px',
                }}
                title="Copy log to clipboard"
              >
                {copied ? <Check size={12} color="#10E79D" /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={onClear}
                className="btn-tactile"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 6,
                  color: 'var(--tertiary-label)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10.5,
                  padding: '2px 8px',
                }}
                title="Clear log"
              >
                <Trash2 size={12} />
                <span>Clear</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Terminal Content Body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px 14px',
          fontFamily: 'var(--font-mono)',
          fontSize: 11.5,
          lineHeight: 1.6,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        {logs.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--tertiary-label)', padding: '8px 0', fontSize: 12, fontFamily: 'var(--font-system)' }}>
            <span>Ready. Process events and file transfer status will appear here.</span>
          </div>
        ) : (
          logs.map((line, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--tertiary-label)', userSelect: 'none', flexShrink: 0, fontSize: 10.5 }}>
                [{line.time}]
              </span>
              <span
                style={{
                  color: getColor(line.type),
                  wordBreak: 'break-word',
                }}
              >
                {line.text}
              </span>
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};
