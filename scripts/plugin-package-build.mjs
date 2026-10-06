import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { zipSync } from 'fflate';
import { format, resolveConfig } from 'prettier';

export async function walkPackage(root, prefix = '') {
  const result = [];
  for (const entry of await readdir(resolve(root, prefix), { withFileTypes: true })) {
    if (
      [
        'node_modules',
        '.venv',
        '__pycache__',
        '.DS_Store',
        '.git',
        '.env',
        '.mimosa',
        '.v2c',
      ].includes(entry.name) ||
      entry.name.endsWith('.pyc')
    )
      continue;
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...(await walkPackage(root, path)));
    else if (entry.isFile()) result.push(path);
    else throw new Error(`Unsupported package entry: ${path}`);
  }
  return result.sort();
}

export async function buildPackage(root, name) {
  const inputs = {};
  const timestamp = new Date(1980, 0, 1, 0, 0, 0);
  for (const path of await walkPackage(root)) {
    const full = resolve(root, path);
    const bytes = await readFile(full);
    const mode = (await stat(full)).mode & 0o111 ? 0o755 : 0o644;
    inputs[`${name}/${path}`] = [bytes, { mtime: timestamp, attrs: (mode << 16) >>> 0, os: 3 }];
  }
  const bytes = Buffer.from(zipSync(inputs, { level: 9 }));
  return { bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}

export async function buildPluginArtifacts(serverRoot) {
  const file = resolve(serverRoot, 'data/plugins/catalog.json');
  const catalog = JSON.parse(await readFile(file, 'utf8'));
  const output = resolve(serverRoot, 'plugin-artifacts');
  await mkdir(output, { recursive: true });
  const assets = catalog.assets.filter((asset) => asset.mime !== 'application/zip');
  for (const entry of catalog.marketplace.plugins) {
    const root = resolve(serverRoot, 'plugins/packages', entry.name, entry.version);
    const manifest = JSON.parse(await readFile(resolve(root, '.zcode-plugin/plugin.json'), 'utf8'));
    if (manifest.name !== entry.name || manifest.version !== entry.version)
      throw new Error(`Package identity mismatch: ${entry.name}`);
    const built = await buildPackage(root, entry.name);
    if (entry.source.sha256 && entry.source.sha256 !== built.sha256) {
      throw new Error(
        `Release content changed without a version bump: ${entry.name} ${entry.version}`,
      );
    }
    const path = `${entry.name}/${entry.version}/${built.sha256}/plugin.zip`;
    await mkdir(dirname(resolve(output, path)), { recursive: true });
    await writeFile(resolve(output, path), built.bytes);
    entry.source = {
      source: 'url',
      type: 'zip',
      url: `/assets/plugins/${path}`,
      sha256: built.sha256,
      path: entry.name,
    };
    assets.push({
      path: `/assets/plugins/${path}`,
      file: path,
      sha256: built.sha256,
      bytes: built.bytes.length,
      mime: 'application/zip',
    });
  }
  for (const asset of assets.filter((asset) => asset.mime !== 'application/zip')) {
    const bytes = await readFile(resolve(serverRoot, 'plugins/assets', asset.file));
    await mkdir(dirname(resolve(output, asset.file)), { recursive: true });
    await writeFile(resolve(output, asset.file), bytes);
  }
  catalog.assets = assets;
  await writeFile(
    file,
    await format(JSON.stringify(catalog), { ...(await resolveConfig(file)), parser: 'json' }),
  );
  return catalog;
}
