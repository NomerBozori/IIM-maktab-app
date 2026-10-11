// ============================================================
//  Intellekt Innovatsion Maktabi — backend API
//  Node + Express, JSON fayllarda saqlash. Hich qanday
//  tashqi servis (DB, email) kerak emas.
//
//  XAVFSIZLIK (asosiy qoidalar):
//   * Parollar hech qachon ochiq matnda saqlanmaydi — scrypt hash.
//   * Sessiya tokenlari crypto.randomBytes (256 bit) + TTL.
//   * Har bir endpoint foydalanuvchi rolini va egaligini tekshiradi
//     (IDOR yo'q: begona sinf/vazifa/chat/o'quvchiga tegib bo'lmaydi).
//   * Login/ro'yxatdan o'tishda rate-limit va akkaunt bloklash.
//   * CORS faqat ruxsat etilgan origin'lar uchun, xavfsizlik
//     sarlavhalari (nosniff, referrer, CSP...) har javobda.
//   * Kirish ma'lumotlari (input) uzunligi/format bo'yicha tekshiriladi.
// ============================================================
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ---------- .env faylini o'qish (kutubxonasiz) ----------
// Allaqachon o'rnatilgan muhit o'zgaruvchilari ustuvor qoladi.
// Namuna: .env.example
(function loadDotEnv() {
  try {
    const file = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(file)) return;
    for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const i = line.indexOf('=');
      if (i < 1) continue;
      const key = line.slice(0, i).trim();
      if (!/^[A-Z0-9_]+$/i.test(key) || process.env[key] !== undefined) continue;
      let val = line.slice(i + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      process.env[key] = val;
    }
  } catch (e) {
    /* .env ixtiyoriy — xatoni e'tiborsiz qoldiramiz */
  }
})();

const app = express();
const PORT = process.env.PORT || 4000;
// Ma'lumotlar papkasi (test/konteyner uchun DATA_DIR bilan almashtirish mumkin)
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, 'data');

// ---------- sozlamalar (muhit o'zgaruvchilari) ----------
const IS_PROD = process.env.NODE_ENV === 'production';
// Sessiya umri (daqiqa). Standart: 8 soat.
const SESSION_TTL_MS = Math.max(5, Number(process.env.SESSION_TTL_MINUTES) || 480) * 60 * 1000;
// Bir vaqtda saqlanadigan sessiyalar chegarasi (xotira DoS'iga qarshi)
const MAX_SESSIONS = Math.max(100, Number(process.env.MAX_SESSIONS) || 5000);
// Yangi parol uchun minimal uzunlik
const PASSWORD_MIN = Math.max(6, Number(process.env.PASSWORD_MIN_LENGTH) || 8);
// Ustoz/direktor hisobini faqat shu kod bilan ochish mumkin (bo'sh bo'lsa — yopiq)
const STAFF_INVITE_CODE = String(process.env.STAFF_INVITE_CODE || '').trim();
// Demo (namuna) ma'lumotlarni seed qilish: SEED_DEMO=0 bilan o'chiriladi
const SEED_DEMO = process.env.SEED_DEMO !== '0' && process.env.SEED_DEMO !== 'false';
// CORS uchun qo'shimcha origin'lar: CORS_ORIGINS="https://a.uz,https://b.uz"
const CORS_ORIGINS = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
// iframe (clickjacking) siyosati. Standart: preview ishlashi uchun ochiq;
// ishlab chiqarishda: FRAME_ANCESTORS="'self' https://maktab.uz"
const FRAME_ANCESTORS = process.env.FRAME_ANCESTORS === undefined ? '*' : String(process.env.FRAME_ANCESTORS);
// Proxy ortida (Render/Railway/nginx) haqiqiy IP ni olish uchun
const TRUST_PROXY = process.env.TRUST_PROXY === undefined ? 1 : process.env.TRUST_PROXY;

app.disable('x-powered-by');
if (TRUST_PROXY !== 'false' && TRUST_PROXY !== '0') app.set('trust proxy', TRUST_PROXY === 'true' ? true : Number(TRUST_PROXY) || 1);

// ---------- yordamchilar ----------
const now = () => new Date().toISOString();
// ID'lar bashorat qilinmasligi kerak (enumeration'ga qarshi) — crypto tasodifiy
const uid = (p) => p + '_' + crypto.randomBytes(6).toString('hex');
const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
// Kirish matnlarini tozalash: boshqaruv belgilarini olib tashlash + uzunlik chegarasi
function str(v, max = 200) {
  return String(v == null ? '' : v)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim()
    .slice(0, max);
}
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
// Xavfsiz taqqoslash (timing attack'ga qarshi)
function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// ---------- parol hash (scrypt) ----------
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const SCRYPT_KEYLEN = 64;
const scrypt = (password, salt, keylen) =>
  new Promise((resolve, reject) => {
    crypto.scrypt(String(password), salt, keylen, SCRYPT_OPTS, (err, key) => (err ? reject(err) : resolve(key)));
  });

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, SCRYPT_KEYLEN);
  return 'scrypt$' + salt + '$' + key.toString('hex');
}

async function verifyPassword(password, record) {
  const stored = record && record.passwordHash;
  if (typeof stored !== 'string') return false;
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  if (!expected.length) return false;
  let actual;
  try {
    actual = await scrypt(password, salt, expected.length);
  } catch (e) {
    return false;
  }
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

// Parol mavjud bo'lmagan foydalanuvchi uchun ham hash tekshiriladi —
// shunda javob vaqti bo'yicha "login bormi" ni aniqlab bo'lmaydi (timing).
let DECOY_HASH = null;
async function verifyDummy(password) {
  if (!DECOY_HASH) DECOY_HASH = await hashPassword('decoy-password-never-used');
  return verifyPassword(password, { passwordHash: DECOY_HASH });
}

// ---------- JSON fayllar ----------
function dataFile(file) {
  const name = String(file);
  if (!/^[a-z0-9][a-z0-9-]*\.json$/i.test(name)) throw new Error('Xavfsiz bo\'lmagan fayl nomi');
  return path.join(DATA_DIR, name);
}
function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(dataFile(file), 'utf8'));
  } catch (e) {
    return fallback;
  }
}
function writeJson(file, data) {
  const full = dataFile(file);
  fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  // Avval vaqtinchalik faylga yozib, keyin almashtiramiz (atomar yozish),
  // fayl huquqi 0600 — shaxsiy ma'lumotlar boshqa foydalanuvchilarga ko'rinmaydi.
  const tmp = full + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, full);
}

const db = {
  users: readJson('users.json', null),
  classes: readJson('classes.json', null),
  subjects: readJson('subjects.json', null),
  tasks: readJson('tasks.json', []),
  attendance: readJson('attendance.json', []),
  messages: readJson('messages.json', []),
  coinBudgets: readJson('coin-budgets.json', []),
  smsLog: readJson('sms-log.json', []),
  grades: readJson('grades.json', []),
};
db.coinTransactions = readJson('coin-transactions.json', []);

// ---------- boshlang'ish ma'lumdatlar ----------
const MONTHS_UZ = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
const currentMonthLabel = () => MONTHS_UZ[new Date().getMonth()];
const monthKey = () => new Date().toISOString().slice(0, 7);

// ---------- sinflar: 1–11, A = rus tili, B = o'zbek tili ----------
const CLASS_NAMES = [];
for (let g = 1; g <= 11; g++) CLASS_NAMES.push(g + '-A', g + '-B');
const streamOf = (name) => (/-A$/.test(String(name)) ? 'ru' : 'uz');
const STREAM_LABEL = { ru: 'Rus tili', uz: "O'zbek tili" };
function buildClasses(teacherIds) {
  return CLASS_NAMES.map((name, i) => ({
    id: 'c_' + (i + 1),
    name,
    stream: streamOf(name),
    streamLabel: STREAM_LABEL[streamOf(name)],
    teacherId: teacherIds[i % teacherIds.length],
  }));
}

function persistAll() {
  writeJson('users.json', db.users);
  writeJson('classes.json', db.classes);
  writeJson('subjects.json', db.subjects);
  writeJson('tasks.json', db.tasks);
  writeJson('attendance.json', db.attendance);
  writeJson('messages.json', db.messages);
  writeJson('coin-budgets.json', db.coinBudgets);
  writeJson('sms-log.json', db.smsLog);
  writeJson('grades.json', db.grades);
  writeJson('coin-transactions.json', db.coinTransactions);
}

