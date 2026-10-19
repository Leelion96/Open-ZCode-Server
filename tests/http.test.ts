import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApplication } from '../dist/app.js';
import {
  BuiltinWire,
  ConfigWire,
  EnvelopeWire,
  MarketplaceWire,
  OpenApiWire,
  ScenesWire,
} from './wire.js';

let app: NestFastifyApplication;
let origin: string;
const originalEnvironment = { ...process.env };
const inventory = JSON.parse(await readFile('specs/api-inventory.json', 'utf8')) as {
  endpoints: { feature: string; state: string; method: string; path: string; status: number }[];
};

beforeAll(async () => {
  Object.assign(process.env, {
    DATABASE_URL: 'postgresql://fixture:fixture@127.0.0.1:1/fixture',
    PUBLIC_ORIGIN: 'https://selfhost.example',
    LOG_LEVEL: 'silent',
    CORS_ORIGINS: 'https://web.example',
    BODY_LIMIT_BYTES: '1048576',
    OPENAPI_ENABLED: 'true',
  });
  app = await createApplication();
  await app.listen(0, '127.0.0.1');
  origin = await app.getUrl();
});

afterAll(async () => {
  await app?.close();
  process.env = originalEnvironment;
});

describe('v1 route inventory over actual Fastify HTTP', () => {
  it('records upstream entrypoints plus the new plugin marketplace', () => {
    expect(inventory.endpoints).toHaveLength(34);
    expect(inventory.endpoints.filter((item) => item.state === 'implemented')).toHaveLength(5);
    expect(inventory.endpoints.filter((item) => item.state === 'stub')).toHaveLength(15);
    expect(inventory.endpoints.filter((item) => item.state === 'absent')).toHaveLength(14);
  });

  for (const route of inventory.endpoints) {
    it(`${route.method} ${route.path} -> ${route.status}`, async () => {
      const path = route.path.replace(/\{[^}]+\}/g, 'fixture');
      const response = await fetch(origin + path, {
        method: route.method,
        ...(route.method === 'POST'
          ? { headers: { 'content-type': 'application/json' }, body: '{}' }
          : {}),
      });
      if (route.feature === 'announcements') {
        // 无设备标识/请求体的探测应明确拒绝；有效投放和回执由公告 HTTP 场景覆盖。
        expect(response.status).toBe(400);
        expect(EnvelopeWire.parse(await response.json()).code).not.toBe(0);
        return;
      }
      expect(response.status).toBe(route.status);
      if (route.feature === 'plugin-marketplace') {
        expect(response.headers.get('cache-control')).toBe('no-cache');
        expect(MarketplaceWire.parse(await response.json()).name).toBe('zcode-plugins-official');
        return;
      }
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(response.headers.get('x-request-id')).toBeTruthy();
      const body = EnvelopeWire.parse(await response.json());
      if (route.state === 'implemented') expect(body.code).toBe(0);
      else {
        expect(body.data).toBeNull();
        expect(body.code).not.toBe(0);
        if (route.state === 'stub') {
          expect(body.feature).toBe(route.feature);
          expect(body.code).toBe(route.feature === 'shares' ? 3200 : 1501);
          expect(body.msg).toContain('not implemented');
          expect(body.token).toBeUndefined();
        }
      }
    });
  }
});

