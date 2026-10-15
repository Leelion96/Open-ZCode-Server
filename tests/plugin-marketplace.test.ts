import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
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

describe('filtered official plugin marketplace', () => {
  it('returns the upstream catalog with only paid-plan entries removed', async () => {
    const response = await fetch(origin + '/api/v1/plugins/marketplace.json');
    const body = await response.json();
    const catalog = MarketplaceWire.parse(body);
    const snapshot = JSON.parse(await readFile('data/plugins/catalog.json', 'utf8'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-cache');
    expect(body).toEqual(snapshot);
    expect(catalog.plugins).toHaveLength(27);
    expect(catalog.plugins.some((plugin) => plugin.requiresPaidPlan === true)).toBe(false);
    expect(
      catalog.plugins.every((plugin) => new URL(plugin.source.url).hostname === 'cdn-zcode.z.ai'),
    ).toBe(true);
    expect(
      catalog.plugins.some((plugin) => ['browser-use', 'node-repl-host'].includes(plugin.name)),
    ).toBe(false);
  });

  it('loads offline without fetching plugin packages', async () => {
    const network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    try {
      const loaded = await loadCatalog(resolve('data/plugins/catalog.json'));
      expect(loaded.plugins).toHaveLength(27);
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
  });

  it('rejects paid entries and non-official package URLs', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'official-marketplace-'));
    const source = JSON.parse(await readFile('data/plugins/catalog.json', 'utf8'));
    try {
      source.plugins[0].requiresPaidPlan = true;
      const catalogFile = resolve(directory, 'catalog.json');
      await writeFile(catalogFile, JSON.stringify(source));
      await expect(loadCatalog(catalogFile)).rejects.toThrow(/Paid-plan/u);
      delete source.plugins[0].requiresPaidPlan;
      source.plugins[0].source.url = 'https://plugins.example/plugin.zip';
      await writeFile(catalogFile, JSON.stringify(source));
      await expect(loadCatalog(catalogFile)).rejects.toThrow(/official HTTPS CDN/u);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
