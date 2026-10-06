import { loadCatalog } from '../dist/plugin-marketplace/catalog-loader.js';
import { resolve } from 'node:path';
import { CONTENT_DIRECTORY } from '../dist/common/content-directory.js';
import { loadContentBundle } from '../dist/public-content/content-files.js';

try {
  const bundle = await loadContentBundle(CONTENT_DIRECTORY);
  await loadCatalog(resolve('data/plugins/catalog.json'), resolve('plugin-artifacts'));
  console.log(
    `Content validated: one config, ${bundle.scenes.data.length} scenes, ${bundle.builtin.config.providerConfigRules.templateRules.length} provider templates, builtin revision ${bundle.builtin.revision}`,
  );
} catch {
  process.stderr.write('Content validation failed: check public JSON and plugin artifacts.\n');
  process.exitCode = 1;
}
