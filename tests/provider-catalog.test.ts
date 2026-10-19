import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

interface ModelConfig {
  enabled?: boolean;
  properties?: {
    contextWindow?: number;
    supportsJsonSchemaOutput?: boolean;
    inputFormat?: { supportsImage?: boolean; supportsAudio?: boolean; supportsVideo?: boolean };
  };
  optionSpecs?: {
    reasoningLevel?: { values?: string[]; map?: string };
    maxOutputTokens?: { max?: number };
  };
}

interface CatalogRule {
  modelMatch: string;
  apiTypeMatch?: string;
  baseUrlMatch?: string;
  config: ModelConfig;
}

const release = JSON.parse(await readFile('data/builtin.json', 'utf8')) as {
  revision: number;
  config: {
    providerConfigRules: {
      templateRules: {
        templateId: string;
        templateNameMap: Record<string, string>;
        config: {
          access: { type: string; apiKeyManagementUrl: string };
          api: { type: string; baseUrl: string };
          builtinModelIds: string[];
        };
      }[];
    };
    modelConfigRules: {
      modelRules: CatalogRule[];
      modelApiRules: CatalogRule[];
      providerSiteRules: CatalogRule[];
      templateModelRules: { templateId: string; modelId: string; config: ModelConfig }[];
    };
  };
};
const templates = release.config.providerConfigRules.templateRules;
const rules = release.config.modelConfigRules;
const latest = {
  openai: ['gpt-6.1-sol', 'gpt-6-sol', 'gpt-6-luna', 'gpt-5.5', 'gpt-5.5-pro'],
  anthropic: ['claude-opus-5-5', 'claude-sonnet-5-5'],
  'zai-standard-api': ['GLM-5.2', 'GLM-5.3-FlashX'],
  'bigmodel-standard-api': ['GLM-5.2', 'GLM-5.3-FlashX'],
  'xiaomi-mimo': ['mimo-v2.6-pro', 'mimo-v2.6-flash', 'mimo-v2.6-pro-ultraspeed'],
  'xiaomi-mimo-token-plan': ['mimo-v2.6-pro', 'mimo-v2.6-flash'],
  xai: ['grok-4.7'],
  openrouter: ['openai/gpt-6.1-sol', 'anthropic/claude-sonnet-5.5', 'z-ai/glm-5.3-flashx'],
  'opencode-zen-responses': ['gpt-6.1-sol', 'gpt-6-sol', 'gpt-6-luna', 'grok-4.7'],
  'opencode-zen-messages': ['claude-opus-5-5', 'claude-sonnet-5-5', 'qwen3.8-flash'],
  'opencode-zen-chat': ['deepseek-v4.1-flash', 'glm-5.3', 'glm-5.3-flash', 'mimo-v2.6-flash-free'],
} as const;

