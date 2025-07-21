

class HostAppUI {
  private selectedSourceId: string | null = null;
  private allowedKeys: Set<string> = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape']);
  private isConnected: boolean = false;
  private isRegistered: boolean = false;
  private isSharing: boolean = false;
  private hostId: string | null = null;
  private connectedClients: Map<string, any> = new Map();
  private pendingRequests: Map<string, any> = new Map();
  
  // WebRTC-related properties
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  
  private readonly availableKeys = [
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'Enter', 'Escape', 'Space', 'Tab', 'Backspace',
    'Home', 'End', 'PageUp', 'PageDown',
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
  ];

  constructor() {
    this.initializeUI();
    this.setupEventListeners();
    this.setupElectronListeners();
    this.loadScreenSources();
    this.renderAllowedKeys();
    this.renderConnectionRequests();
    
    // Expose methods for HTML onclick handlers
    (window as any).hostApp = this;
  }

  private initializeUI(): void {
    this.updateConnectionStatus(false);
    this.updateHostStatus(false, null);
    this.updateShareStatus(false);
  }

  private setupEventListeners(): void {
    const refreshSourcesBtn = document.getElementById('refresh-sources-btn') as HTMLButtonElement;
    const stopSharingBtn = document.getElementById('stop-sharing-btn') as HTMLButtonElement;
    const refreshConnectionBtn = document.getElementById('refresh-connection-btn') as HTMLButtonElement;

    refreshSourcesBtn.addEventListener('click', () => this.loadScreenSources());
    stopSharingBtn.addEventListener('click', () => this.stopScreenShare());
    refreshConnectionBtn.addEventListener('click', () => this.refreshConnection());
  }

  private setupElectronListeners(): void {
    window.electronAPI.onConnectionStatus((status: {connected: boolean}) => {
      this.updateConnectionStatus(status.connected);
    });

    window.electronAPI.onHostStatus((status: {registered: boolean, hostId: string | null, pending?: boolean}) => {
      this.updateHostStatus(status.registered, status.hostId, status.pending);
    });

    window.electronAPI.onConnectionRequest((requestInfo: {clientId: string, clientInfo: any}) => {
      this.showConnectionRequest(requestInfo);
    });

    window.electronAPI.onScreenShareStatus((status: {active: boolean}) => {
      this.updateShareStatus(status.active);
    });

    window.electronAPI.onControlCommand((command: {key: string, type: string}) => {
      this.logActivity(`Remote control: ${command.key} (${command.type})`);
    });
    
    window.electronAPI.onWebRTCSignal((signal: any) => {
      this.handleWebRTCSignal(signal);
    });
  }

  private async loadScreenSources(): Promise<void> {
    try {
    // 

      const sources = await window.electronAPI.getScreenSources();
      this.renderScreenSources(sources);
    } catch (error) {
      this.logActivity(`Failed to load screen sources: ${error}`);
    }
  }

  private renderScreenSources(sources: Array<{id: string, name: string, thumbnail: string}>): void {
    const container = document.getElementById('screen-sources') as HTMLDivElement;
    container.innerHTML = '';

    sources.forEach(source => {
      const sourceElement = document.createElement('div');
      sourceElement.className = 'screen-source';
      sourceElement.innerHTML = `
        <img src="${source.thumbnail}" alt="${source.name}" />
        <div>${source.name}</div>
      `;
      
      sourceElement.addEventListener('click', () => {
        this.selectScreenSource(source.id, sourceElement);
      });
      
      container.appendChild(sourceElement);
    });
  }

  private async selectScreenSource(sourceId: string, element: HTMLElement): Promise<void> {
    // Remove previous selection
    document.querySelectorAll('.screen-source').forEach(el => {
      el.classList.remove('selected');
    });
    
    // Select current source
    element.classList.add('selected');
    this.selectedSourceId = sourceId;

    // Start screen sharing
    try {
      const result = await window.electronAPI.startScreenShare(sourceId);
      if (result.success) {
        this.logActivity(`Started screen sharing: ${sourceId}`);
        
        // Get screen stream for WebRTC
        this.localStream = await this.getScreenStream(sourceId);
        if (this.localStream) {
          this.logActivity('WebRTC screen stream ready');
          
          // Add stream to existing peer connections
          this.peerConnections.forEach((pc, clientId) => {
            this.localStream!.getTracks().forEach(track => {
              pc.addTrack(track, this.localStream!);
            });
          });
        }
      } else {
        this.logActivity(`Failed to start screen sharing: ${result.error}`);
      }
    } catch (error) {
      this.logActivity(`Screen sharing error: ${error}`);
    }
  }

