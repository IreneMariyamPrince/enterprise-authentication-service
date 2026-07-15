import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DisableMfaDto {
  @ApiProperty({ description: 'User password to confirm disabling MFA' })
  @IsString()
  @MinLength(8)
  password: string;
}
