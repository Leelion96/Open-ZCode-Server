import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AnnouncementActionRequest,
  AnnouncementDelivery,
} from '../common/announcement-contracts.js';
import { PublicContentService } from '../public-content/index.js';
import { AnnouncementRepository } from './announcement.repository.js';

@Injectable()
export class AnnouncementService {
  constructor(
    @Inject(PublicContentService) private readonly content: PublicContentService,
    @Inject(AnnouncementRepository) private readonly repository: AnnouncementRepository,
  ) {}

  async query(deviceMid: string, language: 'zh-CN' | 'en-US') {
    const candidates = this.content.announcements().deliveries[language];
    const processed = new Set(
      candidates.length
        ? await this.repository.processed(
            deviceMid,
            candidates.map((item) => item.campaign_id),
          )
        : [],
    );
    const selected = new Map<string, AnnouncementDelivery>();
    for (const item of candidates) {
      if (processed.has(item.campaign_id)) continue;
      const current = selected.get(item.resource_position);
      if (!current || item.priority > current.priority) selected.set(item.resource_position, item);
    }
    return {
      code: 0 as const,
      data: { server_time: Date.now() / 1000, language, deliveries: [...selected.values()] },
    };
  }

  async report(deviceMid: string, input: AnnouncementActionRequest) {
    const content = this.content.announcements();
    if (
      !Object.values(content.deliveries).some((items) =>
        items.some((item) => item.campaign_id === input.campaign_id),
      )
    )
      throw new NotFoundException('Announcement not found');
    await this.repository.record(deviceMid, input.campaign_id, input.action_type);
    return { code: 0 as const };
  }
}
