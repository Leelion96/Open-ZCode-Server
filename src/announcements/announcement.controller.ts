import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Post,
  Query,
} from '@nestjs/common';
import { ApiHeader, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import {
  AnnouncementActionRequestDto,
  AnnouncementActionResponseDto,
  AnnouncementHeadersSchema,
  AnnouncementQueryDto,
  AnnouncementResponseDto,
} from '../common/announcement-contracts.js';
import { AnnouncementService } from './announcement.service.js';

function identity(headers: Record<string, unknown>) {
  const parsed = AnnouncementHeadersSchema.safeParse(headers);
  if (!parsed.success) throw new BadRequestException('Invalid announcement identity or language');
  return parsed.data;
}

@ApiTags('Announcements')
@ApiHeader({ name: 'X-Device-Mid', required: true, schema: { type: 'string', format: 'uuid' } })
@ApiHeader({
  name: 'X-Client-Language',
  required: false,
  schema: { type: 'string', enum: ['zh-CN', 'en-US'], default: 'en-US' },
})
@Controller('api/v1/marketing/touch')
export class AnnouncementController {
  constructor(@Inject(AnnouncementService) private readonly announcements: AnnouncementService) {}

  @Get()
  @ApiOkResponse({ type: AnnouncementResponseDto })
  @ApiQuery({ type: AnnouncementQueryDto })
  query(
    @Headers() headers: Record<string, unknown>,
    @Query(new ZodValidationPipe(AnnouncementQueryDto)) _query: AnnouncementQueryDto,
  ) {
    const caller = identity(headers);
    return this.announcements.query(caller['x-device-mid'], caller['x-client-language']);
  }

  @Post('action')
  @HttpCode(200)
  @ApiOkResponse({ type: AnnouncementActionResponseDto })
  report(
    @Headers() headers: Record<string, unknown>,
    @Body(new ZodValidationPipe(AnnouncementActionRequestDto)) body: AnnouncementActionRequestDto,
  ) {
    return this.announcements.report(identity(headers)['x-device-mid'], body);
  }
}
