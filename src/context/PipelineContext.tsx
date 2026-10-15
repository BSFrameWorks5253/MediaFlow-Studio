import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UploadStructurePaths {
  baseDir: string;
  safarName: string;
  safarRoot: string;
  mainDataPath: string;
  thumbnailsPath: string;
  remainingPath: string;
}

interface PipelineContextValue {
  uploadStructure: UploadStructurePaths;
  setUploadStructure: (paths: Partial<UploadStructurePaths>) => void;
  clearUploadStructure: () => void;
}

const STORAGE_KEY = 'dataflow_upload_structure_v1';

const defaultStructure: UploadStructurePaths = {
  baseDir: '',
  safarName: '',
  safarRoot: '',
  mainDataPath: '',
  thumbnailsPath: '',
  remainingPath: '',
};

const PipelineContext = createContext<PipelineContextValue | undefined>(undefined);

export const PipelineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uploadStructure, setUploadStructureState] = useState<UploadStructurePaths>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...defaultStructure, ...JSON.parse(saved) };
      }
    } catch {}
    return defaultStructure;
  });

  const setUploadStructure = (paths: Partial<UploadStructurePaths>) => {
    setUploadStructureState((prev) => {
      const updated = { ...prev, ...paths };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearUploadStructure = () => {
    setUploadStructureState(defaultStructure);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  return (
    <PipelineContext.Provider
      value={{
        uploadStructure,
        setUploadStructure,
        clearUploadStructure,
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
