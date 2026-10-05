import { Controller, Get } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { notImplemented } from '../common/api-error.js';
import { ErrorResponseDto } from '../common/contracts.js';

@ApiTags('Releases — deferred')
@ApiResponse({
  status: 501,
  type: ErrorResponseDto,
  description: 'Updating is deferred; no YAML manifest or installers are returned',
})
@Controller('api/v1/releases/electron')
export class ReleasesController {
  @Get('manifest')
  manifest(): never {
    return notImplemented('releases');
  }
}