describe('public content and wire compatibility', () => {
  it('serves independent defaults with local download links and no official sales offers', async () => {
    const response = await fetch(
      origin + '/api/v1/client/configs?app_version=3.14.3&platform=darwin-arm64',
      { headers: { 'x-request-id': 'fixture.trace-1' } },
    );
    const wire = ConfigWire.parse(await response.json());
    expect(wire.logid).toBe('fixture.trace-1');
    expect(wire.data.configs.codingPlanStaticProducts).toEqual({});
    expect(wire.data.configs.codingPlanStaticTeamProducts).toEqual({});
    expect(wire.data.configs.computerUse).toEqual({ enabled: true });
    expect(wire.data.configs.dynamicWorkflow).toEqual({ mode: 'alwaysOn' });
    expect(wire.data.configs.offPeak.enable_offpeak_task).toBe(false);
    expect(wire.data.configs.startPlanPreview).toBeNull();
    expect(wire.data.configs.forceUpdate).toBeNull();
    expect(wire.data.configs.captcha).toEqual({ enabled: false });
    expect(wire.data.configs.feedbackUrl.community_urls).toEqual({ 'en-US': '', 'zh-CN': '' });
    expect(wire.data.configs.codingPlanBillingDiscount).toBeUndefined();
    expect(wire.data.configs.magic_name).toBeUndefined();
    expect(wire.data.configs.builtin_provider_config_json).toBe(
      'https://selfhost.example/assets/builtin-config.json',
    );
  });

  it('returns one default config regardless of version/platform while accepting compatibility parameters', async () => {
    const responses = [];
    for (const query of [
      '',
      '?app_version=3.14.3&platform=darwin-arm64',
      '?app_version=99.0.0&platform=unknown',
    ]) {
      const response = await fetch(origin + '/api/v1/client/configs' + query);
      expect(response.status).toBe(200);
      const wire = ConfigWire.parse(await response.json());
      responses.push(wire.data.configs);
    }
    expect(responses[1]).toEqual(responses[0]);
    expect(responses[2]).toEqual(responses[0]);
  });

  it('serves only the two consumed scenes with intact localized prompts and default references', async () => {
    const response = await fetch(origin + '/api/v1/client/scenes');
    const wire = ScenesWire.parse(await response.json());
    expect(wire.logid).toBe(response.headers.get('x-request-id'));
    expect(wire.data.map((scene: { scene: string }) => scene.scene)).toEqual([
      'draft-suggestion',
      'scheduled-task',
    ]);
    expect(wire.data[0]?.options.prompts?.items?.map((item) => item.labels.cn)).toEqual([
      '周报总结',
      '报错修复',
      'PPT 制作',
    ]);
    expect(wire.data[1]?.options.prompts?.items?.map((item) => item.labels.cn)).toEqual([
      '晨会动态',
      '风险扫描',
      '发布简报',
      '文档同步检查',
    ]);
    expect(wire.data[1]?.options.cronExpr?.items?.map((item) => item.contents.cn)).toEqual([
      '0 9 * * 1-5',
      '0 10 * * *',
      '0 16 * * 5',
      '0 15 * * 3',
    ]);
    let referenceCount = 0;
    for (const scene of wire.data) {
      for (const prompt of scene.options.prompts?.items ?? []) {
        expect(prompt.contents.cn?.trim()).toBeTruthy();
        expect(prompt.contents.en?.trim()).toBeTruthy();
        for (const [optionKey, itemIds] of Object.entries(prompt.defaults ?? {})) {
          for (const itemId of itemIds) {
            const referenced = scene.options[optionKey]?.items?.find((item) => item.id === itemId);
            expect(referenced).toBeDefined();
            if (optionKey === 'cronExpr')
              expect(referenced?.contents.cn).toBe(referenced?.contents.en);
            referenceCount += 1;
          }
        }
      }
    }
    expect(referenceCount).toBe(5);
    const text = JSON.stringify(wire);
    expect(text).toContain('Recommended Prompts');
    expect(text).toContain('推荐提示词');
    expect(text).not.toContain('chat.z.ai');
    expect(text).not.toContain('chatglm.cn');
    expect(text).not.toContain('auth_key');
    expect(text).not.toContain('NAVIGATE:AUTOMATIONS:OFFPEAK');
  });

  it('serves 16 API key templates with OpenAI/Anthropic first and no Coding Plan templates', async () => {
    const response = await fetch(origin + '/assets/builtin-config.json');
    expect(response.status).toBe(200);
    const release = BuiltinWire.parse(await response.json());
    expect(release.schemaVersion).toBe(1);
    expect(release.revision).toBe(35);
    expect(release.config.providerConfigRules.providerRules).toEqual([]);
    const templateIds = release.config.providerConfigRules.templateRules.map(
      (rule: { templateId: string }) => rule.templateId,
    );
    expect(templateIds).toHaveLength(16);
    expect(templateIds.slice(0, 2)).toEqual(['openai', 'anthropic']);
    expect(templateIds).toEqual(
      expect.arrayContaining([
        'deepseek',
        'bigmodel-standard-api',
        'zai-standard-api',
        'xiaomi-mimo-token-plan',
      ]),
    );
    expect(templateIds).not.toContain('bigmodel-api');
    expect(templateIds).not.toContain('zai-api');
    const templateModelRules = release.config.modelConfigRules.templateModelRules as {
      templateId: string;
    }[];
    expect(templateModelRules.some((rule) => rule.templateId === 'bigmodel-api')).toBe(false);
    expect(templateModelRules.some((rule) => rule.templateId === 'zai-api')).toBe(false);
    for (const templateId of ['bigmodel-standard-api', 'zai-standard-api']) {
      expect(templateModelRules.some((rule) => rule.templateId === templateId)).toBe(true);
    }
    expect(release.config.modelConfigRules.builtinProviderModelRules).toEqual([]);
    expect(release.config.modelConfigRules.modelRules.length).toBeGreaterThan(0);
    expect(JSON.stringify(release).replaceAll('\\', '')).not.toContain('zcode.z.ai');
  });

  it('documents all inventory routes without changing their implementation status', async () => {
    const response = await fetch(origin + '/openapi.json');
    expect(response.status).toBe(200);
    const document = OpenApiWire.parse(await response.json());
    expect(document.openapi).toBe('3.1.0');
    const metadata = JSON.parse(await readFile('package.json', 'utf8')) as { version: string };
    expect(document.info).toEqual(
      expect.objectContaining({ title: 'Open-ZCode-Server', version: metadata.version }),
    );
    for (const route of inventory.endpoints) {
      const operation = document.paths[route.path]?.[route.method.toLowerCase()];
      expect(operation).toBeDefined();
      if (!operation) throw new Error('Documented operation is missing');
      expect(operation['x-inventory-state']).toBe(route.state);
      expect(operation.responses[String(route.status)]).toBeDefined();
      if (route.state !== 'implemented') {
        expect(operation.responses['200']).toBeUndefined();
        expect(operation.responses['201']).toBeUndefined();
      }
      {
        for (const parameter of route.path.matchAll(/\{([^}]+)\}/g)) {
          expect(operation.parameters).toContainEqual(
            expect.objectContaining({ name: parameter[1], in: 'path', required: true }),
          );
        }
      }
    }
    expect(document.components.schemas.ClientConfigResponseDto).toBeDefined();
    expect(
      document.paths['/api/v1/client/configs']?.get?.parameters?.filter(
        (parameter) => parameter.in === 'query',
      ),
    ).toHaveLength(2);
    expect((await fetch(origin + '/openapi.yaml')).status).toBe(200);
  });

  it('serves interactive documentation and its assets from the local server', async () => {
    for (const path of [
      '/docs',
      '/docs/',
      '/docs/swagger-ui-bundle.js',
      '/docs/swagger-ui.css',
      '/docs/swagger-ui-init.js',
    ]) {
      const response = await fetch(origin + path);
      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text.length).toBeGreaterThan(100);
      if (path === '/docs') expect(text).toContain('Open-ZCode-Server');
      if (path.endsWith('swagger-ui-init.js')) {
        expect(text).toContain('validatorUrl');
        expect(text).toContain('darwin-arm64');
        expect(text).toContain('3.14.3');
        expect(text).toContain('不提供');
      }
    }
  });

  it('disables the page, raw document and static assets with OPENAPI_ENABLED=false', async () => {
    process.env.OPENAPI_ENABLED = 'false';
    const disabled = await createApplication();
    try {
      await disabled.listen(0, '127.0.0.1');
      const disabledOrigin = await disabled.getUrl();
      for (const path of ['/docs', '/openapi.json', '/docs/swagger-ui-bundle.js'])
        expect((await fetch(disabledOrigin + path)).status).toBe(404);
      expect((await fetch(disabledOrigin + '/api/v1/client/scenes')).status).toBe(200);
    } finally {
      await disabled.close();
      process.env.OPENAPI_ENABLED = 'true';
    }
  });
});

