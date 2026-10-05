import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/index.js';
import { PublicContentService } from '../public-content/index.js';

@Injectable()
export class HealthService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(PublicContentService) private readonly content: PublicContentService,
  ) {}

  async checks() {
    return { content: this.content.ready, ...(await this.database.probe()) };
  }
}
