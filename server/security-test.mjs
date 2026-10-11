// ============================================================
//  Xavfsizlik testlari (security-test.mjs)
//
//  Haqiqiy serverni vaqtinchalik DATA_DIR bilan ishga tushiradi va
//  API orqali xavfsizlik talablarini tekshiradi:
//    * parollar hash'da saqlanadi, javoblarda ko'rinmaydi
//    * rol bo'yicha ruxsatlar (student/teacher/director)
//    * IDOR: begona sinf, vazifa, chat, o'quvchi ma'lumotlari yopiq
//    * login: brute-force himoyasi (rate-limit + akkaunt bloklash)
//    * sessiya tokenlari tasodifiy va bekor qilinadi
//    * CORS allowlist, xavfsizlik sarlavhalari
//    * kirish ma'lumotlari (input) validatsiyasi va hajm chegarasi
//
//  Ishlatish:  npm run test:security
// ============================================================
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INVITE = 'test-taklif-kodi-2026';

let pass = 0;
let fail = 0;
const failures = [];

function ok(name, extra = '') {
  pass += 1;
  console.log('  \x1b[32m✓\x1b[0m ' + name + (extra ? '  \x1b[90m' + extra + '\x1b[0m' : ''));
}
function bad(name, msg) {
  fail += 1;
  failures.push(name + ' — ' + msg);
  console.log('  \x1b[31m✗\x1b[0m ' + name + '  \x1b[31m' + msg + '\x1b[0m');
}
async function check(name, fn) {
  try {
    await fn();
    ok(name);
  } catch (e) {
    bad(name, e && e.message);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'shart bajarilmadi');
}
function eq(actual, expected, msg) {
  if (actual !== expected) throw new Error((msg || 'qiymat mos emas') + ': kutildi ' + expected + ', keldi ' + actual);
}

// ---------- serverni ishga tushirish ----------
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

const PORT = await freePort();
const BASE = 'http://127.0.0.1:' + PORT;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'im-sec-'));
const child = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT), DATA_DIR, STAFF_INVITE_CODE: INVITE, PASSWORD_MIN_LENGTH: '8' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
child.stdout.on('data', (d) => (serverLog += d));
child.stderr.on('data', (d) => (serverLog += d));
// Test tugagach jarayon osilib qolmasligi uchun (fon serveri kutib turmasin)
child.unref();
if (child.stdout.unref) child.stdout.unref();
if (child.stderr.unref) child.stderr.unref();

function cleanup() {
  try {
    child.kill('SIGKILL');
  } catch (e) {
    /* ignore */
  }
  try {
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
  } catch (e) {
    /* ignore */
  }
}
process.on('exit', cleanup);
process.on('SIGINT', () => {
  cleanup();
  process.exit(1);
});

// ---------- yordamchilar ----------
let ipCounter = 0;
// Har bir test uchun "boshqa IP" — rate-limit testlarini bir-biriga xalaqit bermasligi uchun
const nextIp = () => '10.9.' + (++ipCounter % 250) + '.' + (ipCounter % 250);

