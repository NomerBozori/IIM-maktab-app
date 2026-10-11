// ============================================================
//  Xavfsizlik testlari (security-test.mjs)
//
//  Haqiqiy serverni vaqtinchalik DATA_DIR bilan ishga tushiradi va
//  API orqali xavfsizlik talablarini tekshiradi:
//    * parollar hash'da saqlanadi, javoblarda ko'rinmaydi
//    * rol bo'yicha ruxsatlar (student/teacher/director)
//    * IDOR: begona sinf, vazifa, chat, o'quvchi ma'lumotlari yopiq
//    * davomat qoidalari: hamma belgilanmaguncha saqlanmaydi, "kelmadi"
//      uchun sabab majburiy, 24 soatdan keyin tahrir qulflanadi
//    * sinflar: 1–11, A (rus tili) / B (o'zbek tili)
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

// Har qanday konfiguratsiya bilan server ko'tarib, tayyor bo'lishini kutamiz
async function startServer(env = {}) {
  const port = await freePort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'im-sec-'));
  const child = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  child.unref();
  if (child.stdout.unref) child.stdout.unref();
  if (child.stderr.unref) child.stderr.unref();

  const base = 'http://127.0.0.1:' + port;
  const deadline = Date.now() + 60000;
  for (;;) {
    try {
      const r = await fetch(base + '/api/health');
      if (r.ok) break;
    } catch (e) {
      /* hali ishga tushmadi */
    }
    if (Date.now() > deadline) throw new Error('Server 60 sekundda ishga tushmadi:\n' + log);
    await new Promise((r) => setTimeout(r, 150));
  }
  const stop = () => {
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
  return { base, dataDir, stop, log: () => log };
}

const main = await startServer({ STAFF_INVITE_CODE: INVITE, PASSWORD_MIN_LENGTH: '8' });
const BASE = main.base;
const DATA_DIR = main.dataDir;
process.on('exit', main.stop);
process.on('SIGINT', () => {
  main.stop();
  process.exit(1);
});

// ---------- yordamchilar ----------
let ipCounter = 0;
// Har bir test uchun "boshqa IP" — rate-limit testlari bir-biriga xalaqit bermasligi uchun
const nextIp = () => '10.9.' + (++ipCounter % 250) + '.' + (ipCounter % 250);

