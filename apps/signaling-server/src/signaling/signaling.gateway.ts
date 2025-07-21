/**
 * Signaling Gateway
 * Handles WebSocket connection logic and message routing
 */

import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SignalingService } from './signaling.service';
import { HostInfoDto } from './dto/host-info.dto';
import { SignalPayloadDto } from './dto/signal-payload.dto';
import { CommandDto } from './dto/command.dto';

@WebSocketGateway({ 
  path: '/signal', 
  cors: { 
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
})
export class SignalingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly signaling: SignalingService) {}

  handleConnection(client: Socket): void {
    console.log(`[GATEWAY] New client connected: ${client.id}`);
    this.signaling.registerClient(client);
  }

  handleDisconnect(client: Socket): void {
    console.log(`[GATEWAY] Client disconnected: ${client.id}`);
    this.signaling.unregisterClient(client);
  }

  @SubscribeMessage('register')
  handleRegisterHost(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: HostInfoDto
  ): void {
    console.log(`[GATEWAY] Host registration request from ${client.id}:`, data);
    try {
      this.signaling.registerHost(data.hostId, client, data.allowedKeys);
      console.log(`[GATEWAY] Host registration completed for: ${data.hostId}`);
    } catch (error) {
      console.error(`[GATEWAY] Host registration failed:`, error);
    }
  }

  @SubscribeMessage('register_client')
  handleRegisterMobileClient(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { clientId: string }
  ): void {
    console.log(`[GATEWAY] Mobile client registration request:`, data);
    this.signaling.registerMobileClient(data.clientId, client);
  }

  @SubscribeMessage('list_hosts')
  handleListHosts(@ConnectedSocket() client: Socket): any {
    console.log(`[GATEWAY] Host list request from: ${client.id}`);
    const hosts = this.signaling.getHostsList();
    return { event: 'hosts_list', data: hosts };
  }

  @SubscribeMessage('connect_request')
  handleConnectRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { hostId: string; clientId: string }
  ): void {
    console.log(`[GATEWAY] Connection request:`, data);
    this.signaling.requestConnection(data.hostId, data.clientId);
  }

  @SubscribeMessage('approve_connection')
  handleApproveConnection(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { hostId: string; clientId: string }
  ): void {
    console.log(`[GATEWAY] Connection approval:`, data);
    this.signaling.approveConnection(data.hostId, data.clientId);
  }

  @SubscribeMessage('signal')
  handleSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SignalPayloadDto
  ): void {
    console.log(`[GATEWAY] Signal message:`, payload);
    this.signaling.relaySignal(payload);
  }

  @SubscribeMessage('command')
  handleCommand(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: CommandDto
  ): void {
    console.log(`[GATEWAY] Command message:`, payload);
    this.signaling.handleCommand(payload);
  }

  // Room-based messages (matching the host app expectations)
  @SubscribeMessage('room-join')
  handleRoomJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; role: 'host' | 'client' }
  ): void {
    console.log(`[GATEWAY] Room join request:`, data);
    
    if (data.role === 'host') {
      // Register as host using roomId as hostId
      this.signaling.registerHost(data.roomId, client, [
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape'
      ]);
      client.emit('room-joined', { roomId: data.roomId, role: 'host' });
    } else {
      // Register as mobile client
      this.signaling.registerMobileClient(data.roomId + '_client', client);
      client.emit('room-joined', { roomId: data.roomId, role: 'client' });
    }
  }

  @SubscribeMessage('room-leave')
  handleRoomLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string }
  ): void {
    console.log(`[GATEWAY] Room leave request:`, data);
    // Disconnect will be handled by handleDisconnect
    client.emit('room-left', { roomId: data.roomId });
  }
}
