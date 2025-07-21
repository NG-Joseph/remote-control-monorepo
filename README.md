# Remote Control Platform

A monorepo containing a React Native mobile app and NestJS signaling server for a remote control platform using WebRTC.

## 🏗️ Project Structure

```
remote-control-platform/
├── apps/
│   ├── mobile-app/          # React Native + Expo app
│   └── signaling-server/    # NestJS WebSocket signaling server
├── packages/
│   ├── shared-dto/          # Shared TypeScript interfaces and DTOs
│   └── webrtc-utils/        # WebRTC utilities and helpers
├── package.json             # Root package.json with workspace configuration
└── tsconfig.json           # Root TypeScript configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- Yarn >= 4.0.0
- For mobile development: Expo CLI

### Installation

1. Install dependencies for all packages:
   ```bash
   yarn install
   ```

2. Build shared packages:
   ```bash
   yarn build
   ```

### Development

#### Run all apps in development mode:
```bash
yarn dev
```

#### Run individual apps:

**Mobile App:**
```bash
yarn mobile
# or
yarn workspace mobile-app start
```

**Signaling Server:**
```bash
yarn server
# or
yarn workspace signaling-server start:dev
```

### Available Scripts

- `yarn build` - Build all packages
- `yarn lint` - Lint all packages
- `yarn lint:fix` - Fix linting issues in all packages
- `yarn type-check` - Type check all packages
- `yarn test` - Run tests in all packages
- `yarn clean` - Clean all build artifacts and node_modules

## 📦 Packages

### Apps

#### `mobile-app`
React Native app built with Expo for remote control functionality.

**Key technologies:**
- React Native + Expo
- TypeScript
- Expo Router for navigation
- WebRTC for peer-to-peer communication

#### `signaling-server`
NestJS server handling WebRTC signaling via WebSockets.

**Key technologies:**
- NestJS
- TypeScript
- Socket.IO for WebSocket connections
- WebRTC signaling

### Shared Packages

#### `@remote-control/shared-dto`
Shared TypeScript interfaces and DTOs used across the platform.

**Includes:**
- WebRTC message types
- API response interfaces
- Room and user management types
- Control command interfaces

#### `@remote-control/webrtc-utils`
WebRTC utilities and helper functions for establishing peer connections.

**Features:**
- WebRTC peer connection wrapper
- Message creation utilities
- Configuration helpers
- Connection state management

## 🔧 Development

### TypeScript Configuration

The monorepo uses TypeScript project references for efficient builds and development:

- Root `tsconfig.json` defines path mappings for absolute imports
- Each package has its own `tsconfig.json` extending the root configuration
- Composite builds enable fast incremental compilation

### Absolute Imports

All packages can import shared code using absolute paths:

```typescript
import { SignalingMessage, Room } from '@remote-control/shared-dto';
import { WebRTCPeerConnection } from '@remote-control/webrtc-utils';
```

### Linting and Formatting

- ESLint configuration for TypeScript
- Prettier for code formatting
- Pre-configured rules for React Native and NestJS

## 🏃‍♂️ Build and Deploy

### Production Build

Build all packages for production:
```bash
yarn build
```

### Individual Package Builds

Build specific packages:
```bash
yarn workspace @remote-control/shared-dto build
yarn workspace @remote-control/webrtc-utils build
yarn workspace mobile-app build
yarn workspace signaling-server build
```

## 📱 Mobile Development

The mobile app uses Expo for easier development and deployment:

```bash
cd apps/mobile-app
yarn start
```

This will open the Expo development server where you can:
- Run on iOS simulator
- Run on Android emulator
- Test on physical devices with Expo Go app

## 🖥️ Server Development

The signaling server runs on port 3000 by default:

```bash
cd apps/signaling-server
yarn start:dev
```

Server endpoints:
- WebSocket: `ws://localhost:3000`
- Health check: `http://localhost:3000`

## 🤝 Contributing

1. Follow the existing code style (ESLint + Prettier)
2. Write tests for new features
3. Update documentation as needed
4. Use conventional commit messages

## 📄 License

Copyright
