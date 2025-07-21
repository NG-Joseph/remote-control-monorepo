import type {
  RTCSessionDescriptionInit,
  RTCIceCandidateInit
} from '@remote-control/shared-dto';

export interface WebRTCConfig {
  iceServers?: RTCIceServer[];
  iceTransportPolicy?: RTCIceTransportPolicy;
  bundlePolicy?: RTCBundlePolicy;
}

export const DEFAULT_WEBRTC_CONFIG: WebRTCConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  iceTransportPolicy: 'all',
  bundlePolicy: 'balanced',
};

export interface PeerConnectionHandlers {
  onIceCandidate?: (candidate: RTCIceCandidate) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onDataChannel?: (channel: RTCDataChannel) => void;
  onTrack?: (event: RTCTrackEvent) => void;
  onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
}

export class WebRTCPeerConnection {
  private peerConnection: RTCPeerConnection;
  private dataChannel?: RTCDataChannel;

  constructor(
    config: WebRTCConfig = DEFAULT_WEBRTC_CONFIG,
    handlers: PeerConnectionHandlers = {}
  ) {
    this.peerConnection = new RTCPeerConnection(config);
    this.setupEventHandlers(handlers);
  }

  private setupEventHandlers(handlers: PeerConnectionHandlers): void {
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
        handlers.onIceConnectionStateChange(
          this.peerConnection.iceConnectionState
        );
      }
    };
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return {
      type: offer.type as 'offer',
      sdp: offer.sdp,
    };
  }

  async createAnswer(
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit> {
    await this.peerConnection.setRemoteDescription(offer);
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return {
      type: answer.type as 'answer',
      sdp: answer.sdp,
    };
  }

  async setRemoteAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    await this.peerConnection.setRemoteDescription(answer);
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (candidate.candidate) {
      await this.peerConnection.addIceCandidate(candidate);
    }
  }

  createDataChannel(label: string, options?: RTCDataChannelInit): RTCDataChannel {
    this.dataChannel = this.peerConnection.createDataChannel(label, options);
    return this.dataChannel;
  }

  getDataChannel(): RTCDataChannel | undefined {
    return this.dataChannel;
  }

  setDataChannel(channel: RTCDataChannel): void {
    this.dataChannel = channel;
  }

  getConnectionState(): RTCPeerConnectionState {
    return this.peerConnection.connectionState;
  }

  getIceConnectionState(): RTCIceConnectionState {
    return this.peerConnection.iceConnectionState;
  }

  close(): void {
    this.dataChannel?.close();
    this.peerConnection.close();
  }

  addTrack(track: MediaStreamTrack, ...streams: MediaStream[]): RTCRtpSender {
    return this.peerConnection.addTrack(track, ...streams);
  }

  removeTrack(sender: RTCRtpSender): void {
    this.peerConnection.removeTrack(sender);
  }

  getSenders(): RTCRtpSender[] {
    return this.peerConnection.getSenders();
  }

  getReceivers(): RTCRtpReceiver[] {
    return this.peerConnection.getReceivers();
  }
}

// Utility functions for message handling
export function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Re-export shared types
export * from '@remote-control/shared-dto';
