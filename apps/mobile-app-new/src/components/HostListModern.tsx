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
    } else {
      onConnect();
    }
  };

  return (
    <TouchableOpacity
      style={styles.hostCard}
      onPress={onPress}
      activeOpacity={0.95}
    >
      <View style={styles.cardContent}>
        <View style={styles.hostHeader}>
          <View style={styles.hostTitleRow}>
            <View style={[styles.statusDot, { backgroundColor: isRecent ? '#10B981' : '#EF4444' }]} />
            <Text style={styles.hostName} numberOfLines={1}>
              {host.name || host.id}
            </Text>
          </View>
          <Text style={[styles.statusText, { color: isRecent ? '#10B981' : '#EF4444' }]}>
            {isRecent ? 'Online' : 'Offline'}
          </Text>
        </View>
        
        <View style={styles.hostDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>ID:</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {host.id}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>OS:</Text>
            <Text style={styles.detailValue}>
              {host.os || 'Unknown'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Last seen:</Text>
            <Text style={styles.detailValue}>
              {lastSeenText}
            </Text>
          </View>
        </View>

        {host.allowedKeys && host.allowedKeys.length > 0 && (
          <View style={styles.controlsSection}>
            <Text style={styles.controlsLabel}>Available controls:</Text>
            <View style={styles.controlsGrid}>
              {host.allowedKeys.slice(0, 6).map((key, index) => (
                <View key={index} style={styles.controlTag}>
                  <Text style={styles.controlTagText}>{key}</Text>
                </View>
              ))}
              {host.allowedKeys.length > 6 && (
                <View style={styles.controlTag}>
                  <Text style={styles.controlTagText}>+{host.allowedKeys.length - 6}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.connectButton, isRecent ? styles.connectButtonActive : styles.connectButtonInactive]}
          onPress={handleConnect}
        >
          <Text style={[styles.connectButtonText, isRecent ? styles.connectButtonTextActive : styles.connectButtonTextInactive]}>
            {isRecent ? '🚀 Connect' : '⚠️ Try Connect'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({ onRefresh, isLoading }: { onRefresh: () => void; isLoading: boolean }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconText}>🖥️</Text>
      </View>
      <Text style={styles.emptyTitle}>No Hosts Found</Text>
      <Text style={styles.emptyMessage}>
        Make sure your desktop host application is running and connected to the same network.
      </Text>
      {!isLoading && (
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ErrorState({ error, onRefresh }: { error: string; onRefresh: () => void }) {
  return (
    <View style={styles.errorState}>
      <View style={styles.errorIcon}>
        <Text style={styles.errorIconText}>⚠️</Text>
      </View>
      <Text style={styles.errorTitle}>Connection Error</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
        <Text style={styles.retryButtonText}>🔄 Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

function LoadingState() {
  return (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text style={styles.loadingText}>Discovering hosts...</Text>
    </View>
  );
}

export function HostListModern({
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
      onPress={() => onHostPress?.(item)}
    />
  );

  if (error && !isRefreshing) {
    return <ErrorState error={error} onRefresh={onRefresh} />;
  }

  if (isLoading && hosts.length === 0) {
    return <LoadingState />;
  }

  if (hosts.length === 0 && !isLoading) {
    return <EmptyState onRefresh={onRefresh} isLoading={isLoading} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Available Hosts</Text>
        <Text style={styles.headerSubtitle}>
          {hosts.length} host{hosts.length !== 1 ? 's' : ''} discovered
        </Text>
      </View>

      <FlatList
        data={hosts}
        renderItem={renderHost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  listContent: {
    padding: 16,
  },
  separator: {
    height: 12,
  },
  hostCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: {
    padding: 20,
  },
  hostHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  hostTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  hostName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    flex: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hostDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    color: '#1E293B',
    flex: 1,
    textAlign: 'right',
  },
  controlsSection: {
    marginBottom: 20,
  },
  controlsLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 8,
  },
  controlsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  controlTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  controlTagText: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '500',
  },
  connectButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectButtonActive: {
    backgroundColor: '#3B82F6',
  },
  connectButtonInactive: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  connectButtonTextActive: {
    color: '#FFFFFF',
  },
  connectButtonTextInactive: {
    color: '#64748B',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyIconText: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorIconText: {
    fontSize: 48,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 16,
  },
});