async function req(pathname, { method = 'GET', body, token, headers = {}, ip } = {}) {
  const h = { ...headers };
  if (body !== undefined) h['Content-Type'] = 'application/json';
  if (token) h['x-token'] = token;
  if (ip) h['X-Forwarded-For'] = ip;
  const res = await fetch(BASE + pathname, {
    method,
    headers: h,
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = null;
  }
  return { status: res.status, json, text, headers: res.headers };
}

const login = async (l, p, ip) => req('/api/login', { method: 'POST', body: { login: l, password: p }, ip });

// ============================================================
console.log('\n=== Intellekt Innovatsion Maktabi — xavfsizlik testlari ===\n');

// 1. Server ishga tushishini kutish
{
  const deadline = Date.now() + 60000;
  for (;;) {
    try {
      const r = await req('/api/health');
      if (r.status === 200) break;
    } catch (e) {
      /* kutamiz */
    }
    if (Date.now() > deadline) {
      console.error('Server ishga tushmadi:\n' + serverLog);
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  console.log('Server: ' + BASE + '\n');
}

// ---------- 2. Sarlavhalar va asosiy himoyalar ----------
await check('x-powered-by sarlavhasi yashirilgan', async () => {
  const r = await req('/api/health');
  assert(!r.headers.get('x-powered-by'), 'x-powered-by ko\'rinib turibdi');
  eq(r.headers.get('x-content-type-options'), 'nosniff', 'nosniff sarlavhasi');
  eq(r.headers.get('referrer-policy'), 'no-referrer', 'referrer-policy');
});

await check('CORS: begona origin rad etiladi, ruxsat etilgani qabul qilinadi', async () => {
  const evil = await req('/api/health', { headers: { Origin: 'https://evil.example' } });
  assert(!evil.headers.get('access-control-allow-origin'), 'begona origin uchun CORS sarlavhasi berildi');
  const good = await req('/api/health', { headers: { Origin: 'http://localhost:5173' } });
  assert(good.headers.get('access-control-allow-origin'), 'ruxsat etilgan origin uchun CORS sarlavhasi yo\'q');
});

await check('noto\'g\'ri JSON → 400 (JSON javob bilan)', async () => {
  const r = await req('/api/login', { method: 'POST', body: '{ buzilgan json', ip: nextIp() });
  eq(r.status, 400, 'holat');
  assert(r.json && r.json.error, 'JSON xato javobi yo\'q');
});

await check('juda katta so\'rov → 413', async () => {
  const big = 'x'.repeat(1_600_000);
  const r = await req('/api/login', { method: 'POST', body: JSON.stringify({ login: 'a', password: big }), ip: nextIp() });
  eq(r.status, 413, 'holat');
});

// ---------- 3. Autentifikatsiya ----------
let student = null;
let studentToken = null;
await check('demo o\'quvchi kira oladi (parol hash bilan)', async () => {
  const r = await login('oquvchi1', '1234', nextIp());
  eq(r.status, 200, 'holat');
  studentToken = r.json.token;
  student = r.json.user;
  assert(!('password' in student) && !('passwordHash' in student), 'javobda parol maydoni bor');
  assert(studentToken.length >= 40, 'token juda qisqa: ' + studentToken.length);
});

await check('token formati va tasodifiyligi', async () => {
  const a = await login('oquvchi1', '1234', nextIp());
  const b = await login('oquvchi1', '1234', nextIp());
  assert(a.json.token !== b.json.token, 'bir xil token qaytdi');
  assert(/^[A-Za-z0-9_-]{40,}$/.test(a.json.token), 'token formati xavfsiz emas');
});

await check('token yo\'q / noto\'g\'ri token → 401', async () => {
  eq((await req('/api/me')).status, 401, 'tokensiz so\'rov');
  eq((await req('/api/me', { token: 'aaaabbbbccccddddeeeeffffgggghhhh' })).status, 401, 'soxta token');
  eq((await req('/api/me', { token: 'a'.repeat(5000) })).status, 401, 'juda uzun token');
});

await check('jumla: direktor/ustoz endpointlari o\'quvchiga yopiq', async () => {
  const paths = [
    ['GET', '/api/director/attendance-check'],
    ['GET', '/api/director/sms-log'],
    ['GET', '/api/director/budgets'],
    ['POST', '/api/director/send-sms'],
    ['POST', '/api/director/budgets'],
    ['GET', '/api/my-students'],
    ['GET', '/api/teacher/sms'],
    ['POST', '/api/teacher/coins'],
    ['POST', '/api/attendance'],
    ['POST', '/api/tasks'],
  ];
  for (const [method, p] of paths) {
    const r = await req(p, { method, token: studentToken, body: method === 'GET' ? undefined : {} });
    eq(r.status, 403, method + ' ' + p + ' uchun kutilgan 403');
  }
});

// ---------- 4. Ro'yxatdan o'tish ----------
await check('direktor hisobini ro\'yxatdan o\'tkazib bo\'lmaydi (403)', async () => {
  const r = await req('/api/register', {
    method: 'POST',
    ip: nextIp(),
    body: { login: 'soxta_direktor', password: 'Parol12345', displayName: 'Soxta Direktor', role: 'director' },
  });
  eq(r.status, 403, 'holat');
});

await check('ustoz hisobi taklif kodisiz ochilmaydi (403)', async () => {
  const r = await req('/api/register', {
    method: 'POST',
    ip: nextIp(),
    body: { login: 'soxta_ustoz', password: 'Parol12345', displayName: 'Soxta Ustoz', role: 'teacher', inviteCode: 'xato-kod' },
  });
  eq(r.status, 403, 'holat');
});

await check('ustoz hisobi to\'g\'ri taklif kodi bilan ochiladi', async () => {
  const r = await req('/api/register', {
    method: 'POST',
    ip: nextIp(),
    body: { login: 'yangi_ustoz', password: 'Parol12345', displayName: 'Yangi Ustoz', role: 'teacher', subject: 'Informatika', inviteCode: INVITE },
  });
  eq(r.status, 200, 'holat');
  eq(r.json.user.role, 'teacher', 'rol');
});

await check('qisqa parol va noto\'g\'ri sinf rad etiladi', async () => {
  const short = await req('/api/register', {
    method: 'POST',
    ip: nextIp(),
    body: { login: 'qisqa_parol', password: '1234', displayName: 'Test', role: 'student', className: '8-A' },
  });
  eq(short.status, 400, 'qisqa parol');
  const badClass = await req('/api/register', {
    method: 'POST',
    ip: nextIp(),
    body: { login: 'xato_sinf', password: 'Parol12345', displayName: 'Test', role: 'student', className: 'yoq-sinf' },
  });
  eq(badClass.status, 400, 'noto\'g\'ri sinf');
  const badLogin = await req('/api/register', {
    method: 'POST',
    ip: nextIp(),
    body: { login: '<script>alert(1)</script>', password: 'Parol12345', displayName: 'Test', role: 'student', className: '8-A' },
  });
  eq(badLogin.status, 400, 'g\'alati login');
});

await check('yangi o\'quvchi ro\'yxatdan o\'tib tizimga kiradi', async () => {
  const r = await req('/api/register', {
    method: 'POST',
    ip: nextIp(),
    body: { login: 'yangi_oquvchi', password: 'Parol12345', displayName: 'Yangi Oquvchi', role: 'student', className: '8-A' },
  });
  eq(r.status, 200, 'holat');
  const dup = await req('/api/register', {
    method: 'POST',
    ip: nextIp(),
    body: { login: 'yangi_oquvchi', password: 'Parol12345', displayName: 'Takror', role: 'student', className: '8-A' },
  });
  eq(dup.status, 409, 'takroriy login');
});

// ---------- 5. Brute-force himoyasi ----------
await check('5 marta xato paroldan keyin akkaunt bloklanadi (429)', async () => {
  const ip = nextIp();
  for (let i = 0; i < 5; i++) {
    const r = await login('ustoz2', 'xato-parol', ip);
    eq(r.status, 401, 'xato parol uchun 401');
  }
  const locked = await login('ustoz2', '1234', ip);
  eq(locked.status, 429, 'bloklangan akkaunt uchun 429');
  assert(locked.headers.get('retry-after'), 'Retry-After sarlavhasi yo\'q');
});

await check('login rate-limit: 30 urinishdan keyin 429', async () => {
  const ip = nextIp();
  let last = 0;
  for (let i = 0; i < 33; i++) {
    const r = await login('yoq_bunday_login', 'parol', ip);
    last = r.status;
  }
  eq(last, 429, 'rate-limit ishlamadi');
});

// ---------- 6. Chat ruxsatlari (IDOR) ----------
let teacherToken = null;
await check('ustoz kira oladi', async () => {
  const r = await login('ustoz1', '1234', nextIp());
  eq(r.status, 200, 'holat');
  teacherToken = r.json.token;
});

await check('chat: o\'quvchi begona sinf chatini o\'qiy olmaydi (403)', async () => {
  const own = await req('/api/chats/class_c_1/messages', { token: studentToken });
  eq(own.status, 200, 'o\'z sinfi');
  const other = await req('/api/chats/class_c_2/messages', { token: studentToken });
  eq(other.status, 403, 'begona sinf');
});

await check('chat: all_teachers xonasi o\'quvchiga yopiq', async () => {
  eq((await req('/api/chats/all_teachers/messages', { token: studentToken })).status, 403, 'all_teachers (o\'quvchi)');
  eq((await req('/api/chats/all_teachers/messages', { token: teacherToken })).status, 200, 'all_teachers (ustoz)');
});

await check('chat: DM xonasiga faqat ikki tomon kira oladi', async () => {
  const own = await req('/api/chats/dm_s_1_t_2/messages', { token: studentToken });
  eq(own.status, 200, 'o\'z DM');
  const stranger = await req('/api/chats/dm_s_1_s_2/messages', { token: studentToken });
  eq(stranger.status, 403, 'begona DM');
  const send = await req('/api/chats/dm_s_1_s_2/messages', { method: 'POST', token: studentToken, body: { text: 'hujum' } });
  eq(send.status, 403, 'begona DM ga yozish');
});

await check('chat: mavjud bo\'lmagan/xiyoliy xona rad etiladi', async () => {
  const rooms = ['dm_s_1_t_999', 'class_c_999', '..%2F..%2Fusers', 'class_c_1%2F..%2Fs_2', 'all_teachers_x'];
  for (const room of rooms) {
    const r = await req('/api/chats/' + room + '/messages', { token: studentToken });
    assert(r.status === 403 || r.status === 404, room + ' uchun kutilgan 403/404, keldi ' + r.status);
  }
});

await check('chat: uzoq xabar qisqartiriladi (DoS himoyasi)', async () => {
  const long = 'A'.repeat(5000);
  const r = await req('/api/chats/class_c_1/messages', { method: 'POST', token: studentToken, body: { text: long } });
  eq(r.status, 200, 'holat');
  assert(r.json.message.text.length <= 2000, 'xabar uzunligi cheklanmadi: ' + r.json.message.text.length);
});

// ---------- 7. Vazifa / davomat / coin ruxsatlari ----------
let directorToken = null;
let tasks8A = [];
await check('ustoz faqat o\'z sinfiga vazifa bera oladi', async () => {
  const mine = await req('/api/tasks', { method: 'POST', token: teacherToken, body: { className: '8-A', title: 'Test vazifa' } });
  eq(mine.status, 200, 'o\'z sinfi');
  const foreign = await req('/api/tasks', { method: 'POST', token: teacherToken, body: { className: '9-A', title: 'Begona sinf' } });
  eq(foreign.status, 403, 'begona sinf');
  tasks8A = (await req('/api/tasks', { token: teacherToken })).json.tasks;
});

await check('o\'quvchi begona sinf vazifasini "bajarildi" qila olmaydi', async () => {
  const dir = await login('director', '1234', nextIp());
  directorToken = dir.json.token;
  const all = (await req('/api/tasks', { token: directorToken })).json.tasks;
  const foreign = all.find((t) => t.className !== '8-A');
  assert(foreign, 'boshqa sinf vazifasi topilmadi');
  const r = await req('/api/tasks/' + foreign.id + '/done', { method: 'POST', token: studentToken });
  eq(r.status, 404, 'begona vazifa');
  const own = tasks8A[0];
  eq((await req('/api/tasks/' + own.id + '/done', { method: 'POST', token: studentToken })).status, 200, 'o\'z vazifasi');
});

await check('ustoz begona sinf o\'quvchisiga davomat qila olmaydi', async () => {
  const r = await req('/api/attendance', {
    method: 'POST',
    token: teacherToken,
    body: { date: '2026-10-11', entries: [{ studentId: 's_2', status: 'keldi' }] },
  });
  eq(r.status, 200, 'holat');
  eq(r.json.saved, 0, 'begona o\'quvchi saqlanib ketdi');
  const bad = await req('/api/attendance', {
    method: 'POST',
    token: teacherToken,
    body: { date: '2026-10-11', entries: [{ studentId: 's_1', status: 'aldash' }] },
  });
  eq(bad.json.saved, 0, 'noto\'g\'ri status saqlandi');
  const good = await req('/api/attendance', {
    method: 'POST',
    token: teacherToken,
    body: { date: '2026-10-11', entries: [{ studentId: 's_1', status: 'keldi' }] },
  });
  eq(good.json.saved, 1, 'to\'g\'ri yozuv saqlanmadi');
  const badDate = await req('/api/attendance', {
    method: 'POST',
    token: teacherToken,
    body: { date: 'kecha', entries: [{ studentId: 's_1', status: 'keldi' }] },
  });
  eq(badDate.status, 400, 'noto\'g\'ri sana');
});

await check('ustoz faqat o\'z sinfidagi o\'quvchiga coin bera oladi', async () => {
  const foreign = await req('/api/teacher/coins', { method: 'POST', token: teacherToken, body: { studentId: 's_2', amount: 10 } });
  eq(foreign.status, 403, 'begona o\'quvchi');
  const negative = await req('/api/teacher/coins', { method: 'POST', token: teacherToken, body: { studentId: 's_1', amount: -100 } });
  eq(negative.status, 400, 'manfiy miqdor');
  const huge = await req('/api/teacher/coins', { method: 'POST', token: teacherToken, body: { studentId: 's_1', amount: 999999 } });
  eq(huge.status, 400, 'juda katta miqdor');
  const good = await req('/api/teacher/coins', { method: 'POST', token: teacherToken, body: { studentId: 's_1', amount: 10, reason: 'test' } });
  eq(good.status, 200, 'to\'g\'ri so\'rov');
});

await check('direktor byudjeti faqat mantiqiy qiymatlarni qabul qiladi', async () => {
  const bad = await req('/api/director/budgets', { method: 'POST', token: directorToken, body: { teacherId: 't_1', amount: -5 } });
  eq(bad.status, 400, 'manfiy byudjet');
  const badTeacher = await req('/api/director/budgets', { method: 'POST', token: directorToken, body: { teacherId: 's_1', amount: 100 } });
  eq(badTeacher.status, 404, 'o\'quvchi id si bilan byudjet');
  const good = await req('/api/director/budgets', { method: 'POST', token: directorToken, body: { teacherId: 't_1', amount: 777 } });
  eq(good.status, 200, 'to\'g\'ri so\'rov');
});

// ---------- 8. Shaxsiy ma'lumotlar ----------
await check('o\'quvchi statistikasida shaxsiy ma\'lumot yo\'q', async () => {
  const r = await req('/api/students/s_1/stats', { token: studentToken });
  eq(r.status, 200, 'holat');
  const raw = JSON.stringify(r.json);
  for (const forbidden of ['phone', 'login', 'passwordHash', 'attendance-record']) {
    assert(!raw.includes(forbidden), 'statistikada "' + forbidden + '" maydoni bor');
  }
  eq((await req('/api/students/yoq_id/stats', { token: studentToken })).status, 404, 'mavjud bo\'lmagan id');
});

await check('reyting javobida telefon/parol yo\'q', async () => {
  const r = await req('/api/rankings', { token: studentToken });
  const raw = JSON.stringify(r.json);
  assert(!raw.includes('passwordHash'), 'parol hash ko\'rinib turibdi');
  assert(!raw.includes('+998'), 'telefon raqam ko\'rinib turibdi');
});

// ---------- 9. Parolni almashtirish ----------
await check('parol almashtirish joriy parolsiz ishlamaydi', async () => {
  const noCurrent = await req('/api/me', { method: 'PUT', token: studentToken, body: { password: 'YangiParol123' } });
  eq(noCurrent.status, 400, 'joriy parolsiz');
  const wrong = await req('/api/me', { method: 'PUT', token: studentToken, body: { currentPassword: 'xato', password: 'YangiParol123' } });
  eq(wrong.status, 403, 'xato joriy parol');
  const short = await req('/api/me', { method: 'PUT', token: studentToken, body: { currentPassword: '1234', password: 'qisqa' } });
  eq(short.status, 400, 'qisqa yangi parol');
});

await check('parol almashtirilgach boshqa sessiyalar bekor qilinadi', async () => {
  const other = await login('oquvchi1', '1234', nextIp());
  const otherToken = other.json.token;
  const r = await req('/api/me', { method: 'PUT', token: studentToken, body: { currentPassword: '1234', password: 'YangiParol123' } });
  eq(r.status, 200, 'parol almashtirish');
  eq((await req('/api/me', { token: otherToken })).status, 401, 'boshqa sessiya ishlayapti');
  eq((await req('/api/me', { token: studentToken })).status, 200, 'joriy sessiya bekor qilindi');
  eq((await login('oquvchi1', '1234', nextIp())).status, 401, 'eski parol bilan kirish');
  eq((await login('oquvchi1', 'YangiParol123', nextIp())).status, 200, 'yangi parol bilan kirish');
});

await check('logout sessiyani bekor qiladi', async () => {
  const s = await login('oquvchi1', 'YangiParol123', nextIp());
  const token = s.json.token;
  eq((await req('/api/logout', { method: 'POST', token })).status, 200, 'logout');
  eq((await req('/api/me', { token })).status, 401, 'logoutdan keyin token ishlayapti');
});

// ---------- 10. Ma'lumotlar diskda ----------
await check('parollar diskda scrypt hash ko\'rinishida', async () => {
  const users = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users.json'), 'utf8'));
  eq(users.length >= 50, true, 'foydalanuvchilar soni');
  const plain = users.filter((u) => 'password' in u);
  eq(plain.length, 0, 'ochiq matnli parol maydoni');
  const weak = users.filter((u) => u.passwordHash && !/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/.test(u.passwordHash));
  eq(weak.length, 0, 'formati noto\'g\'ri hash');
  assert(!fs.readFileSync(path.join(DATA_DIR, 'users.json'), 'utf8').includes('"1234"'), 'faylda "1234" parol ko\'rinib turibdi');
});

await check('ma\'lumot fayllari faqat egasiga o\'qiladi (0600/0700)', async () => {
  const fileMode = fs.statSync(path.join(DATA_DIR, 'users.json')).mode & 0o777;
  eq(fileMode, 0o600, 'users.json huquqi');
  const dirMode = fs.statSync(DATA_DIR).mode & 0o777;
  eq(dirMode, 0o700, 'data papkasi huquqi');
});

await check('chat xabarlari ham hash bilan birga xavfsiz saqlanadi (matn cheklangan)', async () => {
  const messages = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'messages.json'), 'utf8'));
  assert(messages.every((m) => typeof m.text === 'string' && m.text.length <= 2000), 'chegaradan uzun xabar diskda');
});

