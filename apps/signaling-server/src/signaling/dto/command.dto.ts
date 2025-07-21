/**
 * Command DTO for remote control commands
 * Used to validate control commands from mobile clients
 */

import { IsString } from 'class-validator';

export class CommandDto {
  @IsString()
  hostId!: string;

  @IsString()
  clientId!: string;

  @IsString()
  command!: string;

  @IsString()
  type!: 'keydown' | 'keyup' | 'click' | 'move';
}
