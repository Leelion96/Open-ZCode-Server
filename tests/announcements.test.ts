import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApplication } from '../dist/app.js';
import { PublicContentService } from '../dist/public-content/index.js';
import { AnnouncementRepository } from '../dist/announcements/index.js';
import { AnnouncementContentSchema } from '../dist/common/announcement-contracts.js';

const text = (content: string) => ({ format: 'plaintext' as const, content });
const popup = (id: string, priority = 1) => ({
  campaign_id: id,
  priority,
  resource_position: 'popup' as const,
  popup: {
    title: text(id),
    description: text('Release notes'),
    buttons: [{ text: text('Close'), action: { type: 'close' as const } }],
  },
});
const device = randomUUID();
let app: NestFastifyApplication;
let origin: string;
const records = new Set<string>();
const previous = { ...process.env };

beforeAll(async () => {
  Object.assign(process.env, {
    DATABASE_URL: 'postgresql://fixture:fixture@127.0.0.1:1/fixture',
    PUBLIC_ORIGIN: 'https://selfhost.example',
    LOG_LEVEL: 'silent',
    OPENAPI_ENABLED: 'true',
  });
  app = await createApplication();
  const content = app.get(PublicContentService);
  vi.spyOn(content, 'announcements').mockImplementation(() => ({
    schemaVersion: 1,
    deliveries: {
      'en-US': [popup('release', 2), popup('older', 1)],
      'zh-CN': [popup('中文公告', 3)],
    },
  }));
  const repository = app.get(AnnouncementRepository);
  vi.spyOn(repository, 'processed').mockImplementation(async (id) =>
    [...records].filter((key) => key.startsWith(id + ':')).map((key) => key.slice(id.length + 1)),
  );
  vi.spyOn(repository, 'record').mockImplementation(async (id, campaign) => {
    records.add(id + ':' + campaign);
  });
  await app.listen(0, '127.0.0.1');
  origin = await app.getUrl();
});
afterAll(async () => {
  await app?.close();
  vi.restoreAllMocks();
  process.env = previous;
});

describe('ordinary announcement HTTP contract', () => {
  const headers = { 'x-device-mid': device, 'x-client-language': 'en-US' };
  it('selects language and the highest priority per position', async () => {
    const response = await fetch(origin + '/api/v1/marketing/touch?seq=0', { headers });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      code: number;
      data: { server_time: number; language: string; deliveries: ReturnType<typeof popup>[] };
    };
    expect(body.code).toBe(0);
    expect(body.data.server_time).toBeGreaterThan(0);
    expect(body.data.language).toBe('en-US');
    expect(body.data.deliveries.map((d) => d.campaign_id)).toEqual(['release']);
    const chinese = await fetch(origin + '/api/v1/marketing/touch', {
      headers: { ...headers, 'x-client-language': 'zh-CN' },
    });
    expect(
      ((await chinese.json()) as { data: { deliveries: ReturnType<typeof popup>[] } }).data
        .deliveries[0]?.campaign_id,
    ).toBe('中文公告');
  });
  it('records confirm/cancel idempotently and suppresses that device only', async () => {
    for (const action of ['cancel', 'confirm']) {
      const response = await fetch(origin + '/api/v1/marketing/touch/action', {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({ campaign_id: 'release', action_type: action }),
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ code: 0 });
    }
    const response = await fetch(origin + '/api/v1/marketing/touch', { headers });
    expect(
      (
        (await response.json()) as { data: { deliveries: ReturnType<typeof popup>[] } }
      ).data.deliveries.map((d) => d.campaign_id),
    ).toEqual(['older']);
    const other = await fetch(origin + '/api/v1/marketing/touch', {
      headers: { ...headers, 'x-device-mid': randomUUID() },
    });
    expect(
      ((await other.json()) as { data: { deliveries: ReturnType<typeof popup>[] } }).data
        .deliveries[0]?.campaign_id,
    ).toBe('release');
  });
  it('rejects invalid identity, query and unknown campaign without reporting success', async () => {
    expect((await fetch(origin + '/api/v1/marketing/touch')).status).toBe(400);
    expect((await fetch(origin + '/api/v1/marketing/touch?seq=-1', { headers })).status).toBe(400);
    const response = await fetch(origin + '/api/v1/marketing/touch/action', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ campaign_id: 'missing', action_type: 'cancel' }),
    });
    expect(response.status).toBe(404);
  });
});

it('rejects commercial actions in public content including banner result popups', () => {
  const ordinary = popup('ordinary');
  expect(
    AnnouncementContentSchema.safeParse({
      schemaVersion: 1,
      deliveries: { 'en-US': [ordinary], 'zh-CN': [] },
    }).success,
  ).toBe(true);
  for (const action of [
    { type: 'claim_zcode_plan', args: { plan_id: 'plan' } },
    { type: 'navigate', args: { page: 'upgrade' } },
    { type: 'navigate', args: { page: 'rewards' } },
    {
      type: 'navigate',
      args: { page: 'settings', section: 'models', provider_id: 'account:zai-start-plan' },
    },
  ]) {
    expect(
      AnnouncementContentSchema.safeParse({
        schemaVersion: 1,
        deliveries: {
          'en-US': [
            {
              ...ordinary,
              popup: { ...ordinary.popup, buttons: [{ text: text('Action'), action }] },
            },
          ],
          'zh-CN': [],
        },
      }).success,
    ).toBe(false);
  }
});
