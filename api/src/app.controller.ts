import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('System')
@Controller()
export class AppController {

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'hotel-platform-api',
      version: '1.0.0',
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'System status' })
  status() {
    return {
      status: 'running',
      environment: process.env.NODE_ENV || 'production',
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
      },
    };
  }
}
