import { Controller, Get, HttpException, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthResponseDto } from '../common/contracts.js';
import { HealthService } from './health.service.js';

@ApiTags('Operations')
@Controller('health')
export class HealthController {
  constructor(@Inject(HealthService) private readonly health: HealthService) {}

  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiResponse({ status: 503, description: 'Database unavailable or migration missing' })
  async ready() {
    const checks = await this.health.checks();
    if (!Object.values(checks).every(Boolean))
      throw new HttpException({ code: 1503, msg: 'Service is not ready', data: null, checks }, 503);
    return { status: 'ok', checks };
  }
}
