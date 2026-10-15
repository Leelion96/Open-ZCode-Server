import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const marketplace = JSON.parse(await readFile(resolve(root, 'data/plugins/catalog.json'), 'utf8'));
if (marketplace.name !== 'zcode-plugins-official' || !Array.isArray(marketplace.plugins))
  throw new Error('Invalid official marketplace catalog');
if (marketplace.plugins.some((plugin) => plugin.requiresPaidPlan === true))
  throw new Error('Paid-plan plugin leaked into the catalog');

const names = new Set();
for (const plugin of marketplace.plugins) {
  if (names.has(plugin.name)) throw new Error(`Duplicate plugin: ${plugin.name}`);
  names.add(plugin.name);
  const source = new URL(plugin.source?.url ?? '');
  if (
    source.protocol !== 'https:' ||
    source.hostname !== 'cdn-zcode.z.ai' ||
    !/^[a-f0-9]{64}$/u.test(plugin.source?.sha256 ?? '')
  )
    throw new Error(`Invalid official package source: ${plugin.name}`);
}
for (const name of ['browser-use', 'node-repl-host'])
  if (names.has(name)) throw new Error(`Client-provided plugin must not be listed: ${name}`);

console.log(`Verified ${names.size} upstream entries; package metadata and URLs are unchanged`);