// ---------- 11. Rate-limit: ro'yxatdan o'tish ----------
await check('ro\'yxatdan o\'tish rate-limitga ega', async () => {
  const ip = nextIp();
  let last = 0;
  for (let i = 0; i < 12; i++) {
    const r = await req('/api/register', {
      method: 'POST',
      ip,
      body: { login: 'limit_' + i, password: 'Parol12345', displayName: 'Limit ' + i, role: 'student', className: '8-A' },
    });
    last = r.status;
  }
  eq(last, 429, 'rate-limit ishlamadi');
});

// ---------- 12. Ishlab chiqarish rejimi (SEED_DEMO=0) ----------
await check('SEED_DEMO=0: demo hisoblar yo\'q, direktor bootstrap ishlaydi', async () => {
  const port2 = await freePort();
  const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'im-sec-prod-'));
  const child2 = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(port2),
      DATA_DIR: dir2,
      SEED_DEMO: '0',
      ADMIN_LOGIN: 'rektor',
      ADMIN_PASSWORD: 'KuchliParol2026',
      ADMIN_NAME: 'Bosh Direktor',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child2.unref();
  if (child2.stdout.unref) child2.stdout.unref();
  if (child2.stderr.unref) child2.stderr.unref();

  const base2 = 'http://127.0.0.1:' + port2;
  const post = async (p, body) =>
    fetch(base2 + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const deadline = Date.now() + 60000;
  for (;;) {
    try {
      if ((await fetch(base2 + '/api/health')).ok) break;
    } catch (e) {
      /* kutamiz */
    }
    if (Date.now() > deadline) throw new Error('SEED_DEMO=0 server ishga tushmadi');
    await new Promise((r) => setTimeout(r, 150));
  }

  const demo = await post('/api/login', { login: 'oquvchi1', password: '1234' });
  eq(demo.status, 401, 'demo hisob SEED_DEMO=0 da ham mavjud');

  const admin = await post('/api/login', { login: 'rektor', password: 'KuchliParol2026' });
  eq(admin.status, 200, 'direktor bootstrap hisobi ishlamadi');
  const adminUser = (await admin.json()).user;
  eq(adminUser.role, 'director', 'bootstrap hisobi roli');

  const student = await post('/api/register', {
    login: 'yangi_oquvchi_prod',
    password: 'Parol12345',
    displayName: 'Yangi Oquvchi',
    role: 'student',
    className: '8-A',
  });
  eq(student.status, 200, "SEED_DEMO=0 da o'quvchi ro'yxatdan o'ta olmadi (sinflar yo'q)");

  try {
    child2.kill('SIGKILL');
  } catch (e) {
    /* ignore */
  }
  fs.rmSync(dir2, { recursive: true, force: true });
});

// ============================================================
console.log('\n=== NATIJA ===');
console.log('O\'tdi: ' + pass + ' ta, yiqildi: ' + fail + ' ta');
if (fail) {
  console.log('\nYiqilgan testlar:');
  failures.forEach((f) => console.log('  - ' + f));
  console.log('\nServer jurnali:\n' + serverLog);
  process.exit(1);
} else {
  console.log('\x1b[32mBarcha xavfsizlik tekshiruvlari muvaffaqiyatli ✓\x1b[0m');
}
cleanup();
process.exit(fail ? 1 : 0);