function buildSeedData() {
  const director = {
    id: 'dir_1',
    role: 'director',
    displayName: 'Sardor Karimov',
    login: 'director',
    phone: '+998 90 100 10 10',
    createdAt: now(),
  };

  const teachers = [
    { id: 't_1', name: 'Malika Tursunova', subject: 'Matematika', phone: '+998 90 201 20 20' },
    { id: 't_2', name: 'Jasur Aliyev', subject: 'Fizika', phone: '+998 90 202 20 20' },
    { id: 't_3', name: 'Dilnoza Rahimova', subject: 'Ona tili va adabiyot', phone: '+998 90 203 20 20' },
    { id: 't_4', name: 'Botir Usmonov', subject: 'Ingliz tili', phone: '+998 90 204 20 20' },
    { id: 't_5', name: 'Nigora Saidova', subject: 'Informatika', phone: '+998 90 205 20 20' },
    { id: 't_6', name: 'Akmal Valiyev', subject: 'Tarix', phone: '+998 90 206 20 20' },
    { id: 't_7', name: 'Zarina Qodirova', subject: 'Biologiya', phone: '+998 90 207 20 20' },
    { id: 't_8', name: "Rustam Yo'ldoshev", subject: 'Kimyo', phone: '+998 90 208 20 20' },
    { id: 't_9', name: 'Gulnora Karimova', subject: 'Geografiya', phone: '+998 90 209 20 20' },
  ];

  const teacherUsers = teachers.map((t, i) => ({
    id: t.id,
    role: 'teacher',
    displayName: t.name,
    login: 'ustoz' + (i + 1),
    phone: t.phone,
    subject: t.subject,
    createdAt: now(),
  }));

  const classes = buildClasses(teachers.map((t) => t.id));

  const firstNames = ['Aziz', 'Madina', 'Shahzod', 'Kamola', 'Bekzod', 'Sevara', 'Javohir', 'Dildora', 'Otabek', 'Xurshid', 'Nigina', 'Sardor', 'Gulchehra', 'Farrux', 'Zebo', 'Umid', 'Laylo', 'Jasur', 'Rano', 'Sanjar', 'Malika', 'Bekmurod', 'Shirin', 'Eldor', 'Gavhar', 'Islom', 'Durdona', 'Nodir', 'Mohinur', 'Temur', 'Gulsara', 'Abbos', 'Saodat', 'Muhammad', 'Dilfuza', 'Sherzod', 'Hilola', 'Jahongir', 'Barno', 'Olim'];
  const lastNames = ['Karimov', 'Tursunov', 'Aliyev', 'Rahimov', 'Usmonov', 'Saidov', 'Valiyev', 'Qodirov', "Yo'ldoshev", 'Normatov', 'Ismoilov', 'Xolmatov', 'Ergasov', "To'xtasinov", 'Nazarov', 'Salaev', 'Bektemirov', 'Rasulov', 'Mamatqulov', 'Soliev'];
  const subjNames = ['Matematika', 'Fizika', 'Ona tili va adabiyot', 'Ingliz tili', 'Informatika', 'Tarix', 'Biologiya', 'Kimyo', 'Geografiya'];

  // Har sinfga 3 tadan o'quvchi (22 sinf → 66 o'quvchi)
  const PER_CLASS = 3;
  const students = [];
  classes.forEach((cls, ci) => {
    for (let k = 0; k < PER_CLASS; k++) {
      const i = ci * PER_CLASS + k;
      const coins = 40 + Math.floor(Math.random() * 260);
      const attendance = MONTHS_UZ.slice(0, 3).map((label) => ({ label, percent: 82 + Math.floor(Math.random() * 18) }));
      const monitoring = MONTHS_UZ.slice(0, 3).map((label) => ({ label, percent: 70 + Math.floor(Math.random() * 30) }));
      const grades = subjNames.map((sn) => {
        const list = [];
        const n = 4 + Math.floor(Math.random() * 6);
        for (let g = 0; g < n; g++) list.push(3 + Math.floor(Math.random() * 3));
        return { subject: sn, grades: list };
      });
      students.push({
        id: 's_' + (i + 1),
        role: 'student',
        displayName: firstNames[i % firstNames.length] + ' ' + lastNames[(i + ci) % lastNames.length],
        login: 'oquvchi' + (i + 1),
        classId: cls.id,
        className: cls.name,
        stream: cls.stream,
        coins,
        attendance,
        monitoring,
        grades,
        phone: '+998 90 3' + String(10 + (i % 10)).slice(-2) + ' 00 00',
        createdAt: now(),
      });
    }
  });

  const tasks = [
    {
      id: uid('task'),
      teacherId: 't_1',
      teacherName: 'Malika Tursunova',
      className: '1-A',
      subject: 'Matematika',
      title: 'Tengsizliklar mavzusidan mashqlar',
      description: '1-variant, 45-52 mashqlar.',
      dueDate: '2026-10-09',
      createdAt: now(),
      completedBy: [],
    },
    {
      id: uid('task'),
      teacherId: 't_1',
      teacherName: 'Malika Tursunova',
      className: '1-A',
      subject: 'Matematika',
      title: 'Geometriya: Pifagor teoremasi',
      description: 'Daftarga 3 misol yechib yozing.',
      dueDate: '2026-10-12',
      createdAt: now(),
      completedBy: [],
    },
    {
      id: uid('task'),
      teacherId: 't_4',
      teacherName: 'Botir Usmonov',
      className: '2-B',
      subject: 'Ingliz tili',
      title: "Unit 3 lug'atini yodlash",
      description: "20 yangi so'z va 5 ta gap.",
      dueDate: '2026-10-10',
      createdAt: now(),
      completedBy: [],
    },
  ];

  return {
    users: [...students, ...teacherUsers, director],
    classes,
    subjects: teachers.map((t, i) => ({ id: 'sub_' + (i + 1), name: t.subject, teacherId: t.id })),
    tasks,
  };
}

// Eski ma'lumotlarni yangi tuzilmaga o'tkazish (idempotent).
//  * sinflar: 1–11 A/B (22 sinf) + o'quvchilarni sinf nomi bo'yicha qayta bog'lash
//  * chat: eski "all_teachers" xonasi -> "all_staff" (ustozlar + direktor)
//  * davomat: eski holatlar (ketdi/kirmadi) -> kelmadi + sabab, classId qo'shiladi
function migrateData() {
  const changes = [];

  // --- sinflar ---
  const teacherIds = db.users.filter((u) => u.role === 'teacher').map((u) => u.id);
  const hasNewClasses = Array.isArray(db.classes) && CLASS_NAMES.every((n) => db.classes.some((c) => c.name === n));
  if (!hasNewClasses && teacherIds.length) {
    const oldByName = new Map((db.classes || []).map((c) => [c.name, c]));
    const fresh = buildClasses(teacherIds).map((c) => {
      const prev = oldByName.get(c.name);
      return prev && prev.teacherId && teacherIds.includes(prev.teacherId) ? { ...c, teacherId: prev.teacherId } : c;
    });
    db.classes = fresh;
    const byName = new Map(fresh.map((c) => [c.name, c]));
    db.users.forEach((u, i) => {
      if (u.role !== 'student') return;
      const cls = byName.get(u.className);
      if (cls) {
        u.classId = cls.id;
        u.stream = cls.stream;
      } else {
        const fallback = fresh[i % fresh.length];
        u.classId = fallback.id;
        u.className = fallback.name;
        u.stream = fallback.stream;
      }
    });
    changes.push('sinflar 1–11 (A/B) tuzilmasiga o\'tkazildi: ' + fresh.length + ' sinf');
  }

  // --- chat xonasi nomi ---
  let renamed = 0;
  db.messages.forEach((m) => {
    if (m.roomId === LEGACY_STAFF_ROOM) {
      m.roomId = STAFF_ROOM;
      renamed += 1;
    }
  });
  if (renamed) changes.push(renamed + ' ta chat xabari "all_staff" xonasiga ko\'chirildi');

  // --- davomat: holatlar va classId ---
  let fixed = 0;
  db.attendance.forEach((a) => {
    if (a.status === 'ketdi' || a.status === 'kirmadi') {
      a.status = 'kelmadi';
      if (!a.reason) {
        a.reason = 'boshqa';
        a.reasonLabel = ATT_REASON_LABEL.boshqa;
      }
      fixed += 1;
    }
    if (!a.classId) {
      const st = db.users.find((u) => u.id === a.studentId);
      if (st && st.classId) a.classId = st.classId;
      fixed += 1;
    }
    if (!a.className) {
      const st = db.users.find((u) => u.id === a.studentId);
      if (st) a.className = st.className;
    }
  });
  if (fixed) changes.push(fixed + ' ta davomat yozuvi yangi ko\'rinishga o\'tkazildi');

  return changes;
}

