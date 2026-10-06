import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const slug = z.string().regex(/^[a-z0-9][a-z0-9._-]{0,127}$/);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const source = z
  .object({
    source: z.literal('url'),
    type: z.literal('zip'),
    url: z.string().min(1),
    sha256: digest,
    path: slug,
  })
  .strict();
export const PluginEntrySchema = z
  .object({
    name: slug,
    version: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._+-]{0,127}$/),
    author: z.object({ name: z.literal('Open-ZCode') }).strict(),
    description: z.string().optional(),
    category: z.string().optional(),
    source,
  })
  .passthrough();
export const MarketplaceSchema = z
  .object({
    name: z.literal('zcode-plugins-official'),
    description: z.string().optional(),
    featured: z.array(slug).optional(),
    plugins: z.array(PluginEntrySchema),
  })
  .strict();
export const AssetSchema = z
  .object({
    path: z.string().startsWith('/assets/plugins/'),
    file: z.string().min(1),
    sha256: digest,
    bytes: z.number().int().positive(),
    mime: z.string().regex(/^(application\/zip|image\/[a-z0-9.+-]+)$/),
  })
  .strict();
export const CatalogSourceSchema = z
  .object({
    schemaVersion: z.literal(1),
    marketplace: MarketplaceSchema,
    assets: z.array(AssetSchema),
  })
  .strict();
export type Marketplace = z.infer<typeof MarketplaceSchema>;
export type CatalogSource = z.infer<typeof CatalogSourceSchema>;
export class MarketplaceResponseDto extends createZodDto(MarketplaceSchema) {}
