import { Controller, Get, Post } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { notImplemented } from '../common/api-error.js';
import { ErrorResponseDto } from '../common/contracts.js';
import { DeferredPathParam } from '../common/http-decorators.js';

@ApiTags('Feedback — deferred')
@ApiResponse({
  status: 501,
  type: ErrorResponseDto,
  description: 'Feedback is deferred; no tickets or upload credentials are generated',
})
@Controller('api/v1/feedback')
export class FeedbackController {
  @Post('ticket')
  create(): never {
    return notImplemented('feedback');
  }

  @Get('ticket')
  list(): never {
    return notImplemented('feedback');
  }

  @Get('ticket/:id')
  @DeferredPathParam('id')
  detail(): never {
    return notImplemented('feedback');
  }

  @Post('ticket/:id/message')
  @DeferredPathParam('id')
  message(): never {
    return notImplemented('feedback');
  }

  @Post('attachment/upload-credential')
  credential(): never {
    return notImplemented('feedback');
  }
}
