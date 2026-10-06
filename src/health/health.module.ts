import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/index.js';
import { PublicContentModule } from '../public-content/index.js';
import { PluginMarketplaceModule } from '../plugin-marketplace/index.js';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

@Module({
  imports: [DatabaseModule, PublicContentModule, PluginMarketplaceModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
