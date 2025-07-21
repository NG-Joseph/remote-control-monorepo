/**
 * @fileoverview Modern host list component for discovering and connecting to remote hosts
 * 
 * Displays available hosts with their connection status and provides controls
 * to connect to them for remote control sessions.
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import type { HostInfo } from '../types/shared-dto';

const { width } = Dimensions.get('window');

export interface HostListProps {
  hosts: HostInfo[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  onRefresh: () => void;
  onConnectToHost: (hostId: string) => void;
  onHostPress?: (host: HostInfo) => void;
}

interface HostItemProps {
  host: HostInfo;
  onConnect: () => void;
  onPress?: () => void;
}

function HostItem({ host, onConnect, onPress }: HostItemProps) {
  const lastSeenDate = new Date(host.lastSeen);
  const isRecent = (Date.now() - lastSeenDate.getTime()) < 30000; // 30 seconds
  const lastSeenText = isRecent 
    ? 'Online' 
    : `Last seen ${Math.round((Date.now() - lastSeenDate.getTime()) / 60000)}m ago`;

  const handleConnect = () => {
    if (!isRecent) {
      Alert.alert(
        'Host Offline',
        'This host appears to be offline. Connection may fail.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try Anyway', onPress: onConnect }
        ]
      );
      return;
    }
    onConnect();
  };

  return (
    <TouchableOpacity
      style={[styles.hostItem, !isRecent && styles.hostItemOffline]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.hostInfo}>
        <View style={styles.hostHeader}>
          <View style={styles.hostNameContainer}>
            <Text style={styles.hostName}>{host.name}</Text>
            <View style={[styles.statusDot, isRecent ? styles.statusOnline : styles.statusOffline]} />
          </View>
          <Text style={styles.hostId}>ID: {host.id}</Text>
        </View>
        
        <View style={styles.hostDetails}>
          <Text style={styles.lastSeen}>{lastSeenText}</Text>
          <Text style={styles.hostOs}>{host.os}</Text>
          {host.allowedKeys && host.allowedKeys.length > 0 && (
            <Text style={styles.allowedKeys}>
              {host.allowedKeys.length} keys available
            </Text>
          )}
        </View>
      </View>
      
      <TouchableOpacity
        style={[styles.connectButton, !isRecent && styles.connectButtonDisabled]}
        onPress={handleConnect}
        activeOpacity={0.7}
      >
        <Text style={styles.connectButtonText}>
          {isRecent ? 'Connect' : 'Offline'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function EmptyState({ error, onRefresh }: { error: string | null; onRefresh: () => void }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>
        {error ? 'Connection Errors' : 'No Hosts Found'}
      </Text>
      <Text style={styles.emptyMessage}>
        {error 
          ? error
          : 'Make sure your host application is running and connected to the same network.'
        }
      </Text>
      <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );
}

export function HostList({
  hosts,
  isLoading,
  isRefreshing,
  error,
  onRefresh,
  onConnectToHost,
  onHostPress
}: HostListProps) {
  const renderHost = ({ item }: { item: HostInfo }) => (
    <HostItem
      host={item}
      onConnect={() => onConnectToHost(item.id)}
      onPress={onHostPress ? () => onHostPress(item) : undefined}
    />
  );

  const renderContent = () => {
    if (isLoading && hosts.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Searching for hosts...</Text>
        </View>
      );
    }

    if (hosts.length === 0) {
      return <EmptyState error={error} onRefresh={onRefresh} />;
    }

    return (
      <FlatList
        data={hosts}
        renderItem={renderHost}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={styles.container}>
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  hostItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  hostItemOffline: {
    opacity: 0.7,
  },
  hostInfo: {
    flex: 1,
  },
  hostHeader: {
    marginBottom: 8,
  },
  hostNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  hostName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusOnline: {
    backgroundColor: '#4CAF50',
  },
  statusOffline: {
    backgroundColor: '#FF5722',
  },
  hostId: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  hostDetails: {
    gap: 4,
  },
  lastSeen: {
    fontSize: 14,
    color: '#666',
  },
  hostOs: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  allowedKeys: {
    fontSize: 12,
    color: '#007AFF',
  },
  connectButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  connectButtonDisabled: {
    backgroundColor: '#ccc',
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
