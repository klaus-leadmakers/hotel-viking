import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Role } from './roles.enum';
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Log ind — returnerer JWT tokens' })
  login(@Body() dto: LoginDto) { return this.authService.login(dto); }

  @Post('register')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Opret ny bruger (kun Admin+)' })
  register(@Body() dto: RegisterDto) { return this.authService.register(dto); }

  @Post('refresh')
  @ApiOperation({ summary: 'Forny access token via refresh token' })
  refresh(@Body('refresh_token') token: string) { return this.authService.refreshTokens(token); }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Hent oplysninger om nuvaerende bruger' })
  me(@CurrentUser() user: any) {
    return { id: user.id, role: user.role, createdAt: user.createdAt };
  }
}
