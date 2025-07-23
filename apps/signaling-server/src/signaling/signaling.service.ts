/**
 * Signaling Service
 * Maintains host registry, performs validation, and routes messages
 */

import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { SignalPayloadDto } from './dto/signal-payload.dto';
import { CommandDto } from './dto/command.dto';

interface PendingRequest {
  clientId: string;
  hostId: string;
  timestamp: number;
  clientSocket: Socket;
}

@Injectable()
export class SignalingService {
  private hosts = new Map<string, { socket: Socket; allowedKeys: string[] }>();
  private clients = new Map<string, Socket>();
  private pendingRequests = new Map<string, PendingRequest>(); // key: `${hostId}-${clientId}`

  registerClient(socket: Socket): void {
    // Register a generic client (could be host or mobile client)
    console.log(`[SIGNAL] Client connected: ${socket.id}`);
  }

  registerHost(hostId: string, socket: Socket, allowedKeys: string[]): void {
    console.log(`[SIGNAL] Host registered: ${hostId} with keys: ${allowedKeys.join(', ')}`);
    this.hosts.set(hostId, { socket, allowedKeys });
    
    // Send confirmation back to the host
    socket.emit('host_registered', { hostId, allowedKeys });
    
    // Check for any pending requests for this host that arrived before host connected
    this.processPendingRequestsForHost(hostId);
    
    this.notifyClientsUpdated();
  }

  registerMobileClient(clientId: string, socket: Socket): void {
    console.log(`[SIGNAL] Mobile client registered: ${clientId}`);
    this.clients.set(clientId, socket);
    // Send current host list to the new client
    socket.emit('hosts_updated', this.getHostsList());
  }

  unregisterClient(socket: Socket): void {
    console.log(`[SIGNAL] Client disconnected: ${socket.id}`);
    
    // Check if it's a host
    const hostEntry = Array.from(this.hosts.entries()).find(([, v]) => v.socket === socket);
    if (hostEntry) {
      console.log(`[SIGNAL] Removing host: ${hostEntry[0]}`);
      this.hosts.delete(hostEntry[0]);
      
      // Clean up pending requests for this host
      this.cleanupPendingRequestsForHost(hostEntry[0]);
      
      this.notifyClientsUpdated();
    }
    
    // Check if it's a mobile client
    Array.from(this.clients.entries()).forEach(([id, s]) => {
      if (s === socket) {
        console.log(`[SIGNAL] Removing mobile client: ${id}`);
        this.clients.delete(id);
        
        // Clean up pending requests for this client
        this.cleanupPendingRequestsForClient(id);
      }
    });
  }

  getHostsList(): Array<{ hostId: string; allowedKeys: string[] }> {
    return Array.from(this.hosts.entries()).map(([id, { allowedKeys }]) => ({
      hostId: id, 
      allowedKeys
    }));
  }

  requestConnection(hostId: string, clientId: string): void {
    console.log(`[SIGNAL] Connection request from ${clientId} to ${hostId}`);
    const host = this.hosts.get(hostId);
    const clientSocket = this.clients.get(clientId);
    
    if (!clientSocket) {
      console.warn(`[SIGNAL] Client ${clientId} not found for connection request`);
      return;
    }
    
    if (host) {
      // Host is online, send request immediately
      console.log(`[SIGNAL] Host ${hostId} is online, sending request immediately`);
      host.socket.emit('connect_request', { clientId });
    } else {
      // Host is not online yet, store the request for later
      console.log(`[SIGNAL] Host ${hostId} not online, storing pending request`);
      const requestKey = `${hostId}-${clientId}`;
      this.pendingRequests.set(requestKey, {
        clientId,
        hostId,
        timestamp: Date.now(),
        clientSocket
      });
      
      // Notify client that request is pending
      clientSocket.emit('connection_pending', { 
        hostId,
        message: 'Waiting for host to come online...' 
      });
    }
  }

