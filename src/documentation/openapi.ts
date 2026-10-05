import type {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  RequestBodyObject,
} from '@nestjs/swagger';
import type { ApiInventory } from './catalog.js';
import { createNotFoundEnvelope, createNotImplementedEnvelope } from '../common/api-error.js';

const featureNames: Record<string, string> = {
  'public-content': '客户端配置与场景',
  oauth: '账号与登录',
  shares: '会话与附件分享',
  releases: '桌面版本更新',
  feedback: '反馈工单与附件',
  'model-gateway': '模型推理网关',
  billing: '套餐额度与余额',
  mcp: '官方 MCP 用量',
  'off-peak': '闲时任务与容量调度',
};
const stateNames = { implemented: '已实现', stub: '占位', absent: '不提供' } as const;
const errorSchema = { $ref: '#/components/schemas/ErrorResponseDto' };

function parametersFor(path: string): ParameterObject[] {
  return [...path.matchAll(/\{([^}]+)\}/g)].map((match) => ({
    name: match[1]!,
    in: 'path',
    required: true,
    example: 'demo',
    schema: { type: 'string' },
    description: '探测示例标识；接口目前不执行实际业务。',
  }));
}

function probeBody(path: string): RequestBodyObject {
  if (path.endsWith('/artifacts'))
    return {
      description: '仅验证占位响应，不解析或存储上传文件。',
      required: false,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties: {
              descriptor: { type: 'string', example: '{}' },
              file: { type: 'string', format: 'binary' },
            },
          },
        },
      },
    };
  return {
    description: '仅用于探测当前失败响应；未来业务请求体尚未实现，这不是官方完整请求契约。',
    required: false,
    content: {
      'application/json': {
        schema: { type: 'object', additionalProperties: true },
        example: path === '/api/v1/oauth/cli/init' ? { provider: 'bigmodel' } : {},
      },
    },
  };
}

export function buildExplorerDocument(
  source: OpenAPIObject,
  inventory: ApiInventory,
): OpenAPIObject {
  const document = structuredClone(source);
  const counts = { implemented: 0, stub: 0, absent: 0 };
  const groups = new Map<string, number>();
  for (const endpoint of inventory.endpoints) {
    counts[endpoint.state]++;
    groups.set(endpoint.feature, (groups.get(endpoint.feature) ?? 0) + 1);
    const method = endpoint.method === 'GET' ? 'get' : 'post';
    const existing = document.paths[endpoint.path]?.[method];
    if (endpoint.state !== 'absent' && !existing)
      throw new Error(`Registered operation is missing: ${endpoint.method} ${endpoint.path}`);
    if (endpoint.state === 'absent' && existing)
      throw new Error(`Excluded operation was registered: ${endpoint.method} ${endpoint.path}`);
    if (endpoint.state !== 'absent' && !existing?.responses?.[String(endpoint.status)])
      throw new Error(`Documented response is missing: ${endpoint.method} ${endpoint.path}`);
    const operation: OperationObject = existing ?? { responses: {} };
    operation.summary = `[${endpoint.status} ${stateNames[endpoint.state]}] ${endpoint.summary}`;
    operation.tags = [featureNames[endpoint.feature] ?? endpoint.feature];
    Object.assign(operation, {
      'x-inventory-state': endpoint.state,
      'x-expected-status': endpoint.status,
    });
    // 显式@ApiQuery与编译反射会各生成一次DTO参数；按位置/名称归一化，保留schema而不重复表单。
    const parameters = operation.parameters?.length
      ? operation.parameters
      : parametersFor(endpoint.path);
    const uniqueParameters = new Map(
      parameters.map(
        (parameter) =>
          [
            '$ref' in parameter ? parameter.$ref : `${parameter.in}:${parameter.name}`,
            parameter,
          ] as const,
      ),
    );
    operation.parameters = [...uniqueParameters.values()].map((parameter) => {
      if ('$ref' in parameter) return parameter;
      if (parameter.in === 'path') return { ...parameter, example: 'demo' };
      if (parameter.name === 'app_version') return { ...parameter, example: '3.14.3' };
      if (parameter.name === 'platform') return { ...parameter, example: 'darwin-arm64' };
      return parameter;
    });
    if (endpoint.state === 'implemented') {
      operation.description =
        '已实现。点击 Try it out，再点击 Execute 请求当前服务，查看实际返回的数据。配置接口接受版本/平台参数，但本版统一返回自有默认配置。';
    } else {
      const example =
        endpoint.state === 'absent'
          ? createNotFoundEnvelope()
          : createNotImplementedEnvelope(endpoint.feature);
      operation.description =
        endpoint.state === 'stub'
          ? '路由已存在，功能暂缓。预期 HTTP 501，直接失败，不创建令牌、工单、分享或上传凭据。响应面板显示真实失败结果。'
          : '仅列入接口清单，当前服务没有注册此路由。点击 Execute 可以确认 HTTP 404；加入文档不代表实现了该能力。';
      // Nest可能为POST推导201；占位文档必须只描述失败，不能产生虚假的成功示例。
      operation.responses = {
        [String(endpoint.status)]: {
          description: `预期 ${endpoint.status}：${stateNames[endpoint.state]}`,
          content: {
            'application/json': {
              schema: errorSchema,
              example,
            },
          },
        },
      };
      if (endpoint.method === 'POST' && !operation.requestBody)
        operation.requestBody = probeBody(endpoint.path);
    }
    document.paths[endpoint.path] ??= {};
    document.paths[endpoint.path]![method] = operation;
  }
  const auxiliaryTag = '运行检查与静态配置';
  for (const [path, item] of Object.entries(document.paths)) {
    if (path.startsWith('/api/v1/')) continue;
    for (const method of ['get', 'post'] as const)
      if (item[method]) item[method]!.tags = [auxiliaryTag];
  }
  document.tags = [
    ...Object.keys(featureNames)
      .filter((feature) => groups.has(feature))
      .map((feature) => ({
        name: featureNames[feature]!,
        description: `${groups.get(feature)} 个接口；实现状态见每条接口标题。`,
      })),
    { name: auxiliaryTag, description: '辅助端点，不计入31个上游API清单。' },
  ];
  document.servers = [{ url: '/', description: '当前打开页面所在的服务（同源）' }];
  document.info.description = `本地接口浏览与调试 · 共 ${inventory.endpoints.length} 个接口\n\n**200 已实现：${counts.implemented} · 501 占位：${counts.stub} · 404 不提供：${counts.absent}**\n\n按分组展开接口，点击 **Try it out** 编辑参数，再点击 **Execute** 查看真实状态码、响应头和 JSON。配置接口已提供版本/平台示例。顶部搜索按分组名过滤，如“配置”“分享”“反馈”。\n\n所有请求默认发送到当前服务，不接入 ZCode 客户端，不调用官方服务。501/404是当前范围的预期结果，仍以失败响应显示。上传和其他POST示例只用于探测，不执行真实业务。`;
  return document;
}
