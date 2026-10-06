import { createHash, generateKeyPairSync, sign, verify } from 'node:crypto';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

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

async function files(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(resolve(directory, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...(await files(directory, path)));
    else if (entry.isFile() && path !== 'manifest.json') result.push(path);
    else if (!entry.isFile()) throw new Error('Signed payload contains an unsupported file');
  }
  return result.sort();
}

export async function resignMimosaPayload(packageRoot, serverRoot) {
  const payload = resolve(packageRoot, 'payload');
  const signingRoot = resolve(serverRoot, 'artifacts/plugin-content-signing');
  await mkdir(signingRoot, { recursive: true });
  const keyFile = resolve(signingRoot, 'private.pem');
  try {
    await access(keyFile);
  } catch {
    const keys = generateKeyPairSync('ed25519');
    await writeFile(keyFile, keys.privateKey.export({ type: 'pkcs8', format: 'pem' }), {
      mode: 0o600,
    });
    await writeFile(
      resolve(signingRoot, 'public.pem'),
      keys.publicKey.export({ type: 'spki', format: 'pem' }),
    );
  }
  const privateKey = await readFile(keyFile, 'utf8');
  const publicKey = await readFile(resolve(signingRoot, 'public.pem'), 'utf8');
  const fingerprint = hash(publicKey);
  const loaderFile = resolve(payload, 'runtime/protected-loader.cjs');
  const loader = await readFile(loaderFile, 'utf8');
  if (!/const integrityPublicKeyPem = "(?:[^"\\]|\\.)*";/u.test(loader))
    throw new Error('Unrecognized Mimosa integrity key declaration');
  await writeFile(
    loaderFile,
    loader.replace(
      /const integrityPublicKeyPem = "(?:[^"\\]|\\.)*";/u,
      `const integrityPublicKeyPem = ${JSON.stringify(publicKey)};`,
    ),
  );
  const deliveryFile = resolve(payload, 'DELIVERY-MANIFEST.json');
  const delivery = JSON.parse(await readFile(deliveryFile, 'utf8'));
  delivery.integrityPublicKeySha256 = fingerprint;
  await writeFile(deliveryFile, `${JSON.stringify(delivery, null, 2)}\n`);
  const manifestFile = resolve(payload, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
  manifest.files = [];
  for (const path of await files(payload)) {
    const bytes = await readFile(resolve(payload, path));
    manifest.files.push({ path, bytes: bytes.length, sha256: hash(bytes) });
  }
  manifest.integrity = {
    ...manifest.integrity,
    algorithm: 'Ed25519',
    publisher: 'Open-ZCode',
    publicKeySha256: fingerprint,
  };
  delete manifest.integrity.signature;
  const message = Buffer.from(canonical(manifest));
  manifest.integrity.signature = sign(null, message, privateKey).toString('base64');
  if (!verify(null, message, publicKey, Buffer.from(manifest.integrity.signature, 'base64')))
    throw new Error('Publisher signature failed verification');
  await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  return fingerprint;
}
