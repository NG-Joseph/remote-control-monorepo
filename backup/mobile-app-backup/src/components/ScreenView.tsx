/**
 * @fileoverview Screen view component for displaying remote host screen
 * 
 * Renders the video stream from the remote host with basic touch support
 * for mobile remote control functionality.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import type { MediaStream } from 'react-native-webrtc';
import type { ScreenDimensions } from '../types';

export interface ScreenViewProps {
  stream: MediaStream | null;
  isConnected: boolean;
  onTouchEvent?: (x: number, y: number, action: 'down' | 'up' | 'move') => void;
  containerDimensions?: ScreenDimensions;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export function ScreenView({
  stream,
  isConnected,
  onTouchEvent,
  containerDimensions = {
    width: screenWidth,
    height: screenHeight - 200, // Account for UI elements
    density: 1
  }
}: ScreenViewProps) {
  const [touchActive, setTouchActive] = useState(false);

  // Handle touch events and convert to stream coordinates
  const handleTouch = (event: any, action: 'down' | 'up') => {
    if (!onTouchEvent) return;

    const { locationX, locationY } = event.nativeEvent;
    
    // For simplicity, assume 1:1 mapping for now
    // In a real implementation, we'd account for video scaling and positioning
    const streamX = locationX;
    const streamY = locationY;
    
    onTouchEvent(streamX, streamY, action);
    
    if (action === 'down') {
      setTouchActive(true);
    } else if (action === 'up') {
      setTouchActive(false);
    }
  };

  const renderPlaceholder = () => (
    <View style={styles.placeholder}>
      <View style={styles.placeholderContent}>
        {isConnected ? (
          <>
            <View style={styles.loadingIndicator} />
            <Text style={styles.placeholderText}>Waiting for video stream...</Text>
          </>
        ) : (
          <>
            <View style={styles.disconnectedIndicator} />
            <Text style={styles.placeholderText}>Not connected</Text>
          </>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { 
      width: containerDimensions.width, 
      height: containerDimensions.height 
    }]}>
      {stream ? (
        <TouchableWithoutFeedback
          onPressIn={(event) => handleTouch(event, 'down')}
          onPressOut={(event) => handleTouch(event, 'up')}
        >
          <View style={styles.videoContainer}>
            <RTCView
              streamURL={stream.toURL()}
              style={styles.video}
              objectFit="contain"
            />
            {touchActive && <View style={styles.touchIndicator} />}
          </View>
        </TouchableWithoutFeedback>
      ) : (
        renderPlaceholder()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    position: 'relative',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  video: {
    flex: 1,
    backgroundColor: '#000',
  },
  touchIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  placeholderContent: {
    alignItems: 'center',
    gap: 16,
  },
  placeholderText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  loadingIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#007AFF',
    borderTopColor: 'transparent',
  },
  disconnectedIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#666',
  },
});
