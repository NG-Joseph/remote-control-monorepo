/**
 * @fileoverview WebRTC peer connection hook for remote control sessions
 * 
 * Manages WebRTC peer connections, handles video streaming, and coordinates
 * with signaling for establishing connections to remote hosts.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  RTCPeerConnection, 
  RTCSessionDescription, 
  RTCIceCandidate, 
  MediaStream
} from 'react-native-webrtc';
import type {
  RTCSessionDescriptionInit,
  RTCIceCandidateInit
} from '@remote-control/shared-dto';
import type { RTCPeerConnectionState } from '../types';
import type { UseSignalingReturn } from './useSignaling';

export interface UseWebRTCProps {
  signaling: UseSignalingReturn;
  hostId?: string;
}

export interface UseWebRTCReturn {
  // Connection state
  connectionState: RTCPeerConnectionState;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;

  // Media streams
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;

  // Connection management
  initiateConnection: (hostId: string) => Promise<void>;
  closeConnection: () => void;

  // Control commands
  sendControlCommand: (command: any) => void;
}

export function useWebRTC({ signaling, hostId }: UseWebRTCProps): UseWebRTCReturn {
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<any>(null);
  const currentHostIdRef = useRef<string | null>(null);

  const isConnected = connectionState === 'connected';

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    console.log('Creating peer connection');

    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const pc = new RTCPeerConnection(config);

    // Connection state monitoring - using on* properties instead of addEventListener
    (pc as any).onconnectionstatechange = () => {
      const state = (pc as any).connectionState || 'new';
      console.log('Connection state changed:', state);
      setConnectionState(state);
      
      if (state === 'failed' || state === 'disconnected') {
        setError('Connection lost');
      }
    };

    // ICE candidate handling
    (pc as any).onicecandidate = (event: any) => {
      if (event.candidate && currentHostIdRef.current) {
        console.log('Sending ICE candidate to host:', currentHostIdRef.current);
        signaling.sendIceCandidate(currentHostIdRef.current, {
          candidate: event.candidate.candidate,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          sdpMid: event.candidate.sdpMid
        });
      }
    };

    // Track handling (for receiving video stream)
    (pc as any).onaddstream = (event: any) => {
      console.log('Received remote stream:', event.stream);
      if (event.stream) {
        setRemoteStream(event.stream);
      }
    };

    // Data channel
    (pc as any).ondatachannel = (event: any) => {
      console.log('Received data channel');
      const dataChannel = event.channel;
      
      dataChannel.onopen = () => {
        console.log('Data channel opened');
      };
      
      dataChannel.onmessage = (msgEvent: any) => {
        console.log('Data channel message:', msgEvent.data);
      };
      
      dataChannelRef.current = dataChannel;
    };

    return pc;
  }, [signaling]);

  // Handle incoming offer
  const handleOffer = useCallback(async (hostId: string, offer: RTCSessionDescriptionInit) => {
    console.log('Handling offer from host:', hostId);
    
    if (!peerConnectionRef.current) {
      peerConnectionRef.current = createPeerConnection();
      currentHostIdRef.current = hostId;
    }

    try {
      const sessionDesc = new RTCSessionDescription({
        type: offer.type,
        sdp: offer.sdp || ''
      });
      
      await peerConnectionRef.current.setRemoteDescription(sessionDesc);
      
      // Create answer
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      
      // Send answer back to host
      signaling.sendAnswer(hostId, {
        type: answer.type,
        sdp: answer.sdp
      });
    } catch (err) {
      console.error('Error handling offer:', err);
      setError(`Failed to handle offer: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [createPeerConnection, signaling]);

  // Handle incoming answer
  const handleAnswer = useCallback(async (hostId: string, answer: RTCSessionDescriptionInit) => {
    console.log('Handling answer from host:', hostId);
    
    if (!peerConnectionRef.current) {
      console.error('No peer connection available for answer');
      return;
    }

    try {
      const sessionDesc = new RTCSessionDescription({
        type: answer.type,
        sdp: answer.sdp || ''
      });
      
      await peerConnectionRef.current.setRemoteDescription(sessionDesc);
    } catch (err) {
      console.error('Error handling answer:', err);
      setError(`Failed to handle answer: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, []);

  // Handle incoming ICE candidate
  const handleIceCandidate = useCallback(async (hostId: string, candidate: RTCIceCandidateInit) => {
    console.log('Handling ICE candidate from host:', hostId);
    
    if (!peerConnectionRef.current) {
      console.error('No peer connection available for ICE candidate');
      return;
    }

    try {
      const iceCandidate = new RTCIceCandidate({
        candidate: candidate.candidate || '',
        sdpMLineIndex: candidate.sdpMLineIndex,
        sdpMid: candidate.sdpMid
      });
      
      await peerConnectionRef.current.addIceCandidate(iceCandidate);
    } catch (err) {
      console.error('Error handling ICE candidate:', err);
      setError(`Failed to handle ICE candidate: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, []);

  // Initiate connection to host
  const initiateConnection = useCallback(async (targetHostId: string) => {
    console.log('Initiating connection to host:', targetHostId);
    setIsConnecting(true);
    setError(null);
    currentHostIdRef.current = targetHostId;

    try {
      // Connect to host through signaling server
      const connected = await signaling.connectToHost(targetHostId);
      if (!connected) {
        throw new Error('Failed to connect to host via signaling server');
      }

      // Create peer connection
      peerConnectionRef.current = createPeerConnection();

      // Create data channel for control commands
      const dataChannel = peerConnectionRef.current.createDataChannel('control', {
        ordered: true
      }) as any;
      
      dataChannel.onopen = () => {
        console.log('Control data channel opened');
      };
      
      dataChannel.onerror = (event: any) => {
        console.error('Data channel error:', event);
      };
      
      dataChannelRef.current = dataChannel;

      // Create offer
      const offer = await peerConnectionRef.current.createOffer({});
      await peerConnectionRef.current.setLocalDescription(offer);

      // Send offer to host
      signaling.sendOffer(targetHostId, {
        type: offer.type,
        sdp: offer.sdp
      });
      
      setIsConnecting(false);
    } catch (err) {
      console.error('Error initiating connection:', err);
      setError(`Failed to connect: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsConnecting(false);
    }
  }, [signaling, createPeerConnection]);

  // Close connection
  const closeConnection = useCallback(() => {
    console.log('Closing WebRTC connection');
    
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach((track: any) => track.stop());
      setLocalStream(null);
    }

    setRemoteStream(null);
    setConnectionState('closed');
    setIsConnecting(false);
    setError(null);
    currentHostIdRef.current = null;
  }, [localStream]);

  // Send control command
  const sendControlCommand = useCallback((command: any) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      console.log('Sending control command:', command);
      dataChannelRef.current.send(JSON.stringify(command));
    } else {
      console.warn('Data channel not available for sending commands');
    }
  }, []);

  // Set up signaling handlers
  useEffect(() => {
    signaling.setOfferHandler(handleOffer);
    signaling.setAnswerHandler(handleAnswer);
    signaling.setIceCandidateHandler(handleIceCandidate);
  }, [signaling, handleOffer, handleAnswer, handleIceCandidate]);

  // Auto-connect if hostId is provided
  useEffect(() => {
    if (hostId && signaling.isConnected && !isConnecting && !isConnected && !peerConnectionRef.current) {
      initiateConnection(hostId);
    }
  }, [hostId, signaling.isConnected, isConnecting, isConnected, initiateConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      closeConnection();
    };
  }, [closeConnection]);

  return {
    // Connection state
    connectionState,
    isConnecting,
    isConnected,
    error,

    // Media streams
    remoteStream,
    localStream,

    // Connection management
    initiateConnection,
    closeConnection,

    // Control commands
    sendControlCommand
  };
}
