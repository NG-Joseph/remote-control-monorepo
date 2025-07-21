"use strict";
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
    startScreenShare: (sourceId) => ipcRenderer.invoke('start-screen-share', sourceId),
    stopScreenShare: () => ipcRenderer.invoke('stop-screen-share'),
    // Host management
    approveConnection: (clientId) => ipcRenderer.invoke('approve-connection', clientId),
    denyConnection: (clientId) => ipcRenderer.invoke('deny-connection', clientId),
    disconnectClient: (clientId) => ipcRenderer.invoke('disconnect-client', clientId),
    getHostInfo: () => ipcRenderer.invoke('get-host-info'),
    // Configuration methods
    updateAllowedKeys: (keys) => ipcRenderer.invoke('update-allowed-keys', keys),
    refreshConnection: () => ipcRenderer.invoke('refresh-connection'),
    // Event listeners
    onConnectionStatus: (callback) => {
        ipcRenderer.on('connection-status', (_, status) => callback(status));
    },
    onScreenShareStatus: (callback) => {
        ipcRenderer.on('screen-share-status', (_, status) => callback(status));
    },
    onHostStatus: (callback) => {
        ipcRenderer.on('host-status', (_, status) => callback(status));
    },
    onConnectionRequest: (callback) => {
        ipcRenderer.on('connection-request', (_, requestInfo) => callback(requestInfo));
    },
    onControlCommand: (callback) => {
        ipcRenderer.on('control-command', (_, command) => callback(command));
    },
    onWebRTCSignal: (callback) => {
        ipcRenderer.on('webrtc-signal', (_, signal) => callback(signal));
    },
    sendWebRTCSignal: (signal) => ipcRenderer.invoke('send-webrtc-signal', signal),
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
