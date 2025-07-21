/**
 * @fileoverview Temporary shared DTOs for mobile app development
 * This will be replaced with the proper shared-dto package when it's fixed
 */

// Message Types
export enum MessageType {
  REGISTER_HOST = 'register_host',
  HOST_REGISTERED = 'host_registered',
  GET_HOSTS = 'get_hosts',
  HOSTS_LIST = 'hosts_list',
  CONNECT_TO_HOST = 'connect_to_host',
  HOST_CONNECTED = 'host_connected',
  OFFER = 'offer',
  ANSWER = 'answer',
  ICE_CANDIDATE = 'ice-candidate'
}

// Host Information
export interface HostInfo {
  id: string;
  name: string;
  os: string;
  version?: string;
  ipAddress?: string;
  lastSeen: string;
  supportedFeatures?: string[];
  allowedKeys?: string[];
}

// WebRTC Types
export interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp?: string;
}

export interface RTCIceCandidateInit {
  candidate?: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
}

// Message Interfaces
export interface BaseMessage {
  type: MessageType;
}

export interface RegisterHostMessage extends BaseMessage {
  type: MessageType.REGISTER_HOST;
  hostInfo: Omit<HostInfo, 'id' | 'lastSeen'>;
}

export interface HostRegisteredMessage extends BaseMessage {
  type: MessageType.HOST_REGISTERED;
  hostId: string;
  success: boolean;
  message?: string;
}

export interface GetHostsMessage extends BaseMessage {
  type: MessageType.GET_HOSTS;
}

export interface HostsListMessage extends BaseMessage {
  type: MessageType.HOSTS_LIST;
  hosts: HostInfo[];
}

export interface ConnectToHostMessage extends BaseMessage {
  type: MessageType.CONNECT_TO_HOST;
  hostId: string;
  clientId: string;
}

export interface HostConnectedMessage extends BaseMessage {
  type: MessageType.HOST_CONNECTED;
  success: boolean;
  message?: string;
  roomId?: string;
}

export interface OfferMessage extends BaseMessage {
  type: MessageType.OFFER;
  roomId: string;
  offer: RTCSessionDescriptionInit;
}

export interface AnswerMessage extends BaseMessage {
  type: MessageType.ANSWER;
  roomId: string;
  answer: RTCSessionDescriptionInit;
}

export interface ICECandidateMessage extends BaseMessage {
  type: MessageType.ICE_CANDIDATE;
  roomId: string;
  candidate: RTCIceCandidateInit;
}
