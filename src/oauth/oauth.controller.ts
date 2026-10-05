import { Controller, Get, Post } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { notImplemented } from '../common/api-error.js';
import { ErrorResponseDto } from '../common/contracts.js';
import { DeferredPathParam } from '../common/http-decorators.js';

@ApiTags('OAuth — deferred')
@ApiResponse({
  status: 501,
  type: ErrorResponseDto,
  description: 'Authentication is deferred; no tokens are generated',
})
@Controller('api/v1/oauth')
export class OauthController {
  @Post('cli/init')
  init(): never {
    return notImplemented('oauth');
  }

  @Get('cli/poll/:flowId')
  @DeferredPathParam('flowId')
  poll(): never {
    return notImplemented('oauth');
  }

  @Post('token')
  token(): never {
    return notImplemented('oauth');
  }
}
