const brand = /\b(?:Open[- ]?ZCode|Z[- ]?Code)\b/gi;

export function cleanBrandProse(text) {
  return text
    .replace(/\b(?:Open[- ]?ZCode|Z[- ]?Code)['’]s\b/gi, "the app's")
    .replace(/\b(?:for|with)\s+(?:Open[- ]?ZCode|Z[- ]?Code)\b/gi, '')
    .replace(
      /\b(?:Open[- ]?ZCode|Z[- ]?Code)[ -]+(?=plugins?\b|skills?\b|commands?\b|configuration\b|manifest\b)/gi,
      '',
    )
    .replace(/(?:Open[- ]?ZCode|Z[- ]?Code)\s*(?=插件|技能|配置指南|使用指南|工作流)/gi, '')
    .replace(brand, (match, offset, source) =>
      /[\u3400-\u9fff]/u.test(source) ? '应用' : offset === 0 ? 'The app' : 'the app',
    )
    .replace(/[ \t]{2,}/g, ' ');
}

export function cleanSkillMarkdown(text) {
  // 新应用采用独立资料目录；插件格式目录 .zcode-plugin 属于跨客户端兼容契约。
  text = text.replace(/\.zcode(?!-plugin)/g, '.open-zcode');
  text = text.replace(/\bzcode-configuration-guide\b/g, 'configuration-guide');
  let fenced = false;
  return text
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/u.test(line)) {
        fenced = !fenced;
        return line;
      }
      if (fenced || /copyright|all rights reserved|spdx-license/i.test(line)) return line;
      if (/^(?:author|authors):/i.test(line)) return 'author: Open-ZCode';
      if (/^(?:name|license|version):/i.test(line)) return line;
      // 技术代码片段、URL 与路径是兼容契约，清理展示词时保持这些字节。
      return line
        .split(
          /(`[^`]+`|https?:\/\/\S+|\bZCODE_[A-Z0-9_]+\b|\S*\.zcode(?:-plugin)?\S*|zcode:\/\/\S+|::zcode-[\w-]+(?:\{[^\n]*\})?|\bzcode[-_/][\w./-]+)/g,
        )
        .map((part, index) => (index % 2 ? part : cleanBrandProse(part)))
        .join('');
    })
    .join('\n');
}

export function normalizePluginAuthor(document) {
  if (typeof document !== 'object' || document === null || Array.isArray(document)) return document;
  const result = { ...document, author: { name: 'Open-ZCode' } };
  if ('authors' in result) result.authors = ['Open-ZCode'];
  if (typeof result.description === 'string')
    result.description = cleanBrandProse(result.description);
  if (result.description_i18n && typeof result.description_i18n === 'object') {
    result.description_i18n = Object.fromEntries(
      Object.entries(result.description_i18n).map(([key, value]) => [
        key,
        typeof value === 'string' ? cleanBrandProse(value) : value,
      ]),
    );
  }
  return result;
}
