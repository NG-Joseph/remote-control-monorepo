/**
 * Simple signaling server using Socket.IO
 * Basic implementation to get the host app connecting
 */

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  path: '/signal',
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Storage for hosts and clients
const hosts = new Map(); // hostId -> { socket, allowedKeys }
const clients = new Map(); // clientId -> socket

console.log('🚀 Remote Control Platform Signaling Server');
console.log('📡 WebSocket server starting...');

io.on('connection', (socket) => {
  console.log(`[SIGNAL] Client connected: ${socket.id}`);

  // Handle room-join (host registration)
  socket.on('room-join', (data) => {
    console.log(`[SIGNAL] Room join request:`, data);
    
    if (data.role === 'host') {
      // Register as host
      const allowedKeys = data.allowedKeys || ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape'];
      hosts.set(data.roomId, { socket, allowedKeys });
      
      console.log(`[SIGNAL] Host registered: ${data.roomId} with keys: ${allowedKeys.join(', ')}`);
      socket.emit('room-joined', { roomId: data.roomId, role: 'host' });
      
      // Notify all clients of updated hosts
      notifyClientsUpdated();
    } else {
      // Register as mobile client
      clients.set(data.roomId + '_client', socket);
      console.log(`[SIGNAL] Mobile client registered: ${data.roomId}_client`);
      socket.emit('room-joined', { roomId: data.roomId, role: 'client' });
      
      // Send current hosts list
      socket.emit('hosts_updated', getHostsList());
    }
  });

  // Handle room-leave
  socket.on('room-leave', (data) => {
    console.log(`[SIGNAL] Room leave request:`, data);
    socket.emit('room-left', { roomId: data.roomId });
  });

  // Handle host registration
  socket.on('register', (data) => {
    console.log(`[SIGNAL] Host registration:`, data);
    hosts.set(data.hostId, { socket, allowedKeys: data.allowedKeys });
    notifyClientsUpdated();
  });

  // Handle client registration  
  socket.on('register_client', (data) => {
    console.log(`[SIGNAL] Client registration:`, data);
    clients.set(data.clientId, socket);
    socket.emit('hosts_updated', getHostsList());
  });

  // Handle list hosts request
  socket.on('list_hosts', () => {
    console.log(`[SIGNAL] Host list request from: ${socket.id}`);
    socket.emit('hosts_list', getHostsList());
  });

  // Handle connection requests
  socket.on('connect_request', (data) => {
    console.log(`[SIGNAL] Connection request:`, data);
    const host = hosts.get(data.hostId);
    if (host) {
      host.socket.emit('connect_request', { clientId: data.clientId });
    }
  });

  // Handle connection approval from host
  socket.on('approve_connection', (data) => {
    console.log(`[SIGNAL] Connection approved by ${data.hostId} for client ${data.clientId}`);
    const clientSocket = clients.get(data.clientId);
    if (clientSocket) {
      clientSocket.emit('connection_approved', { 
        hostId: data.hostId,
        clientId: data.clientId 
      });
    } else {
      console.warn(`[SIGNAL] Client ${data.clientId} not found for approval notification`);
    }
  });

  // Handle WebRTC signaling
  socket.on('signal', (payload) => {
    console.log(`[SIGNAL] Relaying ${payload.type} from ${payload.fromId} to ${payload.targetId}`);
    
    // Find target socket
    let targetSocket;
    const hostEntry = hosts.get(payload.targetId);
    if (hostEntry) {
      targetSocket = hostEntry.socket;
    } else {
      targetSocket = clients.get(payload.targetId);
    }

    if (targetSocket) {
      targetSocket.emit('signal', payload);
    } else {
      console.warn(`[SIGNAL] Target ${payload.targetId} not found`);
    }
  });

  // Handle control commands
  socket.on('command', (payload) => {
    console.log(`[SIGNAL] Command from ${payload.clientId} to ${payload.hostId}: ${payload.command}`);
    
    const host = hosts.get(payload.hostId);
    if (!host) {
      console.warn(`[SIGNAL] Host ${payload.hostId} not found`);
      return;
    }

    if (!host.allowedKeys.includes(payload.command)) {
      console.warn(`[SIGNAL] Blocked unauthorized command: ${payload.command}`);
      return;
    }

    console.log(`[SIGNAL] Executing authorized command: ${payload.command}`);
    host.socket.emit('command', { 
      clientId: payload.clientId, 
      command: payload.command, 
      type: payload.type || 'keydown'
    });
  });

  // Handle disconnections
  socket.on('disconnect', () => {
    console.log(`[SIGNAL] Client disconnected: ${socket.id}`);
    
    // Remove from hosts
    for (const [hostId, hostData] of hosts.entries()) {
      if (hostData.socket === socket) {
        console.log(`[SIGNAL] Removing host: ${hostId}`);
        hosts.delete(hostId);
        notifyClientsUpdated();
        break;
      }
    }
    
    // Remove from clients
    for (const [clientId, clientSocket] of clients.entries()) {
      if (clientSocket === socket) {
        console.log(`[SIGNAL] Removing client: ${clientId}`);
        clients.delete(clientId);
        break;
      }
    }
  });
});

function getHostsList() {
  return Array.from(hosts.entries()).map(([id, { allowedKeys }]) => ({
    hostId: id, 
    allowedKeys
  }));
}

function notifyClientsUpdated() {
  const hostsList = getHostsList();
  console.log(`[SIGNAL] Notifying clients of updated hosts: ${hostsList.length} hosts`);
  
  clients.forEach(client => {
    client.emit('hosts_updated', hostsList);
  });
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🔌 Socket.IO endpoint: ws://localhost:${PORT}/signal`);
  console.log('⏳ Waiting for host and client connections...');
});
