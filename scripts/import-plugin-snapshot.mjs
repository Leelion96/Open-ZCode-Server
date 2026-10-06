import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { cleanBrandProse, cleanSkillMarkdown, normalizePluginAuthor } from './plugin-branding.mjs';
import { walkPackage, buildPluginArtifacts } from './plugin-package-build.mjs';
import { resignMimosaPayload } from './plugin-signature.mjs';

const serverRoot = resolve(import.meta.dirname, '..');
const clientRoot = resolve(process.argv[2] ?? '');
if (!process.argv[2])
  throw new Error('Pass the captured source checkout as an explicit import input');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const inventory = JSON.parse(
  await readFile(resolve(clientRoot, 'third-party/plugins/inventory.json'), 'utf8'),
);
const definitions = JSON.parse(
  await readFile(resolve(clientRoot, '.tmp/server-market-definitions.json'), 'utf8'),
);
const originalCatalog = JSON.parse(
  await readFile(resolve(clientRoot, 'third-party/plugins/official-catalog.json'), 'utf8'),
);
const preserved = new Set(['browser-use', 'node-repl-host']);
const selected = inventory.plugins.filter(
  (plugin) =>
    plugin.bundled !== false &&
    !preserved.has(plugin.name) &&
    (plugin.kind === 'builtin' || plugin.bundled),
);
const catalog = {
  schemaVersion: 1,
  marketplace: { name: 'zcode-plugins-official', description: '应用插件市场', plugins: [] },
  assets: [],
};
const audit = {
  schemaVersion: 1,
  capturedAt: new Date().toISOString(),
  publisher: 'Open-ZCode',
  plugins: [],
  issues: [],
};
await mkdir(resolve(serverRoot, 'data/plugins'), { recursive: true });

async function treeHash(root) {
  const entries = [];
  for (const path of await walkPackage(root))
    entries.push([path, hash(await readFile(resolve(root, path)))]);
  return hash(JSON.stringify(entries));
}

async function mirrorAsset(entry, field, record) {
  const url = entry[field];
  if (typeof url !== 'string' || !url.startsWith('https://')) return;
  let bytes;
  let mime;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    mime = (response.headers.get('content-type') ?? '').split(';')[0];
    if (!mime.startsWith('image/')) throw new Error('Asset is not an image');
    bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 8 * 1024 * 1024) throw new Error('Asset exceeds 8 MiB');
  } catch (error) {
    audit.issues.push({ plugin: entry.name, kind: 'asset-fallback', field, reason: error.message });
    bytes = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="#202624"/><path d="M32 36h28v28H32zm36 0h28v28H68zM32 72h28v20H32zm36 0h28v20H68z" fill="#dcfce7"/></svg>',
    );
    mime = 'image/svg+xml';
  }
  const digest = hash(bytes);
  const extensions = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/gif': 'gif',
    'image/x-icon': 'ico',
    'image/vnd.microsoft.icon': 'ico',
  };
  const file = `${entry.name}/${entry.version}/${digest}/${field}.${extensions[mime] ?? 'img'}`;
  await mkdir(dirname(resolve(serverRoot, 'plugins/assets', file)), { recursive: true });
  await writeFile(resolve(serverRoot, 'plugins/assets', file), bytes);
  const asset = {
    path: `/assets/plugins/${file}`,
    file,
    sha256: digest,
    bytes: bytes.length,
    mime,
  };
  catalog.assets.push(asset);
  entry[field] = asset.path;
  record.assets ??= [];
  record.assets.push({ field, origin: url, sha256: digest });
}

