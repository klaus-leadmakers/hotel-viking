import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../roles.enum';
export class RegisterDto {
  @ApiProperty({ example: 'bruger@hotel.dk' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StaerktPassword123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: Role, default: Role.USER })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
