/**
 * @fileoverview Host list component for discovering and connecting to remote hosts
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
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { HostInfo } from '@remote-control/shared-dto';

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
  const isOnline = host.isOnline && (Date.now() - host.lastSeen) < 30000; // 30 seconds
  const lastSeenText = isOnline 
    ? 'Online' 
    : `Last seen ${Math.round((Date.now() - host.lastSeen) / 60000)}m ago`;

  const handleConnect = () => {
    if (!isOnline) {
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
      style={[styles.hostItem, !isOnline && styles.hostItemOffline]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.hostInfo}>
        <View style={styles.hostHeader}>
          <View style={styles.hostNameContainer}>
            <Text style={styles.hostName}>{host.name}</Text>
            <View style={[styles.statusDot, isOnline ? styles.statusOnline : styles.statusOffline]} />
          </View>
          <Text style={styles.hostId}>ID: {host.id}</Text>
        </View>
        
        <View style={styles.hostDetails}>
          <Text style={styles.lastSeen}>{lastSeenText}</Text>
          {host.capabilities && host.capabilities.length > 0 && (
            <View style={styles.capabilities}>
              {host.capabilities.slice(0, 3).map((capability, index) => (
                <View key={capability} style={styles.capabilityTag}>
                  <Text style={styles.capabilityText}>{capability}</Text>
                </View>
              ))}
              {host.capabilities.length > 3 && (
                <Text style={styles.moreCapabilities}>
                  +{host.capabilities.length - 3} more
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
      
      <TouchableOpacity
        style={[styles.connectButton, !isOnline && styles.connectButtonDisabled]}
        onPress={handleConnect}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isOnline ? 'play' : 'warning'}
          size={20}
          color={isOnline ? '#fff' : '#666'}
        />
      </TouchableOpacity>
    </TouchableOpacity>
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
  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.emptyText}>Searching for hosts...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="warning-outline" size={48} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name="desktop-outline" size={48} color="#999" />
        <Text style={styles.emptyText}>No hosts found</Text>
        <Text style={styles.emptySubtext}>
          Make sure your host applications are running and connected to the same network.
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color="#007AFF" />
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHost = ({ item }: { item: HostInfo }) => (
    <HostItem
      host={item}
      onConnect={() => onConnectToHost(item.id)}
      onPress={onHostPress ? () => onHostPress(item) : undefined}
    />
  );

  if (hosts.length === 0) {
    return renderEmptyState();
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
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  hostItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  hostItemOffline: {
    backgroundColor: '#f8f8f8',
  },
  hostInfo: {
    flex: 1,
    marginRight: 12,
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
    backgroundColor: '#999',
  },
  hostId: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
  },
  hostDetails: {
    gap: 8,
  },
  lastSeen: {
    fontSize: 14,
    color: '#666',
  },
  capabilities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  capabilityTag: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  capabilityText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  moreCapabilities: {
    fontSize: 12,
    color: '#666',
    alignSelf: 'center',
  },
  connectButton: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectButtonDisabled: {
    backgroundColor: '#ccc',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 400,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  refreshButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