  private async autoSelectScreenSource(): Promise<void> {
    try {
      console.log('🖥️ Auto-selecting screen source...');
      const sources = await window.electronAPI.getScreenSources();
      
      if (sources.length === 0) {
        this.logActivity('No screen sources available');
        return;
      }

      // Find the primary screen (usually the first one)
      const primaryScreen = sources.find(s => s.name.includes('Screen') || s.name.includes('Display')) || sources[0];
      console.log('🎯 Auto-selected source:', primaryScreen.name);
      
      this.selectedSourceId = primaryScreen.id;

      // Start screen sharing
      const result = await window.electronAPI.startScreenShare(primaryScreen.id);
      if (result.success) {
        this.logActivity(`Auto-started screen sharing: ${primaryScreen.name}`);
        
        // Get screen stream for WebRTC
        this.localStream = await this.getScreenStream(primaryScreen.id);
        if (this.localStream) {
          console.log('✅ Auto-selected screen stream ready with tracks:', this.localStream.getTracks().length);
          this.logActivity('Auto-selected screen stream ready for WebRTC');
          
          // Add stream to existing peer connections
          this.peerConnections.forEach((pc, clientId) => {
            console.log('🔄 Adding stream to existing peer connection:', clientId);
            this.localStream!.getTracks().forEach(track => {
              pc.addTrack(track, this.localStream!);
            });
          });
        }
      } else {
        this.logActivity(`Failed to auto-start screen sharing: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Auto screen selection error:', error);
      this.logActivity(`Auto screen selection error: ${error}`);
    }
  }

  private async joinRoom(): Promise<void> {
    // This method is no longer needed in host mode
    this.logActivity('Host automatically registers when connected');
  }

  private async leaveRoom(): Promise<void> {
    // This method is no longer needed in host mode  
    this.logActivity('Host automatically manages connections');
  }

  private async stopScreenShare(): Promise<void> {
    try {
    // 

      const result = await window.electronAPI.stopScreenShare();
      if (result.success) {
        this.logActivity('Stopped screen sharing');
        // Remove selection
        document.querySelectorAll('.screen-source').forEach(el => {
          el.classList.remove('selected');
        });
        this.selectedSourceId = null;
      }
    } catch (error) {
      this.logActivity(`Failed to stop screen sharing: ${error}`);
    }
  }

  private renderAllowedKeys(): void {
    const container = document.getElementById('allowed-keys') as HTMLDivElement;
    container.innerHTML = '';

    this.availableKeys.forEach(key => {
      const keyElement = document.createElement('div');
      keyElement.className = 'key-item';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `key-${key}`;
      checkbox.checked = this.allowedKeys.has(key);
      
      const label = document.createElement('label');
      label.htmlFor = `key-${key}`;
      label.textContent = key;
      
      checkbox.addEventListener('change', () => {
        this.toggleAllowedKey(key, checkbox.checked);
      });
      
      keyElement.appendChild(checkbox);
      keyElement.appendChild(label);
      container.appendChild(keyElement);
    });
  }

  private async toggleAllowedKey(key: string, allowed: boolean): Promise<void> {
    if (allowed) {
      this.allowedKeys.add(key);
    } else {
      this.allowedKeys.delete(key);
    }
    
    try {
    // 

      const result = await window.electronAPI.updateAllowedKeys(Array.from(this.allowedKeys));
      if (result.success) {
        this.logActivity(`Updated allowed keys: ${Array.from(this.allowedKeys).join(', ')}`);
      }
    } catch (error) {
      this.logActivity(`Failed to update allowed keys: ${error}`);
    }
  }

  private updateConnectionStatus(connected: boolean): void {
    this.isConnected = connected;
    const statusDot = document.getElementById('connection-status') as HTMLDivElement;
    const statusText = document.getElementById('connection-text') as HTMLSpanElement;
    
    statusDot.className = `status-dot ${connected ? 'connected' : ''}`;
    statusText.textContent = connected ? 'Connected' : 'Disconnected';
    
    this.logActivity(`Connection ${connected ? 'established' : 'lost'}`);
  }

  private updateRoomStatus(joined: boolean, roomId: string | null): void {
    // Legacy method - now replaced with updateHostStatus
    this.updateHostStatus(joined, roomId);
  }
  
  private updateHostStatus(registered: boolean, hostId: string | null, pending?: boolean): void {
    this.isRegistered = registered;
    this.hostId = hostId;
    
    const statusDot = document.getElementById('host-status') as HTMLDivElement;
    const statusText = document.getElementById('host-text') as HTMLSpanElement;
    const hostIdElement = document.getElementById('host-id') as HTMLSpanElement;
    
    statusDot.className = `status-dot ${registered ? 'connected' : ''}`;
    
    if (pending) {
      statusText.textContent = `Registering: ${hostId}`;
      hostIdElement.textContent = `${hostId} (pending...)`;
    } else {
      statusText.textContent = registered ? `Registered: ${hostId}` : 'Not registered';
      hostIdElement.textContent = hostId || 'Not registered';
    }
  }

  private showConnectionRequest(requestInfo: {clientId: string, clientInfo: any}): void {
    this.pendingRequests.set(requestInfo.clientId, requestInfo);
    this.renderConnectionRequests();
    this.logActivity(`Connection request from client: ${requestInfo.clientId}`);
  }

  private renderConnectionRequests(): void {
    const container = document.getElementById('connection-requests') as HTMLDivElement;
    container.innerHTML = '';
    
    if (this.pendingRequests.size === 0) {
      container.innerHTML = '<p>No pending connection requests</p>';
      return;
    }
    
    this.pendingRequests.forEach((requestInfo, clientId) => {
      const requestElement = document.createElement('div');
      requestElement.className = 'connection-request';
      requestElement.innerHTML = `
        <h4>Connection Request</h4>
        <p><strong>Client ID:</strong> ${clientId}</p>
        <div class="actions">
          <button class="approve" onclick="window.hostApp.approveConnection('${clientId}')">Approve</button>
          <button class="danger" onclick="window.hostApp.denyConnection('${clientId}')">Deny</button>
        </div>
      `;
      container.appendChild(requestElement);
    });
  }

  private async approveConnection(clientId: string): Promise<void> {
    try {
      const result = await window.electronAPI.approveConnection(clientId);
      if (result.success) {
        this.pendingRequests.delete(clientId);
        this.renderConnectionRequests();
        this.logActivity(`Approved connection for client: ${clientId}`);
        this.updateClientCount();
        
        // Automatically start screen sharing if not already active
        if (!this.localStream && !this.selectedSourceId) {
          this.logActivity('Auto-starting screen sharing for approved connection...');
          await this.autoSelectScreenSource();
        }
      }
    } catch (error) {
      this.logActivity(`Failed to approve connection: ${error}`);
    }
  }

  private async denyConnection(clientId: string): Promise<void> {
    try {
      const result = await window.electronAPI.denyConnection(clientId);
      if (result.success) {
        this.pendingRequests.delete(clientId);
        this.renderConnectionRequests();
        this.logActivity(`Denied connection for client: ${clientId}`);
      }
    } catch (error) {
      this.logActivity(`Failed to deny connection: ${error}`);
    }
  }

  private async updateClientCount(): Promise<void> {
    try {
      const hostInfo = await window.electronAPI.getHostInfo();
      const clientCountElement = document.getElementById('client-count') as HTMLSpanElement;
      clientCountElement.textContent = hostInfo.connectedClients.length.toString();
    } catch (error) {
      this.logActivity(`Failed to get host info: ${error}`);
    }
  }

  private async refreshConnection(): Promise<void> {
    try {
      this.logActivity('Refreshing connection to signaling server...');
      const result = await window.electronAPI.refreshConnection();
      if (result.success) {
        this.logActivity('Connection refresh initiated');
      } else {
        this.logActivity(`Failed to refresh connection: ${result.error}`);
      }
    } catch (error) {
      this.logActivity(`Connection refresh error: ${error}`);
    }
  }

  private updateShareStatus(active: boolean): void {
    this.isSharing = active;
    const statusDot = document.getElementById('share-status') as HTMLDivElement;
    const statusText = document.getElementById('share-text') as HTMLSpanElement;
    const stopBtn = document.getElementById('stop-sharing-btn') as HTMLButtonElement;
    
    statusDot.className = `status-dot ${active ? 'connected' : ''}`;
    statusText.textContent = active ? 'Sharing' : 'Not sharing';
    
    stopBtn.disabled = !active;
  }

  private logActivity(message: string): void {
    const logs = document.getElementById('logs') as HTMLDivElement;
    const timestamp = new Date().toLocaleTimeString();
    const logLine = document.createElement('div');
    logLine.textContent = `[${timestamp}] ${message}`;
    
    logs.appendChild(logLine);
    logs.scrollTop = logs.scrollHeight;
  }
  
  private async handleWebRTCSignal(signal: any): Promise<void> {
    console.log('🔄 Handling WebRTC signal:', signal.type);
    console.log('📡 Full signal object:', JSON.stringify(signal, null, 2));
    
    const clientId = signal.fromId;
    let peerConnection = this.peerConnections.get(clientId);
    
    if (!peerConnection) {
      console.log('🆕 Creating new peer connection for client:', clientId);
      peerConnection = await this.createPeerConnection(clientId);
      this.peerConnections.set(clientId, peerConnection);
    }
    
    try {
      switch (signal.type) {
        case 'offer':
          console.log('📥 Processing offer from client:', clientId);
          console.log('🔍 Offer details:', signal.offer);
          
          if (!signal.offer || !signal.offer.sdp) {
            console.error('❌ Invalid offer - missing SDP');
            return;
          }
          
          await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.offer));
          console.log('✅ Remote description set successfully');
          
          // Ensure we have a local stream - auto-select if needed
          if (!this.localStream) {
            console.log('🎥 No local stream - auto-selecting screen source...');
            await this.autoSelectScreenSource();
          }
          
          // Add local stream if available
          if (this.localStream) {
            console.log('📹 Adding local stream tracks to peer connection');
            this.localStream.getTracks().forEach(track => {
              console.log('🎬 Adding track:', track.kind, track.label);
              peerConnection!.addTrack(track, this.localStream!);
            });
          } else {
            console.warn('⚠️ Still no local stream available - screen capture failed');
          }
          
          // Create answer
          console.log('📝 Creating answer...');
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          console.log('✅ Answer created and local description set');
          
          // Send answer back
          console.log('📤 Sending answer to client');
          await window.electronAPI.sendWebRTCSignal({
            type: 'answer',
            fromId: this.hostId,
            targetId: clientId,
            answer: {
              type: answer.type,
              sdp: answer.sdp
            }
          });
          console.log('✅ Answer sent successfully');
          break;
          
        case 'ice-candidate':
          console.log('🧊 Processing ICE candidate from client:', clientId);
          console.log('🔍 Candidate details:', signal.candidate);
          
          if (signal.candidate && signal.candidate.candidate) {
            try {
              await peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
              console.log('✅ ICE candidate added successfully');
            } catch (err) {
              console.error('❌ Failed to add ICE candidate:', err);
            }
          } else {
            console.warn('⚠️ Empty or invalid ICE candidate received');
          }
          break;
          
        default:
          console.warn('❓ Unknown WebRTC signal type:', signal.type);
      }
    } catch (error) {
      console.error('❌ Error handling WebRTC signal:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('📋 Error details:', errorMessage);
      this.logActivity(`WebRTC error: ${errorMessage}`);
    }
  }
  
  private async createPeerConnection(clientId: string): Promise<RTCPeerConnection> {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    
    const peerConnection = new RTCPeerConnection(configuration);
    
    // Handle ICE candidates
    peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        await window.electronAPI.sendWebRTCSignal({
          type: 'ice-candidate',
          fromId: this.hostId,
          targetId: clientId,
          candidate: {
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid
          }
        });
      }
    };
    
    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`WebRTC connection state with ${clientId}:`, peerConnection.connectionState);
      this.logActivity(`WebRTC ${clientId}: ${peerConnection.connectionState}`);
      
      if (peerConnection.connectionState === 'connected') {
        this.connectedClients.set(clientId, { peerConnection });
      } else if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
        this.peerConnections.delete(clientId);
        this.connectedClients.delete(clientId);
      }
    };
    
    return peerConnection;
  }
  
  private async getScreenStream(sourceId: string): Promise<MediaStream | null> {
    try {
      console.log('🎥 Getting screen stream for source:', sourceId);
      
      // Use getUserMedia with Electron's desktopCapturer constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          // @ts-ignore - Electron-specific constraints
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            maxWidth: 1920,
            maxHeight: 1080,
            maxFrameRate: 30
          }
        }
      });
      
      console.log('✅ Screen stream obtained:', stream.getTracks().length, 'tracks');
      return stream;
    } catch (error) {
      console.error('❌ Error getting screen stream:', error);
      return null;
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new HostAppUI();
});