// Boshlang'ich ma'lumotlar + eski (ochiq matnli) parollarni hash'ga o'tkazish
async function initData() {
  let newSeed = false;
  if (!Array.isArray(db.users)) {
    if (!SEED_DEMO) {
      // Namuna (demo) hisoblar yaratilmaydi, lekin tuzilma kerak:
      // sinflarsiz o'quvchi ro'yxatdan o'ta olmaydi.
      const structure = buildSeedData();
      db.users = [];
      db.classes = Array.isArray(db.classes) && db.classes.length ? db.classes : structure.classes;
      db.subjects = Array.isArray(db.subjects) && db.subjects.length ? db.subjects : structure.subjects;
      db.tasks = Array.isArray(db.tasks) ? db.tasks : [];
      const login = str(process.env.ADMIN_LOGIN, 40).toLowerCase();
      const password = String(process.env.ADMIN_PASSWORD || '');
      if (login && password) {
        if (password.length < PASSWORD_MIN) {
          console.error('ADMIN_PASSWORD juda qisqa (kamida ' + PASSWORD_MIN + ' belgi) — direktor hisobi yaratilmadi.');
        } else {
          db.users.push({
            id: uid('dir'),
            role: 'director',
            displayName: str(process.env.ADMIN_NAME, 60) || 'Direktor',
            login,
            passwordHash: await hashPassword(password),
            phone: '',
            createdAt: now(),
          });
          console.log('Direktor hisobi yaratildi: ' + login);
        }
      } else {
        console.warn('SEED_DEMO=0 — demo hisoblar yaratilmadi.');
        console.warn('        Direktor hisobini ochish uchun birinchi ishga tushishda');
        console.warn('        ADMIN_LOGIN va ADMIN_PASSWORD (kamida ' + PASSWORD_MIN + ' belgi) qo\'ying.');
      }
      persistAll();
      return;
    }
    const seed = buildSeedData();
    db.users = seed.users;
    db.classes = seed.classes;
    db.subjects = seed.subjects;
    db.tasks = seed.tasks;
    newSeed = true;
  }
  db.classes = db.classes || [];
  db.subjects = db.subjects || [];
  db.tasks = db.tasks || [];

  if (newSeed) {
    // Demo akkauntlar bir xil boshlang'ich parolga ega — hash bir marta
    // hisoblanadi (har bir hisob uchun scrypt takrorlanmaydi).
    const demoHash = await hashPassword('1234');
    db.users.forEach((u) => {
      u.passwordHash = demoHash;
      u.demo = true;
      delete u.password;
    });
    console.log('Namuna ma\'lumotlar yaratildi: ' + db.users.length + ' ta hisob (parol: 1234 — ishlab chiqarishda o\'zgartiring!)');
  } else {
    // Eski versiyadan qolgan ochiq matnli parollarni hash'ga o'tkazamiz
    let migrated = 0;
    for (const u of db.users) {
      if (!u.passwordHash && typeof u.password === 'string' && u.password) {
        u.passwordHash = await hashPassword(u.password);
        u.demo = true; // eski standart parol hali almashtirilmagan
        migrated += 1;
      }
      delete u.password; // ochiq matnli parol hech qachon saqlanmaydi
    }
    if (migrated) console.log('Xavfsizlik: ' + migrated + ' ta hisob paroli hash\'landi (scrypt).');
  }

  const migrationChanges = migrateData();
  migrationChanges.forEach((c) => console.log('Migratsiya: ' + c));

  const demoLeft = db.users.filter((u) => u.demo).length;
  if (demoLeft) {
    console.warn((IS_PROD ? 'XAVFSIZLIK: ' : 'DIQQAT: ') + demoLeft + ' ta hisob namuna (demo) parol bilan ishlaydi.');
    console.warn('            Ishlab chiqarishda demo hisoblarni o\'chirib, kuchli parol qo\'ying (yoki SEED_DEMO=0).');
  }
  persistAll();
}

// ---------- sinflar ro'yxati ----------
// Ro'yxatdan o'tishda sinf tanlash uchun kerak — shaxsiy ma'lumot yo'q.
app.get('/api/classes', (req, res) => {
  res.json({
    classes: db.classes.map((c) => ({ id: c.id, name: c.name, stream: c.stream || streamOf(c.name) })),
  });
});

// ---------- sessiyalar ----------
const sessions = new Map(); // token -> { userId, role, createdAt, lastSeen, ip }

function pruneSessions() {
  const t = Date.now();
  for (const [token, s] of sessions) {
    if (!s || t - s.lastSeen > SESSION_TTL_MS) sessions.delete(token);
  }
  // Chegaradan oshsa — eng eski sessiyalarni o'chiramiz
  if (sessions.size > MAX_SESSIONS) {
    const sorted = [...sessions.entries()].sort((a, b) => a[1].lastSeen - b[1].lastSeen);
    sorted.slice(0, sessions.size - MAX_SESSIONS).forEach(([token]) => sessions.delete(token));
  }
}

function createSession(user, ip) {
  pruneSessions();
  const token = crypto.randomBytes(32).toString('base64url');
  sessions.set(token, { userId: user.id, role: user.role, createdAt: Date.now(), lastSeen: Date.now(), ip: str(ip, 60) });
  return token;
}

function getSession(token) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 200) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (Date.now() - s.lastSeen > SESSION_TTL_MS) {
    sessions.delete(token);
    return null;
  }
  s.lastSeen = Date.now();
  return s;
}

// Parol o'zgarganda boshqa qurilmalardagi sessiyalar bekor qilinadi
function invalidateUserSessions(userId, keepToken) {
  for (const [token, s] of sessions) {
    if (s.userId === userId && token !== keepToken) sessions.delete(token);
  }
}

function auth(req, res, next) {
  const header = req.headers['x-token'] || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const token = Array.isArray(header) ? header[0] : header;
  const s = getSession(token);
  if (!s) return res.status(401).json({ error: 'Sessiya tugagan yoki token xato' });
  const user = db.users.find((u) => u.id === s.userId);
  if (!user) {
    sessions.delete(token);
    return res.status(401).json({ error: 'auth' });
  }
  req.user = user;
  req.token = token;
  next();
}
const isTeacher = (req) => req.user && req.user.role === 'teacher';
const isDirector = (req) => req.user && req.user.role === 'director';
const isStudent = (req) => req.user && req.user.role === 'student';

// Faqat kerakli maydonlar qaytariladi — parol hash hech qachon javobga tushmaydi
const PUBLIC_FIELDS = ['id', 'role', 'displayName', 'login', 'classId', 'className', 'subject', 'phone', 'coins', 'attendance', 'monitoring', 'grades', 'createdAt'];
function publicUser(u) {
  const out = {};
  PUBLIC_FIELDS.forEach((k) => {
    if (u[k] !== undefined) out[k] = u[k];
  });
  if (u.demo) out.demo = true;
  // O'quvchi uchun oqim yorlig'i (A — rus tili, B — o'zbek tili)
  if (u.role === 'student' && u.className) out.streamLabel = STREAM_LABEL[streamOf(u.className)] || '';
  return out;
}

// ---------- xavfsizlik middleware'lari ----------
const FRAME_CSP = FRAME_ANCESTORS ? '; frame-ancestors ' + FRAME_ANCESTORS : '';
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'" + FRAME_CSP;

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
  if (req.secure || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  // Vite dev server inline/HMR skriptlaridan foydalanadi — CSP faqat build bilan
  if (fs.existsSync(path.join(__dirname, '..', 'client', 'dist'))) res.setHeader('Content-Security-Policy', CSP);
  next();
});

