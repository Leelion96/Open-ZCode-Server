import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/index.js';
import { PublicContentModule } from '../public-content/index.js';
import { AnnouncementController } from './announcement.controller.js';
import { AnnouncementRepository } from './announcement.repository.js';
import { AnnouncementService } from './announcement.service.js';

@Module({
  imports: [DatabaseModule, PublicContentModule],
  controllers: [AnnouncementController],
  providers: [AnnouncementRepository, AnnouncementService],
})
export class AnnouncementsModule {}
