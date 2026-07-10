import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Senior Editor', description: 'The name of the role' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Can edit and publish content', description: 'The description of the role' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 60, description: 'Role hierarchy level' })
  @IsOptional()
  @IsInt()
  @Min(0)
  level?: number;
}
