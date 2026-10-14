import { readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { BuiltinReleaseSchema, ClientConfigSchema, ScenesSchema } from '../common/contracts.js';
import { AnnouncementContentSchema } from '../common/announcement-contracts.js';
import { loadAnnouncementAssets } from './announcement-assets.js';

export function assertNoUnsafeKeys(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) assertNoUnsafeKeys(item);
    return;
  }
  if (typeof value !== 'object' || value === null) return;
  for (const [key, item] of Object.entries(value)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Unsafe JSON key');
    assertNoUnsafeKeys(item);
  }
}

export function assertNoCredentials(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) assertNoCredentials(item);
    return;
  }
  if (typeof value !== 'object' || value === null) return;
  for (const [key, item] of Object.entries(value)) {
    if (
      /^(api_?key|access_?token|refresh_?token|password|secret|client_?secret|authorization|cookie)$/i.test(
        key,
      ) &&
      typeof item === 'string' &&
      item.trim() &&
      !/^\$\{[A-Z0-9_]+\}$/.test(item)
    ) {
      throw new Error('Public content contains a credential field');
    }
    assertNoCredentials(item);
  }
}

export async function readJsonFile(path: string): Promise<unknown> {
  if ((await stat(path)).size > 10_000_000) throw new Error('Content file exceeds size limit');
  const parsed: unknown = JSON.parse(await readFile(path, 'utf8'));
  assertNoUnsafeKeys(parsed);
  assertNoCredentials(parsed);
  return parsed;
}

export async function resolveContentFile(root: string, name: string): Promise<string> {
  if (isAbsolute(name)) throw new Error('Content index contains an absolute path');
  const base = await realpath(root);
  const path = await realpath(resolve(base, name));
  const rel = relative(base, path);
  if (rel.startsWith('..') || isAbsolute(rel))
    throw new Error('Content path leaves content directory');
  return path;
}

export async function loadContentBundle(root: string, publicOrigin = 'https://localhost:8443') {
  const configs = ClientConfigSchema.parse(
    await readJsonFile(await resolveContentFile(root, 'configs.json')),
  );
  const scenes = ScenesSchema.parse(
    await readJsonFile(await resolveContentFile(root, 'scenes.json')),
  );
  const builtin = BuiltinReleaseSchema.parse(
    await readJsonFile(await resolveContentFile(root, 'builtin.json')),
  );
  const announcements = AnnouncementContentSchema.parse(
    await readJsonFile(await resolveContentFile(root, 'announcements.json')),
  );
  const announcementAssets = await loadAnnouncementAssets(root, announcements, publicOrigin);
  return { configs, scenes, builtin, announcements, announcementAssets };
}

export type ContentBundle = Awaited<ReturnType<typeof loadContentBundle>>;
