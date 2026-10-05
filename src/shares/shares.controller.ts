import { Controller, Get, Post } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { notImplemented } from '../common/api-error.js';
import { ErrorResponseDto } from '../common/contracts.js';
import { DeferredPathParam } from '../common/http-decorators.js';

@ApiTags('Shares — deferred')
@ApiResponse({
  status: 501,
  type: ErrorResponseDto,
  description: 'Sharing is deferred; uploads and publication are rejected',
})
@Controller('api/v1/shares')
export class SharesController {
  @Get('capabilities')
  capabilities(): never {
    return notImplemented('shares');
  }

  @Post('preparations')
  preparation(): never {
    return notImplemented('shares');
  }

  @Post('preparations/:preparationId/artifacts')
  @DeferredPathParam('preparationId')
  artifacts(): never {
    return notImplemented('shares');
  }

  @Post('preparations/:preparationId/confirm')
  @DeferredPathParam('preparationId')
  confirm(): never {
    return notImplemented('shares');
  }

  @Get(':shareCode/preview')
  @DeferredPathParam('shareCode')
  preview(): never {
    return notImplemented('shares');
  }

  @Post(':shareCode/continuation')
  @DeferredPathParam('shareCode')
  continuation(): never {
    return notImplemented('shares');
  }
}
