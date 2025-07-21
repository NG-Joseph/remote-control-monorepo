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
} from '../types/shared-dto';
import type {
  RTCSessionDescriptionInit,
  RTCIceCandidateInit
} from '../types/shared-dto';

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

  // Control commands
  sendCommand: (hostId: string, command: any) => void;

  // WebRTC signaling
  sendOffer: (hostId: string, offer: RTCSessionDescriptionInit) => void;
  sendAnswer: (hostId: string, answer: RTCSessionDescriptionInit) => void;
  sendIceCandidate: (hostId: string, candidate: RTCIceCandidateInit) => void;

  // Event handlers (set by useWebRTC hook)
  onOffer?: (hostId: string, offer: RTCSessionDescriptionInit) => void;
  onAnswer?: (hostId: string, answer: RTCSessionDescriptionInit) => void;
  onIceCandidate?: (hostId: string, candidate: RTCIceCandidateInit) => void;
  onConnectionApproved?: (hostId: string) => void;
  setOfferHandler: (handler: (hostId: string, offer: RTCSessionDescriptionInit) => void) => void;
  setAnswerHandler: (handler: (hostId: string, answer: RTCSessionDescriptionInit) => void) => void;
  setIceCandidateHandler: (handler: (hostId: string, candidate: RTCIceCandidateInit) => void) => void;
  setConnectionApprovedHandler: (handler: (hostId: string) => void) => void;
}

