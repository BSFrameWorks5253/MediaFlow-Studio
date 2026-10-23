import { electronAPI } from '../../electron/preload';

declare global {
  interface Window {
    electronAPI: typeof electronAPI;
    api: typeof electronAPI;
  }
}

export {};
