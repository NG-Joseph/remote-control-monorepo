# Remote Control Platform (Monorepo)

Tech stack:
- TypeScript (Nodes/NestJS, React Native, Electron).
- WebRTC for screen streaming + data channels for input.
- Yarn Workspaces monorepo with apps (signaling-server, host-app, mobile-client) and shared packages (shared-dto, webrtc-utils).

Architecture:
- Signaling via WebSocket (NestJS).
- Peer connection with screen capture and DataChannel.
- Host defines allowed keys; mobile app uses virtual control layout accordingly.

Coding standards:
- Use functional components/hooks in React Native.
- NestJS: controllers delegate to services; use `class-validator` for DTOs.
- Prettier + ESLint (Airbnb).
- JSDoc headers on modules/classes.
- Use shared packages—no duplicates.
- Swagger to document NestJS APIs.


🚀Mobile app Overview
The Mobile Client is built with Expo + React Native, utilizing Expo Router for navigation. It discovers desktop hosts, establishes a WebRTC session via a signaling server, displays live screen-sharing, and provides an input overlay based on host-approved controls. All components use functional components and React Hooks.

📂 Folder Structure
pgsql
Copy
Edit
apps/mobile-client/
├── app/
│   ├── _layout.tsx              # Expo Router layout wrapper
│   ├── index.tsx                # Hosts list screen
│   ├── session/                 # Nested route for active session
│   │   ├── index.tsx            # Screen & overlay view
│   │   └── [hostId].tsx         # Session-specific logic by hostId
├── src/
│   ├── components/
│   │   ├── HostList.tsx         # Lists available hosts
│   │   ├── ScreenView.tsx       # Live video render
│   │   └── InputOverlay.tsx     # Virtual controls (keyboard, arrows, modifiers)
│   ├── hooks/
│   │   ├── useSignaling.ts      # Handles WebSocket signaling logic
│   │   └── useWebRTC.ts         # Manages peer connection, media/data channels
│   ├── types/                   # Shared DTOs imported from shared-dto
│   └── utils/                   # Helpers like permissions parser, ICE config
├── app.json                     # Expo config
├── tsconfig.json
├── package.json
└── README.md
🧭 Navigation Flow (Expo Router)
Route	Purpose
/	Displays HostList screen
/session/[hostId]	Shows ScreenView and InputOverlay for a host

Use Expo Router file-based routing for deep linking and navigation.

Navigate with:

ts
Copy
Edit
router.push(`/session/${selectedHost.id}`);
🎯 Core Features
Host Discovery: useSignaling.ts connects via WebSocket, fetches available hosts, maintains real-time updates.

Connection Flow: Selecting a host initiates the SDP offer/answer exchange and ICE candidate sharing.

Screen Streaming: useWebRTC.ts manages peer connection and provides a MediaStream for ScreenView.

Input Overlay: InputOverlay.tsx renders virtual controls based on a permission schema and sends events via WebRTC DataChannel.

State Management: Use useState, useEffect, and useContext (if needed) for peer state, connection status, and input schema.

🧱 Component & Hook Overview
HostList.tsx: functional component using useSignaling() to fetch and display hosts.

useSignaling.ts: custom hook managing host discovery, WebSocket events, and session requests.

useWebRTC.ts: custom hook creating RTCPeerConnection, handling media/data channels, ICE, and clean teardown.

ScreenView.tsx: renders the stream via <RTCView streamURL={...} /> from react-native-webrtc.

InputOverlay.tsx: dynamically renders keys/buttons based on allowed keys and uses useWebRTC() for data channel input.

🛠 Running & Development
From the monorepo root:

bash
Copy
Edit
cd apps/mobile-client
yarn install
Start development:

bash
Copy
Edit
yarn start
Test on device/emulator:

For iOS: run via Expo Go or Xcode Simulator.

For Android: Expo Go or Android Studio emulator.

Make sure signaling-server and host-app are running and accessible, using STUN (stun:stun.l.google.com:19302) or TURN for real-world connectivity.

📝 Coding Guidelines
Hooks First: Core logic belongs in useSignaling.ts, useWebRTC.ts.

Clean Components: Presentational UI only (HostList, ScreenView, InputOverlay).

Typed DTOs: Import types from shared-dto via Yarn Workspace.

Use JSDoc: At file/header level to guide maintainability and Copilot inference.

Use Async/Await & Cleanup: Avoid memory leaks in hooks (e.g., hanging peer connections).