// CORS: standart holatda faqat bir xil origin (frontend bir serverdan beriladi).
// Ruxsat etilganlar: CORS_ORIGINS, localhost (dev) va *.e2b.app (sandbox preview).
function isAllowedOrigin(origin) {
  if (!origin) return true; // bir xil origin / server-server so'rov
  if (CORS_ORIGINS.includes(origin)) return true;
  try {
    const u = new URL(origin);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    if (['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname)) return true;
    if (/\.e2b\.app$/i.test(u.hostname)) return true;
  } catch (e) {
    return false;
  }
  return false;
}
app.use(
  cors({
    origin(origin, cb) {
      cb(null, isAllowedOrigin(origin));
    },
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Token', 'Authorization'],
    maxAge: 600,
  })
);

app.use(express.json({ limit: '1mb' }));

// Oddiy rate-limit (xotirada). Kalit odatda IP manzil.
const limiters = [];
function rateLimit({ windowMs, max, message, key }) {
  const hits = new Map();
  const timer = setInterval(() => {
    const t = Date.now();
    for (const [k, v] of hits) if (v.resetAt <= t) hits.delete(k);
  }, windowMs);
  if (timer.unref) timer.unref();
  const mw = (req, res, next) => {
    const k = String((key ? key(req) : req.ip) || 'unknown');
    const t = Date.now();
    let e = hits.get(k);
    if (!e || e.resetAt <= t) {
      e = { count: 0, resetAt: t + windowMs };
      hits.set(k, e);
    }
    e.count += 1;
    if (e.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((e.resetAt - t) / 1000)));
      return res.status(429).json({ error: message });
    }
    next();
  };
  mw.__hits = hits;
  limiters.push(mw);
  return mw;
}
// Umumiy chegara: IP uchun daqiqasiga 300 so'rov (ilova chatni 4 sekundda
// bir marta so'raydi — normal foydalanishga xalaqit bermaydi).
const globalLimiter = rateLimit({ windowMs: 60 * 1000, max: 300, message: "So'rovlar juda ko'p. Bir daqiqadan so'ng urinib ko'ring." });
const loginLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 30, message: "Juda ko'p kirish urinishi. 10 daqiqadan so'ng urinib ko'ring." });
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: "Ro'yxatdan o'tish urinishlari ko'paydi. Keyinroq urinib ko'ring." });
const passwordLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Parolni o'zgartirish urinishlari ko'paydi. Keyinroq urinib ko'ring." });

// Akkauntni bloklash: 5 marta xato paroldan keyin 15 daqiqa
const MAX_LOGIN_FAILS = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const loginFails = new Map(); // login -> { count, until }
function loginLockLeft(login) {
  const e = loginFails.get(login);
  if (!e) return 0;
  if (e.until && e.until > Date.now()) return e.until - Date.now();
  if (e.until && e.until <= Date.now()) loginFails.delete(login);
  return 0;
}
function recordLoginFail(login) {
  const e = loginFails.get(login) || { count: 0, until: 0 };
  e.count += 1;
  if (e.count >= MAX_LOGIN_FAILS) {
    e.until = Date.now() + LOGIN_LOCK_MS;
    e.count = 0;
  }
  loginFails.set(login, e);
}

app.use('/api', globalLimiter);

// ---------- umumiy ----------
app.get('/api/health', (req, res) => res.json({ ok: true, app: 'Intellekt Innovatsion Maktabi' }));

app.post('/api/login', loginLimiter, async (req, res) => {
  const body = req.body || {};
  const login = str(body.login, 40).toLowerCase();
  const password = String(body.password == null ? '' : body.password).slice(0, 128);
  if (!login || !password) return res.status(400).json({ error: 'Login va parol kiritilishi shart' });

  const lockLeft = loginLockLeft(login);
  if (lockLeft) {
    res.setHeader('Retry-After', String(Math.ceil(lockLeft / 1000)));
    return res.status(429).json({ error: "Akkaunt vaqtincha bloklandi. " + Math.ceil(lockLeft / 60000) + " daqiqadan so'ng urinib ko'ring." });
  }

  const user = db.users.find((u) => u.login === login);
  // Foydalanuvchi topilmasa ham hash tekshiriladi (javob vaqti bir xil bo'lsin)
  const ok = user ? await verifyPassword(password, user) : await verifyDummy(password);
  if (!ok) {
    recordLoginFail(login);
    return res.status(401).json({ error: 'Login yoki parol xato' });
  }
  loginFails.delete(login);
  const token = createSession(user, req.ip);
  res.json({ token, user: publicUser(user) });
});

app.post('/api/logout', auth, (req, res) => {
  sessions.delete(req.token);
  res.json({ ok: true });
});

app.post('/api/register', registerLimiter, async (req, res) => {
  const body = req.body || {};
  const login = str(body.login, 40).toLowerCase();
  const password = String(body.password == null ? '' : body.password);
  const displayName = str(body.displayName, 60);
  const role = str(body.role, 20).toLowerCase() || 'student';

  if (!login || !password || !displayName) return res.status(400).json({ error: 'Login, parol va ism kiritilishi shart' });
  if (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(login)) return res.status(400).json({ error: 'Login 3-40 belgi: faqat harf, raqam, nuqta, pastki chiziq va chiziqcha' });
  if (password.length < PASSWORD_MIN) return res.status(400).json({ error: 'Parol kamida ' + PASSWORD_MIN + ' belgidan iborat bo\'lishi kerak' });
  if (password.length > 128) return res.status(400).json({ error: 'Parol juda uzun' });
  if (!['student', 'teacher'].includes(role)) {
    // Direktor hisobi API orqali ochilmaydi — bu ataylab shunday
// (faqat ADMIN_LOGIN/ADMIN_PASSWORD orqali, birinchi ishga tushishda)
    return res.status(403).json({ error: 'Bu rolni ro\'yxatdan o\'tkazish mumkin emas' });
  }
  if (role === 'teacher' && (!STAFF_INVITE_CODE || !safeEqual(str(body.inviteCode, 100), STAFF_INVITE_CODE))) {
    return res.status(403).json({ error: 'Ustoz hisobini faqat direktor taklif kodi bilan ochadi' });
  }
  if (db.users.some((u) => u.login === login)) return res.status(409).json({ error: 'Bu login band' });

  let classId = null;
  let className = null;
  let subject = '';
  if (role === 'student') {
    const wanted = str(body.className, 20);
    const cls = db.classes.find((c) => c.name === wanted) || null;
    if (!cls) return res.status(400).json({ error: 'Sinf topilmadi. Mavjud sinflardan birini tanlang' });
    classId = cls.id;
    className = cls.name;
  } else {
    subject = str(body.subject, 60);
  }

  const user = {
    id: uid(role === 'student' ? 's' : 't'),
    role,
    displayName,
    login,
    passwordHash: await hashPassword(password),
    classId,
    className,
    subject,
    phone: '',
    coins: 0,
    attendance: [],
    monitoring: [],
    grades: [],
    createdAt: now(),
  };
  db.users.push(user);
  persistAll();
  const token = createSession(user, req.ip);
  res.json({ token, user: publicUser(user) });
});

app.get('/api/me', auth, (req, res) => {
  const me = publicUser(req.user);
  if (req.user.role === 'teacher') {
    const mine = db.classes.filter((c) => c.teacherId === req.user.id);
    me.classes = mine.map((c) => c.name);
    me.classIds = mine.map((c) => c.id);
    me.budget = budgetForTeacher(req.user.id);
    me.sms = db.smsLog.filter((s) => s.teacherId === req.user.id).slice(-5).reverse();
  }
  if (req.user.role === 'student') {
    me.streamLabel = STREAM_LABEL[streamOf(req.user.className)] || '';
  }
  res.json({ user: me });
});

