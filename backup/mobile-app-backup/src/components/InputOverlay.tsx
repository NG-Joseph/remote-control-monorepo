/**
 * @fileoverview Input overlay component for mobile remote control
 * 
 * Provides virtual controls for keyboard, mouse, and system functions
 * overlaid on the screen view for mobile remote control interaction.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ControlCommand, TouchGesture, KeyboardInput, SystemCommand } from '../types';

export interface InputOverlayProps {
  isVisible: boolean;
  onSendCommand: (command: ControlCommand) => void;
  onClose: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const commonKeys = [
  { key: 'Escape', label: 'Esc', icon: 'return-up-back' },
  { key: 'Tab', label: 'Tab', icon: 'chevron-forward' },
  { key: 'Space', label: 'Space', icon: 'remove' },
  { key: 'Enter', label: 'Enter', icon: 'return-down-forward' },
  { key: 'Backspace', label: 'Backspace', icon: 'backspace' },
  { key: 'Delete', label: 'Del', icon: 'close' },
];

const functionKeys = [
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
  'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
];

const modifierKeys = [
  { key: 'Control', label: 'Ctrl' },
  { key: 'Alt', label: 'Alt' },
  { key: 'Shift', label: 'Shift' },
  { key: 'Meta', label: 'Win' }
];

const systemCommands: { action: SystemCommand['action']; label: string; icon: string }[] = [
  { action: 'back', label: 'Back', icon: 'arrow-back' },
  { action: 'home', label: 'Home', icon: 'home' },
  { action: 'menu', label: 'Menu', icon: 'menu' },
  { action: 'power', label: 'Power', icon: 'power' },
  { action: 'volume_up', label: 'Vol+', icon: 'volume-high' },
  { action: 'volume_down', label: 'Vol-', icon: 'volume-low' }
];

export function InputOverlay({ isVisible, onSendCommand, onClose }: InputOverlayProps) {
  const [activeTab, setActiveTab] = useState<'keyboard' | 'mouse' | 'system'>('keyboard');
  const [activeModifiers, setActiveModifiers] = useState<Set<string>>(new Set());
  const [textInput, setTextInput] = useState('');

  const sendKeyCommand = (key: string, modifiers: string[] = []) => {
    const command: ControlCommand = {
      type: 'keyboard',
      data: {
        key,
        action: 'press',
        modifiers
      } as KeyboardInput,
      timestamp: Date.now()
    };
    onSendCommand(command);
  };

  const sendSystemCommand = (action: SystemCommand['action']) => {
    const command: ControlCommand = {
      type: 'system',
      data: { action } as SystemCommand,
      timestamp: Date.now()
    };
    onSendCommand(command);
  };

  const toggleModifier = (modifier: string) => {
    const newModifiers = new Set(activeModifiers);
    if (newModifiers.has(modifier)) {
      newModifiers.delete(modifier);
    } else {
      newModifiers.add(modifier);
    }
    setActiveModifiers(newModifiers);
  };

  const handleKeyPress = (key: string) => {
    const modifiers = Array.from(activeModifiers);
    sendKeyCommand(key, modifiers);
    
    // Clear modifiers after key press (except for sticky modifiers like Caps Lock)
    if (!['CapsLock'].includes(key)) {
      setActiveModifiers(new Set());
    }
  };

  const renderKeyboardTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Modifier Keys */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Modifiers</Text>
        <View style={styles.keyRow}>
          {modifierKeys.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.modifierKey,
                activeModifiers.has(key) && styles.modifierKeyActive
              ]}
              onPress={() => toggleModifier(key)}
            >
              <Text style={[
                styles.keyText,
                activeModifiers.has(key) && styles.keyTextActive
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Common Keys */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Common Keys</Text>
        <View style={styles.keyGrid}>
          {commonKeys.map(({ key, label, icon }) => (
            <TouchableOpacity
              key={key}
              style={styles.actionKey}
              onPress={() => handleKeyPress(key)}
            >
              <Ionicons name={icon as any} size={20} color="#fff" />
              <Text style={styles.keyText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Function Keys */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Function Keys</Text>
        <View style={styles.keyGrid}>
          {functionKeys.map((key) => (
            <TouchableOpacity
              key={key}
              style={styles.functionKey}
              onPress={() => handleKeyPress(key)}
            >
              <Text style={styles.keyText}>{key}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Arrow Keys */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Navigation</Text>
        <View style={styles.arrowKeys}>
          <TouchableOpacity
            style={[styles.arrowKey, styles.arrowUp]}
            onPress={() => handleKeyPress('ArrowUp')}
          >
            <Ionicons name="chevron-up" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.arrowMiddle}>
            <TouchableOpacity
              style={styles.arrowKey}
              onPress={() => handleKeyPress('ArrowLeft')}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.arrowKey}
              onPress={() => handleKeyPress('ArrowRight')}
            >
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.arrowKey, styles.arrowDown]}
            onPress={() => handleKeyPress('ArrowDown')}
          >
            <Ionicons name="chevron-down" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderMouseTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Mouse Controls</Text>
      <Text style={styles.infoText}>
        Tap the screen to click. Long press for right-click.
        Mouse controls are handled through the screen view.
      </Text>
      <View style={styles.mouseButtons}>
        <TouchableOpacity
          style={styles.mouseButton}
          onPress={() => {
            // Send left click command
            const command: ControlCommand = {
              type: 'touch',
              data: {
                type: 'tap',
                startPoint: { x: 0, y: 0, timestamp: Date.now() },
                endPoint: { x: 0, y: 0, timestamp: Date.now() }
              } as TouchGesture,
              timestamp: Date.now()
            };
            onSendCommand(command);
          }}
        >
          <Ionicons name="hand-left" size={24} color="#fff" />
          <Text style={styles.keyText}>Left Click</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.mouseButton}
          onPress={() => {
            // Send right click command
            const command: ControlCommand = {
              type: 'touch',
              data: {
                type: 'tap',
                startPoint: { x: 0, y: 0, timestamp: Date.now() },
                endPoint: { x: 0, y: 0, timestamp: Date.now() }
              } as TouchGesture,
              timestamp: Date.now()
            };
            onSendCommand(command);
          }}
        >
          <Ionicons name="hand-right" size={24} color="#fff" />
          <Text style={styles.keyText}>Right Click</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSystemTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Commands</Text>
        <View style={styles.keyGrid}>
          {systemCommands.map(({ action, label, icon }) => (
            <TouchableOpacity
              key={action}
              style={styles.systemKey}
              onPress={() => sendSystemCommand(action)}
            >
              <Ionicons name={icon as any} size={24} color="#fff" />
              <Text style={styles.keyText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Remote Control</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabs}>
          {(['keyboard', 'mouse', 'system'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Ionicons
                name={
                  tab === 'keyboard' ? 'keypad' :
                  tab === 'mouse' ? 'hand-left' : 'settings'
                }
                size={20}
                color={activeTab === tab ? '#007AFF' : '#666'}
              />
              <Text style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive
              ]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.content}>
          {activeTab === 'keyboard' && renderKeyboardTab()}
          {activeTab === 'mouse' && renderMouseTab()}
          {activeTab === 'system' && renderSystemTab()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  tabTextActive: {
    color: '#007AFF',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  keyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modifierKey: {
    backgroundColor: '#666',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: 60,
    alignItems: 'center',
  },
  modifierKeyActive: {
    backgroundColor: '#007AFF',
  },
  actionKey: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 80,
    alignItems: 'center',
    gap: 4,
  },
  functionKey: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 50,
    alignItems: 'center',
  },
  systemKey: {
    backgroundColor: '#FF6B47',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 80,
    alignItems: 'center',
    gap: 4,
  },
  mouseButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minWidth: 120,
    alignItems: 'center',
    gap: 8,
  },
  mouseButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  keyText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    textAlign: 'center',
  },
  keyTextActive: {
    color: '#fff',
  },
  arrowKeys: {
    alignItems: 'center',
    gap: 8,
  },
  arrowMiddle: {
    flexDirection: 'row',
    gap: 60,
  },
  arrowKey: {
    backgroundColor: '#333',
    borderRadius: 8,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowUp: {
    marginBottom: 8,
  },
  arrowDown: {
    marginTop: 8,
  },
});
