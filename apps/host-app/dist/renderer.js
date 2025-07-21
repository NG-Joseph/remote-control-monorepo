"use strict";
class HostAppUI {
    constructor() {
        this.selectedSourceId = null;
        this.allowedKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape']);
        this.isConnected = false;
        this.isRegistered = false;
        this.isSharing = false;
        this.hostId = null;
        this.connectedClients = new Map();
        this.pendingRequests = new Map();
        // WebRTC-related properties
        this.peerConnections = new Map();
        this.localStream = null;
        this.availableKeys = [
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'Enter', 'Escape', 'Space', 'Tab', 'Backspace',
            'Home', 'End', 'PageUp', 'PageDown',
            'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
        ];
        this.initializeUI();
        this.setupEventListeners();
        this.setupElectronListeners();
        this.loadScreenSources();
        this.renderAllowedKeys();
        this.renderConnectionRequests();
        // Expose methods for HTML onclick handlers
        window.hostApp = this;
    }
    initializeUI() {
        this.updateConnectionStatus(false);
        this.updateHostStatus(false, null);
        this.updateShareStatus(false);
    }
    setupEventListeners() {
        const refreshSourcesBtn = document.getElementById('refresh-sources-btn');
        const stopSharingBtn = document.getElementById('stop-sharing-btn');
        const refreshConnectionBtn = document.getElementById('refresh-connection-btn');
        refreshSourcesBtn.addEventListener('click', () => this.loadScreenSources());
        stopSharingBtn.addEventListener('click', () => this.stopScreenShare());
        refreshConnectionBtn.addEventListener('click', () => this.refreshConnection());
    }
    setupElectronListeners() {
        window.electronAPI.onConnectionStatus((status) => {
            this.updateConnectionStatus(status.connected);
        });
        window.electronAPI.onHostStatus((status) => {
            this.updateHostStatus(status.registered, status.hostId, status.pending);
        });
        window.electronAPI.onConnectionRequest((requestInfo) => {
            this.showConnectionRequest(requestInfo);
        });
        window.electronAPI.onScreenShareStatus((status) => {
            this.updateShareStatus(status.active);
        });
        window.electronAPI.onControlCommand((command) => {
            this.logActivity(`Remote control: ${command.key} (${command.type})`);
        });
        window.electronAPI.onWebRTCSignal((signal) => {
            this.handleWebRTCSignal(signal);
        });
    }
    async loadScreenSources() {
        try {
            // 
            const sources = await window.electronAPI.getScreenSources();
            this.renderScreenSources(sources);
        }
        catch (error) {
            this.logActivity(`Failed to load screen sources: ${error}`);
        }
    }
    renderScreenSources(sources) {
        const container = document.getElementById('screen-sources');
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
    async selectScreenSource(sourceId, element) {
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
                        this.localStream.getTracks().forEach(track => {
                            pc.addTrack(track, this.localStream);
                        });
                    });
                }
            }
            else {
                this.logActivity(`Failed to start screen sharing: ${result.error}`);
            }
        }
        catch (error) {
            this.logActivity(`Screen sharing error: ${error}`);
        }
    }
    async autoSelectScreenSource() {
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
                        this.localStream.getTracks().forEach(track => {
                            pc.addTrack(track, this.localStream);
                        });
                    });
                }
            }
            else {
                this.logActivity(`Failed to auto-start screen sharing: ${result.error}`);
            }
        }
        catch (error) {
            console.error('❌ Auto screen selection error:', error);
            this.logActivity(`Auto screen selection error: ${error}`);
        }
    }
    async joinRoom() {
        // This method is no longer needed in host mode
        this.logActivity('Host automatically registers when connected');
    }
    async leaveRoom() {
        // This method is no longer needed in host mode  
        this.logActivity('Host automatically manages connections');
    }
    async stopScreenShare() {
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
        }
        catch (error) {
            this.logActivity(`Failed to stop screen sharing: ${error}`);
        }
    }
    renderAllowedKeys() {
        const container = document.getElementById('allowed-keys');
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
    async toggleAllowedKey(key, allowed) {
        if (allowed) {
            this.allowedKeys.add(key);
        }
        else {
            this.allowedKeys.delete(key);
        }
        try {
            // 
            const result = await window.electronAPI.updateAllowedKeys(Array.from(this.allowedKeys));
            if (result.success) {
                this.logActivity(`Updated allowed keys: ${Array.from(this.allowedKeys).join(', ')}`);
            }
        }
        catch (error) {
            this.logActivity(`Failed to update allowed keys: ${error}`);
        }
    }
    updateConnectionStatus(connected) {
        this.isConnected = connected;
        const statusDot = document.getElementById('connection-status');
        const statusText = document.getElementById('connection-text');
        statusDot.className = `status-dot ${connected ? 'connected' : ''}`;
        statusText.textContent = connected ? 'Connected' : 'Disconnected';
        this.logActivity(`Connection ${connected ? 'established' : 'lost'}`);
    }
    updateRoomStatus(joined, roomId) {
        // Legacy method - now replaced with updateHostStatus
        this.updateHostStatus(joined, roomId);
    }
    updateHostStatus(registered, hostId, pending) {
        this.isRegistered = registered;
        this.hostId = hostId;
        const statusDot = document.getElementById('host-status');
        const statusText = document.getElementById('host-text');
        const hostIdElement = document.getElementById('host-id');
        statusDot.className = `status-dot ${registered ? 'connected' : ''}`;
        if (pending) {
            statusText.textContent = `Registering: ${hostId}`;
            hostIdElement.textContent = `${hostId} (pending...)`;
        }
        else {
            statusText.textContent = registered ? `Registered: ${hostId}` : 'Not registered';
            hostIdElement.textContent = hostId || 'Not registered';
        }
    }
    showConnectionRequest(requestInfo) {
        this.pendingRequests.set(requestInfo.clientId, requestInfo);
        this.renderConnectionRequests();
        this.logActivity(`Connection request from client: ${requestInfo.clientId}`);
    }
    renderConnectionRequests() {
        const container = document.getElementById('connection-requests');
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
    async approveConnection(clientId) {
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
        }
        catch (error) {
            this.logActivity(`Failed to approve connection: ${error}`);
        }
    }
    async denyConnection(clientId) {
        try {
            const result = await window.electronAPI.denyConnection(clientId);
            if (result.success) {
                this.pendingRequests.delete(clientId);
                this.renderConnectionRequests();
                this.logActivity(`Denied connection for client: ${clientId}`);
            }
        }
        catch (error) {
            this.logActivity(`Failed to deny connection: ${error}`);
        }
    }
    async updateClientCount() {
        try {
            const hostInfo = await window.electronAPI.getHostInfo();
            const clientCountElement = document.getElementById('client-count');
            clientCountElement.textContent = hostInfo.connectedClients.length.toString();
        }
        catch (error) {
            this.logActivity(`Failed to get host info: ${error}`);
        }
    }
    async refreshConnection() {
        try {
            this.logActivity('Refreshing connection to signaling server...');
            const result = await window.electronAPI.refreshConnection();
            if (result.success) {
                this.logActivity('Connection refresh initiated');
            }
            else {
                this.logActivity(`Failed to refresh connection: ${result.error}`);
            }
        }
        catch (error) {
            this.logActivity(`Connection refresh error: ${error}`);
        }
    }
    updateShareStatus(active) {
        this.isSharing = active;
        const statusDot = document.getElementById('share-status');
        const statusText = document.getElementById('share-text');
        const stopBtn = document.getElementById('stop-sharing-btn');
        statusDot.className = `status-dot ${active ? 'connected' : ''}`;
        statusText.textContent = active ? 'Sharing' : 'Not sharing';
        stopBtn.disabled = !active;
    }
    logActivity(message) {
        const logs = document.getElementById('logs');
        const timestamp = new Date().toLocaleTimeString();
        const logLine = document.createElement('div');
        logLine.textContent = `[${timestamp}] ${message}`;
        logs.appendChild(logLine);
        logs.scrollTop = logs.scrollHeight;
    }
    async handleWebRTCSignal(signal) {
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
                            peerConnection.addTrack(track, this.localStream);
                        });
                    }
                    else {
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
                        }
                        catch (err) {
                            console.error('❌ Failed to add ICE candidate:', err);
                        }
                    }
                    else {
                        console.warn('⚠️ Empty or invalid ICE candidate received');
                    }
                    break;
                default:
                    console.warn('❓ Unknown WebRTC signal type:', signal.type);
            }
        }
        catch (error) {
            console.error('❌ Error handling WebRTC signal:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('📋 Error details:', errorMessage);
            this.logActivity(`WebRTC error: ${errorMessage}`);
        }
    }
    async createPeerConnection(clientId) {
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
            }
            else if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
                this.peerConnections.delete(clientId);
                this.connectedClients.delete(clientId);
            }
        };
        return peerConnection;
    }
    async getScreenStream(sourceId) {
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
        }
        catch (error) {
            console.error('❌ Error getting screen stream:', error);
            return null;
        }
    }
}
// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new HostAppUI();
});
