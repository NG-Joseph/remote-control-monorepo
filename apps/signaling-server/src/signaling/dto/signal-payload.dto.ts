/**
 * Signal payload DTO for WebRTC signaling
 * Used for SDP offers, answers, and ICE candidates
 */

import { IsString, IsOptional, IsObject } from 'class-validator';

export class SignalPayloadDto {
  @IsString()
  type!: 'offer' | 'answer' | 'ice-candidate';

  @IsString()
  fromId!: string;

  @IsString()
  targetId!: string;

  @IsOptional()
  @IsObject()
  sdp?: any; // RTCSessionDescriptionInit

  @IsOptional()
  @IsObject()
  candidate?: any; // RTCIceCandidateInit
}
