import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const slug = z.string().regex(/^[a-z0-9][a-z0-9._-]{0,127}$/);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const source = z
  .object({
    source: z.literal('url'),
    type: z.literal('zip'),
    url: z.string().url(),
    sha256: digest,
    path: slug,
  })
  .passthrough();
export const PluginEntrySchema = z
  .object({
    name: slug,
    version: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._+-]{0,127}$/),
    author: z.object({ name: z.string().min(1), url: z.string().url().optional() }).passthrough(),
    description: z.string().optional(),
    category: z.string().optional(),
    source,
  })
  .passthrough();
export const MarketplaceSchema = z
  .object({
    name: z.literal('zcode-plugins-official'),
    description: z.string().optional(),
    plugins: z.array(PluginEntrySchema),
  })
  .passthrough();
export type Marketplace = z.infer<typeof MarketplaceSchema>;
export class MarketplaceResponseDto extends createZodDto(MarketplaceSchema) {}
