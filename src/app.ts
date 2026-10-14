import 'reflect-metadata';
import helmet from '@fastify/helmet';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { FastifyRequest } from 'fastify';
import { cleanupOpenApiDoc, ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module.js';
import { ApiExceptionFilter } from './common/api-error.js';
import { loadEnvironment } from './common/environment.js';
import { TraceInterceptor } from './common/trace.interceptor.js';
import { loadSoftwareVersion } from './common/software-version.js';
import { buildExplorerDocument, EXPLORER_CSS, loadApiInventory } from './documentation/index.js';

export async function createApplication(): Promise<NestFastifyApplication> {
  const env = loadEnvironment();
  const adapter = new FastifyAdapter({
    logger:
      env.logLevel === 'silent'
        ? false
        : {
            level: env.logLevel,
            serializers: {
              req: (request: FastifyRequest) => ({ method: request.method, url: '[redacted]' }),
              res: (response: { statusCode?: number }) => ({
                statusCode: response.statusCode ?? 0,
              }),
              // Fastify serializer 要求 type/stack；用固定值满足契约并避免泄露异常中的凭据。
              err: () => ({
                type: 'RequestError',
                message: 'Request processing failed',
                stack: '[redacted]',
              }),
            },
            redact: ['req.headers.authorization', 'req.headers.cookie', 'req.body', 'req.url'],
          },
    bodyLimit: env.bodyLimitBytes,
    requestTimeout: 15_000,
    connectionTimeout: 15_000,
    genReqId: (request: IncomingMessage) => {
      const header = request.headers['x-request-id'];
      return typeof header === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(header)
        ? header
        : randomUUID();
    },
  });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    logger: env.logLevel === 'silent' ? false : ['error', 'warn', 'log'],
  });
  try {
    const server = adapter.getInstance();
    await app.register(helmet, { contentSecurityPolicy: false });
    // 暂缓的上传接口不消费文件流；只识别媒体类型，让请求到达明确的 501 handler。
    server.addContentTypeParser(/^multipart\/form-data(?:;.*)?$/i, (_request, _payload, done) => {
      done(null, null);
    });
    server.addHook('onRequest', async (request, reply) => {
      const length = Number(request.headers['content-length'] ?? 0);
      if (length > env.bodyLimitBytes) {
        return reply
          .code(413)
          .send({ code: 413, msg: 'Request body exceeds size limit', data: null });
      }
    });
    server.addHook('onSend', async (request, reply, payload) => {
      reply
        .header('x-request-id', request.id)
        .header('cache-control', reply.getHeader('cache-control') ?? 'no-store');
      return payload;
    });
    if (env.corsOrigins.length)
      app.enableCors({
        origin: env.corsOrigins,
        credentials: false,
        methods: ['GET', 'HEAD', 'POST', 'OPTIONS'],
        allowedHeaders: [
          'Content-Type',
          'Authorization',
          'X-Request-Id',
          'X-Device-Mid',
          'X-Client-Language',
          'X-ZCode-App-Version',
        ],
        exposedHeaders: ['X-Request-Id'],
      });
    app.useGlobalPipes(new ZodValidationPipe());
    app.useGlobalFilters(new ApiExceptionFilter());
    app.useGlobalInterceptors(new TraceInterceptor());
    if (env.openapiEnabled) {
      const config = new DocumentBuilder()
        // Zod可空字段使用JSON Schema联合类型；3.1让Swagger UI正确显示，避免Unknown Type。
        .setOpenAPIVersion('3.1.0')
        .setTitle('Open-ZCode-Server')
        .setDescription('ZCode-compatible public APIs. Deferred APIs always fail with HTTP 501.')
        .setVersion(await loadSoftwareVersion())
        .build();
      const document = buildExplorerDocument(
        cleanupOpenApiDoc(SwaggerModule.createDocument(app, config)),
        await loadApiInventory(),
      );
      SwaggerModule.setup('docs', app, document, {
        ui: true,
        customSiteTitle: 'Open-ZCode-Server · 接口浏览与调试',
        customCss: EXPLORER_CSS,
        swaggerOptions: {
          filter: true,
          docExpansion: 'none',
          deepLinking: true,
          displayRequestDuration: true,
          persistAuthorization: false,
          validatorUrl: null,
          supportedSubmitMethods: ['get', 'post'],
        },
        jsonDocumentUrl: '/openapi.json',
        yamlDocumentUrl: '/openapi.yaml',
      });
    }
    app.enableShutdownHooks();
    await app.init();
    await server.ready();
    return app;
  } catch (error) {
    await app.close();
    throw error;
  }
}
