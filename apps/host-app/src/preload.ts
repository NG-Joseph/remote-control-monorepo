/**
 * Preload script for Electron renderer process
 * Exposes safe APIs to the renderer through contextIsolation
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Screen capture
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),
  startScreenShare: (sourceId: string) => ipcRenderer.invoke('start-screen-share', sourceId),
  stopScreenShare: () => ipcRenderer.invoke('stop-screen-share'),
  
  // Host management
  approveConnection: (clientId: string) => ipcRenderer.invoke('approve-connection', clientId),
  denyConnection: (clientId: string) => ipcRenderer.invoke('deny-connection', clientId),
  disconnectClient: (clientId: string) => ipcRenderer.invoke('disconnect-client', clientId),
  getHostInfo: () => ipcRenderer.invoke('get-host-info'),
  
  // Configuration methods
  updateAllowedKeys: (keys: string[]) => ipcRenderer.invoke('update-allowed-keys', keys),
  refreshConnection: () => ipcRenderer.invoke('refresh-connection'),
  
  // Event listeners
  onConnectionStatus: (callback: (status: { connected: boolean }) => void) => {
    ipcRenderer.on('connection-status', (_: any, status: any) => callback(status));
  },
  
  onScreenShareStatus: (callback: (status: { active: boolean }) => void) => {
    ipcRenderer.on('screen-share-status', (_: any, status: any) => callback(status));
  },
  
  onHostStatus: (callback: (status: { registered: boolean; hostId: string | null; pending?: boolean }) => void) => {
    ipcRenderer.on('host-status', (_: any, status: any) => callback(status));
  },
  
  onConnectionRequest: (callback: (requestInfo: { clientId: string; clientInfo: any }) => void) => {
    ipcRenderer.on('connection-request', (_: any, requestInfo: any) => callback(requestInfo));
  },
  
  onControlCommand: (callback: (command: { key: string; type: string }) => void) => {
    ipcRenderer.on('control-command', (_: any, command: any) => callback(command));
  },
  
  onWebRTCSignal: (callback: (signal: any) => void) => {
    ipcRenderer.on('webrtc-signal', (_: any, signal: any) => callback(signal));
  },
  
  sendWebRTCSignal: (signal: any) => ipcRenderer.invoke('send-webrtc-signal', signal),
  
  // Remove listeners
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('connection-status');
    ipcRenderer.removeAllListeners('screen-share-status');
    ipcRenderer.removeAllListeners('host-status');
    ipcRenderer.removeAllListeners('connection-request');
    ipcRenderer.removeAllListeners('control-command');
    ipcRenderer.removeAllListeners('webrtc-signal');
  }
});
