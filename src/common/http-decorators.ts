import { ApiParam } from '@nestjs/swagger';

/** 暂缓接口只声明 URL 结构，不在失败之前执行未确定的业务参数校验。 */
export function DeferredPathParam(name: string) {
  return ApiParam({
    name,
    required: true,
    schema: { type: 'string' },
    description: 'Opaque identifier; this endpoint is deferred.',
  });
}
