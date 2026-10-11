// ============================================================
//  Smoke test uchun fetch qatlami.
//
//  Ilova `/api/...` (nisbiy) manzillarga so'rov yuboradi. Brauzerda bu
//  bir xil origin bo'ladi; Node'da esa bunday manzil yo'q. Shuning uchun
//  bu yerda haqiqiy Express serverni (vaqtinchalik DATA_DIR bilan) ishga
//  tushiramiz va nisbiy so'rovlarni unga yo'naltiramiz.
//
//  install() sinxron chaqiriladi — shuning uchun server fon rejimida
//  birinchi so'rovda ishga tushadi.
// ============================================================
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// Fayl client/ ichida ham, client/.smoke/ ichida ham bo'lishi mumkin —
// shuning uchun loyiha ildizini server/index.js bo'yicha topamiz.
function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, 'server', 'index.js'))) return dir;
    dir = path.resolve(dir, '..');
  }
  throw new Error('smoke: loyiha ildizi (server/index.js) topilmadi');
}
const ROOT = findRoot(HERE);
const realFetch = globalThis.fetch;

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function startServer() {
  const port = await freePort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'im-smoke-'));
  const child = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // Test tugagach jarayon osilib qolmasligi uchun
  child.unref();
  if (child.stdout.unref) child.stdout.unref();
  if (child.stderr.unref) child.stderr.unref();

  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  let exited = null;
  child.on('exit', (code) => (exited = code));

  const base = 'http://127.0.0.1:' + port;
  const deadline = Date.now() + 60000;
  for (;;) {
    try {
      const r = await realFetch(base + '/api/health');
      if (r.ok) break;
    } catch (e) {
      /* hali ishga tushmadi */
    }
    if (exited !== null) throw new Error('smoke: API server ishga tushmadi (exit ' + exited + ')\n' + log);
    if (Date.now() > deadline) throw new Error('smoke: API server 60 sekundda ishga tushmadi\n' + log);
    await new Promise((r) => setTimeout(r, 150));
  }

  const cleanup = () => {
    try {
      child.kill('SIGKILL');
    } catch (e) {
      /* ignore */
    }
    try {
      fs.rmSync(dataDir, { recursive: true, force: true });
    } catch (e) {
      /* ignore */
    }
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(1);
  });

  console.log('smoke: API server ' + base + ' (DATA_DIR: ' + dataDir + ')');
  return base;
}

export function install() {
  let ready = null;
  const boot = () => {
    if (!ready) ready = startServer();
    return ready;
  };
  // Serverni darhol ishga tushirib qo'yamiz (fon rejimida)
  boot().catch(() => {});
  globalThis.fetch = (input, init) => {
    if (typeof input === 'string' && input.startsWith('/api')) {
      return boot().then((base) => realFetch(base + input, init));
    }
    return realFetch(input, init);
  };
}