async function req(pathname, { method = 'GET', body, token, headers = {}, ip, base = BASE } = {}) {
  const h = { ...headers };
  if (body !== undefined) h['Content-Type'] = 'application/json';
  if (token) h['x-token'] = token;
  if (ip) h['X-Forwarded-For'] = ip;
  const res = await fetch(base + pathname, {
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

const login = (l, p, ip) => req('/api/login', { method: 'POST', body: { login: l, password: p }, ip });

// ============================================================
console.log('\n=== Intellekt Innovatsion Maktabi — xavfsizlik testlari ===\n');
console.log('Server: ' + BASE + '\n');

// ---------- 1. Sarlavhalar va asosiy himoyalar ----------
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

// ---------- 2. Sinflar tuzilmasi (1–11, A/B) ----------
await check('sinflar: 1–11 gacha, A — rus tili, B — o\'zbek tili (22 sinf)', async () => {
  const r = await req('/api/classes');
  eq(r.status, 200, 'holat');
  const list = r.json.classes || [];
  eq(list.length, 22, 'sinflar soni');
  eq(list[0].name, '1-A', 'birinchi sinf');
  eq(list[0].stream, 'ru', '1-A oqimi');
  eq(list[1].name, '1-B', 'ikkinchi sinf');
  eq(list[1].stream, 'uz', '1-B oqimi');
  eq(list[list.length - 1].name, '11-B', 'oxirgi sinf');
  assert(list.every((c) => /^\d{1,2}-[AB]$/.test(c.name)), 'sinf nomi formati buzilgan');
  assert(list.every((c) => (c.name.endsWith('-A') ? c.stream === 'ru' : c.stream === 'uz')), 'oqim nom bilan mos emas');
  const grades = [...new Set(list.map((c) => Number(c.name.split('-')[0])))].sort((a, b) => a - b);
  eq(grades.join(','), '1,2,3,4,5,6,7,8,9,10,11', 'sinf raqamlari');
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
  eq(student.className, '1-A', 'birinchi o\'quvchi sinfi');
  eq(student.streamLabel, 'Rus tili', 'oqim yorlig\'i');
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
    ['POST', '/api/director/budgets/all'],
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
    body: { login: 'qisqa_parol', password: '1234', displayName: 'Test', role: 'student', className: '1-A' },
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
    body: { login: '<script>alert(1)</script>', password: 'Parol12345', displayName: 'Test', role: 'student', className: '1-A' },
  });
  eq(badLogin.status, 400, 'g\'alati login');
});

await check('yangi o\'quvchi ro\'yxatdan o\'tib tizimga kiradi', async () => {
  const r = await req('/api/register', {
    method: 'POST',
    ip: nextIp(),
    body: { login: 'yangi_oquvchi', password: 'Parol12345', displayName: 'Yangi Oquvchi', role: 'student', className: '2-A' },
  });
  eq(r.status, 200, 'holat');
  const dup = await req('/api/register', {
    method: 'POST',
    ip: nextIp(),
    body: { login: 'yangi_oquvchi', password: 'Parol12345', displayName: 'Takror', role: 'student', className: '2-A' },
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

await check('chat: umumiy xona (ustozlar + direktor) o\'quvchiga yopiq', async () => {
  eq((await req('/api/chats/all_staff/messages', { token: studentToken })).status, 403, 'all_staff (o\'quvchi)');
  eq((await req('/api/chats/all_staff/messages', { token: teacherToken })).status, 200, 'all_staff (ustoz)');
});

await check('chat: ustoz va direktor umumiy xonaga yoza oladi', async () => {
  const post = await req('/api/chats/all_staff/messages', {
    method: 'POST',
    token: teacherToken,
    body: { text: 'Salom, hamkasblar!' },
  });
  eq(post.status, 200, 'ustoz xabar yuborishi');
  const dir = await login('director', '1234', nextIp());
  const dirToken = dir.json.token;
  const dirPost = await req('/api/chats/all_staff/messages', { method: 'POST', token: dirToken, body: { text: 'Direktordan salom' } });
  eq(dirPost.status, 200, 'direktor xabar yuborishi');
  const list = await req('/api/chats', { token: teacherToken });
  const staff = list.json.chats.find((c) => c.roomId === 'all_staff');
  assert(staff, 'ustoz chat ro\'yxatida umumiy xona yo\'q');
  eq(staff.type, 'staff', 'xona turi');
});

await check('chat: DM xonasiga faqat ikki tomon kira oladi', async () => {
  const own = await req('/api/chats/dm_s_1_t_5/messages', { token: studentToken });
  eq(own.status, 200, 'o\'z DM (o\'quvchi ↔ ustoz)');
  const stranger = await req('/api/chats/dm_s_1_s_2/messages', { token: studentToken });
  eq(stranger.status, 403, 'begona DM');
  const send = await req('/api/chats/dm_s_1_s_2/messages', { method: 'POST', token: studentToken, body: { text: 'hujum' } });
  eq(send.status, 403, 'begona DM ga yozish');
});

await check('chat: ustoz faqat o\'z sinfi o\'quvchisi bilan yozishadi', async () => {
  // ustoz1 (t_1) ning sinflari: 1-A (c_1) va 5-B (c_10) → s_1 (1-A) ruxsat, s_4 (1-B) taqiq
  eq((await req('/api/chats/dm_s_1_t_1/messages', { token: teacherToken })).status, 200, 'o\'z o\'quvchisi');
  eq((await req('/api/chats/dm_s_4_t_1/messages', { token: teacherToken })).status, 403, 'begona sinf o\'quvchisi');
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

// ---------- 7. Vazifalar ----------
let directorToken = null;
let tasks1A = [];
await check('ustoz faqat o\'z sinfiga vazifa bera oladi', async () => {
  const mine = await req('/api/tasks', { method: 'POST', token: teacherToken, body: { className: '1-A', title: 'Test vazifa' } });
  eq(mine.status, 200, 'o\'z sinfi');
  const foreign = await req('/api/tasks', { method: 'POST', token: teacherToken, body: { className: '2-A', title: 'Begona sinf' } });
  eq(foreign.status, 403, 'begona sinf');
  tasks1A = (await req('/api/tasks', { token: teacherToken })).json.tasks.filter((x) => x.className === '1-A');
});

await check('o\'quvchi begona sinf vazifasini "bajarildi" qila olmaydi', async () => {
  const dir = await login('director', '1234', nextIp());
  directorToken = dir.json.token;
  const all = (await req('/api/tasks', { token: directorToken })).json.tasks;
  const foreign = all.find((t) => t.className !== '1-A');
  assert(foreign, 'boshqa sinf vazifasi topilmadi');
  const r = await req('/api/tasks/' + foreign.id + '/done', { method: 'POST', token: studentToken });
  eq(r.status, 404, 'begona vazifa');
  const own = tasks1A[0];
  eq((await req('/api/tasks/' + own.id + '/done', { method: 'POST', token: studentToken })).status, 200, 'o\'z vazifasi');
});

// ---------- 8. Davomat qoidalari ----------
await check('davomat: begona sinf uchun umuman qabul qilinmaydi (403)', async () => {
  const r = await req('/api/attendance', {
    method: 'POST',
    token: teacherToken,
    body: { classId: 'c_2', date: '2026-10-11', entries: [{ studentId: 's_4', status: 'keldi' }] },
  });
  eq(r.status, 403, 'begona sinf');
});

await check('davomat: hamma o\'quvchi belgilanmaguncha saqlanmaydi', async () => {
  const part = await req('/api/attendance', {
    method: 'POST',
    token: teacherToken,
    body: { classId: 'c_1', date: '2026-10-11', entries: [{ studentId: 's_1', status: 'keldi' }] },
  });
  eq(part.status, 400, 'chala davomat qabul qilindi');
  eq(part.json.marked, 1, 'belgilanganlar soni');
  eq(part.json.total, 3, 'jami o\'quvchilar soni');
});

await check('davomat: "kelmadi" uchun sabab majburiy, eski holatlar rad etiladi', async () => {
  const noReason = await req('/api/attendance', {
    method: 'POST',
    token: teacherToken,
    body: {
      classId: 'c_1',
      date: '2026-10-11',
      entries: [
        { studentId: 's_1', status: 'keldi' },
        { studentId: 's_2', status: 'kelmadi' },
        { studentId: 's_3', status: 'keldi' },
      ],
    },
  });
  eq(noReason.status, 400, 'sababsiz "kelmadi" qabul qilindi');
  for (const old of ['ketdi', 'kirmadi']) {
    const r = await req('/api/attendance', {
      method: 'POST',
      token: teacherToken,
      body: {
        classId: 'c_1',
        date: '2026-10-11',
        entries: [
          { studentId: 's_1', status: old },
          { studentId: 's_2', status: 'keldi' },
          { studentId: 's_3', status: 'keldi' },
        ],
      },
    });
    eq(r.status, 400, 'eski "' + old + '" holati qabul qilindi');
  }
  const badDate = await req('/api/attendance', {
    method: 'POST',
    token: teacherToken,
    body: { classId: 'c_1', date: 'kecha', entries: [{ studentId: 's_1', status: 'keldi' }] },
  });
  eq(badDate.status, 400, 'noto\'g\'ri sana');
});

await check('davomat: hamma belgilansa saqlanadi, sabab va izoh yoziladi', async () => {
  const good = await req('/api/attendance', {
    method: 'POST',
    token: teacherToken,
    body: {
      classId: 'c_1',
      date: '2026-10-11',
      entries: [
        { studentId: 's_1', status: 'keldi' },
        { studentId: 's_2', status: 'kelmadi', reason: 'kasallik', note: 'Shifokorda' },
        { studentId: 's_3', status: 'keldi' },
      ],
    },
  });
  eq(good.status, 200, 'saqlash');
  eq(good.json.saved, 3, 'saqlangan yozuvlar');
  const rec = await req('/api/attendance', { token: teacherToken });
  const absent = rec.json.records.find((r) => r.studentId === 's_2' && r.date === '2026-10-11');
  eq(absent.reason, 'kasallik', 'sabab saqlandi');
  eq(absent.note, 'Shifokorda', 'izoh saqlandi');
  eq(absent.reasonLabel, 'Kasallik', 'sabab yorlig\'i');
  eq(absent.classId, 'c_1', 'classId saqlandi');
  assert(rec.json.records.every((r) => r.classId), 'classId yozilmagan');
  eq(rec.json.editWindowHours, 24, 'tahrir oynasi (soat)');
});

await check('davomat: 24 soat ichida tahrir mumkin (dublikat yozuv qolmaydi)', async () => {
  const again = await req('/api/attendance', {
    method: 'POST',
    token: teacherToken,
    body: {
      classId: 'c_1',
      date: '2026-10-11',
      entries: [
        { studentId: 's_1', status: 'keldi' },
        { studentId: 's_2', status: 'keldi' },
        { studentId: 's_3', status: 'kelmadi', reason: 'oilaviy' },
      ],
    },
  });
  eq(again.status, 200, 'tahrir qabul qilinmadi');
  eq(again.json.updated, true, 'yangilash belgisi');
  const rec = await req('/api/attendance', { token: teacherToken });
  const day = rec.json.records.filter((r) => r.date === '2026-10-11' && r.classId === 'c_1');
  eq(day.length, 3, 'dublikat yozuvlar paydo bo\'ldi: ' + day.length);
  assert(day.every((r) => r.canEdit !== false), 'tahrir oynasi ichida qulflangan');
});

await check('davomat: 24 soatdan keyin tahrir qulflanadi (ATT_EDIT_WINDOW_MINUTES=0)', async () => {
  const srv = await startServer({ ATT_EDIT_WINDOW_MINUTES: '0', STAFF_INVITE_CODE: INVITE });
  const base = srv.base;
  const t = await req('/api/login', { method: 'POST', body: { login: 'ustoz1', password: '1234' }, base });
  const token = t.json.token;
  const entries = [
    { studentId: 's_1', status: 'keldi' },
    { studentId: 's_2', status: 'keldi' },
    { studentId: 's_3', status: 'kelmadi', reason: 'boshqa', note: 'sinov' },
  ];
  const first = await req('/api/attendance', { method: 'POST', token, body: { classId: 'c_1', date: '2026-10-12', entries }, base });
  eq(first.status, 200, 'birinchi saqlash');
  eq(first.json.updated, false, 'birinchi saqlash yangilash emas');
  const second = await req('/api/attendance', { method: 'POST', token, body: { classId: 'c_1', date: '2026-10-12', entries }, base });
  eq(second.status, 403, 'qulflangandan keyin tahrir qabul qilindi');
  eq(second.json.locked, true, 'locked belgisi');
  const rec = await req('/api/attendance', { token, base });
  assert(rec.json.records.every((r) => r.canEdit === false), 'canEdit=false qaytmadi');
  srv.stop();
});

await check('davomat: direktor nazorati classId bilan ishlaydi', async () => {
  const r = await req('/api/director/attendance-check', { token: directorToken });
  eq(r.status, 200, 'holat');
  const t1 = r.json.teachers.find((x) => x.id === 't_1');
  assert(t1, 'ustoz topilmadi');
  assert(t1.classes.includes('1-A'), 'ustoz sinfi ko\'rinmadi: ' + t1.classes.join(','));
});

// ---------- 9. Coin ruxsatlari ----------
await check('ustoz faqat o\'z sinfidagi o\'quvchiga coin bera oladi', async () => {
  const foreign = await req('/api/teacher/coins', { method: 'POST', token: teacherToken, body: { studentId: 's_4', amount: 10 } });
  eq(foreign.status, 403, 'begona o\'quvchi (boshqa sinf)');
  const negative = await req('/api/teacher/coins', { method: 'POST', token: teacherToken, body: { studentId: 's_1', amount: -100 } });
  eq(negative.status, 400, 'manfiy miqdor');
  const huge = await req('/api/teacher/coins', { method: 'POST', token: teacherToken, body: { studentId: 's_1', amount: 999999 } });
  eq(huge.status, 400, 'juda katta miqdor');
  const good = await req('/api/teacher/coins', { method: 'POST', token: teacherToken, body: { studentId: 's_1', amount: 10, reason: 'test' } });
  eq(good.status, 200, 'to\'g\'ri so\'rov');
});

await check('direktor: hamma ustozga birdan limit belgilash ishlaydi', async () => {
  const bad = await req('/api/director/budgets/all', { method: 'POST', token: directorToken, body: { amount: -1 } });
  eq(bad.status, 400, 'manfiy miqdor');
  const all = await req('/api/director/budgets/all', { method: 'POST', token: directorToken, body: { amount: 640 } });
  eq(all.status, 200, 'holat');
  eq(all.json.amount, 640, 'miqdor');
  assert(all.json.teachers >= 9, 'ustozlar soni: ' + all.json.teachers);
  const budgets = await req('/api/director/budgets', { token: directorToken });
  eq(budgets.json.teachers.length, all.json.teachers, 'byudjetlar soni');
  assert(budgets.json.teachers.every((x) => x.amount === 640), 'hamma ustozga bir xil limit qo\'yilmadi');
  const t1 = await login('ustoz1', '1234', nextIp());
  eq(t1.json.user.id, 't_1', 'ustoz id');
  const me = await req('/api/me', { token: t1.json.token });
  eq(me.json.user.budget.amount, 640, 'ustoz /me da yangi limit');
});

await check('direktor byudjeti alohida ustoz uchun ham ishlaydi', async () => {
  const bad = await req('/api/director/budgets', { method: 'POST', token: directorToken, body: { teacherId: 't_1', amount: -5 } });
  eq(bad.status, 400, 'manfiy byudjet');
  const badTeacher = await req('/api/director/budgets', { method: 'POST', token: directorToken, body: { teacherId: 's_1', amount: 100 } });
  eq(badTeacher.status, 404, 'o\'quvchi id si bilan byudjet');
  const good = await req('/api/director/budgets', { method: 'POST', token: directorToken, body: { teacherId: 't_1', amount: 777 } });
  eq(good.status, 200, 'to\'g\'ri so\'rov');
});

// ---------- 10. Shaxsiy ma'lumotlar ----------
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

// ---------- 11. Parolni almashtirish ----------
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

// ---------- 12. Ma'lumotlar diskda ----------
await check('parollar diskda scrypt hash ko\'rinishida', async () => {
  const users = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'users.json'), 'utf8'));
  assert(users.length >= 50, 'foydalanuvchilar soni: ' + users.length);
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

await check('chat xabarlari cheklangan uzunlikda saqlanadi', async () => {
  const messages = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'messages.json'), 'utf8'));
  assert(messages.every((m) => typeof m.text === 'string' && m.text.length <= 2000), 'chegaradan uzun xabar diskda');
});

// ---------- 13. Rate-limit: ro'yxatdan o'tish ----------
await check('ro\'yxatdan o\'tish rate-limitga ega', async () => {
  const ip = nextIp();
  let last = 0;
  for (let i = 0; i < 12; i++) {
    const r = await req('/api/register', {
      method: 'POST',
      ip,
      body: { login: 'limit_' + i, password: 'Parol12345', displayName: 'Limit ' + i, role: 'student', className: '1-A' },
    });
    last = r.status;
  }
  eq(last, 429, 'rate-limit ishlamadi');
});

// ---------- 14. Ishlab chiqarish rejimi (SEED_DEMO=0) ----------
await check('SEED_DEMO=0: demo hisoblar yo\'q, direktor bootstrap va sinflar ishlaydi', async () => {
  const srv = await startServer({
    SEED_DEMO: '0',
    ADMIN_LOGIN: 'rektor',
    ADMIN_PASSWORD: 'KuchliParol2026',
    ADMIN_NAME: 'Bosh Direktor',
  });
  const base = srv.base;
  const post = (p, body) => req(p, { method: 'POST', body, base });

  const demo = await post('/api/login', { login: 'oquvchi1', password: '1234' });
  eq(demo.status, 401, 'demo hisob SEED_DEMO=0 da ham mavjud');

  const admin = await post('/api/login', { login: 'rektor', password: 'KuchliParol2026' });
  eq(admin.status, 200, 'direktor bootstrap hisobi ishlamadi');
  eq(admin.json.user.role, 'director', 'bootstrap hisobi roli');

  const classes = await req('/api/classes', { base });
  eq((classes.json.classes || []).length, 22, 'SEED_DEMO=0 da sinflar yaratilmadi');

  const student = await post('/api/register', {
    login: 'yangi_oquvchi_prod',
    password: 'Parol12345',
    displayName: 'Yangi Oquvchi',
    role: 'student',
    className: '11-B',
  });
  eq(student.status, 200, "SEED_DEMO=0 da o'quvchi ro'yxatdan o'ta olmadi");
  eq(student.json.user.className, '11-B', 'sinf biriktirildi');
  srv.stop();
});

// ---------- 15. Eski ma'lumotlarni migratsiya qilish ----------
await check('eski sinflar (8-A...) va chat xonasi avtomatik yangilanadi', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'im-sec-mig-'));
  // Eski ko'rinishdagi ma'lumotlarni yozamiz
  const oldUsers = [
    { id: 'dir_1', role: 'director', displayName: 'Direktor', login: 'director', phone: '', createdAt: new Date().toISOString() },
    { id: 't_1', role: 'teacher', displayName: 'Ustoz Bir', login: 'ustoz1', phone: '', subject: 'Matematika', createdAt: new Date().toISOString() },
    { id: 's_1', role: 'student', displayName: 'Oquvchi Bir', login: 'oquvchi1', classId: 'c_1', className: '8-A', coins: 10, createdAt: new Date().toISOString() },
  ];
  fs.writeFileSync(path.join(dir, 'users.json'), JSON.stringify(oldUsers));
  fs.writeFileSync(path.join(dir, 'classes.json'), JSON.stringify([
    { id: 'c_1', name: '8-A', teacherId: 't_1' },
    { id: 'c_2', name: '8-B', teacherId: 't_1' },
  ]));
  fs.writeFileSync(path.join(dir, 'subjects.json'), JSON.stringify([{ id: 'sub_1', name: 'Matematika', teacherId: 't_1' }]));
  fs.writeFileSync(path.join(dir, 'messages.json'), JSON.stringify([
    { id: 'm_1', roomId: 'all_teachers', senderId: 'dir_1', senderName: 'Direktor', senderRole: 'director', text: 'Salom', createdAt: new Date().toISOString() },
  ]));
  fs.writeFileSync(path.join(dir, 'attendance.json'), JSON.stringify([
    { id: 'a_1', date: '2026-10-01', studentId: 's_1', studentName: 'Oquvchi Bir', className: '8-A', teacherId: 't_1', teacherName: 'Ustoz Bir', status: 'ketdi', createdAt: new Date().toISOString() },
  ]));

  const port = await freePort();
  const child = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), DATA_DIR: dir, SEED_DEMO: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  child.unref();
  if (child.stdout.unref) child.stdout.unref();
  if (child.stderr.unref) child.stderr.unref();
  const base = 'http://127.0.0.1:' + port;
  const deadline = Date.now() + 60000;
  for (;;) {
    try {
      if ((await fetch(base + '/api/health')).ok) break;
    } catch (e) {
      /* kutamiz */
    }
    if (Date.now() > deadline) throw new Error('Migratsiya serveri ishga tushmadi:\n' + log);
    await new Promise((r) => setTimeout(r, 150));
  }

  assert(log.includes('Migratsiya'), 'migratsiya jurnali yo\'q:\n' + log);
  const classes = (await req('/api/classes', { base })).json.classes;
  eq(classes.length, 22, 'sinflar yangilanmadi');
  eq(classes[0].name, '1-A', 'birinchi sinf');
  const users = JSON.parse(fs.readFileSync(path.join(dir, 'users.json'), 'utf8'));
  const st = users.find((u) => u.id === 's_1');
  eq(st.className, '8-A', 'o\'quvchi sinfi saqlanib qoldi (8-A mavjud)');
  const messages = JSON.parse(fs.readFileSync(path.join(dir, 'messages.json'), 'utf8'));
  eq(messages[0].roomId, 'all_staff', 'chat xonasi nomi yangilanmadi');
  const att = JSON.parse(fs.readFileSync(path.join(dir, 'attendance.json'), 'utf8'));
  eq(att[0].status, 'kelmadi', 'eski holat yangilanmadi');
  eq(att[0].reason, 'boshqa', 'sabab qo\'shilmadi');

  try {
    child.kill('SIGKILL');
  } catch (e) {
    /* ignore */
  }
  fs.rmSync(dir, { recursive: true, force: true });
});

// ============================================================
console.log('\n=== NATIJA ===');
console.log('O\'tdi: ' + pass + ' ta, yiqildi: ' + fail + ' ta');
if (fail) {
  console.log('\nYiqilgan testlar:');
  failures.forEach((f) => console.log('  - ' + f));
  console.log('\nServer jurnali:\n' + main.log());
  process.exit(1);
} else {
  console.log('\x1b[32mBarcha xavfsizlik tekshiruvlari muvaffaqiyatli ✓\x1b[0m');
}
main.stop();
process.exit(fail ? 1 : 0);
