import React from 'react';
import {
  Split,
  FolderTree,
  Tags,
  CalendarSync,
  Camera,
  Clapperboard,
  ImageDown,
  ShieldAlert,
  FileSpreadsheet,
  LayoutDashboard,
  Clock,
  Wrench,
  Cloud,
} from 'lucide-react';

export type PageKey =
  | 'overview'
  | 'pvSeparator'
  | 'uploadStructure'
  | 'photoMatcher'
  | 'remainingCollector'
  | 'eventDistributor'
  | 'videoTransfer'
  | 'thumbnailSeparator'
  | 'doNotUpload'
  | 'excelMerger'
  | 'googleDrive'
  | 'activity'
  | 'tools';

/**
 * Canonical Linear Pipeline Order
 * Stage 00 -> Stage 08
 */
export const PIPELINE_NAV_ORDER: PageKey[] = [
  'pvSeparator',          // Stage 00 • PV Separator (RAW Ingestion & Split)
  'uploadStructure',      // Stage 01 • Upload Structure (Folder Hierarchy Generator)
  'photoMatcher',         // Stage 02 • Photo Status Tagger (_U & _R Renamer)
  'remainingCollector',   // Stage 03 • Remaining Shifter (Date Consolidation)
  'videoTransfer',        // Stage 04 • Sync Photo Video (Sequence Pairing)
  'thumbnailSeparator',   // Stage 05 • Thumbnail Shifter (_P & _V Folder Shift)
  'doNotUpload',          // Stage 06 • DO NOT UPLOAD (Quarantine Isolator)
  'eventDistributor',     // Stage 07 • Event Image Shifter (Auto Event Badges)
  'excelMerger',          // Stage 08 • Report Merger (Exact Delivery Workbook)
];

export const SYSTEM_NAV_ORDER: PageKey[] = [
  'overview',             // Command Overview
  'activity',             // Activity & Audit Log
  'tools',                // Automation Utilities
];

export interface StageMeta {
  key: PageKey;
  label: string;
  shortTitle: string;
  desc: string;
  color: string;
  icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties; className?: string }>;
}

export const STAGE_METADATA_MAP: Record<PageKey, Omit<StageMeta, 'key'>> = {
  pvSeparator: {
    label: 'PV Separator',
    shortTitle: 'PV Separator',
    desc: '32x RAW Ingestion & Split',
    color: '#06B6D4',
    icon: Split,
  },
  uploadStructure: {
    label: 'Upload Structure',
    shortTitle: 'Upload Structure',
    desc: 'Auto 3-Folder Setup & Routing',
    color: '#38BDF8',
    icon: FolderTree,
  },
  photoMatcher: {
    label: 'Photo Status Tagger',
    shortTitle: 'Photo Tagger',
    desc: '_U & _R Status Tagger',
    color: '#8B5CF6',
    icon: Tags,
  },
  remainingCollector: {
    label: 'Remaining Shifter',
    shortTitle: 'Remaining Shifter',
    desc: 'Date Shift Consolidation',
    color: '#EC4899',
    icon: CalendarSync,
  },
  eventDistributor: {
    label: 'Event Image Shifter',
    shortTitle: 'Event Images',
    desc: 'Auto Event Badges & Routing',
    color: '#6366F1',
    icon: Camera,
  },
  videoTransfer: {
    label: 'Sync Photo Video',
    shortTitle: 'Sequence Sync',
    desc: 'Multi-Camera Video Alignment',
    color: '#10B981',
    icon: Clapperboard,
  },
  thumbnailSeparator: {
    label: 'Thumbnail Shifter',
    shortTitle: 'Thumbnail Shifter',
    desc: '_P & _V Folder Isolation',
    color: '#0D9488',
    icon: ImageDown,
  },
  doNotUpload: {
    label: 'DO NOT UPLOAD',
    shortTitle: 'DO NOT UPLOAD',
    desc: 'Contributor & Documents Isolation',
    color: '#F43F5E',
    icon: ShieldAlert,
  },
  excelMerger: {
    label: 'Report Merger',
    shortTitle: 'Report Merger',
    desc: 'Excel Delivery Package Compiler',
    color: '#F59E0B',
    icon: FileSpreadsheet,
  },
  overview: {
    label: 'Command Overview',
    shortTitle: 'Overview',
    desc: 'Production Command Center',
    color: '#00F2FE',
    icon: LayoutDashboard,
  },
  activity: {
    label: 'Activity & Audit',
    shortTitle: 'Activity Log',
    desc: 'Reports & Delivery Audit Trail',
    color: '#A855F7',
    icon: Clock,
  },
  tools: {
    label: 'Automation Utilities',
    shortTitle: 'Production Tools',
    desc: 'Extension & Suffix Utilities',
    color: '#3B82F6',
    icon: Wrench,
  },
  googleDrive: {
    label: 'Cloud Sync',
    shortTitle: 'Google Drive',
    desc: 'Enterprise Cloud Ingestion',
    color: '#00F2FE',
    icon: Cloud,
  },
};

/**
 * Returns canonical stage number ('00' through '08') for pipeline items,
 * or symbolic badges ('CORE', 'AUDIT', 'UTIL') for system views.
 */
export function getStageNumber(key: PageKey): string {
  const idx = PIPELINE_NAV_ORDER.indexOf(key);
  if (idx !== -1) {
    return String(idx).padStart(2, '0');
  }
  switch (key) {
    case 'overview':
      return 'CORE';
    case 'activity':
      return 'AUDIT';
    case 'tools':
      return 'UTIL';
    case 'googleDrive':
      return 'CLOUD';
    default:
      return 'SYS';
  }
}

/**
 * Returns full metadata for a given page key
 */
export function getStageMeta(key: PageKey): StageMeta {
  const base = STAGE_METADATA_MAP[key] || {
    label: 'DataFlow View',
    shortTitle: 'DataFlow',
    desc: 'Creative Production Tool',
    color: '#00F2FE',
    icon: LayoutDashboard,
  };
  return {
    key,
    ...base,
  };
}
