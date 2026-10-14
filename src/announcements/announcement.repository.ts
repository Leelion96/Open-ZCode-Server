import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/index.js';

@Injectable()
export class AnnouncementRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async processed(deviceMid: string, campaignIds: string[]): Promise<string[]> {
    const records = await this.database.client.announcementReceipt.findMany({
      where: { deviceMid, campaignId: { in: campaignIds } },
      select: { campaignId: true },
    });
    return records.map((record) => record.campaignId);
  }

  async record(
    deviceMid: string,
    campaignId: string,
    actionType: 'confirm' | 'cancel',
  ): Promise<void> {
    // ON CONFLICT DO NOTHING 保留首次确认/关闭，重复或并发回执不覆盖原结果。
    await this.database.client.announcementReceipt.createMany({
      data: [{ deviceMid, campaignId, actionType }],
      skipDuplicates: true,
    });
  }
}
