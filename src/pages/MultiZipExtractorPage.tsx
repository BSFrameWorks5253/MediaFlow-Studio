import React, { useState, useEffect } from 'react';
import {
  Archive,
  FolderOpen,
  FolderCheck,
  Play,
  RotateCcw,
  Check,
  AlertCircle,
  ExternalLink,
  Layers,
  Sparkles,
  FileArchive,
  CheckCircle2,
  Trash2,
  ArrowRight,
  FolderSync,
} from 'lucide-react';
import { StudioButton } from '../components/StudioButton';
import { PageKey } from '../types/pipelineStages';
import { toUserErrorMessage } from '../utils/errorSanitizer';
import { playSuccessSound } from '../utils/soundEffects';

interface MultiZipExtractorPageProps {
  onShowToast: (text: string, type: 'info' | 'success' | 'warning' | 'danger') => void;
  onNavigate?: (page: PageKey) => void;
}

export const MultiZipExtractorPage: React.FC<MultiZipExtractorPageProps> = ({ onShowToast, onNavigate }) => {
  const [sourceMode, setSourceMode] = useState<'files' | 'folder'>('files');
  const [zipFiles, setZipFiles] = useState<string[]>([]);
  const [sourceDir, setSourceDir] = useState<string>('');
  const [outputDir, setOutputDir] = useState<string>('');
  const [flattenOuter, setFlattenOuter] = useState<boolean>(true);
  const [openOnComplete, setOpenOnComplete] = useState<boolean>(true);

  // Detected groups if folder mode
  const [detectedGroups, setDetectedGroups] = useState<any[]>([]);

  // Extraction Progress State
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [progressData, setProgressData] = useState<{
    percent: number;
    currentZip: string;
    file: string;
    extractedFiles: number;
    totalFiles: number;
    extractedBytes: number;
    totalBytes: number;
    speedMbps: number;
  } | null>(null);

  // Result state
  const [completedResult, setCompletedResult] = useState<any | null>(null);

  // Listen to IPC zip progress events
  useEffect(() => {
    if (window.electronAPI?.onZipProgress) {
      const unsub = window.electronAPI.onZipProgress((data: any) => {
        setProgressData({
          percent: data.percent || 0,
          currentZip: data.current_zip || '',
          file: data.file || '',
          extractedFiles: data.extracted_files || 0,
          totalFiles: data.total_files || 0,
          extractedBytes: data.extracted_bytes || 0,
          totalBytes: data.total_bytes || 0,
          speedMbps: data.speed_mbps || 0,
        });
      });
      return () => {
        if (typeof unsub === 'function') unsub();
      };
    }
  }, []);

  // Demo sample loader
  const handleLoadSample = () => {
    const demoDir = 'D:\\Downloads\\GoogleDrive_RoyalWedding';
    const demoZips = [
      `${demoDir}\\Royal_Wedding_Raw_Photos-001.zip`,
      `${demoDir}\\Royal_Wedding_Raw_Photos-002.zip`,
      `${demoDir}\\Royal_Wedding_Raw_Photos-003.zip`,
    ];
    setZipFiles(demoZips);
    setOutputDir('D:\\2026_EVENTS\\ROYAL_WEDDING\\RAW_PHOTOS_UNIFIED');
    onShowToast('Loaded sample Google Drive 3-part zip archive (001, 002, 003)', 'info');
  };

  // Browse multiple zip files
  const handleBrowseZipFiles = async () => {
    if (!window.electronAPI?.selectOpenFiles) return;
    try {
      const files = await window.electronAPI.selectOpenFiles('Select Multi-Part Zip Files (001, 002, 003...)', [
        { name: 'Zip Archives (*.zip)', extensions: ['zip'] },
        { name: 'All Files (*.*)', extensions: ['*'] },
      ]);
      if (files && files.length > 0) {
        setZipFiles(files);
        // Auto-suggest output folder next to first zip
        if (!outputDir) {
          const first = files[0];
          const dir = first.substring(0, Math.max(first.lastIndexOf('/'), first.lastIndexOf('\\')));
          const baseName = first
            .split(/[\\/]/)
            .pop()
            ?.replace(/[-_.]*(?:001|002|003|\d{2,3})[-_.]*\.zip$/i, '')
            ?.replace(/\.zip$/i, '') || 'Extracted_Unified_Folder';
          setOutputDir(`${dir}\\${baseName}_Unified`);
        }
        onShowToast(`Selected ${files.length} zip archive part${files.length > 1 ? 's' : ''}`, 'success');
      }
    } catch (e: any) {
      onShowToast(toUserErrorMessage(e, 'Could not select zip files'), 'danger');
    }
  };

  // Browse folder containing multi-part zips
  const handleBrowseFolder = async () => {
    if (!window.electronAPI?.selectDirectory) return;
    try {
      const dir = await window.electronAPI.selectDirectory('Select Folder Containing Multi-Part Zips', sourceDir);
      if (dir) {
        setSourceDir(dir);
        if (window.electronAPI?.scanZipDirectory) {
          const groups = await window.electronAPI.scanZipDirectory(dir);
          setDetectedGroups(groups);
          if (groups.length > 0) {
            setZipFiles(groups[0].files);
            setOutputDir(`${dir}\\${groups[0].groupName}_Unified`);
            onShowToast(`Found ${groups.length} zip archive set(s) in folder!`, 'success');
          } else {
            onShowToast('No .zip files found in this directory.', 'warning');
          }
        }
      }
    } catch (e: any) {
      onShowToast(toUserErrorMessage(e, 'Could not scan folder'), 'danger');
    }
  };

  // Browse destination output directory
  const handleBrowseOutput = async () => {
    if (!window.electronAPI?.selectDirectory) return;
    try {
      const dir = await window.electronAPI.selectDirectory('Select Destination Folder for Merged Files', outputDir);
      if (dir) setOutputDir(dir);
    } catch (e: any) {
      onShowToast(toUserErrorMessage(e, 'Could not select destination directory'), 'danger');
    }
  };

  // Execute extraction
  const handleStartExtraction = async () => {
    if (zipFiles.length === 0) {
      onShowToast('Please select at least one zip file or multi-part archive.', 'warning');
      return;
    }
    if (!outputDir.trim()) {
      onShowToast('Please specify a destination folder for the extracted files.', 'warning');
      return;
    }

    setIsExtracting(true);
    setCompletedResult(null);
    setProgressData({
      percent: 0,
      currentZip: 'Initializing...',
      file: 'Starting extraction...',
      extractedFiles: 0,
      totalFiles: 0,
      extractedBytes: 0,
      totalBytes: 0,
      speedMbps: 0,
    });

    try {
      if (window.electronAPI?.extractMultiPartZips) {
        const res = await window.electronAPI.extractMultiPartZips({
          zipPaths: zipFiles,
          outputDir: outputDir.trim(),
          flattenOuter,
        });
        setCompletedResult(res);
        try {
          playSuccessSound();
        } catch {}
        onShowToast(`Successfully merged and extracted ${res.files_extracted || 'all'} files!`, 'success');

        if (openOnComplete && window.electronAPI?.openPath) {
          window.electronAPI.openPath(outputDir);
        }
      } else {
        // Fallback demo simulation
        setTimeout(() => {
          setCompletedResult({
            success: true,
            output_dir: outputDir,
            files_extracted: 2450,
            total_bytes: 14800000000,
            elapsed_seconds: 4.2,
          });
          setIsExtracting(false);
          try {
            playSuccessSound();
          } catch {}
          onShowToast('Mock extraction completed successfully!', 'success');
        }, 2000);
      }
    } catch (err: any) {
      console.error('Multi-zip extraction failed:', err);
      onShowToast(toUserErrorMessage(err, 'Failed to extract multi-part zip archives. Please check disk space and permissions.'), 'danger');
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        height: '100%',
        overflowY: 'auto',
        paddingRight: 6,
      }}
    >
      {/* Page Header */}
      <div
        className="glass-card"
        style={{
          padding: '16px 22px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38BDF8',
              boxShadow: '0 4px 12px rgba(56, 189, 248, 0.2)',
            }}
          >
            <FolderSync size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--label)', letterSpacing: -0.3 }}>
                Multi-Zip & Google Drive Consolidator
              </h1>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 6,
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  color: '#38BDF8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                }}
              >
                AUTO 001/002/003 MERGER
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--secondary-label)' }}>
              Automatically unzips multi-volume Google Drive downloads (parts 001, 002, 003...) directly into one single unified folder.
            </p>
          </div>
        </div>

        {/* Top Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleLoadSample}
            className="btn-tactile"
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--secondary-label)',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Sparkles size={13} color="#38BDF8" />
            <span>Load Sample (3 Parts)</span>
          </button>

          <button
            onClick={() => {
              setZipFiles([]);
              setSourceDir('');
              setOutputDir('');
              setCompletedResult(null);
              setProgressData(null);
            }}
            className="btn-tactile"
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--secondary-label)',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main Configuration Card */}
      <div
        className="glass-card"
        style={{
          padding: '20px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Source Mode Selector */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setSourceMode('files')}
            style={{
              padding: '6px 16px',
              borderRadius: 8,
              border: sourceMode === 'files' ? '1px solid var(--system-cyan)' : '1px solid var(--border)',
              backgroundColor: sourceMode === 'files' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
              color: sourceMode === 'files' ? 'var(--system-cyan)' : 'var(--secondary-label)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Archive size={14} />
            <span>Select Multi-Part Zip Files Directly</span>
          </button>

          <button
            onClick={() => setSourceMode('folder')}
            style={{
              padding: '6px 16px',
              borderRadius: 8,
              border: sourceMode === 'folder' ? '1px solid var(--system-cyan)' : '1px solid var(--border)',
              backgroundColor: sourceMode === 'folder' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
              color: sourceMode === 'folder' ? 'var(--system-cyan)' : 'var(--secondary-label)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <FolderOpen size={14} />
            <span>Auto-Scan Folder for Zip Sets</span>
          </button>
        </div>

        {/* Mode 1: Select files */}
        {sourceMode === 'files' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--label)' }}>
                Multi-Part Zip Archives to Unify ({zipFiles.length} Selected):
              </label>
              <button
                onClick={handleBrowseZipFiles}
                className="btn-tactile"
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  backgroundColor: 'rgba(56, 189, 248, 0.12)',
                  color: '#38BDF8',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <FolderOpen size={13} />
                <span>Browse Zips (001, 002, 003...)</span>
              </button>
            </div>

            {/* List of Selected Zips */}
            {zipFiles.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  maxHeight: 180,
                  overflowY: 'auto',
                  padding: '8px 10px',
                  borderRadius: 8,
                  backgroundColor: 'var(--surface-sunken)',
                  border: '1px solid var(--border)',
                }}
              >
                {zipFiles.map((zp, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '5px 10px',
                      borderRadius: 6,
                      backgroundColor: 'var(--surface-elevated)',
                      fontSize: 11.5,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                      <span style={{ color: '#38BDF8', fontWeight: 800 }}>Part {idx + 1}</span>
                      <span style={{ color: 'var(--label)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {zp.split(/[\\/]/).pop()}
                      </span>
                    </div>
                    <button
                      onClick={() => setZipFiles((prev) => prev.filter((_, i) => i !== idx))}
                      style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 2 }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div
                onClick={handleBrowseZipFiles}
                style={{
                  padding: '24px',
                  border: '1.5px dashed var(--border)',
                  borderRadius: 8,
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'var(--surface-sunken)',
                }}
              >
                <Archive size={28} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--label)' }}>
                  Click to select multiple zip archives (001, 002, 003...)
                </div>
                <div style={{ fontSize: 11, color: 'var(--secondary-label)', marginTop: 4 }}>
                  All parts will be merged sequentially into a single unified folder structure
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Mode 2: Folder Auto Scan */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--label)' }}>
              Folder to Scan for Multi-Part Zip Sets (e.g. Downloads or Event Folder):
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={sourceDir}
                onChange={(e) => setSourceDir(e.target.value)}
                placeholder="e.g. D:\Downloads\RoyalWedding"
                style={{
                  flex: 1,
                  height: 36,
                  padding: '0 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface-sunken)',
                  color: 'var(--label)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  outline: 'none',
                }}
              />
              <button
                onClick={handleBrowseFolder}
                className="btn-tactile"
                style={{
                  height: 36,
                  padding: '0 16px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface-elevated)',
                  color: 'var(--label)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <FolderOpen size={14} />
                <span>Scan Folder</span>
              </button>
            </div>

            {/* Detected Sets */}
            {detectedGroups.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--secondary-label)' }}>
                  Detected Archive Sets ({detectedGroups.length}):
                </span>
                {detectedGroups.map((grp, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setZipFiles(grp.files);
                      setOutputDir(`${sourceDir}\\${grp.groupName}_Unified`);
                      onShowToast(`Selected set "${grp.groupName}" (${grp.count} parts)`, 'info');
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      backgroundColor: zipFiles === grp.files ? 'rgba(56, 189, 248, 0.15)' : 'var(--surface-sunken)',
                      border: zipFiles === grp.files ? '1px solid #38BDF8' : '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--label)' }}>
                        📦 {grp.groupName}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--secondary-label)', marginTop: 2 }}>
                        {grp.count} parts ({grp.files.map((f: string) => f.split(/[\\/]/).pop()).slice(0, 3).join(', ')}...)
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#38BDF8', fontFamily: 'var(--font-mono)' }}>
                      {grp.totalSizeFormatted}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Destination Output Directory */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--label)' }}>
            Destination Unified Folder (Where all files from 001, 002, 003... will be placed):
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={outputDir}
              onChange={(e) => setOutputDir(e.target.value)}
              placeholder="e.g. D:\2026_EVENTS\ROYAL_WEDDING\RAW_PHOTOS_UNIFIED"
              style={{
                flex: 1,
                height: 36,
                padding: '0 12px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-sunken)',
                color: 'var(--label)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                outline: 'none',
              }}
            />
            <button
              onClick={handleBrowseOutput}
              className="btn-tactile"
              style={{
                height: 36,
                padding: '0 16px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-elevated)',
                color: 'var(--label)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <FolderOpen size={14} />
              <span>Browse Destination</span>
            </button>
          </div>
        </div>

        {/* Options Row */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', padding: '6px 0' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--label)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={flattenOuter}
              onChange={(e) => setFlattenOuter(e.target.checked)}
              style={{ accentColor: '#38BDF8' }}
            />
            <span>Strip redundant Google Drive wrapper folder (recommended)</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--label)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={openOnComplete}
              onChange={(e) => setOpenOnComplete(e.target.checked)}
              style={{ accentColor: '#38BDF8' }}
            />
            <span>Open destination folder when extraction finishes</span>
          </label>
        </div>

        {/* Progress Display */}
        {isExtracting && progressData && (
          <div
            style={{
              padding: '16px',
              borderRadius: 10,
              backgroundColor: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#38BDF8' }}>
                Unifying & Extracting: {progressData.currentZip}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--label)', fontFamily: 'var(--font-mono)' }}>
                {progressData.percent}% ({progressData.speedMbps} MB/s)
              </span>
            </div>

            {/* Progress Bar */}
            <div style={{ height: 8, width: '100%', borderRadius: 4, backgroundColor: 'rgba(0, 0, 0, 0.3)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progressData.percent}%`,
                  backgroundColor: '#38BDF8',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--secondary-label)' }}>
              <span>Writing: {progressData.file || 'extracting files...'}</span>
              <span>{progressData.extractedFiles} files extracted</span>
            </div>
          </div>
        )}

        {/* Completed Card */}
        {completedResult && (
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 10,
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <CheckCircle2 size={24} color="#10B981" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--label)' }}>
                  Multi-Part Zips Successfully Consolidated!
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--secondary-label)', marginTop: 2 }}>
                  Extracted {completedResult.files_extracted?.toLocaleString()} files into unified folder.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => window.electronAPI?.openPath(completedResult.output_dir)}
                className="btn-tactile"
                style={{
                  padding: '7px 14px',
                  borderRadius: 6,
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  color: '#10B981',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <FolderOpen size={13} />
                <span>Open Unified Folder</span>
              </button>
            </div>
          </div>
        )}

        {/* Start Button */}
        <StudioButton
          variant="primary"
          size="lg"
          loading={isExtracting}
          disabled={zipFiles.length === 0 || !outputDir.trim()}
          onClick={handleStartExtraction}
          style={{ height: 46, fontSize: 14, fontWeight: 800 }}
        >
          {isExtracting ? 'Unifying Multi-Part Zips into One Folder...' : '⚡ Unzip & Merge All Zip Parts into 1 Folder'}
        </StudioButton>
      </div>
    </div>
  );
};
