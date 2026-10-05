import { afterEach, expect, it } from 'vitest';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
// @ts-expect-error standalone JavaScript architecture checker has no declaration file
import { checkArchitecture } from '../scripts/check-architecture.mjs';

const temporary: string[] = [];
afterEach(async () => {
  await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

it('checks the actual source tree', async () => {
  expect((await checkArchitecture(process.cwd())).errors).toEqual([]);
});

it('detects Controller IO, private cross-module imports, cycles and non-pinned dependencies', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'open-zcode-architecture-'));
  temporary.push(directory);
  await cp('src', resolve(directory, 'src'), {
    recursive: true,
    filter: (path) => !path.includes('/generated'),
  });
  for (const file of ['architecture-policy.json', 'package.json'])
    await cp(file, resolve(directory, file));
  const controller = resolve(directory, 'src/oauth/oauth.controller.ts');
  await writeFile(
    controller,
    "import { readFile } from 'node:fs/promises';\nimport { PublicContentService } from '../public-content/public-content.service.js';\n" +
      (await readFile(controller, 'utf8')),
  );
  await writeFile(resolve(directory, 'src/common/a.ts'), "import './b.js';\n");
  await writeFile(resolve(directory, 'src/common/b.ts'), "import './a.js';\n");
  const packageFile = resolve(directory, 'package.json');
  const packageJson = JSON.parse(await readFile(packageFile, 'utf8'));
  packageJson.dependencies.fastify = '^5.11.3';
  await writeFile(packageFile, JSON.stringify(packageJson));
  const result = await checkArchitecture(directory);
  expect(result.errors.join('\n')).toContain('Controller cannot access IO');
  expect(result.errors.join('\n')).toContain('Cross-module import');
  expect(result.errors.join('\n')).toContain('Import cycle');
  expect(result.errors.join('\n')).toContain('exact stable version');
});
