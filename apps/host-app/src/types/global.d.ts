/**
 * Global type definitions for Electron IPC API
 */

interface ElectronAPI {
  // Screen capture methods
  getScreenSources(): Promise<Array<{
    id: string;
    name: string;
    thumbnail: string;
  }>>;
  
  startScreenShare(sourceId: string): Promise<{
    success: boolean;
    error?: string;
  }>;
  
  stopScreenShare(): Promise<{
    success: boolean;
    error?: string;
  }>;
  
  // Host management methods
  approveConnection(clientId: string): Promise<{
    success: boolean;
    error?: string;
  }>;
  
  denyConnection(clientId: string): Promise<{
    success: boolean;
    error?: string;
  }>;
  
  disconnectClient(clientId: string): Promise<{
    success: boolean;
    error?: string;
  }>;
  
  getHostInfo(): Promise<{
    hostId: string;
    connectedClients: string[];
  }>;
  
  // Configuration methods
  updateAllowedKeys(keys: string[]): Promise<{
    success: boolean;
    error?: string;
  }>;

  refreshConnection(): Promise<{
    success: boolean;
    error?: string;
  }>;
  
  // Event listeners
  onConnectionStatus(callback: (status: { connected: boolean }) => void): void;
  onHostStatus(callback: (status: { registered: boolean; hostId: string | null; pending?: boolean }) => void): void;
  onConnectionRequest(callback: (requestInfo: { clientId: string; clientInfo: any }) => void): void;
  onScreenShareStatus(callback: (status: { active: boolean }) => void): void;
  onControlCommand(callback: (command: { key: string; type: string }) => void): void;
  onWebRTCSignal(callback: (signal: any) => void): void;
  
  // WebRTC methods
  sendWebRTCSignal(signal: any): Promise<void>;
  
  // Cleanup
  removeAllListeners(): void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
