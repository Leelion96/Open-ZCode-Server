import 'dotenv/config';
import { createApplication } from './app.js';
import { loadEnvironment } from './common/environment.js';

async function bootstrap(): Promise<void> {
  const env = loadEnvironment();
  const app = await createApplication();
  await app.listen(env.port, env.host);
}

bootstrap().catch(() => {
  // 启动异常可能包含数据库 URL 或输入值；详细定位通过离线 content/env 检查完成。
  process.stderr.write('Service startup failed. Check environment and content validation.\n');
  process.exitCode = 1;
});
