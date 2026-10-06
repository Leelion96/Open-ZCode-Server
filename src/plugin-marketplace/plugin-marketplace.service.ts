import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { EnvironmentService } from '../common/environment.js';
import { loadCatalog, type LoadedCatalog, type LoadedAsset } from './catalog-loader.js';
import { MarketplaceSchema, type Marketplace } from './contracts.js';

@Injectable()
export class PluginMarketplaceService implements OnModuleInit {
  #loaded: LoadedCatalog | undefined;
  #catalog: Marketplace | undefined;
  #etag = '';

  constructor(@Inject(EnvironmentService) private readonly environment: EnvironmentService) {}

  async onModuleInit(): Promise<void> {
    const loaded = await loadCatalog(
      resolve('data/plugins/catalog.json'),
      resolve('plugin-artifacts'),
    );
    const origin = this.environment.value.publicOrigin;
    const catalog = structuredClone(loaded.source.marketplace);
    for (const plugin of catalog.plugins) {
      plugin.source.url = new URL(plugin.source.url, origin).toString();
      for (const key of ['icon', 'heroImage']) {
        if (typeof plugin[key] === 'string' && plugin[key].startsWith('/assets/'))
          plugin[key] = new URL(plugin[key], origin).toString();
      }
    }
    this.#catalog = MarketplaceSchema.parse(catalog);
    this.#etag = `"${createHash('sha256').update(JSON.stringify(this.#catalog)).digest('hex')}"`;
    this.#loaded = loaded;
  }

  get ready(): boolean {
    return this.#loaded !== undefined;
  }
  get etag(): string {
    return this.#etag;
  }
  catalog(): Marketplace {
    if (!this.#catalog) throw new Error('Plugin marketplace is not ready');
    return structuredClone(this.#catalog);
  }
  asset(path: string): LoadedAsset | undefined {
    const asset = this.#loaded?.assets.get(path);
    return asset ? { ...asset, body: Buffer.from(asset.body) } : undefined;
  }
}
