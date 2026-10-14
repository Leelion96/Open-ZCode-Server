import { spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const project = `open-zcode-server-check-${randomUUID().slice(0, 8)}`;
const directory = await mkdtemp(resolve(tmpdir(), project));
const password = randomBytes(24).toString('hex');
const env = {
  ...process.env,
  POSTGRES_USER: 'open_zcode',
  POSTGRES_DB: 'open_zcode',
  POSTGRES_PASSWORD: password,
  DATABASE_URL: `postgresql://open_zcode:${password}@db:5432/open_zcode`,
  API_PORT: '0',
  HTTPS_PORT: '0',
  PUBLIC_ORIGIN: 'https://localhost:8443',
  LOG_LEVEL: 'silent',
  TLS_HOST: 'localhost',
};
const override = resolve(directory, 'compose.test.yaml');
await writeFile(override, 'services:\n  db:\n    ports:\n      - "127.0.0.1::5432"\n');
const compose = ['compose', '-p', project, '-f', resolve('compose.yaml'), '-f', override];
const phases = [];

function run(command, args, environment = env, quiet = false) {
  return new Promise((resolveResult, reject) => {
    const processHandle = spawn(command, args, {
      env: environment,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    const collect = (chunk) => {
      const safe = chunk.toString().replaceAll(password, '[redacted]');
      output += safe;
      if (!quiet) process.stdout.write(safe);
    };
    processHandle.stdout.on('data', collect);
    processHandle.stderr.on('data', collect);
    processHandle.on('error', reject);
    processHandle.on('close', (code) =>
      code === 0
        ? resolveResult(output.trim())
        : reject(new Error(`${command} exited with ${code}`)),
    );
  });
}

async function check(path, expectedStatus, base) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(5000) });
  if (response.status !== expectedStatus)
    throw new Error(`Unexpected status for ${path}: ${response.status}`);
  return response.json();
}

try {
  await run('docker', [...compose, 'config', '--quiet'], env, true);
  phases.push('compose-config');
  await run('docker', [...compose, 'build', 'app']);
  phases.push('docker-build');
  await run('docker', [
    ...compose,
    '--profile',
    'tls',
    'up',
    '-d',
    '--wait',
    '--wait-timeout',
    '180',
  ]);
  phases.push('compose-health');
  const appPort = (await run('docker', [...compose, 'port', 'app', '3000'], env, true))
    .split(':')
    .at(-1);
  const dbPort = (await run('docker', [...compose, 'port', 'db', '5432'], env, true))
    .split(':')
    .at(-1);
  const origin = `http://127.0.0.1:${appPort}`;
  const ready = await check('/health/ready', 200, origin);
  if (!Object.values(ready.checks).every(Boolean)) throw new Error('Compose readiness failed');
  const configs = await check(
    '/api/v1/client/configs?app_version=3.14.3&platform=darwin-arm64',
    200,
    origin,
  );
  if (configs.data.configs.offPeak.enable_offpeak_task !== false)
    throw new Error('Disabled capability was unexpectedly enabled');
  if (Object.keys(configs.data.configs.codingPlanStaticProducts).length !== 0)
    throw new Error('Official sales offers remain in config');
  const builtin = await check('/assets/builtin-config.json', 200, origin);
  if (builtin.config.providerConfigRules.providerRules.length !== 0 || builtin.revision < 24)
    throw new Error('Independent builtin release is unavailable');
  await run('docker', [
    ...compose,
    'exec',
    '-T',
    'app',
    'node',
    '--input-type=module',
    '-e',
    "import{readdir}from'node:fs/promises';const names=(await readdir('/app/data')).sort();if(JSON.stringify(names)!==JSON.stringify(['announcement-assets','announcements.json','builtin.json','configs.json','plugins','scenes.json']))throw new Error('Unexpected runtime data');console.log('Runtime data verified');",
  ]);
  const scenes = await check('/api/v1/client/scenes', 200, origin);
  if (
    JSON.stringify(scenes.data.map((scene) => scene.scene)) !==
    JSON.stringify(['draft-suggestion', 'scheduled-task'])
  )
    throw new Error('Scene data mismatch');
  await check('/api/v1/shares/capabilities', 501, origin);
  await check('/api/v1/mcp/usage', 404, origin);
  for (const path of ['/docs', '/docs/swagger-ui-bundle.js', '/docs/swagger-ui.css']) {
    const response = await fetch(origin + path, { signal: AbortSignal.timeout(5000) });
    if (response.status !== 200 || (await response.text()).length < 100)
      throw new Error(`Documentation asset unavailable: ${path}`);
  }
  const apiDocument = await check('/openapi.json', 200, origin);
  const operations = Object.entries(apiDocument.paths)
    .filter(([path]) => path.startsWith('/api/v1/'))
    .reduce(
      (total, [, path]) =>
        total + Object.keys(path).filter((method) => ['get', 'post'].includes(method)).length,
      0,
    );
  if (operations !== 34) throw new Error('Documentation inventory is incomplete');
  phases.push('swagger-ui');
  phases.push('compose-http');
  await run('pnpm', ['test:database'], {
    ...env,
    DATABASE_URL: `postgresql://open_zcode:${password}@127.0.0.1:${dbPort}/open_zcode`,
  });
  phases.push('prisma-postgresql');
  // 使用容器内 Node 校验证书链，避免修改宿主机信任库；测试根证书只留在本次 Compose volume。
  const certificate = await run(
    'docker',
    [...compose, 'exec', '-T', 'tls', 'cat', '/data/caddy/pki/authorities/local/root.crt'],
    env,
    true,
  );
  await run('docker', [
    ...compose,
    'exec',
    '-T',
    'app',
    'node',
    '--input-type=module',
    '-e',
    `import{request}from'node:https';const ca=${JSON.stringify(certificate)};await new Promise((resolve,reject)=>{const req=request({hostname:'tls',servername:'localhost',headers:{host:'localhost'},port:443,path:'/api/v1/client/scenes',ca},res=>{let text='';res.on('data',chunk=>text+=chunk);res.on('end',()=>{if(res.statusCode===200&&JSON.stringify(JSON.parse(text).data.map(scene=>scene.scene))===JSON.stringify(['draft-suggestion','scheduled-task']))resolve();else reject(new Error('TLS response failed'));});});req.on('error',reject);req.end();});console.log('TLS certificate and API verified');`,
  ]);
  phases.push('https-certificate');
  // 第二次启动必须复用已迁移数据库而不是依赖清空数据。
  await run('docker', [...compose, 'restart', 'app']);
  await run('docker', [...compose, 'up', '-d', '--wait', '--wait-timeout', '90', 'app']);
  // 端口 0 的宿主映射由 Docker 所有；重启后重新读取，不复用之前的临时端口。
  const restartedPort = (await run('docker', [...compose, 'port', 'app', '3000'], env, true))
    .split(':')
    .at(-1);
  await check('/health/ready', 200, `http://127.0.0.1:${restartedPort}`);
  phases.push('restart-idempotency');
  await mkdir('artifacts', { recursive: true });
  await writeFile(
    'artifacts/compose-verification.json',
    JSON.stringify(
      { completedAt: new Date().toISOString(), phases, project, status: 'passed' },
      null,
      2,
    ) + '\n',
  );
  console.log(`Compose verification passed (${phases.join(', ')})`);
} finally {
  await run(
    'docker',
    [...compose, '--profile', 'tls', 'down', '--volumes', '--remove-orphans'],
    env,
    true,
  );
  await rm(directory, { recursive: true, force: true });
}