app.put('/api/me', auth, passwordLimiter, async (req, res) => {
  const body = req.body || {};
  let changed = false;

  if (body.displayName !== undefined) {
    const displayName = str(body.displayName, 60);
    if (!displayName) return res.status(400).json({ error: 'Ism bo\'sh bo\'lishi mumkin emas' });
    if (displayName !== req.user.displayName) {
      req.user.displayName = displayName;
      changed = true;
    }
  }

  if (body.password !== undefined) {
    const current = String(body.currentPassword == null ? '' : body.currentPassword).slice(0, 128);
    const next = String(body.password == null ? '' : body.password);
    if (!current) return res.status(400).json({ error: 'Joriy parolni kiriting' });
    if (!(await verifyPassword(current, req.user))) {
      recordLoginFail(req.user.login);
      return res.status(403).json({ error: 'Joriy parol xato' });
    }
    if (next.length < PASSWORD_MIN) return res.status(400).json({ error: 'Yangi parol kamida ' + PASSWORD_MIN + ' belgi bo\'lishi kerak' });
    if (next.length > 128) return res.status(400).json({ error: 'Parol juda uzun' });
    if (next === current) return res.status(400).json({ error: 'Yangi parol eskisidan farq qilishi kerak' });
    req.user.passwordHash = await hashPassword(next);
    delete req.user.demo;
    changed = true;
    // Boshqa qurilmalardagi sessiyalar bekor qilinadi
    invalidateUserSessions(req.user.id, req.token);
  }

  if (changed) persistAll();
  res.json({ user: publicUser(req.user) });
});

// ---------- coin byudjeti ----------
function budgetForTeacher(teacherId) {
  const month = monthKey();
  let b = db.coinBudgets.find((x) => x.teacherId === teacherId && x.month === month);
  if (!b) {
    b = { id: uid('b'), teacherId, month, amount: 500, distributed: 0 };
    db.coinBudgets.push(b);
    persistAll();
  }
  const distributed = db.coinTransactions
    .filter((t) => t.teacherId === teacherId && t.month === month)
    .reduce((a, t) => a + t.amount, 0);
  return { month, amount: b.amount, distributed, left: b.amount - distributed };
}

// ---------- reyting ----------
const colors = ['#C9A227', '#1B3A5C', '#2E6DA4', '#6B4E9B', '#1F6B4A', '#A8871F', '#C0503F', '#14B8A6'];
function colorFor(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return colors[h % colors.length];
}
function attendancePercent(u) {
  if (!u.attendance || !u.attendance.length) return 0;
  return Math.round(u.attendance.reduce((a, x) => a + num(x.percent), 0) / u.attendance.length);
}
function monitoringPercent(u) {
  if (!u.monitoring || !u.monitoring.length) return 0;
  return Math.round(u.monitoring.reduce((a, x) => a + num(x.percent), 0) / u.monitoring.length);
}
function rankRow(u) {
  return {
    id: u.id,
    displayName: u.displayName,
    className: u.className || '—',
    avatarColor: colorFor(u.id),
    coins: num(u.coins),
    attendance: attendancePercent(u),
    monitoring: monitoringPercent(u),
  };
}

app.get('/api/rankings', auth, (req, res) => {
  const students = db.users.filter((u) => u.role === 'student');
  const byCoins = [...students].sort((a, b) => num(b.coins) - num(a.coins)).map((u, i) => ({ ...rankRow(u), rank: i + 1, score: num(u.coins) }));
  const byAttendance = [...students].map((u) => ({ u, p: attendancePercent(u) })).sort((a, b) => b.p - a.p).map((x, i) => ({ ...rankRow(x.u), rank: i + 1, score: x.p }));
  const byMonitoring = [...students].map((u) => ({ u, p: monitoringPercent(u) })).sort((a, b) => b.p - a.p).map((x, i) => ({ ...rankRow(x.u), rank: i + 1, score: x.p }));
  res.json({ byCoins, byAttendance, byMonitoring });
});

// ---------- o'quvchi statistikasi (faqat statistika ko'rinadi) ----------
// Diqqat: bu yerda faqat o'qish natijalari qaytariladi — telefon, login,
// parol va boshqa shaxsiy ma'lumotlar hech qachon chiqmaydi.
app.get('/api/students/:id/stats', auth, (req, res) => {
  const id = str(req.params.id, 40);
  const s = db.users.find((u) => u.id === id && u.role === 'student');
  if (!s) return res.status(404).json({ error: 'Topilmadi' });
  res.json({
    id: s.id,
    displayName: s.displayName,
    className: s.className,
    avatarColor: colorFor(s.id),
    coins: num(s.coins),
    attendance: s.attendance || [],
    monitoring: s.monitoring || [],
    grades: s.grades || [],
  });
});

