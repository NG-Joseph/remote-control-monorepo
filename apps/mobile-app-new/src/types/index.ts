/**
 * @fileoverview Type definitions for React Native WebRTC and mobile app
 */

import type {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  MediaStream,
  MediaStreamTrack
} from 'react-native-webrtc';

// Re-export WebRTC types for consistency
export type {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  MediaStream,
  MediaStreamTrack
} from 'react-native-webrtc';

// Define missing types that react-native-webrtc doesn't export
export type RTCPeerConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';

export interface RTCConfiguration {
  iceServers?: RTCIceServer[];
  iceTransportPolicy?: 'all' | 'relay';
  bundlePolicy?: 'balanced' | 'max-bundle' | 'max-compat';
}

export interface RTCIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface RTCDataChannel {
  readyState: 'connecting' | 'open' | 'closing' | 'closed';
  send: (data: string | ArrayBuffer | Blob) => void;
  close: () => void;
  onopen?: ((event: Event) => void) | null;
  onmessage?: ((event: MessageEvent) => void) | null;
  onerror?: ((event: Event) => void) | null;
  onclose?: ((event: Event) => void) | null;
}

// Touch input types for mobile control
export interface TouchInput {
  x: number;
  y: number;
  force?: number;
  timestamp: number;
}

export interface TouchGesture {
  type: 'tap' | 'drag' | 'pinch' | 'swipe';
  startPoint: TouchInput;
  currentPoint?: TouchInput;
  endPoint?: TouchInput;
  velocity?: { x: number; y: number };
  scale?: number;
  rotation?: number;
}

export interface KeyboardInput {
  key: string;
  action: 'press' | 'release';
  modifiers?: string[];
}

export interface ControlCommand {
  type: 'touch' | 'keyboard' | 'system' | 'key' | 'mouse' | 'scroll';
  data?: TouchGesture | KeyboardInput | SystemCommand | MouseCommand | ScrollCommand;
  command?: string; // For backward compatibility
  key?: string; // For backward compatibility
  action?: string; // For mouse actions
  x?: number; // For mouse coordinates
  y?: number; // For mouse coordinates
  button?: string; // For mouse button
  direction?: string; // For scroll direction
  magnitude?: number; // For scroll magnitude
  timestamp: number;
}

export interface MouseCommand {
  action: 'move' | 'click' | 'down' | 'up' | 'drag';
  x?: number;
  y?: number;
  button?: 'left' | 'right' | 'middle';
}

export interface ScrollCommand {
  direction: 'up' | 'down';
  magnitude?: number;
}

export interface SystemCommand {
  action: 'back' | 'home' | 'menu' | 'power' | 'volume_up' | 'volume_down';
}

// Screen and display types
export interface ScreenDimensions {
  width: number;
  height: number;
  density: number;
}

export interface ViewportTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

// Navigation types for Expo Router
export interface SessionParams {
  hostId: string;
}

export interface RootStackParamList {
  index: undefined;
  'session/[hostId]': SessionParams;
}

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
