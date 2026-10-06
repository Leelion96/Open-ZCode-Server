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
        config: { api: { type: string }; builtinModelIds: string[] };
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
  xai: ['grok-4.7'],
  openrouter: ['openai/gpt-6.1-sol', 'anthropic/claude-sonnet-5.5', 'z-ai/glm-5.3-flashx'],
  'opencode-zen-responses': ['gpt-6.1-sol', 'gpt-6-sol', 'gpt-6-luna', 'grok-4.7'],
  'opencode-zen-messages': ['claude-opus-5-5', 'claude-sonnet-5-5', 'qwen3.8-flash'],
  'opencode-zen-chat': ['deepseek-v4.1-flash', 'glm-5.3', 'glm-5.3-flash', 'mimo-v2.6-flash-free'],
} as const;

describe('official provider catalog revision 33', () => {
  it('publishes the verified model IDs through the existing templates', () => {
    expect(release.revision).toBe(33);
    expect(templates).toHaveLength(15);
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

  it('keeps new rules paired with models and avoids duplicate template identities', () => {
    for (const template of templates) {
      expect(new Set(template.config.builtinModelIds).size).toBe(
        template.config.builtinModelIds.length,
      );
    }
    const identities = rules.templateModelRules.map((rule) => `${rule.templateId}/${rule.modelId}`);
    expect(new Set(identities).size).toBe(identities.length);
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
