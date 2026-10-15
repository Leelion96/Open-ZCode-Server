import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { format, resolveConfig } from 'prettier';

const root = resolve(import.meta.dirname, '..');
const marketplaceUrl = 'https://cdn-zcode.z.ai/zcode/official-plugin/marketplace.json';
const response = await fetch(marketplaceUrl, { signal: AbortSignal.timeout(30_000) });
if (!response.ok) throw new Error(`Official marketplace request failed: HTTP ${response.status}`);
const bytes = Buffer.from(await response.arrayBuffer());
if (bytes.length > 10 * 1024 * 1024) throw new Error('Official marketplace exceeds size limit');
const upstream = JSON.parse(bytes.toString('utf8'));
if (upstream.name !== 'zcode-plugins-official' || !Array.isArray(upstream.plugins))
  throw new Error('Unexpected official marketplace document');

const excluded = new Set(
  upstream.plugins
    .filter((plugin) => plugin.requiresPaidPlan === true)
    .map((plugin) => plugin.name),
);
const marketplace = {
  ...upstream,
  plugins: upstream.plugins.filter((plugin) => plugin.requiresPaidPlan !== true),
};
if (Array.isArray(upstream.featured))
  marketplace.featured = upstream.featured.filter((name) => !excluded.has(name));

for (const plugin of marketplace.plugins) {
  const source = new URL(plugin.source?.url ?? '');
  if (
    source.protocol !== 'https:' ||
    source.hostname !== 'cdn-zcode.z.ai' ||
    !/^[a-f0-9]{64}$/u.test(plugin.source?.sha256 ?? '')
  )
    throw new Error(`Invalid official source for plugin: ${plugin.name}`);
}

const catalogPath = resolve(root, 'data/plugins/catalog.json');
const snapshot = `${JSON.stringify(marketplace, null, 2)}\n`;
await writeFile(
  catalogPath,
  await format(snapshot, { ...(await resolveConfig(catalogPath)), parser: 'json' }),
);

const digest = createHash('sha256').update(bytes).digest('hex');
console.log(
  `Synced ${marketplace.plugins.length} upstream plugins; removed ${excluded.size} paid-plan plugins; source SHA-256 ${digest}`,
);
