import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApplication } from '../dist/app.js';
import { DatabaseService } from '../dist/database/index.js';
import { PublicContentService } from '../dist/public-content/index.js';
import { AnnouncementService } from '../dist/announcements/index.js';

let app: NestFastifyApplication;
const device = randomUUID();
const campaign = `integration-${randomUUID()}`;
const second = `${campaign}-new`;
const popup = (id: string) => ({
  campaign_id: id,
  priority: 1,
  resource_position: 'popup' as const,
  popup: {
    title: { format: 'plaintext' as const, content: id },
    description: { format: 'plaintext' as const, content: 'Database fixture' },
    buttons: [
      {
        text: { format: 'plaintext' as const, content: 'Close' },
        action: { type: 'close' as const },
      },
    ],
  },
});
beforeAll(async () => {
  if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL is required for actual PostgreSQL verification');
  process.env.LOG_LEVEL = 'silent';
  vi.spyOn(PublicContentService.prototype, 'announcements').mockImplementation(() => ({
    schemaVersion: 1,
    deliveries: { 'en-US': [popup(campaign)], 'zh-CN': [] },
  }));
  app = await createApplication();
});
afterAll(async () => {
  if (app) {
    await app
      .get(DatabaseService)
      .client.announcementReceipt.deleteMany({ where: { deviceMid: device } });
    await app.close();
  }
  vi.restoreAllMocks();
});
it('keeps first receipts across concurrent retries and application restart, then shows a new ID', async () => {
  expect(await app.get(DatabaseService).probe()).toEqual({ database: true, schema: true });
  const service = app.get(AnnouncementService);
  expect((await service.query(device, 'en-US')).data.deliveries).toHaveLength(1);
  await service.report(device, { campaign_id: campaign, action_type: 'cancel' });
  await Promise.all(
    Array.from({ length: 8 }, () =>
      service.report(device, { campaign_id: campaign, action_type: 'confirm' }),
    ),
  );
  const receipt = await app.get(DatabaseService).client.announcementReceipt.findUniqueOrThrow({
    where: { deviceMid_campaignId: { deviceMid: device, campaignId: campaign } },
  });
  expect(receipt.actionType).toBe('cancel');
  await app.close();
  app = await createApplication();
  expect((await app.get(AnnouncementService).query(device, 'en-US')).data.deliveries).toEqual([]);
  vi.mocked(PublicContentService.prototype.announcements).mockImplementation(() => ({
    schemaVersion: 1,
    deliveries: { 'en-US': [popup(second)], 'zh-CN': [] },
  }));
  expect(
    (await app.get(AnnouncementService).query(device, 'en-US')).data.deliveries[0]?.campaign_id,
  ).toBe(second);
});
