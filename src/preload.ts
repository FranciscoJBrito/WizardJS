// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

// Exponer API segura al renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Listeners para eventos del menú
  onMenuNewFile: (callback: () => void) => {
    ipcRenderer.on('menu-new-file', callback);
  },
  onMenuOpenFile: (callback: () => void) => {
    ipcRenderer.on('menu-open-file', callback);
  },
  onMenuSaveFile: (callback: () => void) => {
    ipcRenderer.on('menu-save-file', callback);
  },
  onMenuRunCode: (callback: () => void) => {
    ipcRenderer.on('menu-run-code', callback);
  },
  onMenuClearOutput: (callback: () => void) => {
    ipcRenderer.on('menu-clear-output', callback);
  },
  onMenuAbout: (callback: () => void) => {
    ipcRenderer.on('menu-about', callback);
  },
  
  // Cleanup para remover listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
