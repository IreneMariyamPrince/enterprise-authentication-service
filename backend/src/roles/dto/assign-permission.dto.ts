import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignPermissionDto {
  @ApiProperty({ example: 'uuid', description: 'The ID of the permission to assign to the role' })
  @IsNotEmpty()
  @IsUUID()
  permissionId: string;
}
