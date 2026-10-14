import { Controller, Get, Inject, NotFoundException, Param, Query, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import {
  BuiltinReleaseResponseDto,
  ClientConfigQueryDto,
  ClientConfigResponseDto,
  ScenesResponseDto,
} from '../common/contracts.js';
import { PublicContentService } from './public-content.service.js';

@ApiTags('Public configuration')
@Controller()
export class PublicContentController {
  constructor(@Inject(PublicContentService) private readonly content: PublicContentService) {}

  @Get('api/v1/client/configs')
  @ApiOkResponse({ type: ClientConfigResponseDto })
  @ApiQuery({ type: ClientConfigQueryDto })
  configs(@Query(new ZodValidationPipe(ClientConfigQueryDto)) query: ClientConfigQueryDto) {
    return this.content.configs(query);
  }

  @Get('api/v1/client/scenes')
  @ApiOkResponse({ type: ScenesResponseDto })
  scenes() {
    return this.content.scenes();
  }

  @Get('assets/builtin-config.json')
  @ApiOkResponse({ type: BuiltinReleaseResponseDto })
  builtin() {
    return this.content.builtin();
  }

  @Get('assets/announcements/:sha/:file')
  asset(
    @Param('sha') sha: string,
    @Param('file') file: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const asset = this.content.announcementAsset(`${sha}/${file}`);
    if (!asset) throw new NotFoundException('Announcement asset not found');
    reply
      .type(asset.contentType)
      .header('etag', `"${asset.sha256}"`)
      .header('cache-control', 'public, max-age=31536000, immutable')
      .header('cross-origin-resource-policy', 'cross-origin');
    return asset.bytes;
  }
}
