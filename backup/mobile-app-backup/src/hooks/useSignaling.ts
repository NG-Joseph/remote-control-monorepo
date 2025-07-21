/**
 * @fileoverview WebSocket signaling hook for host discovery and connection management
 * 
 * Manages WebSocket connection to signaling server, handles host discovery,
 * and facilitates WebRTC signaling for remote control sessions.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  HostInfo,
  MessageType,
  RegisterHostMessage,
  HostRegisteredMessage,
  GetHostsMessage,
  HostsListMessage,
  ConnectToHostMessage,
  HostConnectedMessage,
  OfferMessage,
  AnswerMessage,
  ICECandidateMessage
} from '@remote-control/shared-dto';
import type {
  RTCSessionDescriptionInit,
  RTCIceCandidateInit
} from '@remote-control/shared-dto';

export interface UseSignalingProps {
  serverUrl?: string;
  autoConnect?: boolean;
}

export interface UseSignalingReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;

  // Host discovery
  hosts: HostInfo[];
  isLoadingHosts: boolean;

  // Connection management
  connect: () => void;
  disconnect: () => void;
  refreshHosts: () => void;
  connectToHost: (hostId: string) => Promise<boolean>;

  // WebRTC signaling
  sendOffer: (hostId: string, offer: RTCSessionDescriptionInit) => void;
  sendAnswer: (hostId: string, answer: RTCSessionDescriptionInit) => void;
  sendIceCandidate: (hostId: string, candidate: RTCIceCandidateInit) => void;

  // Event handlers (set by useWebRTC hook)
  onOffer?: (hostId: string, offer: RTCSessionDescriptionInit) => void;
  onAnswer?: (hostId: string, answer: RTCSessionDescriptionInit) => void;
  onIceCandidate?: (hostId: string, candidate: RTCIceCandidateInit) => void;
  setOfferHandler: (handler: (hostId: string, offer: RTCSessionDescriptionInit) => void) => void;
  setAnswerHandler: (handler: (hostId: string, answer: RTCSessionDescriptionInit) => void) => void;
  setIceCandidateHandler: (handler: (hostId: string, candidate: RTCIceCandidateInit) => void) => void;
}

const DEFAULT_SERVER_URL = 'http://localhost:3001';

export function useSignaling({ 
  serverUrl = DEFAULT_SERVER_URL, 
  autoConnect = true 
}: UseSignalingProps = {}): UseSignalingReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hosts, setHosts] = useState<HostInfo[]>([]);
  const [isLoadingHosts, setIsLoadingHosts] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const clientIdRef = useRef<string>(Math.random().toString(36).substring(7));

  // WebRTC signaling handlers
  const offerHandlerRef = useRef<((hostId: string, offer: RTCSessionDescriptionInit) => void) | undefined>(undefined);
  const answerHandlerRef = useRef<((hostId: string, answer: RTCSessionDescriptionInit) => void) | undefined>(undefined);
  const iceCandidateHandlerRef = useRef<((hostId: string, candidate: RTCIceCandidateInit) => void) | undefined>(undefined);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setIsConnecting(true);
    setError(null);

    const socket = io(`${serverUrl}/signal`, {
      transports: ['websocket'],
      forceNew: true,
    });

    socket.on('connect', () => {
      console.log('Connected to signaling server');
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from signaling server');
      setIsConnected(false);
      setIsConnecting(false);
      setHosts([]);
    });

    socket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError(`Connection failed: ${err.message}`);
      setIsConnecting(false);
    });

    // Handle host discovery messages
    socket.on('hosts_list', (message: HostsListMessage) => {
      console.log('Received hosts list:', message.hosts);
      setHosts(message.hosts);
      setIsLoadingHosts(false);
    });

    socket.on('host_connected', (message: HostConnectedMessage) => {
      console.log('Host connection response:', message);
      if (!message.success) {
        setError(`Failed to connect to host: ${message.message}`);
      }
    });

    // Handle WebRTC signaling messages
    socket.on('offer', (message: OfferMessage) => {
      console.log('Received offer from host:', message.roomId);
      if (offerHandlerRef.current) {
        offerHandlerRef.current(message.roomId, message.offer);
      }
    });

    socket.on('answer', (message: AnswerMessage) => {
      console.log('Received answer from host:', message.roomId);
      if (answerHandlerRef.current) {
        answerHandlerRef.current(message.roomId, message.answer);
      }
    });

    socket.on('ice-candidate', (message: ICECandidateMessage) => {
      console.log('Received ICE candidate from host:', message.roomId);
      if (iceCandidateHandlerRef.current) {
        iceCandidateHandlerRef.current(message.roomId, message.candidate);
      }
    });

    socketRef.current = socket;
  }, [serverUrl]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setHosts([]);
  }, []);

  const refreshHosts = useCallback(() => {
    if (!socketRef.current?.connected) {
      setError('Not connected to signaling server');
      return;
    }

    setIsLoadingHosts(true);
    setError(null);

    const message: GetHostsMessage = {
      type: MessageType.GET_HOSTS
    };

    socketRef.current.emit('get_hosts', message);
  }, []);

  const connectToHost = useCallback(async (hostId: string): Promise<boolean> => {
    if (!socketRef.current?.connected) {
      setError('Not connected to signaling server');
      return false;
    }

    const message: ConnectToHostMessage = {
      type: MessageType.CONNECT_TO_HOST,
      hostId,
      clientId: clientIdRef.current
    };

    socketRef.current.emit('connect_to_host', message);
    return true;
  }, []);

  // WebRTC signaling methods
  const sendOffer = useCallback((hostId: string, offer: RTCSessionDescriptionInit) => {
    if (!socketRef.current?.connected) {
      console.error('Cannot send offer: not connected to signaling server');
      return;
    }

    const message: OfferMessage = {
      type: MessageType.OFFER,
      roomId: hostId,
      offer
    };

    socketRef.current.emit('offer', message);
  }, []);

  const sendAnswer = useCallback((hostId: string, answer: RTCSessionDescriptionInit) => {
    if (!socketRef.current?.connected) {
      console.error('Cannot send answer: not connected to signaling server');
      return;
    }

    const message: AnswerMessage = {
      type: MessageType.ANSWER,
      roomId: hostId,
      answer
    };

    socketRef.current.emit('answer', message);
  }, []);

  const sendIceCandidate = useCallback((hostId: string, candidate: RTCIceCandidateInit) => {
    if (!socketRef.current?.connected) {
      console.error('Cannot send ICE candidate: not connected to signaling server');
      return;
    }

    const message: ICECandidateMessage = {
      type: MessageType.ICE_CANDIDATE,
      roomId: hostId,
      candidate
    };

    socketRef.current.emit('ice-candidate', message);
  }, []);

  // Handler setters for WebRTC hook
  const setOfferHandler = useCallback((handler: (hostId: string, offer: RTCSessionDescriptionInit) => void) => {
    offerHandlerRef.current = handler;
  }, []);

  const setAnswerHandler = useCallback((handler: (hostId: string, answer: RTCSessionDescriptionInit) => void) => {
    answerHandlerRef.current = handler;
  }, []);

  const setIceCandidateHandler = useCallback((handler: (hostId: string, candidate: RTCIceCandidateInit) => void) => {
    iceCandidateHandlerRef.current = handler;
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect, autoConnect]);

  // Auto-refresh hosts when connected
  useEffect(() => {
    if (isConnected) {
      refreshHosts();
    }
  }, [isConnected, refreshHosts]);

  return {
    // Connection state
    isConnected,
    isConnecting,
    error,

    // Host discovery
    hosts,
    isLoadingHosts,

    // Connection management
    connect,
    disconnect,
    refreshHosts,
    connectToHost,

    // WebRTC signaling
    sendOffer,
    sendAnswer,
    sendIceCandidate,

    // Event handlers
    onOffer: offerHandlerRef.current,
    onAnswer: answerHandlerRef.current,
    onIceCandidate: iceCandidateHandlerRef.current,
    setOfferHandler,
    setAnswerHandler,
    setIceCandidateHandler
  };
}
