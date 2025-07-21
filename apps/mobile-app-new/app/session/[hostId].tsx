import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, StatusBar } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSignaling, useWebRTC } from '../../src/hooks';
import { ScreenView, InputOverlay } from '../../src/components';
import type { HostInfo } from '../../src/types/shared-dto';

export default function SessionScreen() {
  const { hostId } = useLocalSearchParams<{ hostId: string }>();
  const [currentHost, setCurrentHost] = useState<HostInfo | null>(null);
  
  const signaling = useSignaling({
    serverUrl: 'http://localhost:3000', // Added /signal path for WebSocket gateway
    autoConnect: true
  });

  const webrtc = useWebRTC({
    signaling,
    hostId: hostId || undefined
  });

  useEffect(() => {
    if (hostId && signaling.hosts.length > 0) {
      const host = signaling.hosts.find(h => h.id === hostId);
      setCurrentHost(host || null);
    }
  }, [hostId, signaling.hosts]);

  const handleDisconnect = () => {
    webrtc.closeConnection();
    router.back();
  };

  if (!hostId) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Invalid host ID</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <ScreenView
        stream={webrtc.remoteStream}
        isConnecting={webrtc.isConnecting}
        error={webrtc.error}
      />
      
      <InputOverlay
        allowedKeys={currentHost?.allowedKeys}
        isConnected={webrtc.isConnected}
        onSendCommand={webrtc.sendControlCommand}
        onDisconnect={handleDisconnect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
});
