import { afterAll, beforeAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../dist/database/index.js';
import { EnvironmentService, loadEnvironment } from '../dist/common/environment.js';
import { createApplication } from '../dist/app.js';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { HealthWire } from './wire.js';

let database: DatabaseService;
let app: NestFastifyApplication;
let origin: string;
const key = `integration-${randomUUID()}`;

beforeAll(async () => {
  if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL is required for real PostgreSQL integration tests');
  process.env.LOG_LEVEL = 'silent';
  database = new DatabaseService(new EnvironmentService(loadEnvironment()));
  app = await createApplication();
  await app.listen(0, '127.0.0.1');
  origin = await app.getUrl();
});

afterAll(async () => {
  if (database) {
    await database.client.serverMetadata.deleteMany({ where: { key } });
    await database.onModuleDestroy();
  }
  await app?.close();
});

it('verifies deployed migration and read/write/rollback on actual PostgreSQL', async () => {
  expect(await database.probe()).toEqual({ database: true, schema: true });
  await database.client.serverMetadata.create({ data: { key, value: 'before' } });
  await expect(
    database.client.$transaction(async (transaction) => {
      await transaction.serverMetadata.update({ where: { key }, data: { value: 'after' } });
      throw new Error('rollback fixture');
    }),
  ).rejects.toThrow('rollback fixture');
  expect((await database.client.serverMetadata.findUniqueOrThrow({ where: { key } })).value).toBe(
    'before',
  );
  const response = await fetch(origin + '/health/ready');
  expect(response.status).toBe(200);
  expect(HealthWire.parse(await response.json()).checks).toEqual({
    content: true,
    database: true,
    schema: true,
  });
});