// ---------- dars jadvali ----------
const DAYS = ['dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
const DAYS_LABEL = { dushanba: 'Dushanba', seshanba: 'Seshanba', chorshanba: 'Chorshanba', payshanba: 'Payshanba', juma: 'Juma', shanba: 'Shanba' };

function seedSchedule() {
  // Har bir sinf uchun har kunga 4-6 ta dars (soatbay dars)
  const rows = [];
  const subs = db.subjects;
  const perDay = { dushanba: 6, seshanba: 5, chorshanba: 6, payshanba: 5, juma: 5, shanba: 4 };

  db.classes.forEach((cls, ci) => {
    DAYS.forEach((day, di) => {
      const n = perDay[day];
      for (let i = 0; i < n; i++) {
        // sinf ustozi o'z fanidan kamida 1-2 soat, qolganlari boshqa fanlardan
        const own = subs.find((s) => s.teacherId === cls.teacherId);
        const other = subs[(ci + di + i) % subs.length];
        const sub = i === 0 && own ? own : other;
        rows.push({
          id: uid('sch'),
          day,
          className: cls.name,
          subject: sub.name,
          teacherId: sub.teacherId,
          start: 8 + i + ':30',
          end: 9 + i + ':15',
          hours: 1,
        });
      }
    });
  });
  return rows;
}

// Jadval fayli faqat ma'lum rollar uchun (fayl nomiga tashqi qiymat tushmaydi)
const SCHEDULE_ROLES = ['student', 'teacher', 'director'];
function scheduleFor(role) {
  if (!SCHEDULE_ROLES.includes(role)) return [];
  const file = 'schedule-' + role + '.json';
  let rows = readJson(file, []);
  if (!Array.isArray(rows) || !rows.length) {
    rows = seedSchedule();
    writeJson(file, rows);
  }
  return rows;
}

app.get('/api/schedule', auth, (req, res) => {
  const rows = scheduleFor(req.user.role);
  let list = rows;
  if (req.user.role === 'student') list = rows.filter((r) => r.className === req.user.className);
  if (req.user.role === 'teacher') {
    const names = db.classes.filter((c) => c.teacherId === req.user.id).map((c) => c.name);
    list = rows.filter((r) => names.includes(r.className));
  }
  res.json({ days: DAYS, dayLabels: DAYS_LABEL, schedule: list });
});

// ---------- vazifalar ----------
const myClassNames = (user) => db.classes.filter((c) => c.teacherId === user.id).map((c) => c.name);

app.get('/api/tasks', auth, (req, res) => {
  let list = db.tasks;
  if (req.user.role === 'student') list = list.filter((t) => t.className === req.user.className);
  if (req.user.role === 'teacher') list = list.filter((t) => t.teacherId === req.user.id);
  res.json({ tasks: list });
});

app.post('/api/tasks', auth, (req, res) => {
  if (!isTeacher(req)) return res.status(403).json({ error: 'Faqat ustozlar vazifa bera oladi' });
  const body = req.body || {};
  const title = str(body.title, 120);
  if (!title) return res.status(400).json({ error: 'Vazifa nomi kiritilishi shart' });
  const mine = myClassNames(req.user);
  const className = str(body.className, 20) || mine[0] || '';
  // Ustoz faqat o'zi biriktirilgan sinfga vazifa bera oladi
  if (!mine.length || !mine.includes(className)) return res.status(403).json({ error: 'Bu sinf sizga biriktirilmagan' });
  const dueDate = str(body.dueDate, 10);
  if (dueDate && !isDate(dueDate)) return res.status(400).json({ error: 'Muddat formati YYYY-MM-DD bo\'lishi kerak' });
  const task = {
    id: uid('task'),
    teacherId: req.user.id,
    teacherName: req.user.displayName,
    className,
    subject: str(body.subject, 60) || req.user.subject || 'Umumiy',
    title,
    description: str(body.description, 500),
    dueDate,
    createdAt: now(),
    completedBy: [],
  };
  db.tasks.push(task);
  persistAll();
  res.json({ task });
});

app.post('/api/tasks/:id/done', auth, (req, res) => {
  if (!isStudent(req)) return res.status(403).json({ error: "Faqat o'quvchilar bajarilgan deb belgilaydi" });
  const id = str(req.params.id, 40);
  const t = db.tasks.find((x) => x.id === id);
  // Vazifa o'quvchining o'z sinfiga tegishli bo'lishi shart
  if (!t || t.className !== req.user.className) return res.status(404).json({ error: 'Topilmadi' });
  t.completedBy = Array.isArray(t.completedBy) ? t.completedBy : [];
  if (!t.completedBy.includes(req.user.id)) t.completedBy.push(req.user.id);
  persistAll();
  res.json({ ok: true });
});

// ---------- davomat ----------
// Holatlar: keldi / kelmadi. "kelmadi" uchun sabab majburiy.
const ATT_STATUSES = ['keldi', 'kelmadi'];
const ATT_REASONS = ['kasallik', 'oilaviy', 'boshqa'];
const ATT_REASON_LABEL = { kasallik: 'Kasallik', oilaviy: 'Oilaviy sabab', boshqa: 'Boshqa' };
// Davomatni saqlagandan keyin shu vaqt ichida tahrirlash mumkin (standart: 24 soat)
const ATT_EDIT_WINDOW_MS = Math.max(0, Number(process.env.ATT_EDIT_WINDOW_MINUTES ?? 1440)) * 60 * 1000;

// Bir sinf + sana uchun yozuvlar guruhi qachondan beri tahrirlanmaydi
function attendanceGroupLock(records) {
  if (!records.length) return 0; // hali saqlanmagan — tahrir mumkin
  const oldest = records.reduce((min, r) => {
    const t = Date.parse(r.createdAt);
    return Number.isFinite(t) && (min === null || t < min) ? t : min;
  }, null);
  if (oldest === null) return 0;
  return oldest + ATT_EDIT_WINDOW_MS;
}

app.get('/api/attendance', auth, (req, res) => {
  let list = db.attendance;
  if (req.user.role === 'student') list = list.filter((a) => a.studentId === req.user.id);
  if (req.user.role === 'teacher') list = list.filter((a) => a.teacherId === req.user.id);
  // Guruh (sinf + sana + ustoz) bo'yicha tahrir holati
  const groups = new Map();
  list.forEach((a) => {
    const key = a.classId + '|' + a.date + '|' + a.teacherId;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(a);
  });
  const locks = new Map();
  groups.forEach((records, key) => locks.set(key, attendanceGroupLock(records)));
  const records = list.map((a) => {
    const until = locks.get(a.classId + '|' + a.date + '|' + a.teacherId) || 0;
    return { ...a, canEdit: !until || Date.now() < until, editableUntil: until || null };
  });
  res.json({ records, editWindowHours: ATT_EDIT_WINDOW_MS / 3600000 });
});

app.post('/api/attendance', auth, (req, res) => {
  if (!isTeacher(req)) return res.status(403).json({ error: 'Faqat ustozlar davomat qiladi' });
  const body = req.body || {};
  const entries = body.entries;
  if (!Array.isArray(entries) || !entries.length) return res.status(400).json({ error: "Davomat ma'lumotlari yo'q" });
  if (entries.length > 400) return res.status(400).json({ error: "Bir vaqtda 400 tadan ko'p yozuv yuborilmaydi" });

  const d = str(body.date, 10) || new Date().toISOString().slice(0, 10);
  if (!isDate(d)) return res.status(400).json({ error: 'Sana formati YYYY-MM-DD bo\'lishi kerak' });

  // Ustoz faqat o'ziga biriktirilgan sinfning davomatini qiladi
  const classId = str(body.classId, 40);
  const cls = db.classes.find((c) => c.id === classId && c.teacherId === req.user.id);
  if (!cls) return res.status(403).json({ error: 'Bu sinf sizga biriktirilmagan' });
  const classStudents = db.users.filter((u) => u.role === 'student' && u.classId === cls.id);
  if (!classStudents.length) return res.status(400).json({ error: 'Bu sinfda o\'quvchi yo\'q' });

  // Belgilanganlarni yig'amiz (faqat shu sinf o'quvchilari hisobga olinadi)
  const marks = new Map();
  let badEntry = null;
  for (const e of entries) {
    const studentId = str(e && e.studentId, 40);
    const student = classStudents.find((u) => u.id === studentId);
    if (!student) continue; // boshqa sinf o'quvchisi — e'tiborsiz
    const status = str(e && e.status, 20).toLowerCase();
    if (!ATT_STATUSES.includes(status)) {
      badEntry = 'Holat noto\'g\'ri: ' + (student.displayName || studentId);
      break;
    }
    const reason = str(e && e.reason, 20).toLowerCase();
    if (status === 'kelmadi' && !ATT_REASONS.includes(reason)) {
      badEntry = 'Kelmaganlik sababi tanlanmagan: ' + student.displayName;
      break;
    }
    marks.set(studentId, {
      status,
      reason: status === 'kelmadi' ? reason : '',
      reasonLabel: status === 'kelmadi' ? ATT_REASON_LABEL[reason] : '',
      note: status === 'kelmadi' ? str(e && e.note, 200) : '',
      subject: str(e && e.subject, 60) || req.user.subject || '',
    });
  }
  if (badEntry) return res.status(400).json({ error: badEntry });

  // HAMMA o'quvchi belgilanmaguncha saqlanmaydi
  if (marks.size !== classStudents.length) {
    return res.status(400).json({
      error: 'Davomat saqlanmadi: sinfdagi barcha o\'quvchilarni belgilang (' + marks.size + '/' + classStudents.length + ')',
      marked: marks.size,
      total: classStudents.length,
    });
  }

  // 24 soat qoidasi: avval saqlangan bo'lsa, faqat tahrir oynasi ichida yangilash mumkin
  const existing = db.attendance.filter((a) => a.classId === cls.id && a.date === d && a.teacherId === req.user.id);
  const lockUntil = attendanceGroupLock(existing);
  if (existing.length && lockUntil && Date.now() >= lockUntil) {
    return res.status(403).json({
      error: 'Bu davomat ' + Math.round(ATT_EDIT_WINDOW_MS / 3600000) + ' soat oldin saqlangan — endi o\'zgartirib bo\'lmaydi',
      locked: true,
    });
  }

  const updated = existing.length > 0;
  if (updated) {
    // Avvalgisini o'chirib, yangisini yozamiz (tahrir)
    db.attendance = db.attendance.filter((a) => !(a.classId === cls.id && a.date === d && a.teacherId === req.user.id));
  }

  marks.forEach((m, studentId) => {
    const student = classStudents.find((u) => u.id === studentId);
    db.attendance.push({
      id: uid('att'),
      date: d,
      classId: cls.id,
      className: cls.name,
      studentId,
      studentName: student.displayName,
      teacherId: req.user.id,
      teacherName: req.user.displayName,
      subject: m.subject,
      status: m.status,
      reason: m.reason,
      reasonLabel: m.reasonLabel,
      note: m.note,
      createdAt: now(),
    });
    recalcAttendance(student);
  });
  persistAll();
  res.json({ ok: true, saved: marks.size, updated, editWindowHours: ATT_EDIT_WINDOW_MS / 3600000 });
});

function recalcAttendance(student) {
  const mine = db.attendance.filter((a) => a.studentId === student.id);
  if (!mine.length) return;
  const month = monthKey();
  const thisMonth = mine.filter((a) => String(a.date).slice(0, 7) === month);
  if (!thisMonth.length) return;
  const present = thisMonth.filter((a) => a.status === 'keldi').length;
  const p = Math.round((present / thisMonth.length) * 100);
  const label = currentMonthLabel();
  student.attendance = student.attendance || [];
  const idx = student.attendance.findIndex((x) => x.label === label);
  if (idx >= 0) student.attendance[idx].percent = p;
  else student.attendance.push({ label, percent: p });
}

// Direktor: bugun kim davomat qilmagan
app.get('/api/director/attendance-check', auth, (req, res) => {
  if (!isDirector(req)) return res.status(403).json({ error: 'Faqat direktor uchun' });
  const today = new Date().toISOString().slice(0, 10);
  const teachers = db.users.filter((u) => u.role === 'teacher').map((t) => ({
    id: t.id,
    displayName: t.displayName,
    subject: t.subject,
    phone: t.phone,
    classes: db.classes.filter((c) => c.teacherId === t.id).map((c) => c.name),
    submittedToday: db.attendance.some((a) => a.teacherId === t.id && a.date === today),
  }));
  res.json({ date: today, teachers });
});

app.post('/api/director/send-sms', auth, (req, res) => {
  if (!isDirector(req)) return res.status(403).json({ error: 'Faqat direktor uchun' });
  const body = req.body || {};
  const teacher = db.users.find((u) => u.id === str(body.teacherId, 40) && u.role === 'teacher');
  if (!teacher) return res.status(404).json({ error: 'Ustoz topilmadi' });
  const cls = db.classes.filter((c) => c.teacherId === teacher.id).map((c) => c.name).join(', ');
  const text = str(body.text, 300);
  const msg = text || 'Bu ustoz ' + cls + " sinf(lar)ining davomatini qilmadi. Iltimos, davomatni to'ldiring.";
  const entry = { id: uid('sms'), teacherId: teacher.id, teacherName: teacher.displayName, phone: teacher.phone, text: msg, sentAt: now() };
  db.smsLog.push(entry);
  persistAll();
  res.json({ ok: true, sms: entry });
});

app.get('/api/teacher/sms', auth, (req, res) => {
  if (!isTeacher(req)) return res.status(403).json({ error: 'Faqat ustozlar uchun' });
  res.json({ sms: db.smsLog.filter((s) => s.teacherId === req.user.id) });
});

app.get('/api/director/sms-log', auth, (req, res) => {
  if (!isDirector(req)) return res.status(403).json({ error: 'Faqat direktor uchun' });
  res.json({ sms: db.smsLog });
});

// ---------- ustoz o'quvchilari ----------
app.get('/api/my-students', auth, (req, res) => {
  if (!isTeacher(req)) return res.status(403).json({ error: 'Faqat ustozlar uchun' });
  const classIds = db.classes.filter((c) => c.teacherId === req.user.id).map((c) => c.id);
  const students = db.users.filter((u) => u.role === 'student' && classIds.includes(u.classId));
  res.json({ students: students.map((s) => ({ id: s.id, displayName: s.displayName, className: s.className, coins: num(s.coins), classId: s.classId })) });
});

// ---------- ustoz coin tarqatishi ----------
app.post('/api/teacher/coins', auth, (req, res) => {
  if (!isTeacher(req)) return res.status(403).json({ error: 'Faqat ustozlar' });
  const body = req.body || {};
  const student = db.users.find((u) => u.id === str(body.studentId, 40) && u.role === 'student');
  if (!student) return res.status(404).json({ error: "O'quvchi topilmadi" });
  // Ustoz faqat o'z sinfidagi o'quvchiga coin bera oladi
  const myClassIds = db.classes.filter((c) => c.teacherId === req.user.id).map((c) => c.id);
  if (!myClassIds.includes(student.classId)) return res.status(403).json({ error: "Bu o'quvchi sizga biriktirilgan sinfda emas" });
  const raw = num(body.amount, 0);
  const amt = Math.floor(raw);
  if (!Number.isFinite(raw) || amt <= 0) return res.status(400).json({ error: "Coin miqdori 0 dan katta butun son bo'lishi kerak" });
  if (amt > 1000) return res.status(400).json({ error: "Bir marta 1000 tadan ko'p coin berilmaydi" });
  const budget = budgetForTeacher(req.user.id);
  if (budget.left < amt) return res.status(400).json({ error: 'Oylik coin byudjeti tugadi. Direktorga murojaat qiling.' });
  student.coins = num(student.coins) + amt;
  db.coinTransactions.push({ id: uid('ct'), teacherId: req.user.id, teacherName: req.user.displayName, studentId: student.id, studentName: student.displayName, amount: amt, reason: str(body.reason, 200), month: budget.month, createdAt: now() });
  persistAll();
  res.json({ ok: true, coins: student.coins, budgetLeft: budgetForTeacher(req.user.id).left });
});

// ---------- direktor: byudjetlar ----------
app.get('/api/director/budgets', auth, (req, res) => {
  if (!isDirector(req)) return res.status(403).json({ error: 'Faqat direktor uchun' });
  const month = monthKey();
  const rows = db.users.filter((u) => u.role === 'teacher').map((t) => {
    const b = db.coinBudgets.find((x) => x.teacherId === t.id && x.month === month);
    const distributed = db.coinTransactions.filter((x) => x.teacherId === t.id && x.month === month).reduce((a, x) => a + x.amount, 0);
    const amount = b ? b.amount : 500;
    return { id: t.id, displayName: t.displayName, subject: t.subject, amount, distributed, left: amount - distributed };
  });
  res.json({ month, teachers: rows });
});

// Hamma ustozga bir xil oylik limitni birdan belgilash
app.post('/api/director/budgets/all', auth, (req, res) => {
  if (!isDirector(req)) return res.status(403).json({ error: 'Faqat direktor uchun' });
  const body = req.body || {};
  const amount = Math.floor(num(body.amount, NaN));
  if (!Number.isFinite(amount) || amount < 0 || amount > 100000) {
    return res.status(400).json({ error: "Miqdor 0 dan 100000 gacha butun son bo'lishi kerak" });
  }
  const month = monthKey();
  const teachers = db.users.filter((u) => u.role === 'teacher');
  teachers.forEach((t) => {
    let b = db.coinBudgets.find((x) => x.teacherId === t.id && x.month === month);
    if (!b) {
      b = { id: uid('b'), teacherId: t.id, month, amount, distributed: 0 };
      db.coinBudgets.push(b);
    } else {
      b.amount = amount;
    }
  });
  persistAll();
  res.json({ ok: true, month, amount, teachers: teachers.length });
});

app.post('/api/director/budgets', auth, (req, res) => {
  if (!isDirector(req)) return res.status(403).json({ error: 'Faqat direktor uchun' });
  const body = req.body || {};
  const teacherId = str(body.teacherId, 40);
  const teacher = db.users.find((u) => u.id === teacherId && u.role === 'teacher');
  if (!teacher) return res.status(404).json({ error: 'Ustoz topilmadi' });
  const amount = Math.floor(num(body.amount, NaN));
  if (!Number.isFinite(amount) || amount < 0 || amount > 100000) {
    return res.status(400).json({ error: "Miqdor 0 dan 100000 gacha butun son bo'lishi kerak" });
  }
  const month = monthKey();
  let b = db.coinBudgets.find((x) => x.teacherId === teacherId && x.month === month);
  if (!b) {
    b = { id: uid('b'), teacherId, month, amount, distributed: 0 };
    db.coinBudgets.push(b);
  } else {
    b.amount = amount;
  }
  persistAll();
  res.json({ ok: true, budget: b });
});

// ---------- chat ----------
const MAX_MESSAGES_PER_ROOM = 200;
// Ustozlar va direktor uchun umumiy xona (hammasi yoza oladi)
const STAFF_ROOM = 'all_staff';
const LEGACY_STAFF_ROOM = 'all_teachers';
function dmRoom(a, b) {
  return 'dm_' + [a, b].sort().join('_');
}
const isStaff = (user) => user && (user.role === 'teacher' || user.role === 'director');

// Chat xonasiga faqat a'zolar kira oladi (begona sinf/xabar o'qib bo'lmaydi)
function roomAccess(user, roomId) {
  if (typeof roomId !== 'string' || roomId.length < 3 || roomId.length > 80) return false;
  if (!/^[A-Za-z0-9_.:-]+$/.test(roomId)) return false;

  // Umumiy xona: ustozlar ham, direktor ham yozadi
  if (roomId === STAFF_ROOM || roomId === LEGACY_STAFF_ROOM) return isStaff(user);

  if (roomId.startsWith('class_')) {
    const classId = roomId.slice('class_'.length);
    const cls = db.classes.find((c) => c.id === classId);
    if (!cls) return false;
    if (user.role === 'student') return user.classId === cls.id;
    if (user.role === 'teacher') return cls.teacherId === user.id;
    return false;
  }

  if (roomId.startsWith('dm_')) {
    // Xona aynan men va suhbatdoshim o'rtasidagi DM bo'lishi shart
    const other = db.users.find((u) => u.id !== user.id && dmRoom(user.id, u.id) === roomId);
    if (!other) return false;
    if (user.role === 'student') return other.role === 'teacher';
    if (user.role === 'teacher') {
      // Ustoz faqat o'ziga biriktirilgan sinf o'quvchilari bilan yozishadi
      if (other.role !== 'student') return false;
      return db.classes.some((c) => c.id === other.classId && c.teacherId === user.id);
    }
    if (user.role === 'director') return other.role === 'teacher';
    return false;
  }

  return false;
}

app.get('/api/chats', auth, (req, res) => {
  const me = req.user;
  let chats = [];
  if (me.role === 'teacher') {
    const students = (() => {
      const classIds = db.classes.filter((c) => c.teacherId === me.id).map((c) => c.id);
      return db.users.filter((u) => u.role === 'student' && classIds.includes(u.classId));
    })();
    const classChats = db.classes.filter((c) => c.teacherId === me.id).map((cls) => {
      const msgs = db.messages.filter((m) => m.roomId === 'class_' + cls.id);
      return {
        roomId: 'class_' + cls.id,
        type: 'class',
        title: cls.name + ' sinf chati',
        subtitle: 'Sinf chati',
        memberCount: students.filter((s) => s.classId === cls.id).length,
        avatarColor: '#1B3A5C',
        lastMessage: msgs.length ? msgs[msgs.length - 1] : null,
      };
    });
    const dms = students.map((s) => {
      const msgs = db.messages.filter((m) => m.roomId === dmRoom(me.id, s.id));
      return {
        roomId: dmRoom(me.id, s.id),
        type: 'direct',
        title: s.displayName,
        subtitle: (s.className || '') + " sinf o'quvchisi",
        avatarColor: colorFor(s.id),
        lastMessage: msgs.length ? msgs[msgs.length - 1] : null,
      };
    });
    // Umumiy xona: barcha ustozlar + direktor
    const staffMsgs = db.messages.filter((m) => m.roomId === STAFF_ROOM);
    const staffCount = db.users.filter((u) => u.role === 'teacher' || u.role === 'director').length;
    const staffChat = {
      roomId: STAFF_ROOM,
      type: 'staff',
      title: 'Ustozlar va direktor',
      subtitle: 'Umumiy chat — hamma ustoz va direktor yoza oladi',
      memberCount: staffCount,
      avatarColor: '#6B4E9B',
      lastMessage: staffMsgs.length ? staffMsgs[staffMsgs.length - 1] : null,
    };
    chats = [staffChat, ...classChats, ...dms];
  } else if (me.role === 'director') {
    const staff = db.users.filter((u) => u.role === 'teacher' || u.role === 'director');
    chats = [{
      roomId: STAFF_ROOM,
      type: 'staff',
      title: 'Ustozlar va direktor',
      subtitle: db.users.filter((u) => u.role === 'teacher').length + ' ustoz + direktor',
      memberCount: staff.length,
      avatarColor: '#6B4E9B',
      lastMessage: (() => { const m = db.messages.filter((x) => x.roomId === STAFF_ROOM); return m.length ? m[m.length - 1] : null; })(),
    }];
  } else {
    const teachers = db.users.filter((u) => u.role === 'teacher');
    const dms = teachers.map((t) => {
      const msgs = db.messages.filter((m) => m.roomId === dmRoom(me.id, t.id));
      return {
        roomId: dmRoom(me.id, t.id),
        type: 'direct',
        title: t.displayName,
        subtitle: t.subject || '',
        avatarColor: colorFor(t.id),
        lastMessage: msgs.length ? msgs[msgs.length - 1] : null,
      };
    });
    const clsRoom = 'class_' + me.classId;
    const clsMsgs = db.messages.filter((m) => m.roomId === clsRoom);
    chats = [...dms, {
      roomId: clsRoom,
      type: 'group',
      title: (me.className || '') + ' sinf chati',
      subtitle: 'Umumiy sinf chati',
      memberCount: db.users.filter((u) => u.role === 'student' && u.classId === me.classId).length,
      avatarColor: '#22c55e',
      lastMessage: clsMsgs.length ? clsMsgs[clsMsgs.length - 1] : null,
    }];
  }
  res.json({ chats });
});

app.get('/api/chats/:roomId/messages', auth, (req, res) => {
  const roomId = str(req.params.roomId, 80);
  if (!roomAccess(req.user, roomId)) return res.status(403).json({ error: 'Bu chatga ruxsat yo\'q' });
  const all = db.messages.filter((m) => m.roomId === roomId);
  res.json({ messages: all.slice(-MAX_MESSAGES_PER_ROOM) });
});

app.post('/api/chats/:roomId/messages', auth, (req, res) => {
  const roomId = str(req.params.roomId, 80);
  if (!roomAccess(req.user, roomId)) return res.status(403).json({ error: 'Bu chatga ruxsat yo\'q' });
  const text = str((req.body || {}).text, 2000);
  if (!text) return res.status(400).json({ error: "Bo'sh xabar" });
  const msg = {
    id: uid('msg'),
    roomId,
    senderId: req.user.id,
    senderName: req.user.displayName,
    senderRole: req.user.role,
    text,
    createdAt: now(),
  };
  db.messages.push(msg);
  persistAll();
  res.json({ message: msg });
});

// ---------- o'quvchi dashboard ----------
app.get('/api/student/dashboard', auth, (req, res) => {
  if (!isStudent(req)) return res.status(403).json({ error: "Faqat o'quvchilar uchun" });
  const rows = scheduleFor('student').filter((r) => r.className === req.user.className);
  const tasks = db.tasks.filter((t) => t.className === req.user.className).map((t) => ({ ...t, done: (t.completedBy || []).includes(req.user.id) }));
  res.json({
    coins: num(req.user.coins),
    grades: req.user.grades || [],
    schedule: rows,
    tasks,
  });
});

// ---------- frontend (production: client/dist) ----------
// Vite build natijasi bir xil serverdan beriladi — shunda bitta URL,
// bitta xizmat yetarli (Render / Railway / Fly.io / VPS).
const DIST_DIR = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  // SPA marshrutlari (/rankings, /chat ...) uchun index.html ga qaytarish
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
  console.log('Frontend berilmoqda: ' + DIST_DIR);
} else {
  console.log('DIQQAT: client/dist topilmadi — faqat API ishlayapti.');
  console.log('       Frontend uchun: cd client && npm install && npm run build');
}

