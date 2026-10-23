import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, Home, Copy, Check } from 'lucide-react';

interface Props {
  children: ReactNode;
  onResetPage?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class StudioErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[STUDIO_ERROR_BOUNDARY]', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleCopyError = () => {
    const errorDetails = `DataFlow Studio Error Report:
Error: ${this.state.error?.name || 'Error'}: ${this.state.error?.message || 'Unknown error'}
Stack:
${this.state.error?.stack || 'No stack'}
Component Stack:
${this.state.errorInfo?.componentStack || 'No component stack'}
Timestamp: ${new Date().toISOString()}
UserAgent: ${navigator.userAgent}`;

    navigator.clipboard.writeText(errorDetails).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    });
  };

  private handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleResetToOverview = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onResetPage) {
      this.props.onResetPage();
    } else {
      window.location.hash = '';
      window.location.search = '';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%',
            padding: 24,
            boxSizing: 'border-box',
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: 680,
              width: '100%',
              padding: '36px 32px',
              borderRadius: 20,
              backgroundColor: 'rgba(20, 24, 38, 0.95)',
              border: '1px solid rgba(244, 63, 94, 0.45)',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(244, 63, 94, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            {/* Header Shield */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid rgba(244, 63, 94, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 20px rgba(244, 63, 94, 0.3)',
                  flexShrink: 0,
                }}
              >
                <AlertOctagon size={26} color="#F43F5E" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 18,
                      fontWeight: 800,
                      color: 'var(--label)',
                    }}
                  >
                    Viewport Safe Mode Intercept
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 6,
                      backgroundColor: 'rgba(244, 63, 94, 0.2)',
                      color: '#F43F5E',
                      border: '1px solid rgba(244, 63, 94, 0.4)',
                    }}
                  >
                    RECOVERED
                  </span>
                </div>
                <span style={{ fontSize: 13, color: 'var(--secondary-label)' }}>
                  A presentation component encountered an unexpected error. Your production data on disk is safe and uncorrupted.
                </span>
              </div>
            </div>

            {/* Error Message Snippet */}
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                backgroundColor: 'rgba(7, 8, 13, 0.75)',
                border: '1px solid var(--border)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12.5,
                color: '#FCA5A5',
                maxHeight: 120,
                overflowY: 'auto',
                lineHeight: 1.5,
              }}
            >
              <strong>{this.state.error?.name || 'Error'}: </strong>
              {this.state.error?.message || 'Unknown runtime error occurred.'}
            </div>

            {/* Action Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
                paddingTop: 8,
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={this.handleResetToOverview}
                  className="btn-tactile"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '8px 16px',
                    borderRadius: 10,
                    backgroundColor: 'rgba(0, 242, 254, 0.14)',
                    border: '1px solid rgba(0, 242, 254, 0.35)',
                    color: '#00F2FE',
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontWeight: 700,
                    fontFamily: 'inherit',
                  }}
                >
                  <Home size={15} />
                  <span>Return to Command Overview</span>
                </button>

                <button
                  onClick={this.handleReload}
                  className="btn-tactile"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '8px 16px',
                    borderRadius: 10,
                    backgroundColor: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                    color: 'var(--label)',
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontWeight: 600,
                    fontFamily: 'inherit',
                  }}
                >
                  <RotateCcw size={15} />
                  <span>Reload Studio</span>
                </button>
              </div>

              <button
                onClick={this.handleCopyError}
                className="btn-tactile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 10,
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  color: this.state.copied ? '#10E79D' : 'var(--secondary-label)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                }}
              >
                {this.state.copied ? <Check size={14} color="#10E79D" /> : <Copy size={14} />}
                <span>{this.state.copied ? 'Copied to Clipboard' : 'Copy Diagnostics'}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
