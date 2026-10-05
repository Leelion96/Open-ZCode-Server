import { readFile, stat } from 'node:fs/promises';
import { z } from 'zod';

const expectedStatus = { implemented: 200, stub: 501, absent: 404 } as const;
const EndpointSchema = z
  .object({
    feature: z.string().min(1),
    state: z.enum(['implemented', 'stub', 'absent']),
    method: z.enum(['GET', 'POST']),
    path: z.string().regex(/^\/api\/v1\/[A-Za-z0-9_/{\}.-]+$/),
    status: z.number().int(),
    summary: z.string().min(1),
  })
  .strict()
  .refine(
    (endpoint) => endpoint.status === expectedStatus[endpoint.state],
    'Inventory state/status mismatch',
  );

export const ApiInventorySchema = z
  .object({
    schemaVersion: z.literal(1),
    sourceCheckout: z.string(),
    endpoints: z.array(EndpointSchema).min(1),
  })
  .strict()
  .superRefine((inventory, context) => {
    const keys = new Set<string>();
    for (const [index, endpoint] of inventory.endpoints.entries()) {
      const key = `${endpoint.method} ${endpoint.path}`;
      if (keys.has(key))
        context.addIssue({
          code: 'custom',
          message: 'Duplicate inventory operation',
          path: ['endpoints', index],
        });
      keys.add(key);
    }
  });
export type ApiInventory = z.infer<typeof ApiInventorySchema>;

export async function loadApiInventory(): Promise<ApiInventory> {
  const file = new URL('../../specs/api-inventory.json', import.meta.url);
  if ((await stat(file)).size > 1_000_000) throw new Error('API inventory exceeds size limit');
  return ApiInventorySchema.parse(JSON.parse(await readFile(file, 'utf8')));
}
