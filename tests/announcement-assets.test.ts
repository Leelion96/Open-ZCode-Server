import { afterEach, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { loadContentBundle } from '../dist/public-content/content-files.js';

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});
async function fixture() {
  const directory = await mkdtemp(resolve(tmpdir(), 'open-zcode-announcement-assets-'));
  directories.push(directory);
  await cp('data', directory, { recursive: true });
  await mkdir(resolve(directory, 'announcement-assets/nested'), { recursive: true });
  const bytes = Buffer.from('ordinary announcement asset');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  await writeFile(resolve(directory, 'announcement-assets/nested/image.png'), bytes);
  const content = {
    schemaVersion: 1,
    deliveries: {
      'zh-CN': [],
      'en-US': [
        {
          campaign_id: 'image',
          priority: 1,
          resource_position: 'banner',
          banner: {
            background: {
              type: 'image',
              image: { default: { src: '/assets/announcements/nested/image.png', sha256 } },
            },
            buttons: [
              { text: { format: 'plaintext', content: 'Close' }, action: { type: 'close' } },
            ],
          },
        },
      ],
    },
  };
  await writeFile(resolve(directory, 'announcements.json'), JSON.stringify(content));
  return { directory, bytes, sha256, content };
}
it('loads and hashes local assets at startup, derives immutable URLs, and preserves bytes', async () => {
  const f = await fixture();
  const loaded = await loadContentBundle(f.directory, 'https://selfhost.example');
  const item = loaded.announcements.deliveries['en-US'][0]!;
  expect(item.resource_position).toBe('banner');
  if (item.resource_position !== 'banner' || item.banner.background.type !== 'image')
    throw new Error('Wrong fixture');
  expect(item.banner.background.image.default.src).toBe(
    `https://selfhost.example/assets/announcements/${f.sha256}/image.png`,
  );
  expect(loaded.announcementAssets.get(`${f.sha256}/image.png`)?.bytes.equals(f.bytes)).toBe(true);
  await rm(resolve(f.directory, 'announcement-assets'), { recursive: true });
  expect(loaded.announcementAssets.get(`${f.sha256}/image.png`)?.bytes.equals(f.bytes)).toBe(true);
});
it('rejects corrupt hashes and symlink escapes before publishing content', async () => {
  const f = await fixture();
  await writeFile(resolve(f.directory, 'announcement-assets/nested/image.png'), 'corrupt');
  await expect(loadContentBundle(f.directory)).rejects.toThrow('hash mismatch');
  await rm(resolve(f.directory, 'announcement-assets/nested/image.png'));
  const outside = resolve(f.directory, 'outside.png');
  await writeFile(outside, f.bytes);
  await symlink(outside, resolve(f.directory, 'announcement-assets/nested/image.png'));
  await expect(loadContentBundle(f.directory)).rejects.toThrow('escapes');
});
it('starts with empty independent content and rejects forbidden paths', async () => {
  const source = JSON.parse(await readFile('data/announcements.json', 'utf8'));
  expect(source.deliveries).toEqual({ 'zh-CN': [], 'en-US': [] });
  const f = await fixture();
  const changed = JSON.stringify(f.content).replace('/nested/image.png', '/../private.png');
  await writeFile(resolve(f.directory, 'announcements.json'), changed);
  await expect(loadContentBundle(f.directory)).rejects.toThrow();
});
