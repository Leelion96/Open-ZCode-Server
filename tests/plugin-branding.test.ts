import { describe, expect, it } from 'vitest';
import { cleanSkillMarkdown, normalizePluginAuthor } from '../scripts/plugin-branding.mjs';

describe('plugin release branding', () => {
  it('removes brand modifiers and retains runtime references and copyright', () => {
    const text =
      'ZCode plugins\n在 ZCode 中创建文件。\nUse ZCode to configure tools.\n`ZCODE_PLUGIN_ROOT`\n```sh\nzcode plugins list\n```\n::zcode-file-citation{path="/tmp/file"}\nCopyright 2026 Z.ai\n';
    const result = cleanSkillMarkdown(text);
    expect(result).toContain('plugins');
    expect(result).toContain('在 应用 中创建文件。');
    expect(result).toContain('Use the app to configure tools.');
    expect(result).toContain('ZCODE_PLUGIN_ROOT');
    expect(result).toContain('zcode plugins list');
    expect(result).toContain('::zcode-file-citation');
    expect(result).toContain('Copyright 2026 Z.ai');
  });
  it('uses the publisher as author without changing plugin identity', () => {
    const result = normalizePluginAuthor({
      name: 'zcode-guide',
      author: { name: 'Original', url: 'https://example.com' },
      description: 'ZCode plugin guide',
    });
    expect(result.author).toEqual({ name: 'Open-ZCode' });
    expect(result.name).toBe('zcode-guide');
    expect(result.description).toBe('plugin guide');
  });
});
