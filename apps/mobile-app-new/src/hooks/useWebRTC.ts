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
} from '../types/shared-dto';
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

  // Debug remote stream changes
  useEffect(() => {
    if (remoteStream) {
      console.log('🎊 Remote stream state changed to:', remoteStream);
      console.log('🎥 Remote stream tracks:', remoteStream.getTracks().length);
      console.log('📊 Remote stream active:', remoteStream.active);
    } else {
      console.log('❌ Remote stream is null');
    }
  }, [remoteStream]);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<any>(null);
  const currentHostIdRef = useRef<string | null>(null);
  const pendingIceCandidates = useRef<RTCIceCandidateInit[]>([]);
  const pendingConnectionRef = useRef<string | null>(null);

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
      console.log('🔄 Connection state changed:', state);
      setConnectionState(state);
      
      if (state === 'connected') {
        console.log('✅ WebRTC connection established!');
        setIsConnecting(false);
        setError(null);
      } else if (state === 'failed' || state === 'disconnected') {
        console.log('❌ WebRTC connection failed/disconnected');
        setError('Connection lost');
        setIsConnecting(false);
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

    // Track handling (for receiving video stream) - using modern ontrack API
    (pc as any).ontrack = (event: any) => {
      console.log('🎬 Received remote track:', event.track.kind, event.track.label);
      console.log('📦 Stream count:', event.streams.length);
      console.log('📊 Track readyState:', event.track.readyState);
      console.log('📹 Track enabled:', event.track.enabled);
      
      if (event.streams && event.streams.length > 0) {
        const stream = event.streams[0];
        console.log('✅ Setting remote stream with tracks:', stream.getTracks().length);
        console.log('🎥 Stream ID:', stream.id);
        console.log('🔊 Stream active:', stream.active);
        
        // Log each track
        stream.getTracks().forEach((track: any, index: number) => {
          console.log(`Track ${index}: ${track.kind} - ${track.label} - enabled: ${track.enabled} - readyState: ${track.readyState}`);
        });
        
        setRemoteStream(stream);
      } else {
        console.warn('⚠️ No streams in track event');
      }
    };

    // Legacy fallback for older implementations
    (pc as any).onaddstream = (event: any) => {
      console.log('📺 Received remote stream (legacy):', event.stream);
      if (event.stream) {
        console.log('✅ Setting remote stream (legacy) with tracks:', event.stream.getTracks().length);
        console.log('🎥 Stream ID (legacy):', event.stream.id);
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

    // Add a video transceiver to indicate we want to receive video
    try {
      console.log('📺 Adding video transceiver for receiving video...');
      (pc as any).addTransceiver('video', { direction: 'recvonly' });
      console.log('✅ Video transceiver added');
    } catch (err) {
      console.warn('⚠️ Failed to add video transceiver:', err);
    }

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
      
      // Process any queued ICE candidates
      await processQueuedIceCandidates();
      
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
      
      // Process any queued ICE candidates
      await processQueuedIceCandidates();
    } catch (err) {
      console.error('Error handling answer:', err);
      setError(`Failed to handle answer: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, []);

  // Process queued ICE candidates after remote description is set
  const processQueuedIceCandidates = async () => {
    if (!peerConnectionRef.current || pendingIceCandidates.current.length === 0) {
      return;
    }

    console.log(`🔄 Processing ${pendingIceCandidates.current.length} queued ICE candidates`);

    for (const candidate of pendingIceCandidates.current) {
      try {
        const iceCandidate = new RTCIceCandidate({
          candidate: candidate.candidate || '',
          sdpMLineIndex: candidate.sdpMLineIndex,
          sdpMid: candidate.sdpMid
        });
        
        await peerConnectionRef.current.addIceCandidate(iceCandidate);
        console.log('✅ Queued ICE candidate added successfully');
      } catch (err) {
        console.error('❌ Error adding queued ICE candidate:', err);
      }
    }

    // Clear the queue
    pendingIceCandidates.current = [];
  };

  // Handle incoming ICE candidate
  const handleIceCandidate = useCallback(async (hostId: string, candidate: RTCIceCandidateInit) => {
    console.log('Handling ICE candidate from host:', hostId);
    
    if (!peerConnectionRef.current) {
      console.error('No peer connection available for ICE candidate');
      return;
    }

    // Check if remote description is set
    if (!peerConnectionRef.current.remoteDescription) {
      console.log('🔄 Queueing ICE candidate (no remote description yet)');
      pendingIceCandidates.current.push(candidate);
      return;
    }

    try {
      const iceCandidate = new RTCIceCandidate({
        candidate: candidate.candidate || '',
        sdpMLineIndex: candidate.sdpMLineIndex,
        sdpMid: candidate.sdpMid
      });
      
      await peerConnectionRef.current.addIceCandidate(iceCandidate);
      console.log('✅ ICE candidate added successfully');
    } catch (err) {
      console.error('Error handling ICE candidate:', err);
      setError(`Failed to handle ICE candidate: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, []);

  // Handle connection approval
  const handleConnectionApproved = useCallback(async (hostId: string) => {
    console.log('🎉 Connection approved by host:', hostId);
    console.log('Pending connection:', pendingConnectionRef.current);
    console.log('Is connecting:', isConnecting);
    
    if (!pendingConnectionRef.current || pendingConnectionRef.current !== hostId) {
      console.log('❌ No pending connection or different host, ignoring approval');
      console.log('Expected:', pendingConnectionRef.current, 'Got:', hostId);
      return;
    }

    console.log('✅ Starting WebRTC connection...');

    try {
      // Create peer connection
      peerConnectionRef.current = createPeerConnection();
      currentHostIdRef.current = hostId;

      // Create data channel for control commands
      const dataChannel = peerConnectionRef.current.createDataChannel('control', {
        ordered: true
      }) as any;
      
      dataChannel.onopen = () => {
        console.log('🔗 Control data channel opened');
      };
      
      dataChannel.onerror = (event: any) => {
        console.error('❌ Data channel error:', event);
      };
      
      dataChannelRef.current = dataChannel;

      console.log('📡 Creating WebRTC offer...');
      // Create offer
      const offer = await peerConnectionRef.current.createOffer({});
      console.log('📝 Offer created:', offer);
      
      if (!offer.sdp) {
        throw new Error('Generated offer has no SDP');
      }
      
      await peerConnectionRef.current.setLocalDescription(offer);
      console.log('✅ Local description set');

      console.log('📤 Sending offer to host...');
      // Send offer to host
      signaling.sendOffer(hostId, {
        type: offer.type,
        sdp: offer.sdp
      });
      
      console.log('✅ WebRTC offer sent to approved host');
      // Don't set isConnecting to false here - wait for connection to establish
    } catch (err) {
      console.error('❌ Error starting WebRTC after approval:', err);
      setError(`Failed to start WebRTC: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsConnecting(false);
    }
    
    // Clear pending connection
    pendingConnectionRef.current = null;
  }, [signaling, createPeerConnection, isConnecting]);

  // Initiate connection to host
  const initiateConnection = useCallback(async (targetHostId: string) => {
    console.log('🚀 Initiating connection to host:', targetHostId);
    console.log('Current signaling connection:', signaling.isConnected);
    setIsConnecting(true);
    setError(null);

    try {
      console.log('📋 Sending connection request...');
      // Send connection request and wait for host approval
      const connected = await signaling.connectToHost(targetHostId);
      if (!connected) {
        throw new Error('Failed to connect to host via signaling server');
      }

      // Set pending connection to wait for approval
      pendingConnectionRef.current = targetHostId;
      console.log('✅ Connection request sent, waiting for host approval...');
      console.log('Pending connection set to:', pendingConnectionRef.current);
      
    } catch (err) {
      console.error('❌ Error initiating connection:', err);
      setError(`Failed to connect: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsConnecting(false);
      pendingConnectionRef.current = null;
    }
  }, [signaling]);

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

    // Clear pending ICE candidates
    pendingIceCandidates.current = [];

    // Clear pending connection
    pendingConnectionRef.current = null;

    setRemoteStream(null);
    setConnectionState('closed');
    setIsConnecting(false);
    setError(null);
    currentHostIdRef.current = null;
  }, [localStream]);

  // Send control command
  const sendControlCommand = useCallback((command: any) => {
    // Send command via signaling server instead of WebRTC data channel
    if (currentHostIdRef.current && signaling.sendCommand) {
      console.log('Sending control command via signaling server:', command);
      signaling.sendCommand(currentHostIdRef.current, command);
    } else {
      console.warn('Cannot send command: no active host connection or signaling unavailable');
    }
  }, [signaling]);

  // Set up signaling handlers
  useEffect(() => {
    signaling.setOfferHandler(handleOffer);
    signaling.setAnswerHandler(handleAnswer);
    signaling.setIceCandidateHandler(handleIceCandidate);
    signaling.setConnectionApprovedHandler(handleConnectionApproved);
  }, [signaling, handleOffer, handleAnswer, handleIceCandidate, handleConnectionApproved]);

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
