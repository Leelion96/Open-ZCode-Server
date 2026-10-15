import { readFile, stat } from 'node:fs/promises';
import { MarketplaceSchema, type Marketplace } from './contracts.js';

const MAX_CATALOG_BYTES = 10 * 1024 * 1024;
const CLIENT_PROVIDED_PLUGINS = new Set(['browser-use', 'node-repl-host']);

export async function loadCatalog(sourceFile: string): Promise<Marketplace> {
  if ((await stat(sourceFile)).size > MAX_CATALOG_BYTES)
    throw new Error('Plugin catalog exceeds size limit');
  const raw = JSON.parse(await readFile(sourceFile, 'utf8')) as unknown;
  const marketplace = MarketplaceSchema.parse(raw);
  const names = new Set<string>();
  for (const plugin of marketplace.plugins) {
    if (names.has(plugin.name)) throw new Error('Duplicate marketplace plugin');
    names.add(plugin.name);
    if (CLIENT_PROVIDED_PLUGINS.has(plugin.name))
      throw new Error('Client-provided plugin must not be remotely replaced');
    if (plugin.requiresPaidPlan === true) throw new Error('Paid-plan plugin must not be published');
    const source = new URL(plugin.source.url);
    if (source.protocol !== 'https:' || source.hostname !== 'cdn-zcode.z.ai')
      throw new Error('Official plugin package must use the official HTTPS CDN');
    if (plugin.source.path !== plugin.name) throw new Error('Plugin archive root mismatch');
  }
  for (const plugin of marketplace.plugins) {
    for (const dependency of Array.isArray(plugin.dependencies) ? plugin.dependencies : []) {
      if (typeof dependency !== 'string') throw new Error('Invalid plugin dependency');
      const name = dependency.split('@')[0]!;
      if (!names.has(name) && !CLIENT_PROVIDED_PLUGINS.has(name))
        throw new Error('Missing plugin dependency');
    }
  }
  // Keep the parsed upstream object so passthrough fields and their original order survive.
  return raw as Marketplace;
}
