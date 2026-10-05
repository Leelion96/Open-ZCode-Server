import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { map, type Observable } from 'rxjs';

@Injectable()
export class TraceInterceptor implements NestInterceptor<unknown, unknown> {
  intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    return next.handle().pipe(
      map((value: unknown) => {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const envelope = value as Record<string, unknown>;
          // 自有配置没有官方采集logid；成功信封仍需生成本地追踪，裸release保持原结构。
          if (
            Object.hasOwn(envelope, 'logid') ||
            (envelope.code === 0 && Object.hasOwn(envelope, 'data'))
          )
            return { ...envelope, logid: request.id };
        }
        return value;
      }),
    );
  }
}
