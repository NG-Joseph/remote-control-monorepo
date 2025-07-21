export const DEFAULT_WEBRTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
    iceTransportPolicy: 'all',
    bundlePolicy: 'balanced',
};
export class WebRTCPeerConnection {
    peerConnection;
    dataChannel;
    constructor(config = DEFAULT_WEBRTC_CONFIG, handlers = {}) {
        this.peerConnection = new RTCPeerConnection(config);
        this.setupEventHandlers(handlers);
    }
    setupEventHandlers(handlers) {
        this.peerConnection.onicecandidate = event => {
            if (event.candidate && handlers.onIceCandidate) {
                handlers.onIceCandidate(event.candidate);
            }
        };
        this.peerConnection.onconnectionstatechange = () => {
            if (handlers.onConnectionStateChange) {
                handlers.onConnectionStateChange(this.peerConnection.connectionState);
            }
        };
        this.peerConnection.ondatachannel = event => {
            if (handlers.onDataChannel) {
                handlers.onDataChannel(event.channel);
            }
        };
        this.peerConnection.ontrack = event => {
            if (handlers.onTrack) {
                handlers.onTrack(event);
            }
        };
        this.peerConnection.oniceconnectionstatechange = () => {
            if (handlers.onIceConnectionStateChange) {
                handlers.onIceConnectionStateChange(this.peerConnection.iceConnectionState);
            }
        };
    }
    async createOffer() {
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        return {
            type: offer.type,
            sdp: offer.sdp,
        };
    }
    async createAnswer(offer) {
        await this.peerConnection.setRemoteDescription(offer);
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        return {
            type: answer.type,
            sdp: answer.sdp,
        };
    }
    async setRemoteAnswer(answer) {
        await this.peerConnection.setRemoteDescription(answer);
    }
    async addIceCandidate(candidate) {
        if (candidate.candidate) {
            await this.peerConnection.addIceCandidate(candidate);
        }
    }
    createDataChannel(label, options) {
        this.dataChannel = this.peerConnection.createDataChannel(label, options);
        return this.dataChannel;
    }
    getDataChannel() {
        return this.dataChannel;
    }
    setDataChannel(channel) {
        this.dataChannel = channel;
    }
    getConnectionState() {
        return this.peerConnection.connectionState;
    }
    getIceConnectionState() {
        return this.peerConnection.iceConnectionState;
    }
    close() {
        this.dataChannel?.close();
        this.peerConnection.close();
    }
    addTrack(track, ...streams) {
        return this.peerConnection.addTrack(track, ...streams);
    }
    removeTrack(sender) {
        this.peerConnection.removeTrack(sender);
    }
    getSenders() {
        return this.peerConnection.getSenders();
    }
    getReceivers() {
        return this.peerConnection.getReceivers();
    }
}
// Utility functions for message handling
export function generateMessageId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
// Re-export shared types
export * from '@remote-control/shared-dto';
//# sourceMappingURL=index.js.map