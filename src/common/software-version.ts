import { readFile } from 'node:fs/promises';
import { z } from 'zod';

const PackageVersionSchema = z.object({
  version: z
    .string()
    .max(128)
    .regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/),
});

export async function loadSoftwareVersion(): Promise<string> {
  try {
    const metadata: unknown = JSON.parse(
      await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
    );
    return PackageVersionSchema.parse(metadata).version;
  } catch {
    // 版本来自软件包而不是名称配置；诊断不回显文件内容。
    throw new Error('Unable to load software version');
  }
}
