📡 Signaling Server — Remote Control Platform
🚀 Purpose
The NestJS WebSocket signaling server orchestrates discovery, WebRTC session negotiation, and enforces input permissions for peer-to-peer communication between desktop hosts and mobile clients. It provides:

Host registration and discovery

Secure SDP/ICE exchange

Permission-based command validation

Robust session lifecycle management

Its role is critical, since WebRTC doesn't include signaling or permission enforcement — it merely transports encrypted media and data channels. Secure signaling and command verification are vital for a secure PoC. 
webrtcHacks
webrtc-security.github.io
Stack Overflow
+4
Stream
+4
MDN Web Docs
+4

🔒 Security & Authorization
Secure Signaling Channel
Use wss:// (TLS) to prevent MITM attacks during SDP/ICE exchange. 
Stream
webrtc-security.github.io
+2
Ant Media
+2
MoldStud
+2

Authentication & Authorization

Ideally, enforce user identity (JWT/OAuth, API tokens), but at least validate hostId and clientId.

Trust only registered hosts, and validate commands against host-defined allowedKeys.

Command Enforcement
Even though input is peer-to-peer via WebRTC DataChannel, the server acts as authority on allowed commands to prevent misuse. You enforce this before forwarding to the host. (See example implementation below.)

🧱 Project Structure
pgsql
Copy
Edit
apps/signaling-server/
├── src/
│   ├── signaling/
│   │   ├── signaling.gateway.ts
│   │   ├── signaling.service.ts
│   │   └── dto/
│   │       ├── host-info.dto.ts
│   │       ├── signal-payload.dto.ts
│   │       └── command.dto.ts
│   ├── app.module.ts
│   └── main.ts
├── package.json
└── tsconfig.json
🗂️ Signaling Flow & Enforcement
gateway: SignalingGateway
Handles WebSocket connection logic and message routing.

ts
Copy
Edit
@WebSocketGateway({ path: '/signal', cors: { origin: '*' } })
export class SignalingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private signaling: SignalingService) {}

  handleConnection(client: Socket) { this.signaling.registerClient(client); }
  handleDisconnect(client: Socket) { this.signaling.unregisterClient(client); }

  @SubscribeMessage('register')
  onRegister(client: Socket, dto: HostInfoDto) {
    this.signaling.registerHost(dto.hostId, client, dto.allowedKeys);
  }

  @SubscribeMessage('list_hosts')
  onListHosts(client: Socket) {
    return this.signaling.getHostsList();
  }

  @SubscribeMessage('connect_request')
  onConnectRequest(client: Socket, dto: { hostId: string; clientId: string }) {
    this.signaling.requestConnection(dto.hostId, dto.clientId);
  }

  @SubscribeMessage('signal')
  onSignal(client: Socket, payload: SignalPayloadDto) {
    this.signaling.relaySignal(payload);
  }

  @SubscribeMessage('command')
  onCommand(client: Socket, payload: CommandDto) {
    this.signaling.handleCommand(payload);
  }
}
service: SignalingService
Maintains host registry, performs validation, and routes messages.

ts
Copy
Edit
@Injectable()
export class SignalingService {
  private hosts = new Map<string, { socket: Socket; allowedKeys: string[] }>();
  private clients = new Map<string, Socket>();

  registerHost(hostId: string, socket: Socket, allowedKeys: string[]) {
    this.hosts.set(hostId, { socket, allowedKeys });
    this.notifyClientsUpdated();
  }

  unregisterClient(socket: Socket) {
    const hostEntry = Array.from(this.hosts.entries()).find(([,v]) => v.socket === socket);
    if (hostEntry) {
      this.hosts.delete(hostEntry[0]);
      this.notifyClientsUpdated();
    }
    Array.from(this.clients.entries()).forEach(([id, s]) => {
      if (s === socket) this.clients.delete(id);
    });
  }

  getHostsList() {
    return Array.from(this.hosts.entries()).map(([id, { allowedKeys }]) => ({
      hostId: id, allowedKeys
    }));
  }

  requestConnection(hostId: string, clientId: string) {
    const host = this.hosts.get(hostId);
    if (host) host.socket.emit('connect_request', { clientId });
  }

  relaySignal(payload: SignalPayloadDto) {
    const targetSocket = this.clients.get(payload.targetId) || this.hosts.get(payload.targetId)?.socket;
    targetSocket?.emit('signal', payload);
  }

  handleCommand({ hostId, clientId, command }: CommandDto) {
    const host = this.hosts.get(hostId);
    if (!host) return;

    if (!host.allowedKeys.includes(command)) {
      console.warn(`[SIGNAL] Blocked unauthorized command: ${command}`);
      return;
    }
    host.socket.emit('command', { clientId, command });
  }

  private notifyClientsUpdated() {
    Array.from(this.clients.values()).forEach(c => c.emit('hosts_updated', this.getHostsList()));
  }
}
🛠 Setup & Run
bash
Copy
Edit
cd apps/signaling-server
yarn install
yarn start:dev
Runs a secured WebSocket server at wss://localhost:3001/signal.
Make sure TLS certificates are configured for production.

✅ Summary
Uses wss:// for secure signaling. 
wowza.com
+9
Stream
+9
Ant Media
+9

Hosts register with allowedKeys, which the service enforces.

All input commands are validated server-side before reaching the host.

Relay logic handles SDP, ICE, session requests, and command messages robustly.