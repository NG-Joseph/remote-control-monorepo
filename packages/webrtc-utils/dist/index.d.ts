import type { RTCSessionDescriptionInit, RTCIceCandidateInit } from '@remote-control/shared-dto';
export interface WebRTCConfig {
    iceServers?: RTCIceServer[];
    iceTransportPolicy?: RTCIceTransportPolicy;
    bundlePolicy?: RTCBundlePolicy;
}
export declare const DEFAULT_WEBRTC_CONFIG: WebRTCConfig;
export interface PeerConnectionHandlers {
    onIceCandidate?: (candidate: RTCIceCandidate) => void;
    onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
    onDataChannel?: (channel: RTCDataChannel) => void;
    onTrack?: (event: RTCTrackEvent) => void;
    onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
}
export declare class WebRTCPeerConnection {
    private peerConnection;
    private dataChannel?;
    constructor(config?: WebRTCConfig, handlers?: PeerConnectionHandlers);
    private setupEventHandlers;
    createOffer(): Promise<RTCSessionDescriptionInit>;
    createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit>;
    setRemoteAnswer(answer: RTCSessionDescriptionInit): Promise<void>;
    addIceCandidate(candidate: RTCIceCandidateInit): Promise<void>;
    createDataChannel(label: string, options?: RTCDataChannelInit): RTCDataChannel;
    getDataChannel(): RTCDataChannel | undefined;
    setDataChannel(channel: RTCDataChannel): void;
    getConnectionState(): RTCPeerConnectionState;
    getIceConnectionState(): RTCIceConnectionState;
    close(): void;
    addTrack(track: MediaStreamTrack, ...streams: MediaStream[]): RTCRtpSender;
    removeTrack(sender: RTCRtpSender): void;
    getSenders(): RTCRtpSender[];
    getReceivers(): RTCRtpReceiver[];
}
export declare function generateMessageId(): string;
export * from '@remote-control/shared-dto';
//# sourceMappingURL=index.d.ts.map