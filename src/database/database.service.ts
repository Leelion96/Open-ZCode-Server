import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { EnvironmentService } from '../common/environment.js';
import { PrismaClient } from '../generated/prisma/client.js';
import { DATABASE_SCHEMA_VERSION } from './schema-version.js';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly client: PrismaClient;
  constructor(@Inject(EnvironmentService) environment: EnvironmentService) {
    const adapter = new PrismaPg({
      connectionString: environment.value.databaseUrl,
      max: 4,
      connectionTimeoutMillis: 2000,
      query_timeout: 2000,
    });
    this.client = new PrismaClient({ adapter, log: [] });
  }

  async probe(): Promise<{ database: boolean; schema: boolean }> {
    try {
      await this.client.$queryRaw`SELECT 1`;
    } catch {
      return { database: false, schema: false };
    }
    try {
      const marker = await this.client.serverMetadata.findUnique({
        where: { key: 'schema-version' },
      });
      return { database: true, schema: marker?.value === DATABASE_SCHEMA_VERSION };
    } catch {
      return { database: true, schema: false };
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
