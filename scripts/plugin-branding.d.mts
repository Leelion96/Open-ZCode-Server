export function cleanBrandProse(text: string): string;
export function cleanSkillMarkdown(text: string): string;
export function normalizePluginAuthor<T extends Record<string, unknown>>(
  document: T,
): T & { author: { name: string }; description?: string };
