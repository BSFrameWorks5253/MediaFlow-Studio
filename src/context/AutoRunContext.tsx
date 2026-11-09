import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { PageKey } from '../types/pipelineStages';
import { usePipeline } from './PipelineContext';
import { playChimeSuccess, playChimeWarning } from '../utils/soundNotifications';
import { toUserErrorMessage } from '../utils/errorSanitizer';

export type AutoRunStatus =
  | 'IDLE'
  | 'CONFIGURING'
  | 'RUNNING'
  | 'PAUSED_MANUAL'
  | 'PAUSED_CONFLICT'
  | 'COMPLETED'
  | 'ERROR';

export interface AutoRunConfig {
  baseDir: string;
  safarName: string;
  dateFolderName: string;
  incomingVideoDir: string;
}

export interface UnmatchedVideoConflictItem {
  videoFile: string;
  videoPath: string;
  videoDir: string;
  dateFolder: string;
  shotCode: string;
  cleanName: string;
  suggestedFolder?: { name: string; path: string; reason: string };
  selectedTargetFolder?: string;
}

export interface AutoRunProgressState {
  currentStageIndex: number; // 2, 3, 4, 5, 6
  currentStageKey: PageKey;
  currentStageTitle: string;
  stageProgressPct: number;
  overallProgressPct: number;
  statusMessage: string;
  error: string | null;
}

export interface AutoRunContextValue {
  status: AutoRunStatus;
  config: AutoRunConfig;
  progress: AutoRunProgressState;
  unmatchedVideos: UnmatchedVideoConflictItem[];
  matchedPairs: any[];
  allCandidateFolders: { name: string; path: string; dateFolder?: string }[];
  openSetup: () => void;
  closeSetup: () => void;
  startAutoRun: (cfg: AutoRunConfig) => Promise<void>;
  pauseAutoRun: () => void;
  resumeAutoRun: () => Promise<void>;
  stopAutoRun: () => void;
  dismissComplete: () => void;
  resolveConflictPairings: (manualPairs: { videoPath: string; targetFolder: string }[]) => Promise<void>;
  skipConflictsAndFinish: () => Promise<void>;
}

const AutoRunContext = createContext<AutoRunContextValue | null>(null);

const DEFAULT_CONFIG: AutoRunConfig = {
  baseDir: '',
  safarName: '',
  dateFolderName: '',
  incomingVideoDir: '',
};

const DEFAULT_PROGRESS: AutoRunProgressState = {
  currentStageIndex: 2,
  currentStageKey: 'uploadStructure',
  currentStageTitle: 'Structure Creator',
  stageProgressPct: 0,
  overallProgressPct: 0,
  statusMessage: 'Ready to start pipeline',
  error: null,
};

