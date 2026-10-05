import { expect, it } from 'vitest';
import type { OpenAPIObject } from '@nestjs/swagger';
import { ApiInventorySchema } from '../dist/documentation/catalog.js';
import { buildExplorerDocument } from '../dist/documentation/openapi.js';

const source: OpenAPIObject = {
  openapi: '3.0.0',
  info: { title: 'fixture', version: '1' },
  paths: {
    '/api/v1/client/configs': {
      get: {
        responses: { '200': { description: 'ok' } },
        parameters: [{ name: 'platform', in: 'query', schema: { type: 'string' } }],
      },
    },
  },
};
const inventory = {
  schemaVersion: 1,
  sourceCheckout: 'fixture',
  endpoints: [
    {
      feature: 'public-content',
      state: 'implemented',
      method: 'GET',
      path: '/api/v1/client/configs',
      status: 200,
      summary: '获取配置',
    },
    {
      feature: 'off-peak',
      state: 'absent',
      method: 'POST',
      path: '/api/v1/off-peak/ticket/{ticketId}/settle',
      status: 404,
      summary: '结算票据',
    },
  ],
};

it('enriches a copy and uses only the current origin with editable parameter examples', () => {
  const document = buildExplorerDocument(source, ApiInventorySchema.parse(inventory));
  expect(source.paths['/api/v1/off-peak/ticket/{ticketId}/settle']).toBeUndefined();
  expect(document.servers).toEqual([{ url: '/', description: '当前打开页面所在的服务（同源）' }]);
  expect(document.paths['/api/v1/client/configs']?.get?.parameters).toContainEqual(
    expect.objectContaining({ name: 'platform', example: 'darwin-arm64' }),
  );
  expect(
    document.paths['/api/v1/off-peak/ticket/{ticketId}/settle']?.post?.parameters,
  ).toContainEqual(expect.objectContaining({ name: 'ticketId', example: 'demo', required: true }));
});

it('rejects duplicate operations and inconsistent implementation status', () => {
  expect(() =>
    ApiInventorySchema.parse({
      ...inventory,
      endpoints: [inventory.endpoints[0], inventory.endpoints[0]],
    }),
  ).toThrow();
  expect(() =>
    ApiInventorySchema.parse({
      ...inventory,
      endpoints: [{ ...inventory.endpoints[0], status: 501 }],
    }),
  ).toThrow();
});

it('rejects mismatches between actual registered operations and the catalog', () => {
  const checked = ApiInventorySchema.parse(inventory);
  expect(() => buildExplorerDocument({ ...source, paths: {} }, checked)).toThrow(
    'Registered operation is missing',
  );
  const registeredExcluded = structuredClone(source);
  registeredExcluded.paths['/api/v1/off-peak/ticket/{ticketId}/settle'] = {
    post: { responses: { '200': { description: 'wrongly implemented' } } },
  };
  expect(() => buildExplorerDocument(registeredExcluded, checked)).toThrow(
    'Excluded operation was registered',
  );
});

it('never retains a generated success response for a deferred POST', () => {
  const path = '/api/v1/oauth/token';
  const doc = buildExplorerDocument(
    {
      ...source,
      paths: {
        [path]: {
          post: {
            responses: {
              '201': { description: 'inferred success' },
              '501': { description: 'deferred' },
            },
          },
        },
      },
    },
    ApiInventorySchema.parse({
      ...inventory,
      endpoints: [
        {
          feature: 'oauth',
          state: 'stub',
          method: 'POST',
          path,
          status: 501,
          summary: '兑换登录令牌',
        },
      ],
    }),
  );
  expect(Object.keys(doc.paths[path]!.post!.responses)).toEqual(['501']);
  expect(JSON.stringify(doc.paths[path]!.post!.responses)).toContain('oauth is not implemented');
  expect(JSON.stringify(doc.paths[path]!.post!.responses)).not.toContain('Open-ZCode-Server');
  expect(doc.paths[path]!.post!.requestBody).toBeDefined();
});

it('deduplicates explicit DTO and compiler-reflected parameters without dropping schema', () => {
  const duplicated = structuredClone(source);
  const operation = duplicated.paths['/api/v1/client/configs']!.get!;
  operation.parameters = [...operation.parameters!, ...operation.parameters!];
  const document = buildExplorerDocument(duplicated, ApiInventorySchema.parse(inventory));
  const parameters = document.paths['/api/v1/client/configs']!.get!.parameters;
  expect(parameters).toHaveLength(1);
  expect(parameters?.[0]).toEqual(
    expect.objectContaining({
      name: 'platform',
      schema: { type: 'string' },
      example: 'darwin-arm64',
    }),
  );
});
