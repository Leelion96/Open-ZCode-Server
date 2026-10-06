import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { unzipSync } from 'fflate';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApplication } from '../dist/app.js';
import { loadCatalog } from '../dist/plugin-marketplace/catalog-loader.js';
import { MarketplaceWire } from './wire.js';

let app: NestFastifyApplication;
let origin: string;
const environment = { ...process.env };
beforeAll(async () => {
  Object.assign(process.env, {
    DATABASE_URL: 'postgresql://fixture:fixture@127.0.0.1:1/fixture',
    PUBLIC_ORIGIN: 'https://selfhost.example',
    LOG_LEVEL: 'silent',
    OPENAPI_ENABLED: 'true',
  });
  app = await createApplication();
  await app.listen(0, '127.0.0.1');
  origin = await app.getUrl();
});
afterAll(async () => {
  await app?.close();
  process.env = environment;
});

describe('new plugin marketplace over real HTTP', () => {
  it('keeps identity, groups and metadata, replaces author and uses self-hosted URLs', async () => {
    const response = await fetch(origin + '/api/v1/plugins/marketplace.json');
    const catalog = MarketplaceWire.parse(await response.json());
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-cache');
    expect(catalog.name).toBe('zcode-plugins-official');
    expect(catalog.code).toBeUndefined();
    expect(catalog.plugins).toHaveLength(21);
    expect(
      catalog.plugins.every(
        (plugin) =>
          plugin.author.name === 'Open-ZCode' &&
          plugin.source.url.startsWith('https://selfhost.example/assets/plugins/') &&
          /^[a-f0-9]{64}$/u.test(plugin.source.sha256),
      ),
    ).toBe(true);
    expect(
      catalog.plugins.some((plugin) => ['browser-use', 'node-repl-host'].includes(plugin.name)),
    ).toBe(false);
    expect(
      catalog.plugins.find((plugin) => plugin.name === 'accounting-and-reporting')!.category,
    ).toBe('finance');
    expect(catalog.plugins.find((plugin) => plugin.name === 'lark-cli')!.category).toBe(
      'productivity',
    );
    expect(catalog.plugins.find((plugin) => plugin.name === 'mimosa')!.category).toBe(
      'developer-tools',
    );
  });

  it('downloads complete, verifiable packages with author and license preserved', async () => {
    const catalog = MarketplaceWire.parse(
      await (await fetch(origin + '/api/v1/plugins/marketplace.json')).json(),
    );
    for (const plugin of catalog.plugins) {
      const path = new URL(plugin.source.url).pathname;
      const response = await fetch(origin + path);
      const bytes = new Uint8Array(await response.arrayBuffer());
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/zip');
      expect(response.headers.get('cache-control')).toContain('immutable');
      expect(response.headers.get('cross-origin-resource-policy')).toBe('cross-origin');
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(plugin.source.sha256);
      const files = unzipSync(bytes);
      const manifest = JSON.parse(
        Buffer.from(files[`${plugin.name}/.zcode-plugin/plugin.json`]!).toString(),
      );
      expect(manifest.name).toBe(plugin.name);
      expect(manifest.version).toBe(plugin.version);
      expect(manifest.author.name).toBe('Open-ZCode');
      if (plugin.name === 'documents') {
        expect(Buffer.from(files[`${plugin.name}/skills/docx/LICENSE.txt`]!).toString()).toContain(
          'non-commercial use only',
        );
      }
      if (plugin.name === 'mimosa')
        expect(files['mimosa/payload/dist/mcp/server.mimosa']).toBeDefined();
      if (plugin.name === 'video2code')
        expect(files['video2code/mcp/video_server.py']).toBeDefined();
    }
  });

  it('supports HEAD, conditional asset reads and rejects unpublished paths', async () => {
    const catalog = MarketplaceWire.parse(
      await (await fetch(origin + '/api/v1/plugins/marketplace.json')).json(),
    );
    const path = new URL(catalog.plugins[0]!.source.url).pathname;
    const head = await fetch(origin + path, { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(Number(head.headers.get('content-length'))).toBeGreaterThan(0);
    expect(await head.text()).toBe('');
    const unchanged = await fetch(origin + path, {
      headers: { 'if-none-match': head.headers.get('etag')! },
    });
    expect(unchanged.status).toBe(304);
    expect((await fetch(origin + '/assets/plugins/unknown/1/unknown/plugin.zip')).status).toBe(404);
  });

  it('serves copied images without upstream requests', async () => {
    const catalog = MarketplaceWire.parse(
      await (await fetch(origin + '/api/v1/plugins/marketplace.json')).json(),
    );
    for (const plugin of catalog.plugins.filter((plugin) => plugin.icon)) {
      const response = await fetch(origin + new URL(plugin.icon!).pathname);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toMatch(/^image\//u);
    }
  });
});

describe('bounded immutable snapshot loader', () => {
  it('loads offline and detects corruption without modifying production materials', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'plugin-content-'));
    try {
      await cp('data/plugins/catalog.json', resolve(directory, 'catalog.json'));
      await cp('plugin-artifacts', resolve(directory, 'assets'), { recursive: true });
      const source = JSON.parse(await readFile(resolve(directory, 'catalog.json'), 'utf8'));
      await writeFile(resolve(directory, 'assets', source.assets[0].file), 'corrupt fixture');
      await expect(
        loadCatalog(resolve(directory, 'catalog.json'), resolve(directory, 'assets')),
      ).rejects.toThrow(/size|checksum/u);
      const network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
      try {
        const loaded = await loadCatalog(
          resolve('data/plugins/catalog.json'),
          resolve('plugin-artifacts'),
        );
        expect(loaded.source.marketplace.plugins.length).toBe(21);
        expect(network).not.toHaveBeenCalled();
      } finally {
        network.mockRestore();
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  it('refuses a path escaping the published asset root', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'plugin-path-'));
    try {
      const source = JSON.parse(await readFile('data/plugins/catalog.json', 'utf8'));
      source.assets[0].file = '../catalog.json';
      await writeFile(resolve(directory, 'catalog.json'), JSON.stringify(source));
      await expect(
        loadCatalog(resolve(directory, 'catalog.json'), resolve(directory)),
      ).rejects.toThrow();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