const DEFAULT_SERVER_URL = 'http://localhost:3000';

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
  const connectionApprovedHandlerRef = useRef<((hostId: string) => void) | undefined>(undefined);

  const connect = useCallback(() => {
    // If already connected or connecting, don't create a new connection
    if (socketRef.current?.connected || isConnecting) return;

    // Clean up any existing socket before creating a new one
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setIsConnecting(true);
    setError(null);

    console.log('Attempting to connect to:', serverUrl);
    const socket = io(serverUrl, {
      path: '/signal', // Ensure the correct path for signaling
      transports: ['websocket', 'polling'],
      forceNew: false, // Changed to false to reuse connections
      timeout: 10000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 3,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to signaling server');
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
      
      // Register as a mobile client immediately after connection
      socket.emit('register_client', { clientId: clientIdRef.current });
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
    socket.on('hosts_updated', (data: Array<{ hostId: string; allowedKeys: string[] }>) => {
      console.log('Received hosts list:', data);
      // Convert server format to HostInfo format
      const hostInfos: HostInfo[] = data.map(host => ({
        id: host.hostId,
        name: host.hostId, // Use hostId as name for now
        os: 'Unknown',
        lastSeen: new Date().toISOString(),
        allowedKeys: host.allowedKeys
      }));
      setHosts(hostInfos);
      setIsLoadingHosts(false);
    });

    // Handle connection approval
    socket.on('connection_approved', (data: { hostId: string; clientId: string }) => {
      console.log(`🎉 Connection approved by host ${data.hostId} for client ${data.clientId}`);
      console.log('Approval data:', data);
      // Trigger connection approved callback if set
      if (connectionApprovedHandlerRef.current) {
        console.log('🔄 Calling connection approved handler...');
        connectionApprovedHandlerRef.current(data.hostId);
      } else {
        console.warn('⚠️ No connection approved handler set!');
      }
    });

    // Handle WebRTC signaling messages
    socket.on('signal', (payload: any) => {
      console.log(`Received ${payload.type} signal from ${payload.fromId}:`, payload);
      
      switch (payload.type) {
        case 'offer':
          if (offerHandlerRef.current) {
            offerHandlerRef.current(payload.fromId, payload.offer);
          }
          break;
        case 'answer':
          if (answerHandlerRef.current) {
            answerHandlerRef.current(payload.fromId, payload.answer);
          }
          break;
        case 'ice-candidate':
          if (iceCandidateHandlerRef.current) {
            iceCandidateHandlerRef.current(payload.fromId, payload.candidate);
          }
          break;
        default:
          console.warn('Unknown signal type:', payload.type);
      }
    });

    socketRef.current = socket;
  }, [serverUrl]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('Disconnecting from signaling server...');
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setHosts([]);
    setError(null);
  }, []);

  const refreshHosts = useCallback(() => {
    if (!socketRef.current?.connected) {
      setError('Not connected to signaling server');
      return;
    }

    setIsLoadingHosts(true);
    setError(null);

    console.log('Requesting hosts list...');
    const response = socketRef.current.emit('list_hosts', (response: any) => {
      if (response && response.data) {
        console.log('Received hosts list response:', response.data);
        // Convert server format to HostInfo format
        const hostInfos: HostInfo[] = response.data.map((host: { hostId: string; allowedKeys: string[] }) => ({
          id: host.hostId,
          name: host.hostId, // Use hostId as name for now
          os: 'Unknown',
          lastSeen: new Date().toISOString(),
          allowedKeys: host.allowedKeys
        }));
        setHosts(hostInfos);
        setIsLoadingHosts(false);
      }
    });
  }, []);

  const connectToHost = useCallback(async (hostId: string): Promise<boolean> => {
    if (!socketRef.current?.connected) {
      setError('Not connected to signaling server');
      return false;
    }

    const payload = {
      hostId,
      clientId: clientIdRef.current
    };

    socketRef.current.emit('connect_request', payload);
    return true;
  }, []);

  // WebRTC signaling methods
  const sendOffer = useCallback((hostId: string, offer: RTCSessionDescriptionInit) => {
    if (!socketRef.current?.connected) {
      console.error('Cannot send offer: not connected to signaling server');
      return;
    }

    const payload = {
      type: 'offer',
      fromId: clientIdRef.current,
      targetId: hostId,
      offer
    };

    socketRef.current.emit('signal', payload);
  }, []);

  const sendAnswer = useCallback((hostId: string, answer: RTCSessionDescriptionInit) => {
    if (!socketRef.current?.connected) {
      console.error('Cannot send answer: not connected to signaling server');
      return;
    }

    const payload = {
      type: 'answer',
      fromId: clientIdRef.current,
      targetId: hostId,
      answer
    };

    socketRef.current.emit('signal', payload);
  }, []);

  const sendIceCandidate = useCallback((hostId: string, candidate: RTCIceCandidateInit) => {
    if (!socketRef.current?.connected) {
      console.error('Cannot send ICE candidate: not connected to signaling server');
      return;
    }

    const payload = {
      type: 'ice-candidate',
      fromId: clientIdRef.current,
      targetId: hostId,
      candidate
    };

    socketRef.current.emit('signal', payload);
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

  const setConnectionApprovedHandler = useCallback((handler: (hostId: string) => void) => {
    connectionApprovedHandlerRef.current = handler;
  }, []);

  const sendCommand = useCallback((hostId: string, command: any) => {
    if (!socketRef.current?.connected) {
      console.error('Cannot send command: not connected to signaling server');
      return;
    }

    let commandName = command.command || command.key;
    
    // Handle mouse commands
    if (command.type === 'mouse' && command.action) {
      commandName = `mouse_${command.action}`;
    }
    
    // Handle scroll commands  
    if (command.type === 'scroll' && command.direction) {
      commandName = `scroll_${command.direction}`;
    }

    const payload = {
      hostId,
      clientId: clientIdRef.current,
      command: commandName,
      type: command.type || 'key',
      // Include additional data for mouse/scroll commands
      ...(command.x !== undefined && { x: command.x }),
      ...(command.y !== undefined && { y: command.y }),
      ...(command.button && { button: command.button }),
      ...(command.magnitude && { magnitude: command.magnitude })
    };

    console.log('Sending command via signaling server:', payload);
    socketRef.current.emit('command', payload);
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

    // Control commands
    sendCommand,

    // WebRTC signaling
    sendOffer,
    sendAnswer,
    sendIceCandidate,

    // Event handlers
    onOffer: offerHandlerRef.current,
    onAnswer: answerHandlerRef.current,
    onIceCandidate: iceCandidateHandlerRef.current,
    onConnectionApproved: connectionApprovedHandlerRef.current,
    setOfferHandler,
    setAnswerHandler,
    setIceCandidateHandler,
    setConnectionApprovedHandler
  };
}
