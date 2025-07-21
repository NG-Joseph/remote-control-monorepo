/**
 * Main Electron process for the Remote Control Host Application
 * Handles window management, screen capture, and WebRTC peer connections
 */

import { app, BrowserWindow, desktopCapturer, ipcMain, Menu, Tray, nativeImage, DesktopCapturerSource } from 'electron';
import * as path from 'path';
import * as os from 'os';
import { io, Socket } from 'socket.io-client';
import { mouse, keyboard, Key, Button, Point } from '@nut-tree-fork/nut-js';

class HostApp {
  private mainWindow: BrowserWindow | null = null;
  private ws: Socket | null = null;
  private tray: Tray | null = null;
  private hostId: string | null = null;
  private allowedKeys: string[] = [
    // Keyboard commands
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'Enter', 'Escape', 'Space', 'Tab', 'Backspace',
    'Home', 'End', 'PageUp', 'PageDown',
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
    // Mouse commands (these are handled separately but kept for backwards compatibility)
    'mouse_move', 'mouse_click', 'mouse_down', 'mouse_up', 'mouse_drag',
    'scroll_up', 'scroll_down'
  ];
  private isScreenSharing: boolean = false;
  private connectedClients: Map<string, any> = new Map();
  private pendingRequests: Map<string, any> = new Map();

  constructor() {
    this.initializeApp();
    // Test mouse automation on startup
    this.testMouseAutomation();
  }

  private async testMouseAutomation(): Promise<void> {
    setTimeout(async () => {
      try {
        console.log('🧪 Testing mouse automation in 3 seconds...');
        console.log('⚠️  If mouse doesn\'t move, you may need administrator privileges!');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('🎯 Moving mouse to center of screen...');
        await mouse.setPosition(new Point(500, 300));
        
        console.log('🎯 Moving mouse in a small circle...');
        for (let i = 0; i < 10; i++) {
          const x = 500 + Math.cos(i * 0.6) * 50;
          const y = 300 + Math.sin(i * 0.6) * 50;
          await mouse.setPosition(new Point(x, y));
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('✅ Mouse automation test completed!');
      } catch (error) {
        console.error('❌ Mouse automation test failed:', error);
        console.error('💡 TIP: Try running as administrator - Right click terminal → "Run as administrator"');
      }
    }, 1000);
  }

  private initializeApp(): void {
    // Handle app ready
    app.whenReady().then(() => {
      this.createWindow();
      this.createTray();
      this.setupIPC();
      this.connectToSignalingServer();
    });

    // Handle app activation (macOS)
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });

