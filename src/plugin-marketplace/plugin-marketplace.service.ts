import { Injectable, type OnModuleInit } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { loadCatalog } from './catalog-loader.js';
import type { Marketplace } from './contracts.js';

@Injectable()
export class PluginMarketplaceService implements OnModuleInit {
  #catalog: Marketplace | undefined;
  #etag = '';

  async onModuleInit(): Promise<void> {
    const catalog = await loadCatalog(resolve('data/plugins/catalog.json'));
    this.#catalog = catalog;
    this.#etag = `"${createHash('sha256').update(JSON.stringify(this.#catalog)).digest('hex')}"`;
  }

  get ready(): boolean {
    return this.#catalog !== undefined;
  }
  get etag(): string {
    return this.#etag;
  }
  catalog(): Marketplace {
    if (!this.#catalog) throw new Error('Plugin marketplace is not ready');
    return structuredClone(this.#catalog);
  }
}
