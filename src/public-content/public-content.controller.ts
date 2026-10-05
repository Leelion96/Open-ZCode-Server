import { Controller, Get, Inject, Query } from '@nestjs/common';
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
}
