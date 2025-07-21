/**
 * Signaling Service
 * Maintains host registry, performs validation, and routes messages
 */

import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { SignalPayloadDto } from './dto/signal-payload.dto';
import { CommandDto } from './dto/command.dto';

@Injectable()
export class SignalingService {
  private hosts = new Map<string, { socket: Socket; allowedKeys: string[] }>();
  private clients = new Map<string, Socket>();

  registerClient(socket: Socket): void {
    // Register a generic client (could be host or mobile client)
    console.log(`[SIGNAL] Client connected: ${socket.id}`);
  }

  registerHost(hostId: string, socket: Socket, allowedKeys: string[]): void {
    console.log(`[SIGNAL] Host registered: ${hostId} with keys: ${allowedKeys.join(', ')}`);
    this.hosts.set(hostId, { socket, allowedKeys });
    
    // Send confirmation back to the host
    socket.emit('host_registered', { hostId, allowedKeys });
    
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
      this.notifyClientsUpdated();
    }
    
    // Check if it's a mobile client
    Array.from(this.clients.entries()).forEach(([id, s]) => {
      if (s === socket) {
        console.log(`[SIGNAL] Removing mobile client: ${id}`);
        this.clients.delete(id);
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
    if (host) {
      host.socket.emit('connect_request', { clientId });
    } else {
      console.warn(`[SIGNAL] Host ${hostId} not found for connection request`);
    }
  }

  approveConnection(hostId: string, clientId: string): void {
    console.log(`[SIGNAL] Connection approved by ${hostId} for client ${clientId}`);
    const clientSocket = this.clients.get(clientId);
    if (clientSocket) {
      clientSocket.emit('connection_approved', { 
        hostId,
        clientId 
      });
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

  private notifyClientsUpdated(): void {
    const hostsList = this.getHostsList();
    console.log(`[SIGNAL] Notifying clients of updated hosts list: ${hostsList.length} hosts`);
    
    Array.from(this.clients.values()).forEach(client => {
      client.emit('hosts_updated', hostsList);
    });
  }
}
