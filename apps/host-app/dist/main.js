"use strict";
/**
 * Main Electron process for the Remote Control Host Application
 * Handles window management, screen capture, and WebRTC peer connections
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const socket_io_client_1 = require("socket.io-client");
const nut_js_1 = require("@nut-tree-fork/nut-js");
class HostApp {
    constructor() {
        this.mainWindow = null;
        this.ws = null;
        this.tray = null;
        this.hostId = null;
        this.allowedKeys = [
            // Keyboard commands
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'Enter', 'Escape', 'Space', 'Tab', 'Backspace',
            'Home', 'End', 'PageUp', 'PageDown',
            'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
            // Mouse commands (these are handled separately but kept for backwards compatibility)
            'mouse_move', 'mouse_click', 'mouse_down', 'mouse_up', 'mouse_drag',
            'scroll_up', 'scroll_down'
        ];
        this.isScreenSharing = false;
        this.connectedClients = new Map();
        this.pendingRequests = new Map();
        this.initializeApp();
        // Test mouse automation on startup
        this.testMouseAutomation();
    }
    async testMouseAutomation() {
        setTimeout(async () => {
            try {
                console.log('🧪 Testing mouse automation in 3 seconds...');
                console.log('⚠️  If mouse doesn\'t move, you may need administrator privileges!');
                await new Promise(resolve => setTimeout(resolve, 3000));
                console.log('🎯 Moving mouse to center of screen...');
                await nut_js_1.mouse.setPosition(new nut_js_1.Point(500, 300));
                console.log('🎯 Moving mouse in a small circle...');
                for (let i = 0; i < 10; i++) {
                    const x = 500 + Math.cos(i * 0.6) * 50;
                    const y = 300 + Math.sin(i * 0.6) * 50;
                    await nut_js_1.mouse.setPosition(new nut_js_1.Point(x, y));
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                console.log('✅ Mouse automation test completed!');
            }
            catch (error) {
                console.error('❌ Mouse automation test failed:', error);
                console.error('💡 TIP: Try running as administrator - Right click terminal → "Run as administrator"');
            }
        }, 1000);
    }
    initializeApp() {
        // Handle app ready
        electron_1.app.whenReady().then(() => {
            this.createWindow();
            this.createTray();
            this.setupIPC();
            this.connectToSignalingServer();
        });
        // Handle app activation (macOS)
        electron_1.app.on('activate', () => {
            if (electron_1.BrowserWindow.getAllWindows().length === 0) {
                this.createWindow();
            }
        });
        // Handle window close
        electron_1.app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                electron_1.app.quit();
            }
        });
    }
    createWindow() {
        this.mainWindow = new electron_1.BrowserWindow({
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
    createTray() {
        // Create tray icon
        const icon = electron_1.nativeImage.createEmpty();
        this.tray = new electron_1.Tray(icon);
        const contextMenu = electron_1.Menu.buildFromTemplate([
            {
                label: 'Show App',
                click: () => {
                    this.mainWindow?.show();
                }
            },
            {
                label: 'Quit',
                click: () => {
                    electron_1.app.quit();
                }
            }
        ]);
        this.tray.setToolTip('Remote Control Host');
        this.tray.setContextMenu(contextMenu);
    }
    setupIPC() {
        // Get available screen sources
        electron_1.ipcMain.handle('get-screen-sources', async () => {
            const sources = await electron_1.desktopCapturer.getSources({
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
        electron_1.ipcMain.handle('start-screen-share', async (event, sourceId) => {
            try {
                await this.startScreenShare(sourceId);
                return { success: true };
            }
            catch (error) {
                console.error('Failed to start screen share:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });
        // Stop screen sharing
        electron_1.ipcMain.handle('stop-screen-share', () => {
            this.stopScreenShare();
            return { success: true };
        });
        // Join room (legacy - now just logs)
        electron_1.ipcMain.handle('join-room', (event, roomId) => {
            console.log('Legacy join-room called - hosts auto-register on connection');
            return { success: true };
        });
        // Leave room (legacy - now just logs)
        electron_1.ipcMain.handle('leave-room', () => {
            console.log('Legacy leave-room called - hosts manage connections automatically');
            return { success: true };
        });
        // Host-based connection management
        electron_1.ipcMain.handle('approve-connection', (event, clientId) => {
            return this.approveConnection(clientId);
        });
        electron_1.ipcMain.handle('deny-connection', (event, clientId) => {
            return this.denyConnection(clientId);
        });
        electron_1.ipcMain.handle('disconnect-client', (event, clientId) => {
            return this.disconnectClient(clientId);
        });
        electron_1.ipcMain.handle('get-host-info', () => {
            return {
                hostId: this.hostId,
                connectedClients: Array.from(this.connectedClients.keys())
            };
        });
        // Update allowed keys
        electron_1.ipcMain.handle('update-allowed-keys', (event, keys) => {
            this.allowedKeys = keys;
            return { success: true };
        });
        // Refresh connection
        electron_1.ipcMain.handle('refresh-connection', () => {
            return this.refreshConnection();
        });
        // WebRTC signaling
        electron_1.ipcMain.handle('send-webrtc-signal', (event, signal) => {
            return this.sendSignalingMessage(signal);
        });
    }
    connectToSignalingServer() {
        const serverUrl = 'http://localhost:3000';
        this.ws = (0, socket_io_client_1.io)(serverUrl, {
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
        this.ws.on('host_registered', (data) => {
            console.log('Host registration confirmed:', data.hostId);
            // Confirm the hostId from server (should match what we generated)
            this.hostId = data.hostId;
            this.mainWindow?.webContents.send('host-status', {
                registered: true,
                hostId: data.hostId,
                pending: false // Registration is now confirmed
            });
        });
        this.ws.on('connect_request', (data) => {
            console.log('Connection request from client:', data.clientId);
            this.pendingRequests.set(data.clientId, data);
            this.mainWindow?.webContents.send('connection-request', data);
        });
        this.ws.on('command', (data) => {
            console.log('Received command:', data);
            this.handleControlCommand(data);
        });
        this.ws.on('signal', (data) => {
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
        this.ws.on('error', (error) => {
            console.error('Socket.IO error:', error);
        });
    }
    async handleControlCommand(command) {
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
    async handleKeyCommand(command) {
        // Check if the key is allowed for key commands
        if (!this.allowedKeys.includes(command.command)) {
            console.log('Key not allowed:', command.command);
            return;
        }
        try {
            // Map common keys to nut-tree format
            const keyMap = {
                'ArrowUp': nut_js_1.Key.Up,
                'ArrowDown': nut_js_1.Key.Down,
                'ArrowLeft': nut_js_1.Key.Left,
                'ArrowRight': nut_js_1.Key.Right,
                'Enter': nut_js_1.Key.Return,
                'Escape': nut_js_1.Key.Escape,
                'Space': nut_js_1.Key.Space,
                'Tab': nut_js_1.Key.Tab,
                'Backspace': nut_js_1.Key.Backspace,
                'Home': nut_js_1.Key.Home,
                'End': nut_js_1.Key.End,
                'PageUp': nut_js_1.Key.PageUp,
                'PageDown': nut_js_1.Key.PageDown
            };
            const nutKey = keyMap[command.command];
            if (nutKey) {
                if (command.action === 'keydown') {
                    console.log(`Key down: ${command.command}`);
                    await nut_js_1.keyboard.pressKey(nutKey);
                }
                else if (command.action === 'keyup') {
                    console.log(`Key up: ${command.command}`);
                    await nut_js_1.keyboard.releaseKey(nutKey);
                }
                else {
                    console.log(`Key tap: ${command.command}`);
                    await nut_js_1.keyboard.type(nutKey);
                }
                console.log(`Key executed: ${command.command}`);
            }
            else {
                console.log(`Key not mapped: ${command.command}`);
            }
        }
        catch (error) {
            console.error('Error executing key command:', error);
        }
    }
    async handleMouseCommand(command) {
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
            const buttonMap = {
                'left': nut_js_1.Button.LEFT,
                'right': nut_js_1.Button.RIGHT,
                'middle': nut_js_1.Button.MIDDLE
            };
            const nutButton = buttonMap[button] || nut_js_1.Button.LEFT;
            switch (action) {
                case 'move':
                    if (typeof x === 'number' && typeof y === 'number') {
                        // Scale up the movement for visibility (multiply by 10)
                        const currentPos = await nut_js_1.mouse.getPosition();
                        const scaledX = x * 10; // Make movements 10x larger
                        const scaledY = y * -10; // Flip Y axis and scale
                        const newX = Math.max(0, Math.min(1920, currentPos.x + scaledX));
                        const newY = Math.max(0, Math.min(1080, currentPos.y + scaledY));
                        console.log(`🎯 MOUSE MOVE: from (${currentPos.x}, ${currentPos.y}) by (${scaledX}, ${scaledY}) to (${newX}, ${newY})`);
                        await nut_js_1.mouse.setPosition(new nut_js_1.Point(newX, newY));
                    }
                    else {
                        // Fallback: Create smooth test movement when coordinates are missing
                        console.log(`🔄 FALLBACK MOUSE MOVEMENT: x=${x}, y=${y} - generating test movement`);
                        const currentPos = await nut_js_1.mouse.getPosition();
                        // Generate small circular movement as fallback
                        const time = Date.now();
                        const radius = 20;
                        const angle = (time / 500) % (2 * Math.PI); // Complete circle every 500ms
                        const deltaX = Math.cos(angle) * radius;
                        const deltaY = Math.sin(angle) * radius;
                        const newX = Math.max(0, Math.min(1920, currentPos.x + deltaX));
                        const newY = Math.max(0, Math.min(1080, currentPos.y + deltaY));
                        console.log(`🎯 FALLBACK MOVE: from (${currentPos.x}, ${currentPos.y}) by (${deltaX.toFixed(1)}, ${deltaY.toFixed(1)}) to (${newX.toFixed(1)}, ${newY.toFixed(1)})`);
                        await nut_js_1.mouse.setPosition(new nut_js_1.Point(newX, newY));
                    }
                    break;
                case 'click':
                    console.log(`🖱️  MOUSE CLICK: ${button} button at current position`);
                    // Add visual feedback by moving mouse slightly before clicking
                    try {
                        const currentPos = await nut_js_1.mouse.getPosition();
                        console.log(`🎯 CLICK POSITION: (${currentPos.x}, ${currentPos.y})`);
                        // Small wiggle movement for visual confirmation
                        await nut_js_1.mouse.setPosition(new nut_js_1.Point(currentPos.x + 2, currentPos.y + 2));
                        await new Promise(resolve => setTimeout(resolve, 50));
                        await nut_js_1.mouse.setPosition(new nut_js_1.Point(currentPos.x, currentPos.y));
                        // Perform the click
                        await nut_js_1.mouse.click(nutButton);
                        console.log(`✅ CLICK COMPLETED: ${button} button`);
                        // Visual feedback - small movement after click
                        await nut_js_1.mouse.setPosition(new nut_js_1.Point(currentPos.x + 1, currentPos.y + 1));
                        await new Promise(resolve => setTimeout(resolve, 50));
                        await nut_js_1.mouse.setPosition(new nut_js_1.Point(currentPos.x, currentPos.y));
                    }
                    catch (error) {
                        console.error('❌ Click execution failed:', error);
                    }
                    break;
                case 'down':
                    if (typeof x === 'number' && typeof y === 'number') {
                        console.log(`Mouse down at: ${x}, ${y} with ${button} button`);
                        await nut_js_1.mouse.setPosition(new nut_js_1.Point(x, y));
                    }
                    console.log(`Mouse down: ${button} button`);
                    await nut_js_1.mouse.pressButton(nutButton);
                    break;
                case 'up':
                    console.log(`Mouse up: ${button} button`);
                    await nut_js_1.mouse.releaseButton(nutButton);
                    break;
                case 'drag':
                    if (typeof x === 'number' && typeof y === 'number') {
                        console.log(`Mouse dragged to: ${x}, ${y}`);
                        const currentPos = await nut_js_1.mouse.getPosition();
                        await nut_js_1.mouse.drag([currentPos, new nut_js_1.Point(x, y)]);
                    }
                    break;
                case 'double_click':
                case 'doubleclick':
                    console.log(`🖱️  DOUBLE CLICK: ${button} button`);
                    try {
                        const currentPos = await nut_js_1.mouse.getPosition();
                        console.log(`🎯 DOUBLE CLICK POSITION: (${currentPos.x}, ${currentPos.y})`);
                        // Perform double click
                        await nut_js_1.mouse.click(nutButton);
                        await new Promise(resolve => setTimeout(resolve, 100));
                        await nut_js_1.mouse.click(nutButton);
                        console.log(`✅ DOUBLE CLICK COMPLETED: ${button} button`);
                    }
                    catch (error) {
                        console.error('❌ Double click execution failed:', error);
                    }
                    break;
                case 'right_click':
                case 'rightclick':
                    console.log(`🖱️  RIGHT CLICK: forcing right button`);
                    try {
                        const currentPos = await nut_js_1.mouse.getPosition();
                        console.log(`🎯 RIGHT CLICK POSITION: (${currentPos.x}, ${currentPos.y})`);
                        // Force right click
                        await nut_js_1.mouse.click(nut_js_1.Button.RIGHT);
                        console.log(`✅ RIGHT CLICK COMPLETED`);
                    }
                    catch (error) {
                        console.error('❌ Right click execution failed:', error);
                    }
                    break;
                default:
                    console.log('Unknown mouse action:', action);
            }
        }
        catch (error) {
            console.error('Error executing mouse command:', error);
        }
    }
    async handleScrollCommand(command) {
        try {
            // Extract direction from command name (e.g., 'scroll_up' -> 'up')
            const direction = command.command.replace('scroll_', '');
            const { magnitude = 3 } = command;
            switch (direction) {
                case 'up':
                    console.log(`Scrolled up: ${magnitude}`);
                    await nut_js_1.mouse.scrollUp(magnitude);
                    break;
                case 'down':
                    console.log(`Scrolled down: ${magnitude}`);
                    await nut_js_1.mouse.scrollDown(magnitude);
                    break;
                default:
                    console.log('Unknown scroll direction:', direction);
            }
        }
        catch (error) {
            console.error('Error executing scroll command:', error);
        }
    }
    async startScreenShare(sourceId) {
        try {
            // Get screen stream using Electron's desktopCapturer
            const sources = await electron_1.desktopCapturer.getSources({
                types: ['window', 'screen'],
                thumbnailSize: { width: 1, height: 1 }
            });
            const source = sources.find((s) => s.id === sourceId);
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
        }
        catch (error) {
            console.error('Failed to start screen sharing:', error);
            throw error;
        }
    }
    stopScreenShare() {
        this.isScreenSharing = false;
        console.log('Screen sharing stopped');
        this.mainWindow?.webContents.send('screen-share-status', { active: false });
        this.mainWindow?.webContents.send('screen-source-stopped');
    }
    generateHostId() {
        const timestamp = Date.now();
        return `${os.hostname()}-${timestamp}`;
    }
    registerAsHost() {
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
        }
        catch (error) {
            console.error('Error during host registration:', error);
        }
    }
    refreshConnection() {
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
        }
        catch (error) {
            console.error('Failed to refresh connection:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    approveConnection(clientId) {
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
        }
        catch (error) {
            console.error('Failed to approve connection:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    denyConnection(clientId) {
        try {
            this.pendingRequests.delete(clientId);
            if (this.ws && this.ws.connected) {
                this.ws.emit('deny_connection', { clientId, hostId: this.hostId });
            }
            console.log(`Denied connection for client: ${clientId}`);
            return { success: true };
        }
        catch (error) {
            console.error('Failed to deny connection:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    disconnectClient(clientId) {
        try {
            this.connectedClients.delete(clientId);
            if (this.ws && this.ws.connected) {
                this.ws.emit('disconnect_client', { clientId, hostId: this.hostId });
            }
            console.log(`Disconnected client: ${clientId}`);
            return { success: true };
        }
        catch (error) {
            console.error('Failed to disconnect client:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    sendSignalingMessage(message) {
        if (this.ws && this.ws.connected) {
            this.ws.emit('signal', message);
        }
        else {
            console.error('Socket.IO is not connected');
        }
    }
}
// Start the application
new HostApp();
