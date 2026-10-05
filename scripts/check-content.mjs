import { CONTENT_DIRECTORY } from '../dist/common/content-directory.js';
import { loadContentBundle } from '../dist/public-content/content-files.js';

try {
  const bundle = await loadContentBundle(CONTENT_DIRECTORY);
  console.log(
    `Content validated: one config, ${bundle.scenes.data.length} scenes, ${bundle.builtin.config.providerConfigRules.templateRules.length} provider templates, builtin revision ${bundle.builtin.revision}`,
  );
} catch {
  process.stderr.write('Content validation failed: check the three public JSON files.\n');
  process.exitCode = 1;
}