  approveConnection(hostId: string, clientId: string): void {
    console.log(`[SIGNAL] Connection approved by ${hostId} for client ${clientId}`);
    const clientSocket = this.clients.get(clientId);
    const requestKey = `${hostId}-${clientId}`;
    
    if (clientSocket) {
      clientSocket.emit('connection_approved', { 
        hostId,
        clientId 
      });
      
      // Remove from pending requests if it was there
      this.pendingRequests.delete(requestKey);
    } else {
      console.warn(`[SIGNAL] Client ${clientId} not found for approval notification`);
    }
  }

  relaySignal(payload: SignalPayloadDto): void {
    console.log(`[SIGNAL] Relaying ${payload.type} from ${payload.fromId} to ${payload.targetId}`);
    
    // Try to find target in both hosts and clients
    let targetSocket: Socket | undefined;
    
    const hostEntry = this.hosts.get(payload.targetId);
    if (hostEntry) {
      targetSocket = hostEntry.socket;
    } else {
      targetSocket = this.clients.get(payload.targetId);
    }

    if (targetSocket) {
      targetSocket.emit('signal', payload);
    } else {
      console.warn(`[SIGNAL] Target ${payload.targetId} not found for signal relay`);
    }
  }

  handleCommand({ hostId, clientId, command, type }: CommandDto): void {
    console.log(`[SIGNAL] Command from ${clientId} to ${hostId}: ${command} (${type})`);
    
    const host = this.hosts.get(hostId);
    if (!host) {
      console.warn(`[SIGNAL] Host ${hostId} not found for command`);
      return;
    }

    if (!host.allowedKeys.includes(command)) {
      console.warn(`[SIGNAL] Blocked unauthorized command: ${command} (allowed: ${host.allowedKeys.join(', ')})`);
      return;
    }

    console.log(`[SIGNAL] Executing authorized command: ${command}`);
    host.socket.emit('command', { clientId, command, type });
  }

  private processPendingRequestsForHost(hostId: string): void {
    console.log(`[SIGNAL] Processing pending requests for host: ${hostId}`);
    const host = this.hosts.get(hostId);
    if (!host) return;

    // Find all pending requests for this host
    Array.from(this.pendingRequests.entries()).forEach(([key, request]) => {
      if (request.hostId === hostId) {
        console.log(`[SIGNAL] Forwarding pending request from ${request.clientId} to ${hostId}`);
        
        // Send the request to the host
        host.socket.emit('connect_request', { clientId: request.clientId });
        
        // Notify client that request has been forwarded
        if (request.clientSocket.connected) {
          request.clientSocket.emit('connection_forwarded', { 
            hostId,
            message: 'Host is now online, request forwarded' 
          });
        }
      }
    });
  }

  private cleanupPendingRequestsForHost(hostId: string): void {
    Array.from(this.pendingRequests.entries()).forEach(([key, request]) => {
      if (request.hostId === hostId) {
        console.log(`[SIGNAL] Cleaning up pending request for disconnected host: ${hostId}`);
        
        // Notify client that host disconnected
        if (request.clientSocket.connected) {
          request.clientSocket.emit('host_disconnected', { 
            hostId,
            message: 'Host has disconnected' 
          });
        }
        
        this.pendingRequests.delete(key);
      }
    });
  }

  private cleanupPendingRequestsForClient(clientId: string): void {
    Array.from(this.pendingRequests.entries()).forEach(([key, request]) => {
      if (request.clientId === clientId) {
        console.log(`[SIGNAL] Cleaning up pending request for disconnected client: ${clientId}`);
        this.pendingRequests.delete(key);
      }
    });
  }

  private notifyClientsUpdated(): void {
    const hostsList = this.getHostsList();
    console.log(`[SIGNAL] Notifying clients of updated hosts list: ${hostsList.length} hosts`);
    
    Array.from(this.clients.values()).forEach(client => {
      client.emit('hosts_updated', hostsList);
    });
  }
}
