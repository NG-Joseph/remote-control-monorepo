/**
 * Host registration information DTO
 * Used when a host registers with the signaling server
 */

import { IsString, IsArray, ArrayNotEmpty } from 'class-validator';

export class HostInfoDto {
  @IsString()
  hostId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  allowedKeys!: string[];
}
