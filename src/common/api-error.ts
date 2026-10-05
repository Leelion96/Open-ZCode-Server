import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import type { ErrorEnvelope } from './contracts.js';

export function createNotImplementedEnvelope(feature: string): ErrorEnvelope {
  return {
    code: feature === 'shares' ? 3200 : 1501,
    msg: `${feature} is not implemented`,
    data: null,
    feature,
  };
}

export function createNotFoundEnvelope(): ErrorEnvelope {
  return { code: 404, msg: 'Not found', data: null };
}

export function notImplemented(feature: string): never {
  throw new HttpException(createNotImplementedEnvelope(feature), HttpStatus.NOT_IMPLEMENTED);
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let response: ErrorEnvelope = { code: 1500, msg: 'Internal server error', data: null };
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const raw = exception.getResponse();
      if (
        typeof raw === 'object' &&
        raw !== null &&
        'code' in raw &&
        'msg' in raw &&
        'data' in raw
      ) {
        response = raw as ErrorEnvelope;
      } else {
        response =
          status === 404
            ? createNotFoundEnvelope()
            : {
                code: status,
                msg: 'Request rejected',
                data: null,
              };
      }
    }
    reply.status(status).header('cache-control', 'no-store').send(response);
  }
}
