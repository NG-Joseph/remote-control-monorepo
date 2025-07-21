import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSignaling } from '../../src/hooks';
import { HostListModern } from '../../src/components';

export default function HomeScreen() {
  const signaling = useSignaling({
    serverUrl: 'http://localhost:3000', // Base URL only
    autoConnect: true
  });

  const handleHostPress = (host: any) => {
    router.push(`/session/${host.id}` as any);
  };

  const handleConnectToHost = (hostId: string) => {
    router.push(`/session/${hostId}` as any);
  };

  return (
    <View style={styles.container}>
      <HostListModern
        hosts={signaling.hosts}
        isLoading={signaling.isConnecting}
        isRefreshing={signaling.isLoadingHosts}
        error={signaling.error}
        onRefresh={signaling.refreshHosts}
        onHostPress={handleHostPress}
        onConnectToHost={handleConnectToHost}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
