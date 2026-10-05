import { Global, Inject, Injectable, Module } from '@nestjs/common';
import { z } from 'zod';

export const ENVIRONMENT = Symbol('ENVIRONMENT');
const booleanEnv = z.enum(['true', 'false']).transform((value) => value === 'true');
const EnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  PUBLIC_ORIGIN: z
    .url()
    .default('https://localhost:8443')
    .refine((value) => {
      const url = new URL(value);
      return (
        ['http:', 'https:'].includes(url.protocol) &&
        !url.username &&
        !url.password &&
        url.pathname === '/' &&
        !url.search &&
        !url.hash
      );
    }, 'PUBLIC_ORIGIN must be an HTTP(S) origin without credentials/path/query/fragment'),
  DATABASE_URL: z
    .string()
    .min(1)
    .refine((value) => {
      try {
        return ['postgres:', 'postgresql:'].includes(new URL(value).protocol);
      } catch {
        return false;
      }
    }, 'DATABASE_URL must be a PostgreSQL URL'),
  OPENAPI_ENABLED: booleanEnv.default(true),
  CORS_ORIGINS: z.string().default(''),
  LOG_LEVEL: z.enum(['silent', 'error', 'warn', 'info', 'debug']).default('info'),
  BODY_LIMIT_BYTES: z.coerce.number().int().min(1024).max(10485760).default(1048576),
});

export type Environment = Readonly<{
  nodeEnv: string;
  host: string;
  port: number;
  publicOrigin: string;
  databaseUrl: string;
  openapiEnabled: boolean;
  corsOrigins: string[];
  logLevel: 'silent' | 'error' | 'warn' | 'info' | 'debug';
  bodyLimitBytes: number;
}>;

export function loadEnvironment(input: NodeJS.ProcessEnv = process.env): Environment {
  const parsed = EnvironmentSchema.safeParse(input);
  // 凭据可能存在于无效环境值；只报告字段名，绝不输出 schema 输入或数据库 URL。
  if (!parsed.success)
    throw new Error(
      `Invalid environment fields: ${[...new Set(parsed.error.issues.map((issue) => issue.path[0]))].join(', ')}`,
    );
  const value = parsed.data;
  const corsOrigins = value.CORS_ORIGINS.split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  for (const origin of corsOrigins) {
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin)
      throw new Error('Invalid CORS_ORIGINS');
  }
  return Object.freeze({
    nodeEnv: value.NODE_ENV,
    host: value.HOST,
    port: value.PORT,
    publicOrigin: new URL(value.PUBLIC_ORIGIN).origin,
    databaseUrl: value.DATABASE_URL,
    openapiEnabled: value.OPENAPI_ENABLED,
    corsOrigins,
    logLevel: value.LOG_LEVEL,
    bodyLimitBytes: value.BODY_LIMIT_BYTES,
  });
}

@Injectable()
export class EnvironmentService {
  constructor(@Inject(ENVIRONMENT) readonly value: Environment) {}
}

@Global()
@Module({
  providers: [{ provide: ENVIRONMENT, useFactory: () => loadEnvironment() }, EnvironmentService],
  exports: [EnvironmentService],
})
export class EnvironmentModule {}