// 404
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint topilmadi' }));

// Xatoliklarni birxil JSON ko'rinishida qaytarish (stack trace tashqariga chiqmaydi)
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const type = err && err.type;
  if (type === 'entity.too.large') return res.status(413).json({ error: "So'rov hajmi juda katta (1 MB dan oshmasin)" });
  if (type === 'entity.parse.failed' || err instanceof SyntaxError) return res.status(400).json({ error: 'JSON formati buzilgan' });
  console.error('[xato]', (err && err.message) || err);
  res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
});

// Ma'lumotlarni tayyorlab (seed + parol migratsiyasi), keyin serverni ishga tushirish
initData()
  .catch((e) => {
    console.error("Ma'lumotlarni tayyorlashda xatolik:", e);
    process.exitCode = 1;
  })
  .finally(() => {
    const server = app.listen(PORT, () => {
      console.log('Intellekt Innovatsion Maktabi ishlamoqda: http://localhost:' + PORT);
      console.log('Xavfsizlik: parollar scrypt hash, sessiya ' + Math.round(SESSION_TTL_MS / 60000) + ' daqiqa, CORS allowlist ' + (CORS_ORIGINS.length ? CORS_ORIGINS.join(', ') : 'faqat bir xil origin + dev/preview'));
    });
    server.on('error', (e) => {
      console.error('Server ishga tushmadi:', e.message);
      process.exitCode = 1;
    });
  });
