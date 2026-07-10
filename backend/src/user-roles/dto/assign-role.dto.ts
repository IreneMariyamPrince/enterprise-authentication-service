import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({ example: 'uuid', description: 'The ID of the role to assign' })
  @IsNotEmpty()
  @IsUUID()
  roleId: string;
}
