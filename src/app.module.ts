import { Module } from '@nestjs/common';
import { EnvironmentModule } from './common/environment.js';
import { DatabaseModule } from './database/index.js';
import { FeedbackModule } from './feedback/index.js';
import { HealthModule } from './health/index.js';
import { OauthModule } from './oauth/index.js';
import { PublicContentModule } from './public-content/index.js';
import { ReleasesModule } from './releases/index.js';
import { SharesModule } from './shares/index.js';

@Module({
  imports: [
    EnvironmentModule,
    DatabaseModule,
    PublicContentModule,
    OauthModule,
    SharesModule,
    FeedbackModule,
    ReleasesModule,
    HealthModule,
  ],
})
export class AppModule {}
