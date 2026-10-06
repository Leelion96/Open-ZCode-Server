import { Module } from '@nestjs/common';
import { PluginMarketplaceController } from './plugin-marketplace.controller.js';
import { PluginMarketplaceService } from './plugin-marketplace.service.js';

@Module({
  controllers: [PluginMarketplaceController],
  providers: [PluginMarketplaceService],
  exports: [PluginMarketplaceService],
})
export class PluginMarketplaceModule {}
