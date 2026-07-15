import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ example: '1234567890abcdef...', description: 'The verification token sent to email' })
  @IsNotEmpty()
  @IsString()
  token: string;
}
