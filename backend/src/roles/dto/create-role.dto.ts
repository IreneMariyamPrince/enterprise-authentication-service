import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsInt, Min } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'Editor', description: 'The name of the role' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Can edit content', description: 'The description of the role' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 50, description: 'Role hierarchy level (higher is more privileged)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  level?: number;
}
