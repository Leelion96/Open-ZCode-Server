import { createHash } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { CatalogSourceSchema, type CatalogSource } from './contracts.js';

export const MAX_ASSET_BYTES = 128 * 1024 * 1024;
export type LoadedAsset = Readonly<{ body: Buffer; mime: string; etag: string; size: number }>;
export type LoadedCatalog = { source: CatalogSource; assets: Map<string, LoadedAsset> };

export async function loadCatalog(
  sourceFile: string,
  artifactRoot: string,
): Promise<LoadedCatalog> {
  if ((await stat(sourceFile)).size > 10 * 1024 * 1024)
    throw new Error('Plugin catalog exceeds size limit');
  const source = CatalogSourceSchema.parse(JSON.parse(await readFile(sourceFile, 'utf8')));
  const assets = new Map<string, LoadedAsset>();
  const base = await realpath(artifactRoot);
  let total = 0;
  for (const asset of source.assets) {
    if (assets.has(asset.path)) throw new Error('Duplicate public plugin asset');
    if (isAbsolute(asset.file)) throw new Error('Invalid plugin artifact reference');
    const file = await realpath(resolve(base, asset.file));
    const location = relative(base, file);
    if (location === '..' || location.startsWith(`..${sep}`) || isAbsolute(location))
      throw new Error('Plugin artifact escapes content root');
    const info = await stat(file);
    total += info.size;
    if (total > MAX_ASSET_BYTES || info.size !== asset.bytes)
      throw new Error('Plugin artifact size mismatch or limit exceeded');
    const bytes = await readFile(file);
    if (
      bytes.length !== asset.bytes ||
      createHash('sha256').update(bytes).digest('hex') !== asset.sha256
    )
      throw new Error('Plugin artifact checksum mismatch');
    assets.set(asset.path, {
      body: bytes,
      mime: asset.mime,
      etag: `"${asset.sha256}"`,
      size: bytes.length,
    });
  }
  const names = new Set<string>();
  for (const plugin of source.marketplace.plugins) {
    if (names.has(plugin.name)) throw new Error('Duplicate marketplace plugin');
    names.add(plugin.name);
    if (['browser-use', 'node-repl-host'].includes(plugin.name))
      throw new Error('Client-provided plugin must not be remotely replaced');
    const asset = assets.get(plugin.source.url);
    if (!asset || asset.mime !== 'application/zip' || asset.etag !== `"${plugin.source.sha256}"`)
      throw new Error('Plugin references an unpublished archive');
    if (plugin.source.path !== plugin.name) throw new Error('Plugin archive root mismatch');
    for (const field of ['icon', 'heroImage']) {
      const path = plugin[field];
      if (typeof path === 'string' && path.startsWith('/assets/') && !assets.has(path))
        throw new Error('Plugin references an unpublished image');
    }
  }
  for (const plugin of source.marketplace.plugins) {
    for (const dependency of Array.isArray(plugin.dependencies) ? plugin.dependencies : []) {
      if (typeof dependency !== 'string') throw new Error('Invalid plugin dependency');
      const name = dependency.split('@')[0]!;
      if (!names.has(name) && !['browser-use', 'node-repl-host'].includes(name))
        throw new Error('Missing plugin dependency');
    }
  }
  return { source, assets };
}
