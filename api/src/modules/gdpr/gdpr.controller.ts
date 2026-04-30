import { Controller, Get, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GdprService } from './gdpr.service';
@ApiTags('GDPR')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gdpr')
export class GdprController {
  constructor(private gdprService: GdprService) {}

  @Get('export')
  @ApiOperation({ summary: 'Eksporter alle mine data (GDPR Art. 15)' })
  export(@CurrentUser() user: any) { return this.gdprService.exportUserData(user.id); }

  @Delete('erase')
  @ApiOperation({ summary: 'Slet alle mine data - retten til at blive glemt (GDPR Art. 17)' })
  erase(@CurrentUser() user: any) { return this.gdprService.eraseUserData(user.id); }

  @Get('consents')
  @ApiOperation({ summary: 'Hent mine samtykker' })
  consents(@CurrentUser() user: any) { return this.gdprService.getConsents(user.id); }

  @Delete('consents/:id')
  @ApiOperation({ summary: 'Tilbagetraek samtykke' })
  revokeConsent(@CurrentUser() user: any, @Param('id') id: string) {
    return this.gdprService.revokeConsent(user.id, id);
  }
}
