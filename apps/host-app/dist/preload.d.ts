/**
 * Preload script for Electron renderer process
 * Exposes safe APIs to the renderer through contextIsolation
 */
declare const contextBridge: any, ipcRenderer: any;
