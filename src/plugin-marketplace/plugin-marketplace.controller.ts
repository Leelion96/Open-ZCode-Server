import {
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
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

  @Get('assets/plugins/:name/:version/:digest/:file')
  @ApiParam({ name: 'name', example: 'lark-cli' })
  @ApiParam({ name: 'version', example: '0.1.2-open.1' })
  @ApiParam({ name: 'digest', description: 'SHA-256 from the marketplace catalog' })
  @ApiParam({ name: 'file', example: 'plugin.zip' })
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  download(
    @Param() params: Record<string, string>,
    @Headers('if-none-match') condition: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    return this.respond(params, condition, reply);
  }

  private respond(
    params: Record<string, string>,
    condition: string | undefined,
    reply: FastifyReply,
  ) {
    const asset = this.marketplace.asset(
      `/assets/plugins/${params.name}/${params.version}/${params.digest}/${params.file}`,
    );
    if (!asset) throw new NotFoundException('Plugin asset not found');
    reply
      .type(asset.mime)
      .header('etag', asset.etag)
      // 应用 Renderer 与市场服务不同源，公开图片/ZIP 必须允许跨源读取；不扩展私有 API 权限。
      .header('cross-origin-resource-policy', 'cross-origin')
      .header('cache-control', 'public, max-age=31536000, immutable');
    if (condition === asset.etag) {
      reply.code(304);
      return;
    }
    reply.header('content-length', asset.size);
    return asset.body;
  }
}