describe('merged provider catalog revision 35', () => {
  it('publishes the verified model IDs through the existing templates', () => {
    // 客户端随包34已发布不同内容，本次远端目录必须递增到35才能正常应用。
    expect(release.revision).toBe(35);
    expect(templates).toHaveLength(16);
    for (const [templateId, modelIds] of Object.entries(latest)) {
      const template = templates.find((item) => item.templateId === templateId);
      expect(template?.config.builtinModelIds).toEqual(expect.arrayContaining([...modelIds]));
      for (const modelId of modelIds) {
        expect(
          rules.templateModelRules.find(
            (rule) => rule.templateId === templateId && rule.modelId === modelId,
          )?.config.enabled,
        ).toBe(true);
      }
    }
  });

  it('adds the separate MiMo Token Plan without replacing ordinary API models', () => {
    const apiIndex = templates.findIndex((item) => item.templateId === 'xiaomi-mimo');
    const api = templates[apiIndex]!;
    const plan = templates[apiIndex + 1]!;
    expect(api.templateNameMap).toEqual({
      'zh-CN': 'Xiaomi MiMo API',
      'en-US': 'Xiaomi MiMo API',
    });
    expect(api.config.api.baseUrl).toBe('https://api.xiaomimimo.com/anthropic');
    expect(api.config.builtinModelIds).toEqual([
      'mimo-v2.6-pro',
      'mimo-v2.6-pro-ultraspeed',
      'mimo-v2.6-flash',
      'mimo-v2.5-pro',
      'mimo-v2.5',
    ]);
    expect(plan.templateId).toBe('xiaomi-mimo-token-plan');
    expect(plan.config.access).toEqual({
      type: 'api-key',
      apiKeyManagementUrl: 'https://platform.xiaomimimo.com/',
    });
    expect(plan.config.api).toEqual({
      type: 'anthropic-messages',
      baseUrl: 'https://token-plan-cn.xiaomimimo.com/anthropic',
    });
    expect(plan.config.builtinModelIds).toEqual(['mimo-v2.6-pro', 'mimo-v2.6-flash']);
  });

  it('adopts upstream generic limits while retaining the unknown-model reasoning policy', () => {
    const fallback = rules.modelRules.find((rule) => rule.modelMatch === '.*')!;
    expect(fallback.config.properties?.contextWindow).toBe(1000000);
    expect(fallback.config.optionSpecs?.maxOutputTokens?.max).toBe(128000);
    expect(fallback.config.optionSpecs?.reasoningLevel?.values).toEqual(['disabled']);
  });

  it('keeps new rules paired with models and avoids duplicate template identities', () => {
    expect(rules.templateModelRules).toHaveLength(265);
    expect(
      templates.reduce((count, template) => count + template.config.builtinModelIds.length, 0),
    ).toBe(265);
    for (const template of templates) {
      expect(new Set(template.config.builtinModelIds).size).toBe(
        template.config.builtinModelIds.length,
      );
    }
    const identities = rules.templateModelRules.map((rule) => `${rule.templateId}/${rule.modelId}`);
    expect(new Set(identities).size).toBe(identities.length);
    for (const rule of rules.templateModelRules) {
      expect(
        templates.find((template) => template.templateId === rule.templateId)?.config
          .builtinModelIds,
      ).toContain(rule.modelId);
    }
    for (const [templateId, modelIds] of Object.entries(latest)) {
      for (const modelId of modelIds) {
        expect(identities).toContain(`${templateId}/${modelId}`);
      }
    }
    const router = templates.find((item) => item.templateId === 'openrouter')!;
    for (const retired of [
      'openai/gpt-5.6',
      'qwen/qwen3.8-max',
      'qwen/qwen3-vl-plus',
      'qwen/qwen3-vl-flash',
    ]) {
      expect(router.config.builtinModelIds).not.toContain(retired);
      expect(identities).not.toContain(`openrouter/${retired}`);
    }
    expect(
      templates.find((item) => item.templateId === 'openai')?.config.builtinModelIds,
    ).not.toContain('gpt-5.6');
    expect(
      templates.find((item) => item.templateId === 'minimax')?.config.builtinModelIds,
    ).not.toContain('MiniMax-M3.1-Flash-Preview');
    for (const templateId of [
      'bigmodel-api',
      'zai-api',
      'opencode-go-chat',
      'opencode-go-messages',
      'opencode-go-responses',
    ]) {
      expect(templates.some((template) => template.templateId === templateId)).toBe(false);
    }
  });

  it('separates GPT-6.1 reasoning from Sol/Luna and preserves Responses routing', () => {
    for (const rule of [...rules.modelRules, ...rules.modelApiRules, ...rules.providerSiteRules]) {
      expect(() => new RegExp(`^(?:${rule.modelMatch})$`, 'i')).not.toThrow();
    }
    for (const modelId of ['gpt-6.1-sol', 'gpt-6-sol', 'gpt-6-luna']) {
      const modelRule = rules.modelRules.findLast((rule) =>
        new RegExp(`^(?:${rule.modelMatch})$`, 'i').test(modelId),
      )!;
      expect(modelRule.config.properties?.contextWindow).toBe(1050000);
      expect(modelRule.config.optionSpecs?.maxOutputTokens?.max).toBe(128000);
      expect(modelRule.config.optionSpecs?.reasoningLevel?.values).toContain('max');
      expect(modelRule.config.optionSpecs?.reasoningLevel?.values).not.toContain('minimal');
      expect(modelRule.config.optionSpecs?.reasoningLevel?.values?.includes('none')).toBe(
        modelId !== 'gpt-6.1-sol',
      );
    }
    expect(templates.find((item) => item.templateId === 'openai')?.config.api.type).toBe(
      'openai-responses',
    );
    const mapping = rules.providerSiteRules.findLast(
      (rule) =>
        rule.apiTypeMatch === 'anthropic-messages' &&
        new RegExp(`^(?:${rule.modelMatch})$`, 'i').test('openai/gpt-6-luna'),
    )?.config.optionSpecs?.reasoningLevel?.map;
    // OpenRouter的Messages适配必须把none映射为关闭思考，不能透传原厂Responses字段。
    expect(mapping).toContain('disabled');
    expect(mapping).toContain('output_config');
    expect(mapping).not.toContain('"reasoning"');
  });

  it('publishes FlashX visual capabilities and site-specific token limits', () => {
    const flashx = rules.modelRules.findLast((rule) =>
      new RegExp(`^(?:${rule.modelMatch})$`, 'i').test('GLM-5.3-FlashX'),
    )!;
    expect(flashx.config.properties?.inputFormat?.supportsImage).toBe(true);
    expect(flashx.config.properties?.inputFormat?.supportsVideo).toBe(true);
    const omni = rules.modelRules.findLast((rule) =>
      new RegExp(`^(?:${rule.modelMatch})$`, 'i').test('qwen3.8-omni-flash'),
    )!;
    expect(omni.config.properties?.contextWindow).toBe(1000000);
    expect(omni.config.optionSpecs?.maxOutputTokens?.max).toBe(131072);
    const routerGrok = rules.templateModelRules.find(
      (rule) => rule.templateId === 'openrouter' && rule.modelId === 'x-ai/grok-4.7',
    )!;
    expect(routerGrok.config.properties?.contextWindow).toBe(500000);
    expect(routerGrok.config.optionSpecs?.maxOutputTokens?.max).toBe(450000);
  });
});