    // Handle window close
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      title: 'Remote Control Host',
      show: false
    });

    // Load the HTML file
    this.mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private createTray(): void {
    // Create tray icon
    const icon = nativeImage.createEmpty();
    this.tray = new Tray(icon);
    
    const contextMenu = Menu.buildFromTemplate([
      { 
        label: 'Show App', 
        click: () => {
          this.mainWindow?.show();
        }
      },
      { 
        label: 'Quit', 
        click: () => {
          app.quit();
        }
      }
    ]);
    
    this.tray.setToolTip('Remote Control Host');
    this.tray.setContextMenu(contextMenu);
  }

  private setupIPC(): void {
    // Get available screen sources
    ipcMain.handle('get-screen-sources', async () => {
      const sources = await desktopCapturer.getSources({ 
        types: ['window', 'screen'],
        thumbnailSize: { width: 150, height: 150 }
      });
      
      return sources.map(source => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL()
      }));
    });

    // Start screen sharing
    ipcMain.handle('start-screen-share', async (event, sourceId: string) => {
      try {
        await this.startScreenShare(sourceId);
        return { success: true };
      } catch (error) {
        console.error('Failed to start screen share:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // Stop screen sharing
    ipcMain.handle('stop-screen-share', () => {
      this.stopScreenShare();
      return { success: true };
    });

    // Join room (legacy - now just logs)
    ipcMain.handle('join-room', (event, roomId: string) => {
      console.log('Legacy join-room called - hosts auto-register on connection');
      return { success: true };
    });

    // Leave room (legacy - now just logs)
    ipcMain.handle('leave-room', () => {
      console.log('Legacy leave-room called - hosts manage connections automatically');
      return { success: true };
    });

    // Host-based connection management
    ipcMain.handle('approve-connection', (event, clientId: string) => {
      return this.approveConnection(clientId);
    });

    ipcMain.handle('deny-connection', (event, clientId: string) => {
      return this.denyConnection(clientId);
    });

    ipcMain.handle('disconnect-client', (event, clientId: string) => {
      return this.disconnectClient(clientId);
    });

    ipcMain.handle('get-host-info', () => {
      return {
        hostId: this.hostId,
        connectedClients: Array.from(this.connectedClients.keys())
      };
    });

    // Update allowed keys
    ipcMain.handle('update-allowed-keys', (event, keys: string[]) => {
      this.allowedKeys = keys;
      return { success: true };
    });

    // Refresh connection
    ipcMain.handle('refresh-connection', () => {
      return this.refreshConnection();
    });
    
    // WebRTC signaling
    ipcMain.handle('send-webrtc-signal', (event, signal: any) => {
      return this.sendSignalingMessage(signal);
    });
  }

  private connectToSignalingServer(): void {
    const serverUrl = 'http://localhost:3000';
    this.ws = io(serverUrl, {
      path: '/signal',
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 5000,
      forceNew: true
    });

    this.ws.on('connect', () => {
      console.log('Connected to signaling server');
      this.mainWindow?.webContents.send('connection-status', { connected: true });
      
      // Add a small delay before registering to ensure connection is stable
      setTimeout(() => {
        this.registerAsHost();
      }, 500);
    });

    this.ws.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.mainWindow?.webContents.send('connection-status', { connected: false });
    });

    this.ws.on('reconnect', (attemptNumber) => {
      console.log(`Reconnected to signaling server (attempt ${attemptNumber})`);
      this.mainWindow?.webContents.send('connection-status', { connected: true });
      
      // Re-register as host after reconnection
      setTimeout(() => {
        this.registerAsHost();
      }, 500);
    });

    this.ws.on('host_registered', (data: any) => {
      console.log('Host registration confirmed:', data.hostId);
      // Confirm the hostId from server (should match what we generated)
      this.hostId = data.hostId;
      this.mainWindow?.webContents.send('host-status', { 
        registered: true, 
        hostId: data.hostId,
        pending: false // Registration is now confirmed
      });
    });

    this.ws.on('connect_request', (data: any) => {
      console.log('Connection request from client:', data.clientId);
      this.pendingRequests.set(data.clientId, data);
      this.mainWindow?.webContents.send('connection-request', data);
    });

    this.ws.on('command', (data: any) => {
      console.log('Received command:', data);
      this.handleControlCommand(data);
    });

    this.ws.on('signal', (data: any) => {
      console.log('Received WebRTC signal:', data);
      // Forward to renderer process for WebRTC handling
      this.mainWindow?.webContents.send('webrtc-signal', data);
    });

    this.ws.on('disconnect', (reason) => {
      console.log('Disconnected from signaling server, reason:', reason);
      this.hostId = null;
      this.connectedClients.clear();
      this.pendingRequests.clear();
      this.mainWindow?.webContents.send('connection-status', { connected: false });
      this.mainWindow?.webContents.send('host-status', { registered: false, hostId: null });
    });

    this.ws.on('error', (error: Error) => {
      console.error('Socket.IO error:', error);
    });
  }

  private async handleControlCommand(command: any): Promise<void> {
    console.log('🔍 RAW COMMAND RECEIVED:', JSON.stringify(command, null, 2));
    console.log('🔍 CONNECTED CLIENTS:', Array.from(this.connectedClients.keys()));
    
    // Check if client is authorized
    if (!this.connectedClients.has(command.clientId)) {
      console.log('❌ Command from unauthorized client:', command.clientId);
      console.log('❌ Available clients:', Array.from(this.connectedClients.keys()));
      return;
    }

    console.log(`✅ Executing command: ${command.type} - ${command.command || command.action} from client: ${command.clientId}`);
    
    // Handle different command types
    switch (command.type) {
      case 'key':
        await this.handleKeyCommand(command);
        break;
      case 'mouse':
        await this.handleMouseCommand(command);
        break;
      case 'scroll':
        await this.handleScrollCommand(command);
        break;
      default:
        console.log('❌ Unknown command type:', command.type);
        return;
    }
    
    // Send to renderer for logging/display
    this.mainWindow?.webContents.send('control-command', {
      key: command.command || command.action,
      type: command.type,
      hostId: this.hostId,
      clientId: command.clientId
    });
  }

  private async handleKeyCommand(command: any): Promise<void> {
    // Check if the key is allowed for key commands
    if (!this.allowedKeys.includes(command.command)) {
      console.log('Key not allowed:', command.command);
      return;
    }

    try {
      // Map common keys to nut-tree format
      const keyMap: Record<string, Key> = {
        'ArrowUp': Key.Up,
        'ArrowDown': Key.Down,
        'ArrowLeft': Key.Left,
        'ArrowRight': Key.Right,
        'Enter': Key.Return,
        'Escape': Key.Escape,
        'Space': Key.Space,
        'Tab': Key.Tab,
        'Backspace': Key.Backspace,
        'Home': Key.Home,
        'End': Key.End,
        'PageUp': Key.PageUp,
        'PageDown': Key.PageDown
      };

      const nutKey = keyMap[command.command];
      
      if (nutKey) {
        if (command.action === 'keydown') {
          console.log(`Key down: ${command.command}`);
          await keyboard.pressKey(nutKey);
        } else if (command.action === 'keyup') {
          console.log(`Key up: ${command.command}`);
          await keyboard.releaseKey(nutKey);
        } else {
          console.log(`Key tap: ${command.command}`);
          await keyboard.type(nutKey);
        }
        console.log(`Key executed: ${command.command}`);
      } else {
        console.log(`Key not mapped: ${command.command}`);
      }
    } catch (error) {
      console.error('Error executing key command:', error);
    }
  }

  private async handleMouseCommand(command: any): Promise<void> {
    try {
      console.log(`🔍 RAW MOUSE COMMAND STRUCTURE:`, JSON.stringify(command, null, 2));
      
      // Extract action from command name (e.g., 'mouse_click' -> 'click') or use action directly
      const action = command.action || (command.command ? command.command.replace('mouse_', '') : '');
      const { x, y, button = 'left' } = command;
      
      console.log(`🎯 PROCESSING MOUSE COMMAND: action="${action}", x=${x}, y=${y}, button="${button}"`);
      console.log(`🔍 COMMAND PROPERTIES: action=${command.action}, command=${command.command}, x=${command.x}, y=${command.y}`);
      
      if (!action) {
        console.log('❌ No action found in mouse command');
        return;
      }
      
      // Map button names to nut-tree buttons
      const buttonMap: Record<string, Button> = {
        'left': Button.LEFT,
        'right': Button.RIGHT,
        'middle': Button.MIDDLE
      };
      
      const nutButton = buttonMap[button] || Button.LEFT;
      
      switch (action) {
        case 'move':
          if (typeof x === 'number' && typeof y === 'number') {
            // Scale up the movement for visibility (multiply by 10)
            const currentPos = await mouse.getPosition();
            const scaledX = x * 10;  // Make movements 10x larger
            const scaledY = y * -10; // Flip Y axis and scale
            const newX = Math.max(0, Math.min(1920, currentPos.x + scaledX));
            const newY = Math.max(0, Math.min(1080, currentPos.y + scaledY));
            
            console.log(`🎯 MOUSE MOVE: from (${currentPos.x}, ${currentPos.y}) by (${scaledX}, ${scaledY}) to (${newX}, ${newY})`);
            await mouse.setPosition(new Point(newX, newY));
          } else {
            // Fallback: Create smooth test movement when coordinates are missing
            console.log(`🔄 FALLBACK MOUSE MOVEMENT: x=${x}, y=${y} - generating test movement`);
            const currentPos = await mouse.getPosition();
            
            // Generate small circular movement as fallback
            const time = Date.now();
            const radius = 20;
            const angle = (time / 500) % (2 * Math.PI); // Complete circle every 500ms
            const deltaX = Math.cos(angle) * radius;
            const deltaY = Math.sin(angle) * radius;
            
            const newX = Math.max(0, Math.min(1920, currentPos.x + deltaX));
            const newY = Math.max(0, Math.min(1080, currentPos.y + deltaY));
            
            console.log(`🎯 FALLBACK MOVE: from (${currentPos.x}, ${currentPos.y}) by (${deltaX.toFixed(1)}, ${deltaY.toFixed(1)}) to (${newX.toFixed(1)}, ${newY.toFixed(1)})`);
            await mouse.setPosition(new Point(newX, newY));
          }
          break;
          
        case 'click':
          console.log(`🖱️  MOUSE CLICK: ${button} button at current position`);
          
          // Add visual feedback by moving mouse slightly before clicking
          try {
            const currentPos = await mouse.getPosition();
            console.log(`🎯 CLICK POSITION: (${currentPos.x}, ${currentPos.y})`);
            
            // Small wiggle movement for visual confirmation
            await mouse.setPosition(new Point(currentPos.x + 2, currentPos.y + 2));
            await new Promise(resolve => setTimeout(resolve, 50));
            await mouse.setPosition(new Point(currentPos.x, currentPos.y));
            
            // Perform the click
            await mouse.click(nutButton);
            console.log(`✅ CLICK COMPLETED: ${button} button`);
            
            // Visual feedback - small movement after click
            await mouse.setPosition(new Point(currentPos.x + 1, currentPos.y + 1));
            await new Promise(resolve => setTimeout(resolve, 50));
            await mouse.setPosition(new Point(currentPos.x, currentPos.y));
            
          } catch (error) {
            console.error('❌ Click execution failed:', error);
          }
          break;
          
        case 'down':
          if (typeof x === 'number' && typeof y === 'number') {
            console.log(`Mouse down at: ${x}, ${y} with ${button} button`);
            await mouse.setPosition(new Point(x, y));
          }
          console.log(`Mouse down: ${button} button`);
          await mouse.pressButton(nutButton);
          break;
          
        case 'up':
          console.log(`Mouse up: ${button} button`);
          await mouse.releaseButton(nutButton);
          break;
          
        case 'drag':
          if (typeof x === 'number' && typeof y === 'number') {
            console.log(`Mouse dragged to: ${x}, ${y}`);
            const currentPos = await mouse.getPosition();
            await mouse.drag([currentPos, new Point(x, y)]);
          }
          break;

        case 'double_click':
        case 'doubleclick':
          console.log(`🖱️  DOUBLE CLICK: ${button} button`);
          try {
            const currentPos = await mouse.getPosition();
            console.log(`🎯 DOUBLE CLICK POSITION: (${currentPos.x}, ${currentPos.y})`);
            
            // Perform double click
            await mouse.click(nutButton);
            await new Promise(resolve => setTimeout(resolve, 100));
            await mouse.click(nutButton);
            console.log(`✅ DOUBLE CLICK COMPLETED: ${button} button`);
            
          } catch (error) {
            console.error('❌ Double click execution failed:', error);
          }
          break;

        case 'right_click':
        case 'rightclick':
          console.log(`🖱️  RIGHT CLICK: forcing right button`);
          try {
            const currentPos = await mouse.getPosition();
            console.log(`🎯 RIGHT CLICK POSITION: (${currentPos.x}, ${currentPos.y})`);
            
            // Force right click
            await mouse.click(Button.RIGHT);
            console.log(`✅ RIGHT CLICK COMPLETED`);
            
          } catch (error) {
            console.error('❌ Right click execution failed:', error);
          }
          break;
          
        default:
          console.log('Unknown mouse action:', action);
      }
    } catch (error) {
      console.error('Error executing mouse command:', error);
    }
  }

  private async handleScrollCommand(command: any): Promise<void> {
    try {
      // Extract direction from command name (e.g., 'scroll_up' -> 'up')
      const direction = command.command.replace('scroll_', '');
      const { magnitude = 3 } = command;
      
      switch (direction) {
        case 'up':
          console.log(`Scrolled up: ${magnitude}`);
          await mouse.scrollUp(magnitude);
          break;
          
        case 'down':
          console.log(`Scrolled down: ${magnitude}`);
          await mouse.scrollDown(magnitude);
          break;
          
        default:
          console.log('Unknown scroll direction:', direction);
      }
    } catch (error) {
      console.error('Error executing scroll command:', error);
    }
  }

  private async startScreenShare(sourceId: string): Promise<void> {
    try {
      // Get screen stream using Electron's desktopCapturer
      const sources = await desktopCapturer.getSources({ 
        types: ['window', 'screen'],
        thumbnailSize: { width: 1, height: 1 }
      });
      
      const source = sources.find((s: any) => s.id === sourceId);
      if (!source) {
        throw new Error('Screen source not found');
      }

      // Mark as screen sharing (WebRTC setup would happen in renderer process)
      this.isScreenSharing = true;
      console.log('Screen sharing started with source:', source.name);
      this.mainWindow?.webContents.send('screen-share-status', { active: true });
      
      // Send the selected source to renderer for WebRTC handling
      this.mainWindow?.webContents.send('screen-source-selected', { 
        sourceId, 
        sourceName: source.name 
      });
    } catch (error) {
      console.error('Failed to start screen sharing:', error);
      throw error;
    }
  }

  private stopScreenShare(): void {
    this.isScreenSharing = false;
    console.log('Screen sharing stopped');
    this.mainWindow?.webContents.send('screen-share-status', { active: false });
    this.mainWindow?.webContents.send('screen-source-stopped');
  }  private generateHostId(): string {
    const timestamp = Date.now();
    return `${os.hostname()}-${timestamp}`;
  }

  private registerAsHost(): void {
    console.log('Attempting to register as host...');
    
    if (!this.ws) {
      console.error('WebSocket not initialized');
      return;
    }
    
    if (!this.ws.connected) {
      console.error('WebSocket not connected');
      return;
    }
    
    try {
      const hostId = this.generateHostId();
      // Store the generated hostId immediately
      this.hostId = hostId;
      
      const registrationData = {
        hostId,
        allowedKeys: this.allowedKeys
      };
      
      console.log(`Registering as host with data:`, registrationData);
      this.ws.emit('register', registrationData);
      
      console.log(`Registration message sent for host: ${hostId}`);
      
      // Update UI immediately with generated ID
      this.mainWindow?.webContents.send('host-status', { 
        registered: true, 
        hostId: hostId,
        pending: true // Indicate registration is pending confirmation
      });
    } catch (error) {
      console.error('Error during host registration:', error);
    }
  }

  private refreshConnection(): { success: boolean; error?: string } {
    try {
      console.log('Refreshing connection to signaling server...');
      
      if (this.ws) {
        this.ws.disconnect();
        this.ws = null;
      }
      
      // Clear current state
      this.hostId = null;
      this.connectedClients.clear();
      this.pendingRequests.clear();
      
      // Notify UI of disconnection
      this.mainWindow?.webContents.send('connection-status', { connected: false });
      this.mainWindow?.webContents.send('host-status', { registered: false, hostId: null });
      
      // Reconnect after a short delay and auto-register
      setTimeout(() => {
        this.connectToSignalingServer();
        // The registerAsHost() will be called automatically in the 'connect' event handler
      }, 1000);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to refresh connection:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private approveConnection(clientId: string): { success: boolean; error?: string } {
    try {
      if (!this.pendingRequests.has(clientId)) {
        return { success: false, error: 'No pending request for this client' };
      }

      const requestInfo = this.pendingRequests.get(clientId);
      this.connectedClients.set(clientId, requestInfo);
      this.pendingRequests.delete(clientId);

      if (this.ws && this.ws.connected) {
        this.ws.emit('approve_connection', { clientId, hostId: this.hostId });
      }

      console.log(`✅ Approved connection for client: ${clientId}`);
      console.log(`📱 Connected clients now:`, Array.from(this.connectedClients.keys()));
      return { success: true };
    } catch (error) {
      console.error('Failed to approve connection:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private denyConnection(clientId: string): { success: boolean; error?: string } {
    try {
      this.pendingRequests.delete(clientId);

      if (this.ws && this.ws.connected) {
        this.ws.emit('deny_connection', { clientId, hostId: this.hostId });
      }

      console.log(`Denied connection for client: ${clientId}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to deny connection:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private disconnectClient(clientId: string): { success: boolean; error?: string } {
    try {
      this.connectedClients.delete(clientId);

      if (this.ws && this.ws.connected) {
        this.ws.emit('disconnect_client', { clientId, hostId: this.hostId });
      }

      console.log(`Disconnected client: ${clientId}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to disconnect client:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private sendSignalingMessage(message: any): void {
    if (this.ws && this.ws.connected) {
      this.ws.emit('signal', message);
    } else {
      console.error('Socket.IO is not connected');
    }
  }
}

// Start the application
new HostApp();
