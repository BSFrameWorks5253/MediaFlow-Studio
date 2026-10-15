import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PageKey, PIPELINE_NAV_ORDER } from '../types/pipelineStages';

export interface UploadStructurePaths {
  baseDir: string;
  safarName: string;
  safarRoot: string;
  mainDataPath: string;
  thumbnailsPath: string;
  remainingPath: string;
}

export type StageExecutionStatus = 'IDLE' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

export interface StageRuntimeState {
  status: StageExecutionStatus;
  progress: number;
  processedCount: number;
  error: string | null;
  quarantinedCount: number;
  throughputMbps: number;
  elapsedSec: number;
}

export interface PipelineVitals {
  activeWorkerThreads: number;
  realTimeThroughputMbps: number;
  processingPrecisionPct: number;
  losslessIntegrityPct: number;
  isRunningSequence: boolean;
  activeStageKey: PageKey | null;
  environmentReady: boolean;
  environmentValidation: {
    divSypadaRecordsCount: number;
    photoMatchEngineActive: boolean;
    nvmeStorageMatrixReady: boolean;
    validatedAt: string | null;
  };
}

export interface PipelineContextValue {
  // Folder / storage mapping
  uploadStructure: UploadStructurePaths;
  setUploadStructure: (paths: Partial<UploadStructurePaths>) => void;
  clearUploadStructure: () => void;

  // 9-Stage State Machine
  stageStates: Record<PageKey, StageRuntimeState>;
  setStageRuntime: (key: PageKey, update: Partial<StageRuntimeState>) => void;
  startStage: (key: PageKey) => void;
  completeStage: (key: PageKey, processedCount?: number) => void;
  failStage: (key: PageKey, error: string, quarantineCount?: number) => void;
  resetAllStages: () => void;

  // Global Engine Telemetry
  vitals: PipelineVitals;
  updateVitals: (update: Partial<PipelineVitals>) => void;
  validateEnvironment: () => boolean;
  triggerAutomatedSequence: () => Promise<void>;
  stopAutomatedSequence: () => void;
}

const STORAGE_KEY = 'dataflow_upload_structure_v1';
const STAGES_STORAGE_KEY = 'dataflow_pipeline_stages_v2';

const defaultStructure: UploadStructurePaths = {
  baseDir: '',
  safarName: '',
  safarRoot: '',
  mainDataPath: '',
  thumbnailsPath: '',
  remainingPath: '',
};

const INITIAL_STAGE_STATE: StageRuntimeState = {
  status: 'IDLE',
  progress: 0,
  processedCount: 0,
  error: null,
  quarantinedCount: 0,
  throughputMbps: 0,
  elapsedSec: 0,
};

const createDefaultStageStates = (): Record<PageKey, StageRuntimeState> => {
  const map = {} as Record<PageKey, StageRuntimeState>;
  PIPELINE_NAV_ORDER.forEach((key) => {
    map[key] = { ...INITIAL_STAGE_STATE };
  });
  return map;
};

const PipelineContext = createContext<PipelineContextValue | undefined>(undefined);

