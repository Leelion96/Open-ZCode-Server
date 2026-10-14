import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const id = z.string().trim().min(1).max(128);
const text = z.object({
  format: z.enum(['plaintext', 'html', 'markdown']),
  content: z.string().max(20_000),
});
const url = z
  .string()
  .max(4096)
  .refine((value) => {
    if (value.startsWith('/assets/announcements/'))
      return (
        !value.includes('..') &&
        !value.includes('\\') &&
        !value.includes('?') &&
        !value.includes('#')
      );
    try {
      const parsed = new URL(value);
      return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password;
    } catch {
      return false;
    }
  }, 'Announcement URL must be HTTP(S) or a local announcement asset');
const navigation = z.discriminatedUnion('page', [
  z
    .object({
      page: z.literal('settings'),
      section: z
        .enum([
          'general',
          'appearance',
          'models',
          'browser',
          'computer_use',
          'memory',
          'subagents',
          'plugins',
          'mcp',
          'skills',
          'commands',
          'hooks',
          'usage',
        ])
        .optional(),
      provider_id: id.optional(),
    })
    .strict()
    .refine(
      (args) =>
        args.provider_id === undefined ||
        (args.section === 'models' && !args.provider_id.startsWith('account:')),
    ),
  z
    .object({
      page: z.literal('plugin_marketplace'),
      plugin_id: id.regex(/^[^@\s]+@[^@\s]+$/u).optional(),
    })
    .strict(),
]);
export const AnnouncementActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('close') }),
  z.object({
    type: z.literal('open_url'),
    args: z.object({ url: url.refine((value) => !value.startsWith('/')) }),
  }),
  z.object({
    type: z.literal('copy_text'),
    args: z
      .object({
        text: z
          .string()
          .max(20_000)
          .refine((value) => value.trim().length > 0),
      })
      .strict(),
  }),
  z.object({ type: z.literal('navigate'), args: navigation }),
]);
export const AnnouncementAssetSchema = z.object({
  src: url,
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
});
const args = z
  .record(z.string(), z.unknown())
  .refine((value) => JSON.stringify(value).length <= 64_000)
  .optional();
const theme = z
  .object({
    variant: z
      .enum(['', 'default', 'outline', 'secondary', 'ghost', 'destructive', 'warning', 'link'])
      .optional()
      .transform((value) => value || 'default'),
    class: z.string().max(512).optional(),
    style: z.string().max(512).optional(),
  })
  .nullish();
const button = z.object({ text, action: AnnouncementActionSchema, theme });
export const AnnouncementVisualSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('image'),
    image: z.object({ default: AnnouncementAssetSchema, dark: AnnouncementAssetSchema.nullish() }),
    args,
  }),
  z.object({
    type: z.literal('video'),
    video: z.object({ src: AnnouncementAssetSchema, fallback: AnnouncementAssetSchema }),
    args,
  }),
  z.object({
    type: z.literal('bundle'),
    bundle: z.object({
      bundle: AnnouncementAssetSchema,
      entry: z
        .string()
        .min(1)
        .max(240)
        .refine(
          (value) =>
            !value.includes('\\') &&
            value.split('/').every((part) => part && part !== '.' && part !== '..'),
        ),
      fallback: AnnouncementAssetSchema.nullish(),
    }),
    args,
  }),
]);
const popup = z.object({
  layout: z.enum(['', 'v1']).optional(),
  title: text,
  description: text,
  hero: AnnouncementVisualSchema.nullish(),
  buttons: z.array(button).max(4),
});
const banner = z
  .object({
    layout: z.enum(['', 'v1']).optional(),
    background: AnnouncementVisualSchema,
    buttons: z
      .array(
        button.omit({ theme: true }).extend({
          text: text.extend({
            format: z
              .enum(['', 'plaintext', 'html', 'markdown'])
              .transform((value) => value || 'plaintext'),
          }),
        }),
      )
      .max(2),
    success_popup: popup.nullish(),
  })
  .refine(
    (value) =>
      value.buttons.filter((b) => b.action.type === 'close').length <= 1 &&
      value.buttons.filter((b) => b.action.type !== 'close').length <= 1,
  );
const base = { campaign_id: id, priority: z.number().int().min(0).max(100) };
export const AnnouncementDeliverySchema = z.discriminatedUnion('resource_position', [
  z.object({ ...base, resource_position: z.literal('banner'), banner }),
  z.object({ ...base, resource_position: z.literal('popup'), popup }),
]);
export const AnnouncementContentSchema = z
  .object({
    schemaVersion: z.literal(1),
    deliveries: z
      .object({
        'zh-CN': z.array(AnnouncementDeliverySchema).max(32),
        'en-US': z.array(AnnouncementDeliverySchema).max(32),
      })
      .strict(),
  })
  .strict();
export type AnnouncementContent = z.infer<typeof AnnouncementContentSchema>;
export type AnnouncementDelivery = z.infer<typeof AnnouncementDeliverySchema>;
export const AnnouncementHeadersSchema = z.object({
  'x-device-mid': z.uuid(),
  'x-client-language': z.enum(['zh-CN', 'en-US']).default('en-US'),
});
export const AnnouncementQuerySchema = z
  .object({ seq: z.coerce.number().int().nonnegative().optional() })
  .passthrough();
export class AnnouncementQueryDto extends createZodDto(AnnouncementQuerySchema) {}
export const AnnouncementActionRequestSchema = z
  .object({ campaign_id: id, action_type: z.enum(['confirm', 'cancel']) })
  .strict();
export type AnnouncementActionRequest = z.infer<typeof AnnouncementActionRequestSchema>;
export class AnnouncementActionRequestDto extends createZodDto(AnnouncementActionRequestSchema) {}
export const AnnouncementResponseSchema = z.object({
  code: z.literal(0),
  data: z.object({
    server_time: z.number().finite(),
    language: z.enum(['zh-CN', 'en-US']),
    deliveries: z.array(AnnouncementDeliverySchema).max(2),
  }),
});
export class AnnouncementResponseDto extends createZodDto(AnnouncementResponseSchema) {}
export class AnnouncementActionResponseDto extends createZodDto(z.object({ code: z.literal(0) })) {}
