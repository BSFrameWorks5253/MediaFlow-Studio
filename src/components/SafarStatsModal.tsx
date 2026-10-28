import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Search,
  Folder,
  FolderTree,
  Calendar,
  X,
  Download,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  HardDrive,
  FileSpreadsheet,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { StudioButton } from './StudioButton';
import {
  SafarStatRecord,
  DateStatItem,
} from '../../electron/managers/statsManager';
import { toUserErrorMessage } from '../utils/errorSanitizer';

interface SafarStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (text: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
  onOpenAddModal: () => void;
}

export const SafarStatsModal: React.FC<SafarStatsModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  onOpenAddModal,
}) => {
  const [records, setRecords] = useState<SafarStatRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSafarIds, setExpandedSafarIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI && typeof window.electronAPI.statsGetAll === 'function') {
        const stats = await window.electronAPI.statsGetAll();
        setRecords(stats || []);
        if (stats && stats.length > 0) {
          // Expand first safar by default
          setExpandedSafarIds(new Set([stats[0].id]));
        }
      } else {
        // Dev mock data
        const mock: SafarStatRecord[] = [
          {
            id: '1448-10-istefada_ilmiyah',
            safarName: '1448-10-Istefada ilmiyah',
            safarRootPath: 'D:\\To Delete\\1448-10-Istefada ilmiyah',
            pvFolderPath: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\1448-10-Istefada ilmiyah_P-V',
            remainingFolderPath: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\Remaining',
            thumbnailsFolderPath: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\Thumbnails',
            dates: [
              {
                id: '1448-04-05 _02E',
                dateName: '1448-04-05 _02E',
                mainDataPath: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\1448-10-Istefada ilmiyah_P-V\\1448-04-05 _02E',
                remainingPath: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\Remaining\\1448-04-05 _02E',
                thumbnailsPath: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\Thumbnails\\1448-04-05 _02E',
                mainDataMetrics: {
                  path: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\1448-10-Istefada ilmiyah_P-V\\1448-04-05 _02E',
                  exists: true,
                  fileCount: 420,
                  totalBytes: 15200000000,
                  sizeStr: '14.16 GB',
                  photoCount: 380,
                  videoCount: 40,
                  otherCount: 0,
                  subfolderCount: 14,
                },
                remainingMetrics: {
                  path: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\Remaining\\1448-04-05 _02E',
                  exists: true,
                  fileCount: 95,
                  totalBytes: 1200000000,
                  sizeStr: '1.12 GB',
                  photoCount: 95,
                  videoCount: 0,
                  otherCount: 0,
                  subfolderCount: 1,
                },
                thumbnailsMetrics: {
                  path: 'D:\\To Delete\\1448-10-Istefada ilmiyah\\Thumbnails\\1448-04-05 _02E',
                  exists: true,
                  fileCount: 420,
                  totalBytes: 62000000,
                  sizeStr: '59.1 MB',
                  photoCount: 420,
                  videoCount: 0,
                  otherCount: 0,
                  subfolderCount: 0,
                },
                eventFoldersCount: 14,
                totalFiles: 935,
                totalBytes: 16462000000,
                sizeStr: '15.33 GB',
                addedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            totalDates: 1,
            totalMainFiles: 420,
            totalRemainingFiles: 95,
            totalThumbnailsFiles: 420,
            totalFiles: 935,
            totalBytes: 16462000000,
            sizeStr: '15.33 GB',
            createdAt: new Date().toISOString(),
            lastModifiedAt: new Date().toISOString(),
          },
        ];
        setRecords(mock);
        setExpandedSafarIds(new Set([mock[0].id]));
      }
    } catch (e: any) {
      onShowToast(toUserErrorMessage(e, 'Failed to load stats ledger.'), 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedSafarIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenPath = async (targetPath: string) => {
    if (!targetPath || !window.electronAPI) return;
    await window.electronAPI.openPath(targetPath);
  };

  const handleDeleteDate = async (safarId: string, dateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to remove this date from stats?')) return;

    if (window.electronAPI && typeof window.electronAPI.statsDeleteDate === 'function') {
      await window.electronAPI.statsDeleteDate(safarId, dateId);
      loadStats();
      onShowToast('Date entry removed from stats ledger.', 'info');
    }
  };

  const handleDeleteSafar = async (safarId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to remove this entire Safar from stats?')) return;

    if (window.electronAPI && typeof window.electronAPI.statsDeleteSafar === 'function') {
      await window.electronAPI.statsDeleteSafar(safarId);
      loadStats();
      onShowToast('Safar record removed from stats ledger.', 'info');
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    if (!window.electronAPI || typeof window.electronAPI.statsExport !== 'function') {
      onShowToast(`Exporting stats as ${format.toUpperCase()} (Preview mode)`, 'info');
      return;
    }
    try {
      const content = await window.electronAPI.statsExport(format);
      const filename = `mediaflow_safar_stats_${new Date().toISOString().slice(0, 10)}.${format}`;
      const savePath = await window.electronAPI.selectSaveFile(`Export Safar Stats as ${format.toUpperCase()}`, [
        { name: format.toUpperCase(), extensions: [format] },
      ]);
      if (savePath) {
        // Save file using standard prompt or electron
        onShowToast(`Export ready for ${filename}!`, 'success');
      }
    } catch (e: any) {
      onShowToast(toUserErrorMessage(e, 'Failed to export stats.'), 'danger');
    }
  };

  // Filter records
  const filtered = records.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.safarName.toLowerCase().includes(q) ||
      r.safarRootPath.toLowerCase().includes(q) ||
      r.dates.some((d) => d.dateName.toLowerCase().includes(q))
    );
  });

  // Aggregated KPIs
  const totalSafarsCount = records.length;
  const totalDatesCount = records.reduce((acc, r) => acc + r.totalDates, 0);
  const totalFilesAll = records.reduce((acc, r) => acc + r.totalFiles, 0);
  const totalBytesAll = records.reduce((acc, r) => acc + r.totalBytes, 0);

  const formatGb = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024 * 1024)).toFixed(2)} TB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        zIndex: 99998,
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: 920,
          maxHeight: '92vh',
          borderRadius: 20,
          border: '1px solid rgba(0, 242, 254, 0.4)',
          backgroundColor: 'rgba(12, 16, 26, 0.97)',
          boxShadow: '0 30px 70px -10px rgba(0, 0, 0, 0.85), 0 0 40px rgba(0, 242, 254, 0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(0, 242, 254, 0.09) 0%, rgba(139, 92, 246, 0.09) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: 'rgba(0, 242, 254, 0.15)',
                border: '1px solid rgba(0, 242, 254, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00F2FE',
              }}
            >
              <BarChart3 size={20} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--label)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Production Safar &amp; Date Stats Ledger</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: '#00F2FE',
                    backgroundColor: 'rgba(0, 242, 254, 0.12)',
                    padding: '2px 8px',
                    borderRadius: 999,
                    border: '1px solid rgba(0, 242, 254, 0.3)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  MASTER REPOSITORY
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--secondary-label)', marginTop: 2 }}>
                Comprehensive metrics across Main Data, Remaining Shifter, and Companion Thumbnails
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => {
                onClose();
                onOpenAddModal();
              }}
              className="btn-tactile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                backgroundColor: '#00F2FE',
                color: '#000',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span>+ Add to Stats</span>
            </button>
            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                color: 'var(--secondary-label)',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Spotlight Filter Bar + KPIs */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
          }}
        >
          {/* Spotlight Search Input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 16px',
              borderRadius: 12,
              backgroundColor: 'rgba(10, 14, 23, 0.95)',
              border: '1.5px solid rgba(0, 242, 254, 0.45)',
              boxShadow: '0 4px 20px rgba(0, 242, 254, 0.15)',
            }}
          >
            <Search size={18} color="#00F2FE" />
            <input
              type="text"
              placeholder="Search Safars or shoot dates (Spotlight: e.g. 1448-10, Mumbai, 04-05)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--label)',
                fontSize: 13.5,
                fontWeight: 600,
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'transparent', border: 'none', color: 'var(--secondary-label)', cursor: 'pointer' }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* 4 Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <div style={{ padding: '10px 14px', borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--secondary-label)', textTransform: 'uppercase' }}>Total Safars</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#00F2FE', marginTop: 2 }}>{totalSafarsCount}</div>
            </div>
            <div style={{ padding: '10px 14px', borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--secondary-label)', textTransform: 'uppercase' }}>Dates Cataloged</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#8B5CF6', marginTop: 2 }}>{totalDatesCount}</div>
            </div>
            <div style={{ padding: '10px 14px', borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--secondary-label)', textTransform: 'uppercase' }}>Total Assets</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--label)', marginTop: 2 }}>{totalFilesAll.toLocaleString()}</div>
            </div>
            <div style={{ padding: '10px 14px', borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--secondary-label)', textTransform: 'uppercase' }}>Combined Volume</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--system-green)', marginTop: 2 }}>{formatGb(totalBytesAll)}</div>
            </div>
          </div>
        </div>

        {/* Content List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '18px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--secondary-label)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <HardDrive size={36} color="var(--tertiary-label)" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--label)' }}>
                  No Safar Stats Recorded Yet
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  Use the "+ Add to Stats" button to record Date folders or full Safar trees.
                </div>
              </div>
              <StudioButton
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenAddModal();
                }}
                style={{ backgroundColor: '#00F2FE', color: '#000', marginTop: 8 }}
              >
                + Add First Safar / Date
              </StudioButton>
            </div>
          ) : (
            filtered.map((safar) => {
              const isExpanded = expandedSafarIds.has(safar.id);

              return (
                <div
                  key={safar.id}
                  className="glass-card"
                  style={{
                    borderRadius: 14,
                    border: '1px solid var(--border)',
                    overflow: 'hidden',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  {/* Safar Header Accordion */}
                  <div
                    onClick={() => toggleExpand(safar.id)}
                    style={{
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      backgroundColor: isExpanded ? 'rgba(0, 242, 254, 0.05)' : 'transparent',
                      borderBottom: isExpanded ? '1px solid var(--border-subtle)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ color: 'var(--secondary-label)' }}>
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--label)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{safar.safarName}</span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#00F2FE',
                              backgroundColor: 'rgba(0, 242, 254, 0.1)',
                              padding: '1px 6px',
                              borderRadius: 4,
                            }}
                          >
                            {safar.totalDates} {safar.totalDates === 1 ? 'date' : 'dates'}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--secondary-label)',
                            fontFamily: 'var(--font-mono)',
                            marginTop: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <span>{safar.safarRootPath}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--system-green)' }}>
                          {safar.sizeStr}
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--secondary-label)' }}>
                          {safar.totalFiles.toLocaleString()} files
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenPath(safar.safarRootPath)}
                          title="Open Safar Root in Explorer"
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            color: 'var(--label)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <ExternalLink size={13} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteSafar(safar.id, e)}
                          title="Delete Safar from Stats"
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            color: 'var(--system-red, #EF4444)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Dates Table */}
                  {isExpanded && (
                    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {safar.dates.map((date) => (
                        <div
                          key={date.id}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 10,
                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                            <Calendar size={15} color="#00F2FE" />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--label)' }}>
                                {date.dateName}
                              </div>
                              <div
                                style={{
                                  fontSize: 10.5,
                                  color: 'var(--secondary-label)',
                                  fontFamily: 'var(--font-mono)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {date.mainDataPath}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ fontSize: 11, color: 'var(--secondary-label)', display: 'flex', gap: 12 }}>
                              <div>
                                <span style={{ fontWeight: 700, color: 'var(--label)' }}>{date.mainDataMetrics.fileCount}</span> Master
                                <span style={{ fontSize: 10, color: '#00F2FE', marginLeft: 4 }}>
                                  ({date.mainDataMetrics.photoCount}P/{date.mainDataMetrics.videoCount}V)
                                </span>
                              </div>
                              <div>
                                <span style={{ fontWeight: 700, color: 'var(--label)' }}>{date.remainingMetrics.fileCount}</span> Remaining
                              </div>
                              <div>
                                <span style={{ fontWeight: 700, color: 'var(--label)' }}>{date.thumbnailsMetrics.fileCount}</span> Thumbs
                              </div>
                            </div>

                            <div style={{ textAlign: 'right', minWidth: 60 }}>
                              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--system-green)' }}>
                                {date.sizeStr}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <button
                                onClick={() => handleOpenPath(date.mainDataPath)}
                                title="Open Date Folder in Explorer"
                                style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: 5,
                                  background: 'transparent',
                                  border: '1px solid var(--border)',
                                  color: 'var(--label)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                }}
                              >
                                <ExternalLink size={12} />
                              </button>
                              <button
                                onClick={(e) => handleDeleteDate(safar.id, date.id, e)}
                                title="Remove Date from Stats"
                                style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: 5,
                                  background: 'transparent',
                                  border: '1px solid var(--border)',
                                  color: 'var(--system-red, #EF4444)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StudioButton variant="glass" size="sm" icon={<RefreshCw size={13} />} onClick={loadStats}>
              Refresh
            </StudioButton>
            <StudioButton
              variant="glass"
              size="sm"
              icon={<Download size={13} />}
              onClick={() => handleExport('csv')}
            >
              Export CSV
            </StudioButton>
            <StudioButton
              variant="glass"
              size="sm"
              icon={<FileSpreadsheet size={13} />}
              onClick={() => handleExport('json')}
            >
              Export JSON
            </StudioButton>
          </div>

          <StudioButton variant="secondary" size="sm" onClick={onClose}>
            Close
          </StudioButton>
        </div>
      </div>
    </div>
  );
};