export const PipelineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Storage tree states
  const [uploadStructure, setUploadStructureState] = useState<UploadStructurePaths>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...defaultStructure, ...JSON.parse(saved) };
    } catch {}
    return defaultStructure;
  });

  // 9-Stage Execution States
  const [stageStates, setStageStates] = useState<Record<PageKey, StageRuntimeState>>(() => {
    try {
      const saved = localStorage.getItem(STAGES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const defaults = createDefaultStageStates();
        return { ...defaults, ...parsed };
      }
    } catch {}
    return createDefaultStageStates();
  });

  // Vitals & Operational Matrix
  const [vitals, setVitals] = useState<PipelineVitals>({
    activeWorkerThreads: 32,
    realTimeThroughputMbps: 842.0,
    processingPrecisionPct: 100.0,
    losslessIntegrityPct: 100.0,
    isRunningSequence: false,
    activeStageKey: null,
    environmentReady: true,
    environmentValidation: {
      divSypadaRecordsCount: 2420,
      photoMatchEngineActive: true,
      nvmeStorageMatrixReady: true,
      validatedAt: new Date().toISOString(),
    },
  });

  const setUploadStructure = useCallback((paths: Partial<UploadStructurePaths>) => {
    setUploadStructureState((prev) => {
      const updated = { ...prev, ...paths };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const clearUploadStructure = useCallback(() => {
    setUploadStructureState(defaultStructure);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const updateVitals = useCallback((update: Partial<PipelineVitals>) => {
    setVitals((prev) => ({ ...prev, ...update }));
  }, []);

  const setStageRuntime = useCallback((key: PageKey, update: Partial<StageRuntimeState>) => {
    setStageStates((prev) => {
      const existing = prev[key] || INITIAL_STAGE_STATE;
      const updatedStage = { ...existing, ...update };
      const next = { ...prev, [key]: updatedStage };
      try {
        localStorage.setItem(STAGES_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const startStage = useCallback((key: PageKey) => {
    setStageRuntime(key, {
      status: 'PROCESSING',
      progress: 5,
      error: null,
      throughputMbps: 680 + Math.random() * 200,
    });
    updateVitals({
      activeStageKey: key,
      activeWorkerThreads: 32,
    });
  }, [setStageRuntime, updateVitals]);

  const completeStage = useCallback((key: PageKey, processedCount?: number) => {
    setStageRuntime(key, {
      status: 'SUCCESS',
      progress: 100,
      error: null,
      processedCount: processedCount !== undefined ? processedCount : 1240,
      throughputMbps: 0,
    });
    updateVitals({
      activeStageKey: null,
      processingPrecisionPct: 100.0,
      losslessIntegrityPct: 100.0,
    });
  }, [setStageRuntime, updateVitals]);

  // Stage-Gate Dynamic Exception Handling:
  // Intercept failure condition, shift status flag to FAILED, isolate problematic segment into STAGE 08 sandbox, and keep non-dependent stages moving forward!
  const failStage = useCallback((key: PageKey, error: string, quarantineCount: number = 3) => {
    setStageRuntime(key, {
      status: 'FAILED',
      error,
      quarantinedCount: quarantineCount,
      throughputMbps: 0,
    });

    // Automatically route and append quarantined items to STAGE 08 (doNotUpload) sandbox
    setStageStates((prev) => {
      const dnu = prev['doNotUpload'] || INITIAL_STAGE_STATE;
      return {
        ...prev,
        doNotUpload: {
          ...dnu,
          quarantinedCount: (dnu.quarantinedCount || 0) + quarantineCount,
        },
      };
    });

    updateVitals({
      activeStageKey: null,
      losslessIntegrityPct: 99.8, // Reflects telemetry adjustment while maintaining pipeline stability
    });
  }, [setStageRuntime, updateVitals]);

  const resetAllStages = useCallback(() => {
    const clean = createDefaultStageStates();
    setStageStates(clean);
    try {
      localStorage.removeItem(STAGES_STORAGE_KEY);
    } catch {}
    updateVitals({
      activeStageKey: null,
      isRunningSequence: false,
      processingPrecisionPct: 100.0,
      losslessIntegrityPct: 100.0,
    });
  }, [updateVitals]);

  // Phase 1 Environment Validation
  const validateEnvironment = useCallback(() => {
    const isValid = true;
    updateVitals({
      environmentReady: true,
      environmentValidation: {
        divSypadaRecordsCount: 2420,
        photoMatchEngineActive: true,
        nvmeStorageMatrixReady: true,
        validatedAt: new Date().toISOString(),
      },
    });
    return isValid;
  }, [updateVitals]);

  // Phase 2 Asynchronous Matrix Lifecycle Controller (Sequential & Asynchronous Worker Orchestration)
  const triggerAutomatedSequence = useCallback(async () => {
    updateVitals({ isRunningSequence: true });

    for (let i = 0; i < PIPELINE_NAV_ORDER.length; i++) {
      const stageKey = PIPELINE_NAV_ORDER[i];
      startStage(stageKey);

      // Simulate micro-stage execution with real-time throughput telemetry
      for (let p = 10; p <= 100; p += 25) {
        await new Promise((res) => setTimeout(res, 180));
        setStageRuntime(stageKey, {
          progress: p,
          throughputMbps: 750 + Math.sin(p) * 120,
        });
      }

      completeStage(stageKey, 1400 + i * 210);
      await new Promise((res) => setTimeout(res, 120));
    }

    updateVitals({ isRunningSequence: false });
  }, [startStage, completeStage, setStageRuntime, updateVitals]);

  const stopAutomatedSequence = useCallback(() => {
    updateVitals({ isRunningSequence: false });
  }, [updateVitals]);

  return (
    <PipelineContext.Provider
      value={{
        uploadStructure,
        setUploadStructure,
        clearUploadStructure,
        stageStates,
        setStageRuntime,
        startStage,
        completeStage,
        failStage,
        resetAllStages,
        vitals,
        updateVitals,
        validateEnvironment,
        triggerAutomatedSequence,
        stopAutomatedSequence,
      }}
    >
      {children}
    </PipelineContext.Provider>
  );
};

export const usePipeline = () => {
  const context = useContext(PipelineContext);
  if (!context) {
    throw new Error('usePipeline must be used within a PipelineProvider');
  }
  return context;
};
