import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class LoginDto {
  @ApiProperty({ example: 'admin@hotel.dk' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StaerktPassword123' })
  @IsString()
  @MinLength(8)
  password: string;
}
