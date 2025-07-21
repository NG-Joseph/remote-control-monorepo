/**
 * Signaling Module
 * Organizes the WebSocket signaling components
 */

import { Module } from '@nestjs/common';
import { SignalingGateway } from './signaling.gateway';
import { SignalingService } from './signaling.service';

@Module({
  providers: [SignalingGateway, SignalingService],
  exports: [SignalingService],
})
export class SignalingModule {}