export const AutoRunProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { uploadStructure, setUploadStructure } = usePipeline();

  const [status, setStatus] = useState<AutoRunStatus>('IDLE');
  const [config, setConfig] = useState<AutoRunConfig>(() => ({
    baseDir: uploadStructure.baseDir || '',
    safarName: uploadStructure.safarName || '',
    dateFolderName: uploadStructure.dateFolderName || '',
    incomingVideoDir: '',
  }));
  const [progress, setProgress] = useState<AutoRunProgressState>(DEFAULT_PROGRESS);
  const [unmatchedVideos, setUnmatchedVideos] = useState<UnmatchedVideoConflictItem[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<any[]>([]);
  const [allCandidateFolders, setAllCandidateFolders] = useState<{ name: string; path: string; dateFolder?: string }[]>([]);

  const isPausedRef = useRef(false);
  const isStoppedRef = useRef(false);
  const activeConfigRef = useRef<AutoRunConfig>(config);

  const openSetup = useCallback(() => {
    setConfig((prev) => ({
      baseDir: uploadStructure.baseDir || prev.baseDir,
      safarName: uploadStructure.safarName || prev.safarName,
      dateFolderName: uploadStructure.dateFolderName || prev.dateFolderName,
      incomingVideoDir: prev.incomingVideoDir,
    }));
    setStatus('CONFIGURING');
  }, [uploadStructure]);

  const closeSetup = useCallback(() => {
    if (status === 'CONFIGURING') {
      setStatus('IDLE');
    }
  }, [status]);

  const stopAutoRun = useCallback(() => {
    isStoppedRef.current = true;
    isPausedRef.current = false;
    setStatus('IDLE');
    setProgress(DEFAULT_PROGRESS);
  }, []);

  const pauseAutoRun = useCallback(() => {
    if (status === 'RUNNING') {
      isPausedRef.current = true;
      setStatus('PAUSED_MANUAL');
    }
  }, [status]);

  const resumeAutoRun = useCallback(async () => {
    if (status === 'PAUSED_MANUAL') {
      isPausedRef.current = false;
      setStatus('RUNNING');
    }
  }, [status]);

  const dismissComplete = useCallback(() => {
    setStatus('IDLE');
    setProgress(DEFAULT_PROGRESS);
  }, []);

  /**
   * Core Runner executing Stages 2 through 6
   */
  const executePipelineStages = async (cfg: AutoRunConfig) => {
    isStoppedRef.current = false;
    isPausedRef.current = false;
    activeConfigRef.current = cfg;
    setStatus('RUNNING');

    let currentMainDataPath = uploadStructure.mainDataPath;
    let currentThumbnailsPath = uploadStructure.thumbnailsPath;
    let currentRemainingPath = uploadStructure.remainingPath;

    try {
      // ─────────────────────────────────────────────────────────────
      // STAGE 2: Structure Creator
      // ─────────────────────────────────────────────────────────────
      if (isStoppedRef.current) return;
      setProgress({
        currentStageIndex: 2,
        currentStageKey: 'uploadStructure',
        currentStageTitle: 'Structure Creator',
        stageProgressPct: 15,
        overallProgressPct: 10,
        statusMessage: 'Creating standardized 3-branch folder hierarchy...',
        error: null,
      });

      if (window.electronAPI?.createUploadStructure) {
        const res = await window.electronAPI.createUploadStructure(
          cfg.baseDir,
          cfg.safarName,
          cfg.dateFolderName
        );
        if (res && res.success) {
          currentMainDataPath = res.mainDataPath;
          currentThumbnailsPath = res.thumbnailsPath;
          currentRemainingPath = res.remainingPath;
          setUploadStructure({
            baseDir: cfg.baseDir,
            safarName: cfg.safarName,
            safarRoot: res.safarRoot,
            mainDataPath: res.mainDataPath,
            thumbnailsPath: res.thumbnailsPath,
            remainingPath: res.remainingPath,
            dateFolderName: cfg.dateFolderName,
          });
        }
      }

      setProgress((p) => ({
        ...p,
        stageProgressPct: 100,
        overallProgressPct: 20,
        statusMessage: 'Folder structure verified and active.',
      }));
      await new Promise((r) => setTimeout(r, 250));

      // ─────────────────────────────────────────────────────────────
      // STAGE 3: Photo Matcher & Tagger
      // ─────────────────────────────────────────────────────────────
      if (isStoppedRef.current) return;
      setProgress({
        currentStageIndex: 3,
        currentStageKey: 'photoMatcher',
        currentStageTitle: 'Photo Matcher & Tagger',
        stageProgressPct: 10,
        overallProgressPct: 25,
        statusMessage: 'Scanning RAW photos in Main Data for numeric alignment...',
        error: null,
      });

      const photoScanTarget = currentMainDataPath || `${cfg.baseDir}\\${cfg.safarName}\\Main Data\\${cfg.safarName}`;

      if (window.electronAPI?.scanPhotoMatcher && window.electronAPI?.executePhotoRename) {
        const scanRes = await window.electronAPI.scanPhotoMatcher(photoScanTarget);
        if (scanRes && scanRes.all_items && scanRes.all_items.length > 0) {
          setProgress((p) => ({
            ...p,
            stageProgressPct: 50,
            overallProgressPct: 35,
            statusMessage: `Found ${scanRes.all_items.length} photos. Applying numeric and _U / _R tags...`,
          }));
          await window.electronAPI.executePhotoRename(scanRes.all_items, false);
        }
      }

      setProgress((p) => ({
        ...p,
        stageProgressPct: 100,
        overallProgressPct: 40,
        statusMessage: 'Photo tagging complete.',
      }));
      await new Promise((r) => setTimeout(r, 250));

      // ─────────────────────────────────────────────────────────────
      // STAGE 4: Remaining Shifter
      // ─────────────────────────────────────────────────────────────
      if (isStoppedRef.current) return;
      setProgress({
        currentStageIndex: 4,
        currentStageKey: 'remainingCollector',
        currentStageTitle: 'Remaining Shifter',
        stageProgressPct: 15,
        overallProgressPct: 45,
        statusMessage: 'Scanning for un-matched Remaining folders...',
        error: null,
      });

      const remainingDestTarget = currentRemainingPath || `${cfg.baseDir}\\${cfg.safarName}\\Remaining`;

      if (window.electronAPI?.scanRemaining && window.electronAPI?.executeRemainingShift) {
        const remScan = await window.electronAPI.scanRemaining(photoScanTarget, remainingDestTarget);
        if (remScan && remScan.items && remScan.items.length > 0) {
          setProgress((p) => ({
            ...p,
            stageProgressPct: 50,
            overallProgressPct: 55,
            statusMessage: `Consolidating ${remScan.totalFolders} Remaining folders into destination...`,
          }));
          await window.electronAPI.executeRemainingShift(remScan.items, remainingDestTarget);
        }
      }

      setProgress((p) => ({
        ...p,
        stageProgressPct: 100,
        overallProgressPct: 60,
        statusMessage: 'Remaining folders successfully consolidated.',
      }));
      await new Promise((r) => setTimeout(r, 250));

      // ─────────────────────────────────────────────────────────────
      // STAGE 5: Thumbnail Shifter
      // ─────────────────────────────────────────────────────────────
      if (isStoppedRef.current) return;
      setProgress({
        currentStageIndex: 5,
        currentStageKey: 'thumbnailSeparator',
        currentStageTitle: 'Thumbnail Shifter',
        stageProgressPct: 15,
        overallProgressPct: 65,
        statusMessage: 'Scanning Main Data for _P and _V thumbnail files...',
        error: null,
      });

      const thumbDestTarget = currentThumbnailsPath || `${cfg.baseDir}\\${cfg.safarName}\\Thumbnail\\${cfg.safarName}`;

      if (window.electronAPI?.scanThumbnailSeparator && window.electronAPI?.executeThumbnailSeparation) {
        const thumbScan = await window.electronAPI.scanThumbnailSeparator(photoScanTarget, thumbDestTarget);
        if (thumbScan && thumbScan.items && thumbScan.items.length > 0) {
          setProgress((p) => ({
            ...p,
            stageProgressPct: 50,
            overallProgressPct: 75,
            statusMessage: `Isolating ${thumbScan.items.length} thumbnails into Thumbnail hierarchy...`,
          }));
          await window.electronAPI.executeThumbnailSeparation(thumbScan.items, thumbDestTarget, 'move');
        }
      }

      setProgress((p) => ({
        ...p,
        stageProgressPct: 100,
        overallProgressPct: 80,
        statusMessage: 'Thumbnails successfully separated.',
      }));
      await new Promise((r) => setTimeout(r, 250));

      // ─────────────────────────────────────────────────────────────
      // STAGE 6: Video Sync & Alignment
      // ─────────────────────────────────────────────────────────────
      if (isStoppedRef.current) return;
      setProgress({
        currentStageIndex: 6,
        currentStageKey: 'videoTransfer',
        currentStageTitle: 'Video Transfer & Sync',
        stageProgressPct: 15,
        overallProgressPct: 85,
        statusMessage: 'Scanning video clips and matching with photo event folders...',
        error: null,
      });

      if (!cfg.incomingVideoDir || !cfg.incomingVideoDir.trim()) {
        // No video dir provided; pipeline finishes after stage 5
        setProgress({
          currentStageIndex: 6,
          currentStageKey: 'videoTransfer',
          currentStageTitle: 'Video Transfer & Sync',
          stageProgressPct: 100,
          overallProgressPct: 100,
          statusMessage: 'Auto Run completed successfully (Video folder omitted).',
          error: null,
        });
        setStatus('COMPLETED');
        playChimeSuccess();
        return;
      }

      if (window.electronAPI?.scanVideoTransfer) {
        const videoScanRes = await window.electronAPI.scanVideoTransfer(cfg.incomingVideoDir, photoScanTarget);
        const pairs = videoScanRes?.matched || [];
        const unmatched = videoScanRes?.unmatched || [];
        
        const candidateFolders: { name: string; path: string }[] = [];
        if (videoScanRes?.photoFoldersByDate) {
          Object.values(videoScanRes.photoFoldersByDate).forEach((list) => {
            if (Array.isArray(list)) {
              candidateFolders.push(...list);
            }
          });
        }
        if (videoScanRes?.unmatchedPhotoFolders) {
          videoScanRes.unmatchedPhotoFolders.forEach((uf: any) => {
            if (!candidateFolders.some((c) => c.path === uf.folderPath)) {
              candidateFolders.push({ name: uf.folderName, path: uf.folderPath });
            }
          });
        }

        setMatchedPairs(pairs);
        setAllCandidateFolders(candidateFolders);

        // OPTION B: Pause & Prompt on unmatched clips or unknown folders!
        if (unmatched.length > 0) {
          setUnmatchedVideos(unmatched);
          setStatus('PAUSED_CONFLICT');
          setProgress((p) => ({
            ...p,
            statusMessage: `Action Required: Found ${unmatched.length} unmatched video clip(s).`,
          }));
          playChimeWarning();
          return;
        }

        // Zero unmatched: transfer matched pairs automatically
        if (pairs.length > 0 && window.electronAPI?.executeVideoTransfer) {
          setProgress((p) => ({
            ...p,
            stageProgressPct: 60,
            overallProgressPct: 92,
            statusMessage: `Transferring ${pairs.length} video pairs into matching photo subfolders...`,
          }));
          await window.electronAPI.executeVideoTransfer(pairs, 'move', 'rename');
        }
      }

      setProgress({
        currentStageIndex: 6,
        currentStageKey: 'videoTransfer',
        currentStageTitle: 'Video Transfer & Sync',
        stageProgressPct: 100,
        overallProgressPct: 100,
        statusMessage: 'All 5 stages completed and synchronized successfully!',
        error: null,
      });
      setStatus('COMPLETED');
      playChimeSuccess();
    } catch (err: any) {
      console.error('Auto Run Pipeline Error:', err);
      setStatus('ERROR');
      setProgress((p) => ({
        ...p,
        error: toUserErrorMessage(err, 'An error occurred during automated execution.'),
        statusMessage: 'Pipeline execution stopped due to an error.',
      }));
      playChimeWarning();
    }
  };

  const startAutoRun = useCallback(async (cfg: AutoRunConfig) => {
    setConfig(cfg);
    setStatus('RUNNING');
    await executePipelineStages(cfg);
  }, []);

  /**
   * Conflict Resolution: User manually paired some/all clips
   */
  const resolveConflictPairings = useCallback(async (manualPairs: { videoPath: string; targetFolder: string }[]) => {
    setStatus('RUNNING');
    try {
      // Merge manually paired items with already matched pairs
      const finalPairs = [...matchedPairs];
      for (const m of manualPairs) {
        const existing = finalPairs.find((p) => p.videoPath === m.videoPath);
        if (!existing) {
          finalPairs.push({
            videoPath: m.videoPath,
            targetPath: m.targetFolder,
            photoFolderPath: m.targetFolder,
          });
        }
      }

      if (finalPairs.length > 0 && window.electronAPI?.executeVideoTransfer) {
        setProgress((p) => ({
          ...p,
          stageProgressPct: 80,
          overallProgressPct: 95,
          statusMessage: `Transferring ${finalPairs.length} resolved video pairs...`,
        }));
        await window.electronAPI.executeVideoTransfer(finalPairs, 'move', 'rename');
      }

      setStatus('COMPLETED');
      setProgress({
        currentStageIndex: 6,
        currentStageKey: 'videoTransfer',
        currentStageTitle: 'Video Transfer & Sync',
        stageProgressPct: 100,
        overallProgressPct: 100,
        statusMessage: 'Auto Run completed successfully with manual pairings resolved!',
        error: null,
      });
      playChimeSuccess();
    } catch (e: any) {
      console.error('Failed to execute resolved pairs:', e);
      setStatus('ERROR');
      playChimeWarning();
    }
  }, [matchedPairs]);

  /**
   * Conflict Resolution: User chose to skip unmatched and complete
   */
  const skipConflictsAndFinish = useCallback(async () => {
    setStatus('RUNNING');
    try {
      if (matchedPairs.length > 0 && window.electronAPI?.executeVideoTransfer) {
        setProgress((p) => ({
          ...p,
          stageProgressPct: 80,
          overallProgressPct: 95,
          statusMessage: `Transferring ${matchedPairs.length} matched video pairs...`,
        }));
        await window.electronAPI.executeVideoTransfer(matchedPairs, 'move', 'rename');
      }

      setStatus('COMPLETED');
      setProgress({
        currentStageIndex: 6,
        currentStageKey: 'videoTransfer',
        currentStageTitle: 'Video Transfer & Sync',
        stageProgressPct: 100,
        overallProgressPct: 100,
        statusMessage: `Auto Run completed: ${matchedPairs.length} videos synced. (${unmatchedVideos.length} unmatched skipped)`,
        error: null,
      });
      playChimeSuccess();
    } catch (e: any) {
      console.error('Failed to complete with skipped items:', e);
      setStatus('ERROR');
      playChimeWarning();
    }
  }, [matchedPairs, unmatchedVideos.length]);

  return (
    <AutoRunContext.Provider
      value={{
        status,
        config,
        progress,
        unmatchedVideos,
        matchedPairs,
        allCandidateFolders,
        openSetup,
        closeSetup,
        startAutoRun,
        pauseAutoRun,
        resumeAutoRun,
        stopAutoRun,
        dismissComplete,
        resolveConflictPairings,
        skipConflictsAndFinish,
      }}
    >
      {children}
    </AutoRunContext.Provider>
  );
};

export const useAutoRun = (): AutoRunContextValue => {
  const ctx = useContext(AutoRunContext);
  if (!ctx) {
    throw new Error('useAutoRun must be used within an AutoRunProvider');
  }
  return ctx;
};
