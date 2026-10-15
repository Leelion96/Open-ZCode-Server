import { Controller, Get, Header, Inject, Res } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { MarketplaceResponseDto } from './contracts.js';
import { PluginMarketplaceService } from './plugin-marketplace.service.js';

@ApiTags('Plugin marketplace')
@Controller()
export class PluginMarketplaceController {
  constructor(
    @Inject(PluginMarketplaceService) private readonly marketplace: PluginMarketplaceService,
  ) {}

  @Get('api/v1/plugins/marketplace.json')
  @Header('Cache-Control', 'no-cache')
  @ApiOkResponse({ type: MarketplaceResponseDto })
  catalog(@Res({ passthrough: true }) reply: FastifyReply) {
    reply.header('etag', this.marketplace.etag);
    return this.marketplace.catalog();
  }
}
