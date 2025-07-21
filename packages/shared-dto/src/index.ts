// Common types for the remote control platform

// Message types enum
export enum MessageType {
  OFFER = 'offer',
  ANSWER = 'answer',
  ICE_CANDIDATE = 'ice-candidate',
  JOIN_ROOM = 'join-room',
  LEAVE_ROOM = 'leave-room',
  CONTROL_COMMAND = 'control-command',
  // Host discovery messages
  REGISTER_HOST = 'register-host',
  HOST_REGISTERED = 'host-registered',
  GET_HOSTS = 'get-hosts',
  HOSTS_LIST = 'hosts-list',
  CONNECT_TO_HOST = 'connect-to-host',
  HOST_CONNECTED = 'host-connected'
}

// WebRTC types (to avoid dependency on DOM types)
export interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer';
  sdp?: string;
}

export interface RTCIceCandidateInit {
  candidate?: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
}

export interface BaseMessage {
  type: MessageType;
  roomId: string;
}

// WebRTC signaling messages
export interface RoomJoinMessage extends BaseMessage {
  type: MessageType.JOIN_ROOM;
  role: 'host' | 'client';
}

export interface RoomLeaveMessage extends BaseMessage {
  type: MessageType.LEAVE_ROOM;
}

export interface OfferMessage extends BaseMessage {
  type: MessageType.OFFER;
  offer: RTCSessionDescriptionInit;
}

export interface AnswerMessage extends BaseMessage {
  type: MessageType.ANSWER;
  answer: RTCSessionDescriptionInit;
}

export interface ICECandidateMessage extends BaseMessage {
  type: MessageType.ICE_CANDIDATE;
  candidate: RTCIceCandidateInit;
}

// Host discovery messages
export interface RegisterHostMessage {
  type: MessageType.REGISTER_HOST;
  hostId: string;
  hostName: string;
  capabilities: string[];
}

export interface HostRegisteredMessage {
  type: MessageType.HOST_REGISTERED;
  hostId: string;
  success: boolean;
  message?: string;
}

export interface GetHostsMessage {
  type: MessageType.GET_HOSTS;
}

export interface HostsListMessage {
  type: MessageType.HOSTS_LIST;
  hosts: HostInfo[];
}

export interface ConnectToHostMessage {
  type: MessageType.CONNECT_TO_HOST;
  hostId: string;
  clientId: string;
}

export interface HostConnectedMessage {
  type: MessageType.HOST_CONNECTED;
  hostId: string;
  clientId: string;
  success: boolean;
  message?: string;
}

// Host information
export interface HostInfo {
  id: string;
  name: string;
  capabilities: string[];
  isOnline: boolean;
  lastSeen: number;
}

// Control command message
export interface ControlCommand extends BaseMessage {
  type: MessageType.CONTROL_COMMAND;
  key: string;
  commandType: 'keydown' | 'keyup' | 'click' | 'move';
  x?: number;
  y?: number;
}

// Unified WebRTC message type
export type WebRTCMessage = 
  | RoomJoinMessage 
  | RoomLeaveMessage 
  | OfferMessage 
  | AnswerMessage 
  | ICECandidateMessage 
  | ControlCommand
  | RegisterHostMessage
  | HostRegisteredMessage
  | GetHostsMessage
  | HostsListMessage
  | ConnectToHostMessage
  | HostConnectedMessage;

// Room and user management
export interface Room {
  id: string;
  name: string;
  createdAt: number;
  controller?: User;
  controlled?: User;
  isActive: boolean;
}

export interface User {
  id: string;
  name: string;
  role: 'controller' | 'controlled';
  joinedAt: number;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface RoomListResponse extends ApiResponse<Room[]> {}
export interface CreateRoomResponse extends ApiResponse<Room> {}
export interface JoinRoomResponse extends ApiResponse<{ room: Room; user: User }> {}

// Touch and gesture commands for mobile
export interface TouchCommand {
  x: number;
  y: number;
  action: 'down' | 'up' | 'move';
}

export interface KeyCommand {
  key: string;
  action: 'down' | 'up';
  modifiers?: string[];
}

export interface GestureCommand {
  type: 'swipe' | 'pinch' | 'rotate';
  data: SwipeGesture | PinchGesture | RotateGesture;
}

export interface SwipeGesture {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  duration: number;
}

export interface PinchGesture {
  centerX: number;
  centerY: number;
  scale: number;
}

export interface RotateGesture {
  centerX: number;
  centerY: number;
  rotation: number;
}
