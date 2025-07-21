import React, { useState } from 'react';
import { StyleSheet, ScrollView, Alert, View, Text } from 'react-native';

export default function SettingsScreen() {
  const [serverUrl, setServerUrl] = useState('http://localhost:3000/signal');

  const showInfo = () => {
    Alert.alert(
      'Remote Control Mobile',
      'This mobile app connects to remote host computers for screen sharing and control.\n\nMake sure your signaling server and host applications are running on the same network.',
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection</Text>
          <Text style={styles.label}>Signaling Server:</Text>
          <Text style={styles.value}>{serverUrl}</Text>
          <Text style={styles.note}>
            Update the server URL in the source code to match your network setup.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>
            Remote Control Platform enables you to control desktop computers from your mobile device. 
            Connect to hosts on your local network for screen sharing and remote input.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  section: {
    marginBottom: 32,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    color: '#666',
  },
  value: {
    fontSize: 14,
    fontFamily: 'monospace',
    marginBottom: 8,
    color: '#333',
    backgroundColor: '#f8f8f8',
    padding: 8,
    borderRadius: 4,
  },
  note: {
    fontSize: 12,
    opacity: 0.7,
    fontStyle: 'italic',
    color: '#666',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
});
