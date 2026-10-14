import { createHash } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import type { AnnouncementContent } from '../common/announcement-contracts.js';

export interface AnnouncementAssetBuffer {
  bytes: Buffer;
  sha256: string;
  contentType: string;
}
const MAX_ASSET_BYTES = 50_000_000;
const MAX_TOTAL_BYTES = 200_000_000;
const PREFIX = '/assets/announcements/';

/** 启动时加载唯一资产快照，HTTP 只读缓存，不在请求路径触碰文件。 */
export async function loadAnnouncementAssets(
  root: string,
  content: AnnouncementContent,
  origin: string,
) {
  const assets = new Map<string, AnnouncementAssetBuffer>();
  let total = 0;
  async function walk(value: unknown): Promise<void> {
    if (Array.isArray(value)) {
      for (const item of value) await walk(item);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const record = value as Record<string, unknown>;
    if (
      typeof record.src === 'string' &&
      record.src.startsWith(PREFIX) &&
      typeof record.sha256 === 'string'
    ) {
      const name = record.src.slice(PREFIX.length);
      if (
        !name ||
        name.split('/').some((part) => !part || part === '.' || part === '..') ||
        name.includes('\\')
      )
        throw new Error('Invalid announcement asset path');
      const base = await realpath(resolve(root, 'announcement-assets'));
      const path = await realpath(resolve(base, name));
      const rel = relative(base, path);
      if (rel.split(sep)[0] === '..' || isAbsolute(rel))
        throw new Error('Announcement asset escapes directory');
      const outputName = `${record.sha256}/${name.split('/').at(-1)!}`;
      const existing = assets.get(outputName);
      if (existing && existing.sha256 !== record.sha256)
        throw new Error('Conflicting announcement asset hash');
      if (!existing) {
        const size = (await stat(path)).size;
        if (size > MAX_ASSET_BYTES || total + size > MAX_TOTAL_BYTES)
          throw new Error('Announcement assets exceed size limit');
        const bytes = await readFile(path);
        const hash = createHash('sha256').update(bytes).digest('hex');
        if (hash !== record.sha256) throw new Error('Announcement asset hash mismatch');
        const extension = name.split('.').pop()?.toLowerCase();
        const contentType =
          (
            {
              png: 'image/png',
              jpg: 'image/jpeg',
              jpeg: 'image/jpeg',
              webp: 'image/webp',
              gif: 'image/gif',
              svg: 'image/svg+xml',
              mp4: 'video/mp4',
              webm: 'video/webm',
              zip: 'application/zip',
            } as Record<string, string>
          )[extension ?? ''] ?? 'application/octet-stream';
        assets.set(outputName, { bytes, sha256: hash, contentType });
        total += bytes.length;
      }
      record.src = new URL(PREFIX + outputName, origin).href;
    }
    for (const item of Object.values(record)) await walk(item);
  }
  await walk(content);
  return assets;
}
