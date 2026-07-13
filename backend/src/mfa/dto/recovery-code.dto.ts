import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecoveryCodeDto {
  @ApiProperty({ description: 'The 10-character backup recovery code' })
  @IsString()
  @Length(10, 10)
  code: string;
}
