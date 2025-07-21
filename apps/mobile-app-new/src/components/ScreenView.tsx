/**
 * @fileoverview Screen view component for displaying remote host screen via WebRTC
 * 
 * Renders the live video stream from the remote host and handles viewport
 * transformations for different screen sizes.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import type { MediaStream } from 'react-native-webrtc';
import type { ViewportTransform } from '../types';

export interface ScreenViewProps {
  stream: MediaStream | null;
  isConnecting: boolean;
  error: string | null;
  onViewportChange?: (transform: ViewportTransform) => void;
}

export function ScreenView({ 
  stream, 
  isConnecting, 
  error, 
  onViewportChange 
}: ScreenViewProps) {
  const [viewTransform, setViewTransform] = useState<ViewportTransform>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });

  const handleViewportChange = useCallback((transform: ViewportTransform) => {
    setViewTransform(transform);
    onViewportChange?.(transform);
  }, [onViewportChange]);

  const renderContent = () => {
    if (error) {
      return (
        <View style={styles.messageContainer}>
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorMessage}>{error}</Text>
        </View>
      );
    }

    if (isConnecting) {
      return (
        <View style={styles.messageContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.connectingText}>Connecting to host...</Text>
        </View>
      );
    }

    if (!stream) {
      return (
        <View style={styles.messageContainer}>
          <Text style={styles.waitingTitle}>Waiting for Stream</Text>
          <Text style={styles.waitingMessage}>
            Establishing video connection with the host...
          </Text>
        </View>
      );
    }

    return (
      <RTCView
        style={styles.videoView}
        streamURL={stream.toURL()}
        objectFit="contain"
        mirror={false}
        zOrder={0}
      />
    );
  };

  return (
    <View style={styles.container}>
      {renderContent()}
      
      {/* Viewport Info Overlay */}
      {stream && __DEV__ && (
        <View style={styles.debugOverlay}>
          <Text style={styles.debugText}>
            Scale: {viewTransform.scale.toFixed(2)}
          </Text>
          <Text style={styles.debugText}>
            Offset: ({viewTransform.offsetX.toFixed(0)}, {viewTransform.offsetY.toFixed(0)})
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF5722',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 22,
  },
  connectingText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 16,
    textAlign: 'center',
  },
  waitingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  waitingMessage: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 22,
  },
  videoView: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  debugOverlay: {
    position: 'absolute',
    top: 50,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 6,
  },
  debugText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
