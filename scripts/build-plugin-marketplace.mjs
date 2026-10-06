import { resolve } from 'node:path';
import { buildPluginArtifacts } from './plugin-package-build.mjs';
const catalog = await buildPluginArtifacts(resolve(import.meta.dirname, '..'));
console.log(`Built ${catalog.marketplace.plugins.length} plugin packages`);
