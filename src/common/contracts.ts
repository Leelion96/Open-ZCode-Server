import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ErrorEnvelopeSchema = z
  .object({
    code: z
      .number()
      .int()
      .refine((value) => value !== 0),
    msg: z.string(),
    data: z.null(),
    feature: z.string().optional(),
  })
  .passthrough();
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
export class ErrorResponseDto extends createZodDto(ErrorEnvelopeSchema) {}

export const ClientConfigQuerySchema = z
  .object({
    app_version: z.string().max(64).optional(),
    platform: z.string().max(64).optional(),
  })
  .passthrough();
export type ClientConfigQuery = z.infer<typeof ClientConfigQuerySchema>;
export class ClientConfigQueryDto extends createZodDto(ClientConfigQuerySchema) {}

export const ClientConfigSchema = z
  .object({
    code: z.literal(0),
    msg: z.string(),
    data: z.object({ configs: z.record(z.string(), z.unknown()) }).passthrough(),
    logid: z.string().optional(),
  })
  .passthrough();
export type ClientConfigEnvelope = z.infer<typeof ClientConfigSchema>;
export class ClientConfigResponseDto extends createZodDto(ClientConfigSchema) {}

const LocaleMapSchema = z.record(z.string(), z.string());
export const SceneItemSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    contents: LocaleMapSchema,
    labels: LocaleMapSchema,
    descs: LocaleMapSchema.optional(),
    on_finish: z.string().nullable().optional(),
    img: z.string().nullable().optional(),
    imgs: z
      .object({ cn: z.string().optional(), en: z.string().optional() })
      .passthrough()
      .optional(),
    share_urls: LocaleMapSchema.optional(),
    defaults: z.record(z.string(), z.array(z.string())).optional(),
  })
  .passthrough();
export const SceneOptionSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    contents: LocaleMapSchema,
    prompts: LocaleMapSchema.optional(),
    items: z.array(SceneItemSchema).optional(),
    refer: z.string().optional(),
    cascades: z.record(z.string(), z.array(SceneItemSchema)).optional(),
    templates: LocaleMapSchema.optional(),
  })
  .passthrough();
export const SceneSchema = z
  .object({
    namespace: z.string(),
    scene: z.string(),
    options: z.record(z.string(), SceneOptionSchema),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
  })
  .passthrough();
export const ScenesSchema = z
  .object({
    code: z.literal(0),
    msg: z.string(),
    data: z.array(SceneSchema),
    logid: z.string().optional(),
  })
  .passthrough();
export type ScenesEnvelope = z.infer<typeof ScenesSchema>;
export class ScenesResponseDto extends createZodDto(ScenesSchema) {}

export const BuiltinReleaseSchema = z
  .object({
    schemaVersion: z.literal(1),
    revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    config: z
      .object({
        providerConfigRules: z
          .object({
            templateRules: z.array(z.record(z.string(), z.unknown())),
            providerRules: z.array(z.record(z.string(), z.unknown())),
          })
          .strict(),
        modelConfigRules: z.unknown(),
      })
      .strict(),
  })
  .strict();
export type BuiltinRelease = z.infer<typeof BuiltinReleaseSchema>;
export class BuiltinReleaseResponseDto extends createZodDto(BuiltinReleaseSchema) {}

export const HealthSchema = z.object({
  status: z.enum(['ok', 'unavailable']),
  checks: z.object({ content: z.boolean(), database: z.boolean(), schema: z.boolean() }),
});
export class HealthResponseDto extends createZodDto(HealthSchema) {}
