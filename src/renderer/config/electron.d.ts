// Tipos para la API expuesta por el preload script
export interface ElectronAPI {
  onMenuNewFile: (callback: () => void) => void;
  onMenuOpenFile: (callback: () => void) => void;
  onMenuSaveFile: (callback: () => void) => void;
  onMenuRunCode: (callback: () => void) => void;
  onMenuClearOutput: (callback: () => void) => void;
  onMenuAbout: (callback: () => void) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
