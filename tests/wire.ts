import { z } from 'zod';

// 测试按客户端消费字段独立验证 HTTP 结果，不导入生产响应 schema 来重复实现。
export const EnvelopeWire = z
  .object({
    code: z.number(),
    msg: z.string(),
    data: z.unknown(),
    feature: z.string().optional(),
    token: z.unknown().optional(),
    version: z.unknown().optional(),
  })
  .passthrough();

export const ConfigWire = z
  .object({
    code: z.literal(0),
    logid: z.string(),
    data: z
      .object({
        configs: z
          .object({
            codingPlanStaticProducts: z.unknown().optional(),
            pluginStoreOrder: z.unknown().optional(),
            dynamicWorkflow: z.unknown().optional(),
            offPeak: z.object({ enable_offpeak_task: z.boolean() }).passthrough(),
            startPlanPreview: z.unknown(),
            forceUpdate: z.unknown(),
            captcha: z.object({ enabled: z.boolean() }).passthrough(),
            feedbackUrl: z
              .object({ community_urls: z.record(z.string(), z.string()) })
              .passthrough(),
            builtin_provider_config_json: z.string().optional(),
          })
          .passthrough(),
      })
      .passthrough(),
  })
  .passthrough();

export const ScenesWire = z
  .object({
    code: z.literal(0),
    data: z.array(
      z
        .object({
          scene: z.string(),
          options: z.record(
            z.string(),
            z
              .object({
                items: z
                  .array(
                    z
                      .object({
                        id: z.string(),
                        contents: z.record(z.string(), z.string()),
                        labels: z.record(z.string(), z.string()),
                        defaults: z.record(z.string(), z.array(z.string())).optional(),
                      })
                      .passthrough(),
                  )
                  .optional(),
              })
              .passthrough(),
          ),
        })
        .passthrough(),
    ),
  })
  .passthrough();

export const BuiltinWire = z.object({
  schemaVersion: z.literal(1),
  revision: z.number().int().nonnegative(),
  config: z.object({
    providerConfigRules: z.object({
      templateRules: z.array(z.object({ templateId: z.string() }).passthrough()),
      providerRules: z.array(z.unknown()),
    }),
    modelConfigRules: z
      .object({
        modelRules: z.array(z.unknown()),
        builtinProviderModelRules: z.array(z.unknown()),
      })
      .passthrough(),
  }),
});

export const OpenApiWire = z
  .object({
    paths: z.record(
      z.string(),
      z.record(
        z.string(),
        z
          .object({
            responses: z.record(z.string(), z.unknown()),
            parameters: z
              .array(
                z
                  .object({ name: z.string(), in: z.string(), required: z.boolean().optional() })
                  .passthrough(),
              )
              .optional(),
          })
          .passthrough(),
      ),
    ),
    components: z.object({ schemas: z.record(z.string(), z.unknown()) }),
  })
  .passthrough();

export const HealthWire = z
  .object({
    checks: z.object({ content: z.boolean(), database: z.boolean(), schema: z.boolean() }),
  })
  .passthrough();
