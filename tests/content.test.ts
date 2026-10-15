import { afterEach, describe, expect, it, vi } from 'vitest';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  assertNoCredentials,
  assertNoUnsafeKeys,
  loadContentBundle,
  resolveContentFile,
} from '../dist/public-content/content-files.js';
import { EnvironmentService, loadEnvironment } from '../dist/common/environment.js';
import { PublicContentService } from '../dist/public-content/public-content.service.js';

const temporary: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe('independent public content', () => {
  it('loads the three complete public JSON files without upstream metadata', async () => {
    const bundle = await loadContentBundle(resolve('data'));
    expect(bundle.configs.data.configs.codingPlanStaticProducts).toEqual({});
    expect(bundle.scenes.data.map((scene) => scene.scene)).toEqual([
      'draft-suggestion',
      'scheduled-task',
    ]);
    expect(bundle.builtin.revision).toBeGreaterThan(23);
    expect(bundle.builtin.config.providerConfigRules.providerRules).toEqual([]);
  });

  it('keeps existing unsafe-key and credential checks without rejecting key-management URLs', () => {
    expect(() => assertNoUnsafeKeys(JSON.parse('{"__proto__":{"polluted":true}}'))).toThrow(
      'Unsafe JSON key',
    );
    expect(() => assertNoCredentials({ access_token: 'real-token' })).toThrow('credential');
    expect(() =>
      assertNoCredentials({
        apiKeyUrl: 'https://provider.example/keys',
        apiKey: '${MODEL_API_KEY}',
      }),
    ).not.toThrow();
  });

  it('loads offline, isolates response copies and does not retain per-request state', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network disabled'));
    const content = new PublicContentService(
      new EnvironmentService(
        loadEnvironment({
          DATABASE_URL: 'postgresql://localhost/unused',
          PUBLIC_ORIGIN: 'https://selfhost.example',
        }),
      ),
    );
    await content.onModuleInit();
    const first = content.configs({ app_version: '3.14.3' });
    first.data.configs.offPeak = { enable_offpeak_task: true };
    expect(content.configs({ app_version: '99.0.0' }).data.configs.offPeak).toEqual(
      expect.objectContaining({ enable_offpeak_task: false }),
    );
    const release = content.builtin();
    release.config.providerConfigRules.templateRules.length = 0;
    expect(content.builtin().config.providerConfigRules.templateRules.length).toBeGreaterThan(0);
    expect(spy).not.toHaveBeenCalled();
  });

  it('serves direct config edits and omits HTTPS-only links for HTTP deployments', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'open-zcode-config-'));
    temporary.push(directory);
    await cp('data', resolve(directory, 'data'), { recursive: true });
    const configFile = resolve(directory, 'data/configs.json');
    const config = JSON.parse(await readFile(configFile, 'utf8'));
    config.data.configs.futureFlag = { enabled: false };
    config.data.configs.feedbackUrl.feedback_url = 'https://team.example/feedback';
    await writeFile(configFile, JSON.stringify(config));
    // 用副本验证真实HTTP直接读取自有配置，避免修改正常部署文件。
    const { stdout } = await promisify(execFile)(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import { createApplication } from ${JSON.stringify(new URL('../dist/app.js', import.meta.url).href)};
      const app = await createApplication();
      try {
        await app.listen(0, '127.0.0.1');
        const response = await fetch((await app.getUrl()) + '/api/v1/client/configs');
        if (response.status !== 200) throw new Error('Config response failed');
        process.stdout.write(await response.text());
      } finally { await app.close(); }`,
      ],
      {
        cwd: directory,
        env: {
          ...process.env,
          DATABASE_URL: 'postgresql://fixture:fixture@127.0.0.1:1/fixture',
          PUBLIC_ORIGIN: 'http://127.0.0.1:3000',
          LOG_LEVEL: 'silent',
          OPENAPI_ENABLED: 'false',
        },
      },
    );
    const wire = JSON.parse(stdout);
    expect(wire.data.configs.futureFlag).toEqual({ enabled: false });
    expect(wire.data.configs.builtin_provider_config_json).toBeUndefined();
    expect(wire.data.configs.feedbackUrl.feedback_url).toBe('https://team.example/feedback');
  });

  it('rejects missing/invalid public files and paths outside the data root', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'open-zcode-content-'));
    temporary.push(directory);
    await cp('data', directory, { recursive: true });
    await rm(resolve(directory, 'scenes.json'));
    await expect(loadContentBundle(directory)).rejects.toThrow();
    await cp('data/scenes.json', resolve(directory, 'scenes.json'));
    await writeFile(resolve(directory, 'configs.json'), '{}');
    await expect(loadContentBundle(directory)).rejects.toThrow();
    await expect(resolveContentFile(resolve('data'), '../package.json')).rejects.toThrow(
      'leaves content',
    );
  });

  it('rejects invalid deployment environment without echoing credentials', () => {
    expect(() => loadEnvironment({ DATABASE_URL: 'secret-marker', PORT: 'bad' })).toThrow(
      'DATABASE_URL',
    );
    try {
      loadEnvironment({ DATABASE_URL: 'secret-marker' });
    } catch (error) {
      expect(String(error)).not.toContain('secret-marker');
    }
    expect(() =>
      loadEnvironment({
        DATABASE_URL: 'postgresql://localhost/x',
        PUBLIC_ORIGIN: 'https://selfhost.example/path',
      }),
    ).toThrow('PUBLIC_ORIGIN');
  });
});
