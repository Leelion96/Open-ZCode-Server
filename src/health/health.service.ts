import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/index.js';
import { PublicContentService } from '../public-content/index.js';
import { PluginMarketplaceService } from '../plugin-marketplace/index.js';

@Injectable()
export class HealthService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(PublicContentService) private readonly content: PublicContentService,
    @Inject(PluginMarketplaceService) private readonly plugins: PluginMarketplaceService,
  ) {}

  async checks() {
    return {
      content: this.content.ready,
      plugins: this.plugins.ready,
      ...(await this.database.probe()),
    };
  }
}