describe('failure handling, transport and operations', () => {
  it('rejects a real multipart upload with 501 and stores nothing', async () => {
    const form = new FormData();
    form.append('descriptor', JSON.stringify({ artifact_id: 'fixture' }));
    form.append('file', new Blob(['fixture-file']), 'fixture.txt');
    const response = await fetch(origin + '/api/v1/shares/preparations/fixture/artifacts', {
      method: 'POST',
      body: form,
    });
    expect(response.status).toBe(501);
    expect(EnvelopeWire.parse(await response.json()).code).toBe(3200);
  });

  it('supports HEAD without returning response content', async () => {
    const response = await fetch(origin + '/api/v1/client/scenes', { method: 'HEAD' });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
  });

  it('keeps the updater failure non-2xx rather than returning a usable manifest', async () => {
    const response = await fetch(
      origin + '/api/v1/releases/electron/manifest?platform=darwin-arm64&channel=stable',
      { headers: { accept: 'application/yaml' } },
    );
    expect(response.status).toBe(501);
    expect(EnvelopeWire.parse(await response.json()).version).toBeUndefined();
  });

  it('rejects oversized and malformed bodies and invalid query types', async () => {
    const oversized = await fetch(origin + '/api/v1/feedback/ticket', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ data: 'x'.repeat(1048576) }),
    });
    expect(oversized.status).toBe(413);
    const malformed = await fetch(origin + '/api/v1/feedback/ticket', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    });
    expect(malformed.status).toBe(400);
    const query = await fetch(origin + '/api/v1/client/configs?app_version=1&app_version=2');
    expect(query.status).toBe(400);
  });

  it('replaces invalid request identifiers', async () => {
    const response = await fetch(origin + '/health/live', {
      headers: { 'x-request-id': 'invalid space' },
    });
    expect(response.headers.get('x-request-id')).toMatch(/^[A-Za-z0-9._:-]{1,128}$/);
    expect(response.headers.get('x-request-id')).not.toBe('invalid space');
  });

  it('permits only configured browser origins', async () => {
    const allowed = await fetch(origin + '/api/v1/client/configs', {
      headers: { origin: 'https://web.example' },
    });
    expect(allowed.headers.get('access-control-allow-origin')).toBe('https://web.example');
    const denied = await fetch(origin + '/api/v1/client/configs', {
      headers: { origin: 'https://unknown.example' },
    });
    expect(denied.headers.get('access-control-allow-origin')).toBeNull();
    const preflight = await fetch(origin + '/api/v1/feedback/ticket', {
      method: 'OPTIONS',
      headers: { origin: 'https://web.example', 'access-control-request-method': 'POST' },
    });
    expect(preflight.status).toBe(204);
  });

  it('reports unavailable database without blocking public APIs or leaking connection details', async () => {
    expect((await fetch(origin + '/health/live')).status).toBe(200);
    const response = await fetch(origin + '/health/ready');
    expect(response.status).toBe(503);
    const text = await response.text();
    expect(text).not.toContain('postgresql');
    expect(text).not.toContain('fixture:fixture');
    expect(JSON.parse(text).checks).toEqual({
      content: true,
      plugins: true,
      database: false,
      schema: false,
    });
  });
});
