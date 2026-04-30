import {
  Controller, Post, Get, Patch, Body, Param,
  UseGuards, Headers, UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { MewsService } from './mews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';

@ApiTags('Mews PMS')
@Controller('mews')
export class MewsController {
  constructor(
    private mewsService: MewsService,
    private config: ConfigService,
  ) {}

  @Get('status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Mews API forbindelsesstatus og miljø' })
  status() {
    return {
      configured: this.mewsService.isConfigured(),
      environment: this.mewsService.getEnvironment(),
      apiUrl: this.config.get('MEWS_API_URL'),
      message: this.mewsService.isConfigured()
        ? `Mews konfigureret [${this.mewsService.getEnvironment().toUpperCase()}]`
        : 'Tilføj MEWS_ACCESS_TOKEN og MEWS_CLIENT_TOKEN i .env',
    };
  }

  @Patch('tokens')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Opdater Mews API tokens (SuperAdmin)' })
  updateTokens(
    @Body() body: { accessToken?: string; clientToken?: string; environment?: string },
  ) {
    return this.mewsService.updateTokens(body);
  }

  @Get('configuration')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Hent hotel-konfiguration fra Mews' })
  getConfiguration() { return this.mewsService.getConfiguration(); }

  @Get('spaces')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Hent rum-inventar fra Mews' })
  getSpaces() { return this.mewsService.getSpaces(); }

  @Get('services')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Hent services fra Mews' })
  getServices() { return this.mewsService.getServices(); }

  @Post('reservations')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Hent reservationer fra Mews' })
  getReservations(@Body() body: { startUtc: string; endUtc: string }) {
    return this.mewsService.getReservations(body.startUtc, body.endUtc);
  }

  @Post('customers/search')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Søg efter gæster i Mews' })
  searchCustomers(@Body() body: { email: string }) {
    return this.mewsService.searchCustomers(body.email);
  }

  @Post('checkin/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)
  @ApiOperation({ summary: 'Check in gæst (Mews)' })
  checkIn(@Param('id') id: string) { return this.mewsService.checkIn(id); }

  @Post('checkout/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.USER)
  @ApiOperation({ summary: 'Check ud gæst (Mews)' })
  checkOut(@Param('id') id: string) { return this.mewsService.checkOut(id); }

  @Post('webhooks')
  @ApiOperation({ summary: 'Modtag Mews WebHook events (HMAC-SHA256 verificeret)' })
  async handleWebhook(
    @Headers('x-mews-signature') signature: string,
    @Body() payload: any,
  ) {
    const secret = this.config.get('MEWS_WEBHOOK_SECRET', '');
    if (secret) {
      const expected = createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
      if (signature !== expected) throw new UnauthorizedException('Ugyldig webhook signatur');
    }
    return { received: true, type: payload?.Type ?? 'unknown' };
  }
}
