/**
 * @fileoverview Input overlay component for sending control commands to remote host
 * 
 * Provides virtual controls for keyboard input, mouse/touch gestures,
 * and system commands based on host permissions.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import type { ControlCommand, TouchGesture, KeyboardInput } from '../types';

export interface InputOverlayProps {
  allowedKeys?: string[];
  isConnected: boolean;
  onSendCommand: (command: ControlCommand) => void;
  onDisconnect: () => void;
}

export function InputOverlay({
  allowedKeys = [],
  isConnected,
  onSendCommand,
  onDisconnect,
}: InputOverlayProps) {
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [textInput, setTextInput] = useState('');
  
  // Analog stick for mouse control
  const stickPosition = useRef(new Animated.ValueXY()).current;
  const stickCenter = { x: 40, y: 40 }; // Center of the 80x80 stick area
  const maxDistance = 35; // Maximum distance from center
  
  // Get screen dimensions for mouse coordinate mapping
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  
  // Mouse movement tracking
  const mouseVelocity = useRef({ x: 0, y: 0 });
  const mouseMoveInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const createAnalogStick = () => {
    const panResponder = PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        stickPosition.setOffset({
          x: (stickPosition.x as any)._value,
          y: (stickPosition.y as any)._value,
        });
        stickPosition.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        
        // Limit the stick to circular movement within maxDistance
        const distance = Math.sqrt(dx * dx + dy * dy);
        let constrainedX = dx;
        let constrainedY = dy;
        
        if (distance > maxDistance) {
          constrainedX = (dx / distance) * maxDistance;
          constrainedY = (dy / distance) * maxDistance;
        }
        
        // Update stick position
        stickPosition.setValue({ x: constrainedX, y: constrainedY });
        
        // Calculate mouse movement velocity based on stick displacement
        const velocityMultiplier = 3; // Adjust sensitivity
        mouseVelocity.current = {
          x: constrainedX * velocityMultiplier,
          y: constrainedY * velocityMultiplier
        };
        
        // Start continuous mouse movement if not already started
        if (!mouseMoveInterval.current && (Math.abs(constrainedX) > 5 || Math.abs(constrainedY) > 5)) {
          mouseMoveInterval.current = setInterval(() => {
            if (mouseVelocity.current.x !== 0 || mouseVelocity.current.y !== 0) {
              // Send relative mouse movement
              sendMouseCommand('move', mouseVelocity.current.x, mouseVelocity.current.y);
            }
          }, 50); // Send movement updates every 50ms
        }
      },
      onPanResponderRelease: () => {
        // Stop mouse movement
        mouseVelocity.current = { x: 0, y: 0 };
        if (mouseMoveInterval.current) {
          clearInterval(mouseMoveInterval.current);
          mouseMoveInterval.current = null;
        }
        
        // Reset stick position
        stickPosition.flattenOffset();
        Animated.spring(stickPosition, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
      },
    });
    
    return panResponder;
  };

  const analogStickPanResponder = createAnalogStick();

  const sendKeyboardCommand = useCallback((key: string, action: 'press' | 'release' = 'press') => {
    const command: ControlCommand = {
      type: 'key',
      command: key,
      timestamp: Date.now(),
    };
    onSendCommand(command);
  }, [onSendCommand]);

  const sendMouseCommand = useCallback((action: string, x?: number, y?: number, button: string = 'left') => {
    const command: ControlCommand = {
      type: 'mouse',
      action,
      x,
      y,
      button,
      timestamp: Date.now(),
    };
    onSendCommand(command);
  }, [onSendCommand]);

  const sendScrollCommand = useCallback((direction: 'up' | 'down', magnitude: number = 3) => {
    const command: ControlCommand = {
      type: 'scroll',
      direction,
      magnitude,
      timestamp: Date.now(),
    };
    onSendCommand(command);
  }, [onSendCommand]);

  const sendTextInput = useCallback(() => {
    if (!textInput.trim()) return;
    
    // Send each character as a key press
    for (const char of textInput) {
      sendKeyboardCommand(char);
    }
    
    setTextInput('');
    setShowKeyboard(false);
  }, [textInput, sendKeyboardCommand]);

  const handleDisconnect = useCallback(() => {
    Alert.alert(
      'Disconnect',
      'Are you sure you want to disconnect from the host?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: onDisconnect }
      ]
    );
  }, [onDisconnect]);

  if (!isConnected) {
    return null;
  }

  return (
    <>
      <View style={styles.overlay}>
        {/* Control Bar */}
        <View style={styles.controlBar}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setShowKeyboard(true)}
          >
            <Text style={styles.controlButtonText}>KB</Text>
          </TouchableOpacity>

          {allowedKeys.includes('Escape') && (
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => sendKeyboardCommand('Escape')}
            >
              <Text style={styles.controlButtonText}>ESC</Text>
            </TouchableOpacity>
          )}

          {allowedKeys.includes('Tab') && (
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => sendKeyboardCommand('Tab')}
            >
              <Text style={styles.controlButtonText}>TAB</Text>
            </TouchableOpacity>
          )}

          <View style={styles.spacer} />

          <TouchableOpacity
            style={[styles.controlButton, styles.disconnectButton]}
            onPress={handleDisconnect}
          >
            <Text style={styles.disconnectButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Arrow Keys */}
        {(allowedKeys.includes('ArrowUp') || allowedKeys.includes('ArrowDown') || 
          allowedKeys.includes('ArrowLeft') || allowedKeys.includes('ArrowRight')) && (
          <View style={styles.arrowKeys}>
            {allowedKeys.includes('ArrowUp') && (
              <TouchableOpacity
                style={styles.arrowButton}
                onPress={() => sendKeyboardCommand('ArrowUp')}
              >
                <Text style={styles.arrowText}>↑</Text>
              </TouchableOpacity>
            )}
            
            <View style={styles.arrowRow}>
              {allowedKeys.includes('ArrowLeft') && (
                <TouchableOpacity
                  style={styles.arrowButton}
                  onPress={() => sendKeyboardCommand('ArrowLeft')}
                >
                  <Text style={styles.arrowText}>←</Text>
                </TouchableOpacity>
              )}
              
              {allowedKeys.includes('ArrowRight') && (
                <TouchableOpacity
                  style={styles.arrowButton}
                  onPress={() => sendKeyboardCommand('ArrowRight')}
                >
                  <Text style={styles.arrowText}>→</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {allowedKeys.includes('ArrowDown') && (
              <TouchableOpacity
                style={styles.arrowButton}
                onPress={() => sendKeyboardCommand('ArrowDown')}
              >
                <Text style={styles.arrowText}>↓</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Space and Enter - Only show if Space is available */}
        {allowedKeys.includes('Space') && (
          <View style={styles.bottomControls}>
            <TouchableOpacity
              style={[styles.controlButton, styles.spaceButton]}
              onPress={() => sendKeyboardCommand('Space')}
            >
              <Text style={styles.controlButtonText}>SPACE</Text>
            </TouchableOpacity>

            {allowedKeys.includes('Enter') && (
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => sendKeyboardCommand('Enter')}
              >
                <Text style={styles.controlButtonText}>ENTER</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Mouse Controls */}
        <View style={styles.mouseControls}>
          <View style={styles.mouseButtons}>
            <TouchableOpacity
              style={[styles.mouseButton, styles.leftClickButton]}
              onPress={() => sendMouseCommand('click', undefined, undefined, 'left')}
            >
              <Text style={styles.mouseButtonText}>L</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.mouseButton, styles.rightClickButton]}
              onPress={() => sendMouseCommand('click', undefined, undefined, 'right')}
            >
              <Text style={styles.mouseButtonText}>R</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.mouseButton, styles.doubleClickButton]}
              onPress={() => sendMouseCommand('double_click', undefined, undefined, 'left')}
            >
              <Text style={styles.mouseButtonText}>2x</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.scrollControls}>
            <TouchableOpacity
              style={styles.scrollButton}
              onPress={() => sendScrollCommand('up')}
            >
              <Text style={styles.scrollText}>↑</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.scrollButton}
              onPress={() => sendScrollCommand('down')}
            >
              <Text style={styles.scrollText}>↓</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Analog Stick for Mouse Control */}
        <View style={styles.analogStickContainer}>
          <View style={styles.analogStickBackground}>
            <Animated.View
              style={[
                styles.analogStickKnob,
                {
                  transform: stickPosition.getTranslateTransform(),
                }
              ]}
              {...analogStickPanResponder.panHandlers}
            />
          </View>
          <Text style={styles.analogStickLabel}>Mouse</Text>
        </View>
      </View>

      {/* Keyboard Input Modal */}
      <Modal
        visible={showKeyboard}
        transparent
        animationType="slide"
        onRequestClose={() => setShowKeyboard(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.keyboardModal}>
            <Text style={styles.modalTitle}>Type Text</Text>
            
            <TextInput
              style={styles.textInput}
              value={textInput}
              onChangeText={setTextInput}
              placeholder="Enter text to send..."
              multiline
              autoFocus
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setTextInput('');
                  setShowKeyboard(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.sendButton]}
                onPress={sendTextInput}
              >
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },
  controlBar: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: 8,
  },
  controlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
  },
  disconnectButton: {
    backgroundColor: 'rgba(255, 87, 34, 0.8)',
    marginRight: 0,
  },
  disconnectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  arrowKeys: {
    position: 'absolute',
    bottom: 120,
    right: 16,
    alignItems: 'center',
  },
  arrowRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  arrowButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  arrowText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  spaceButton: {
    minWidth: 120,
    marginRight: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: '#007AFF',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mouseControls: {
    position: 'absolute',
    bottom: 40,
    right: 16,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  mouseButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    maxWidth: 140,
  },
  mouseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  leftClickButton: {
    backgroundColor: '#007AFF',
    borderColor: '#005BBB',
  },
  rightClickButton: {
    backgroundColor: '#FF9500',
    borderColor: '#CC7700',
  },
  doubleClickButton: {
    backgroundColor: '#34C759',
    borderColor: '#28A745',
  },
  mouseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollControls: {
    alignItems: 'center',
    gap: 4,
  },
  scrollButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  analogStickContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    alignItems: 'center',
    gap: 4,
  },
  analogStickBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analogStickKnob: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#005BBB',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  analogStickLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '600',
  },
});
