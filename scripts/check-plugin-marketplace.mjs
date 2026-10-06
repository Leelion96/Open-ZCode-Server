import { createHash, verify } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { unzipSync } from 'fflate';
import { cleanSkillMarkdown } from './plugin-branding.mjs';

const root = resolve(import.meta.dirname, '..');
const source = JSON.parse(await readFile(resolve(root, 'data/plugins/catalog.json'), 'utf8'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const canonical = (value) =>
  value === null || typeof value !== 'object'
    ? JSON.stringify(value)
    : Array.isArray(value)
      ? `[${value.map(canonical).join(',')}]`
      : `{${Object.keys(value)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
          .join(',')}}`;
let skillCount = 0;
for (const plugin of source.marketplace.plugins) {
  const asset = source.assets.find((asset) => asset.path === plugin.source.url);
  const bytes = await readFile(resolve(root, 'plugin-artifacts', asset.file));
  if (hash(bytes) !== plugin.source.sha256)
    throw new Error(`Archive checksum mismatch: ${plugin.name}`);
  const files = unzipSync(bytes);
  const manifest = JSON.parse(
    Buffer.from(files[`${plugin.name}/.zcode-plugin/plugin.json`]).toString('utf8'),
  );
  if (
    manifest.name !== plugin.name ||
    manifest.version !== plugin.version ||
    manifest.author.name !== 'Open-ZCode' ||
    plugin.author.name !== 'Open-ZCode'
  )
    throw new Error(`Plugin metadata mismatch: ${plugin.name}`);
  for (const [path, data] of Object.entries(files)) {
    if (path.includes('/skills/') && path.endsWith('.md') && !path.endsWith('/LICENSE.md')) {
      const text = Buffer.from(data).toString('utf8');
      if (cleanSkillMarkdown(text) !== text) throw new Error(`Unnormalized skill prose: ${path}`);
      if (path.endsWith('/SKILL.md')) skillCount += 1;
    }
  }
  if (plugin.name === 'mimosa') {
    const prefix = 'mimosa/payload/';
    const signed = JSON.parse(Buffer.from(files[prefix + 'manifest.json']).toString('utf8'));
    const loader = Buffer.from(files[prefix + 'runtime/protected-loader.cjs']).toString('utf8');
    const match = loader.match(/const integrityPublicKeyPem = ("(?:[^"\\]|\\.)*");/u);
    const key = JSON.parse(match[1]);
    const signature = signed.integrity.signature;
    delete signed.integrity.signature;
    if (!verify(null, Buffer.from(canonical(signed)), key, Buffer.from(signature, 'base64')))
      throw new Error('Publisher signature is invalid');
    for (const file of signed.files)
      if (hash(files[prefix + file.path]) !== file.sha256)
        throw new Error('Signed payload file checksum mismatch');
  }
}
const result = {
  plugins: source.marketplace.plugins.length,
  skills: skillCount,
  archiveChecksums: 'passed',
  authors: 'Open-ZCode',
  skillProse: 'normalized',
  mimosaSignature: 'verified',
};
await writeFile(
  resolve(root, 'artifacts/plugin-content-check.json'),
  JSON.stringify(result, null, 2) + '\n',
);
console.log(JSON.stringify(result));