for (const item of selected) {
  const source = resolve(clientRoot, item.runtimeRoot);
  const sourceVersion = item.version;
  const version = `${sourceVersion}-open.1`;
  const original = resolve(serverRoot, 'plugins/upstream', item.name, sourceVersion);
  const target = resolve(serverRoot, 'plugins/packages', item.name, version);
  let sourceDigest;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const before = await treeHash(source);
    await rm(original, { recursive: true, force: true });
    await cp(source, original, {
      recursive: true,
      filter: (path) =>
        !/\/(?:node_modules|\.venv|__pycache__|\.git|\.env|\.mimosa|\.v2c)(?:\/|$)/u.test(path) &&
        !path.endsWith('.pyc') &&
        !path.endsWith('/.DS_Store'),
    });
    const after = await treeHash(source);
    if (before === after && (await treeHash(original)) === before) {
      sourceDigest = before;
      break;
    }
  }
  if (!sourceDigest) throw new Error(`Source remained unstable during snapshot: ${item.name}`);
  await mkdir(dirname(target), { recursive: true });
  await cp(original, target, { recursive: true });
  const record = {
    name: item.name,
    sourceVersion,
    version,
    sourceTreeSha256: sourceDigest,
    changes: [],
    retainedTechnicalReferences: [],
  };
  for (const path of await walkPackage(target)) {
    const file = resolve(target, path);
    if (path.endsWith('.md') && !/(?:^|\/)(?:LICENSE|NOTICE|COPYING|UPSTREAM)/iu.test(path)) {
      const text = await readFile(file, 'utf8');
      const cleaned = cleanSkillMarkdown(text);
      if (text !== cleaned) {
        await writeFile(file, cleaned);
        record.changes.push(path);
      }
      if (path.includes('/skills/') || path.startsWith('skills/')) {
        const remaining =
          cleaned.match(
            /ZCODE_[A-Z0-9_]+|\.zcode(?:-plugin)?|::zcode-[\w-]+|\bzcode[-_/][\w./-]+/g,
          ) ?? [];
        if (remaining.length)
          record.retainedTechnicalReferences.push({ file: path, tokens: [...new Set(remaining)] });
      }
    }
    if (/(?:^|\/)(?:package|plugin)\.json$/u.test(path)) {
      const document = JSON.parse(await readFile(file, 'utf8'));
      const updated = normalizePluginAuthor(document);
      if (document.version === sourceVersion) updated.version = version;
      await writeFile(file, `${JSON.stringify(updated, null, 2)}\n`);
      record.changes.push(path);
    }
  }
  if (item.name === 'mimosa')
    record.publisherSigningKeySha256 = await resignMimosaPayload(target, serverRoot);
  const manifest = JSON.parse(await readFile(resolve(target, '.zcode-plugin/plugin.json'), 'utf8'));
  const originalEntry = originalCatalog.plugins.find((plugin) => plugin.name === item.name) ?? {};
  const definition = definitions.find((plugin) => plugin.name === item.name) ?? {};
  const metadata = { ...originalEntry };
  delete metadata.source;
  delete metadata._artifact;
  const entry = normalizePluginAuthor({
    ...metadata,
    ...definition.listing,
    name: item.name,
    version,
    description: manifest.description,
    source: {},
  });
  if (entry.displayName) entry.displayName = cleanBrandProse(entry.displayName);
  if (entry.displayName_i18n)
    entry.displayName_i18n = Object.fromEntries(
      Object.entries(entry.displayName_i18n).map(([key, value]) => [key, cleanBrandProse(value)]),
    );
  await mirrorAsset(entry, 'icon', record);
  await mirrorAsset(entry, 'heroImage', record);
  catalog.marketplace.plugins.push(entry);
  audit.plugins.push(record);
  console.log(`Captured ${item.name} ${version}`);
}
if (originalCatalog.featured?.length)
  catalog.marketplace.featured = originalCatalog.featured.filter((name) =>
    selected.some((plugin) => plugin.name === name),
  );
await writeFile(resolve(serverRoot, 'plugins/sources.json'), `${JSON.stringify(audit, null, 2)}\n`);
await writeFile(
  resolve(serverRoot, 'data/plugins/catalog.json'),
  `${JSON.stringify(catalog, null, 2)}\n`,
);
await buildPluginArtifacts(serverRoot);
console.log(`Published snapshot: ${selected.length} plugins`);
