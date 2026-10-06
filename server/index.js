// ============================================================
//  Intellekt Innovatsion Maktabi — backend API
//  Node + Express, JSON fayllarda saqlash. Hich qanday
//  tashqi servis (DB, email) kerak emas.
// ============================================================
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_DIR = path.join(__dirname, 'data');

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ---------- yordamchilar ----------
const now = () => new Date().toISOString();
const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 9);
const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

function readJson(file, fallback) {
  const full = path.join(DATA_DIR, file);
  try {
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (e) {
    return fallback;
  }
}
function writeJson(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
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

function seed() {
  if (db.users) return;

  const director = {
    id: 'dir_1',
    role: 'director',
    displayName: 'Sardor Karimov',
    login: 'director',
    password: '1234',
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
    password: '1234',
    phone: t.phone,
    subject: t.subject,
    createdAt: now(),
  }));

  const classes = [
    { id: 'c_1', name: '8-A', teacherId: 't_1' },
    { id: 'c_2', name: '8-B', teacherId: 't_2' },
    { id: 'c_3', name: '9-A', teacherId: 't_3' },
    { id: 'c_4', name: '9-B', teacherId: 't_4' },
    { id: 'c_5', name: '10-A', teacherId: 't_5' },
    { id: 'c_6', name: '11-A', teacherId: 't_6' },
  ];

  const firstNames = ['Aziz', 'Madina', 'Shahzod', 'Kamola', 'Bekzod', 'Sevara', 'Javohir', 'Dildora', 'Otabek', 'Xurshid', 'Nigina', 'Sardor', 'Gulchehra', 'Farrux', 'Zebo', 'Umid', 'Laylo', 'Jasur', 'Rano', 'Sanjar', 'Malika', 'Bekmurod', 'Shirin', 'Eldor', 'Gavhar', 'Islom', 'Durdona', 'Nodir', 'Mohinur', 'Temur', 'Gulsara', 'Abbos', 'Saodat', 'Muhammad', 'Dilfuza', 'Sherzod', 'Hilola', 'Jahongir', 'Barno', 'Olim'];
  const lastNames = ['Karimov', 'Tursunov', 'Aliyev', 'Rahimov', 'Usmonov', 'Saidov', 'Valiyev', 'Qodirov', "Yo'ldoshev", 'Normatov', 'Ismoilov', 'Xolmatov', 'Ergasov', "To'xtasinov", 'Nazarov', 'Salaev', 'Bektemirov', 'Rasulov', 'Mamatqulov', 'Soliev'];
  const subjNames = ['Matematika', 'Fizika', 'Ona tili va adabiyot', 'Inglili tili', 'Informatika', 'Tarix', 'Biologiya', 'Kimyo', 'Geografiya'];

  const students = [];
  firstNames.forEach((fn, i) => {
    const cls = classes[i % classes.length];
    const coins = 40 + Math.floor(Math.random() * 260);
    const attendance = MONTHS_UZ.slice(0, 3).map((label) => ({ label, percent: 82 + Math.floor(Math.random() * 18) }));
    const monitoring = MONTHS_UZ.slice(0, 3).map((label) => ({ label, percent: 70 + Math.floor(Math.random() * 30) }));
    const grades = subjNames.map((sn) => {
      const list = [];
      const n = 4 + Math.floor(Math.random() * 6);
      for (let k = 0; k < n; k++) list.push(3 + Math.floor(Math.random() * 3));
      return { subject: sn, grades: list };
    });
    students.push({
      id: 's_' + (i + 1),
      role: 'student',
      displayName: firstNames[i] + ' ' + lastNames[i % lastNames.length],
      login: 'oquvchi' + (i + 1),
      password: '1234',
      classId: cls.id,
      className: cls.name,
      coins,
      attendance,
      monitoring,
      grades,
      phone: '+998 90 3' + String(10 + (i % 10)).slice(-2) + ' 00 00',
      createdAt: now(),
    });
  });

  db.users = [...students, ...teacherUsers, director];
  db.classes = classes;
  db.subjects = teachers.map((t, i) => ({ id: 'sub_' + (i + 1), name: t.subject, teacherId: t.id }));

  // namunaviy vazifalar
  db.tasks = [
    {
      id: uid('task'),
      teacherId: 't_1',
      teacherName: 'Malika Tursunova',
      className: '8-A',
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
      className: '8-A',
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
      className: '9-B',
      subject: 'Inglili tili',
      title: 'Unit 3 lug\'atini yodlash',
      description: '20 yangi so\'z va 5 ta gap.',
      dueDate: '2026-10-10',
      createdAt: now(),
      completedBy: [],
    },
  ];

  persistAll();
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
seed();

// ---------- sessiyalar ----------
const sessions = new Map();
function auth(req, res, next) {
  const token = req.headers['x-token'] || (req.headers.authorization || '').replace('Bearer ', '');
  const s = token && sessions.get(token);
  if (!s) return res.status(401).json({ error: 'auth' });
  const user = db.users.find((u) => u.id === s.userId);
  if (!user) return res.status(401).json({ error: 'auth' });
  req.user = user;
  next();
}
const isTeacher = (req) => req.user && req.user.role === 'teacher';
const isDirector = (req) => req.user && req.user.role === 'director';

function publicUser(u) {
  const { password, ...rest } = u;
  return rest;
}

// ---------- umumiy ----------
app.get('/api/health', (req, res) => res.json({ ok: true, app: 'Intellekt Innovatsion Maktabi' }));

app.post('/api/login', (req, res) => {
  const { login, password } = req.body || {};
  const user = db.users.find((u) => u.login === String(login || '').trim().toLowerCase() && u.password === String(password || ''));
  if (!user) return res.status(401).json({ error: 'Login yoki parol xato' });
  const token = uid('tk');
  sessions.set(token, { userId: user.id, role: user.role });
  res.json({ token, user: publicUser(user) });
});

app.post('/api/register', (req, res) => {
  const { login, password, displayName, role, className } = req.body || {};
  if (!login || !password || !displayName) return res.status(400).json({ error: 'Login, parol va ism kiritilishi shart' });
  if (db.users.some((u) => u.login === String(login).trim().toLowerCase())) return res.status(409).json({ error: 'Bu login band' });
  const finalRole = role || 'student';
  let classId = null;
  if (finalRole === 'student') {
    const cls = db.classes.find((c) => c.name === className) || db.classes[0];
    classId = cls.id;
  }
  const user = {
    id: uid(finalRole === 'student' ? 's' : finalRole === 'teacher' ? 't' : 'd'),
    role: finalRole,
    displayName: String(displayName).trim(),
    login: String(login).trim().toLowerCase(),
    password: String(password),
    classId,
    className: classId ? db.classes.find((c) => c.id === classId).name : null,
    subject: req.body.subject || '',
    phone: '',
    coins: 0,
    attendance: [],
    monitoring: [],
    grades: [],
    createdAt: now(),
  };
  db.users.push(user);
  persistAll();
  const token = uid('tk');
  sessions.set(token, { userId: user.id, role: user.role });
  res.json({ token, user: publicUser(user) });
});

app.get('/api/me', auth, (req, res) => {
  const me = publicUser(req.user);
  if (req.user.role === 'teacher') {
    me.classes = db.classes.filter((c) => c.teacherId === req.user.id).map((c) => c.name);
    me.budget = budgetForTeacher(req.user.id);
    me.sms = db.smsLog.filter((s) => s.teacherId === req.user.id).slice(-5).reverse();
  }
  res.json({ user: me });
});

app.put('/api/me', auth, (req, res) => {
  const { displayName, password } = req.body || {};
  if (displayName && displayName.trim()) req.user.displayName = displayName.trim();
  if (password && password.trim()) req.user.password = String(password);
  persistAll();
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

// ---------- o'quvchi statistikasi (fagat statistika ko'rinadi) ----------
app.get('/api/students/:id/stats', auth, (req, res) => {
  const s = db.users.find((u) => u.id === req.params.id && u.role === 'student');
  if (!s) return res.status(404).json({ error: "Topilmadi" });
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

function seedSchedule(role) {
  // Har bir sinf uchun har kunga 4-6 ta dars (soatbay dars)
  const rows = [];
  const classTeacher = {}; // className -> teacherId
  db.classes.forEach((c) => (classTeacher[c.name] = c.teacherId));
  const subs = db.subjects;
  const perDay = { dushanba: 6, seshanba: 5, chorshanba: 6, payshanba: 5, juma: 5, shanaba: 4 };

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

function scheduleFor(role) {
  const file = 'schedule-' + role + '.json';
  let rows = readJson(file, []);
  if (!rows.length) {
    rows = seedSchedule(role);
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
app.get('/api/tasks', auth, (req, res) => {
  let list = db.tasks;
  if (req.user.role === 'student') list = list.filter((t) => t.className === req.user.className);
  if (req.user.role === 'teacher') list = list.filter((t) => t.teacherId === req.user.id);
  res.json({ tasks: list });
});

app.post('/api/tasks', auth, (req, res) => {
  if (!isTeacher(req)) return res.status(403).json({ error: "Fagat ustozlar vazifa bera oladi" });
  const { className, subject, title, description, dueDate } = req.body || {};
  if (!title || !title.trim()) return res.status(400).json({ error: "Vazifa nomi kiritilishi shart" });
  const myClasses = db.classes.filter((c) => c.teacherId === req.user.id).map((c) => c.name);
  const task = {
    id: uid('task'),
    teacherId: req.user.id,
    teacherName: req.user.displayName,
    className: className || myClasses[0] || '',
    subject: subject || req.user.subject || "Umumiy",
    title: title.trim(),
    description: (description || '').trim(),
    dueDate: dueDate || '',
    createdAt: now(),
    completedBy: [],
  };
  db.tasks.push(task);
  persistAll();
  res.json({ task });
});

app.post('/api/tasks/:id/done', auth, (req, res) => {
  const t = db.tasks.find((x) => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: "Topilmadi" });
  if (req.user.role !== 'student') return res.status(403).json({ error: "Fagat o'quvchilar bajarilgan deb belgilaydi" });
  t.completedBy = t.completedBy || [];
  if (!t.completedBy.includes(req.user.id)) t.completedBy.push(req.user.id);
  persistAll();
  res.json({ ok: true });
});

// ---------- davomat ----------
app.get('/api/attendance', auth, (req, res) => {
  let list = db.attendance;
  if (req.user.role === 'student') list = list.filter((a) => a.studentId === req.user.id);
  if (req.user.role === 'teacher') list = list.filter((a) => a.teacherId === req.user.id);
  res.json({ records: list });
});

app.post('/api/attendance', auth, (req, res) => {
  if (!isTeacher(req)) return res.status(403).json({ error: "Fagat ustozlar davomat qiladi" });
  const { date, entries } = req.body || {};
  if (!entries || !Array.isArray(entries) || !entries.length) return res.status(400).json({ error: "Davomat ma'lumotlari yo'q" });
  const d = date || new Date().toISOString().slice(0, 10);
  // ustoz faqat o'ziga biriktirilgan sinf o'quvchilarining davomatini qiladi
  const myClassIds = db.classes.filter((c) => c.teacherId === req.user.id).map((c) => c.id);
  entries.forEach((e) => {
    const student = db.users.find((u) => u.id === e.studentId);
    if (!student || !myClassIds.includes(student.classId)) return;
    db.attendance.push({
      id: uid('att'),
      date: d,
      studentId: e.studentId,
      studentName: student.displayName,
      className: student.className,
      teacherId: req.user.id,
      teacherName: req.user.displayName,
      subject: e.subject || req.user.subject || '',
      status: e.status,
      createdAt: now(),
    });
    recalcAttendance(student);
  });
  persistAll();
  res.json({ ok: true, saved: entries.length });
});

function recalcAttendance(student) {
  const mine = db.attendance.filter((a) => a.studentId === student.id);
  if (!mine.length) return;
  const month = monthKey();
  const thisMonth = mine.filter((a) => a.date.slice(0, 7) === month);
  if (!thisMonth.length) return;
  const present = thisMonth.filter((a) => a.status === 'keldi' || a.status === 'ketdi').length;
  const p = Math.round((present / thisMonth.length) * 100);
  const label = currentMonthLabel();
  student.attendance = student.attendance || [];
  const idx = student.attendance.findIndex((x) => x.label === label);
  if (idx >= 0) student.attendance[idx].percent = p;
  else student.attendance.push({ label, percent: p });
}

// Direktor: bugun kim davomat qilmagan
app.get('/api/director/attendance-check', auth, (req, res) => {
  if (!isDirector(req)) return res.status(403).json({ error: "Fagat direktor uchun" });
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
  if (!isDirector(req)) return res.status(403).json({ error: "Fagat direktor uchun" });
  const { teacherId, text } = req.body || {};
  const teacher = db.users.find((u) => u.id === teacherId && u.role === 'teacher');
  if (!teacher) return res.status(404).json({ error: "Ustoz topilmadi" });
  const cls = db.classes.filter((c) => c.teacherId === teacher.id).map((c) => c.name).join(', ');
  const msg = (text && String(text).trim()) || "Bu ustoz " + cls + " sinf(lar)ining davomatini qilmadi. Iltimos, davomatni to'ldiring.";
  const entry = { id: uid('sms'), teacherId: teacher.id, teacherName: teacher.displayName, phone: teacher.phone, text: msg, sentAt: now() };
  db.smsLog.push(entry);
  persistAll();
  res.json({ ok: true, sms: entry });
});

app.get('/api/teacher/sms', auth, (req, res) => {
  if (!isTeacher(req)) return res.status(403).json({ error: "Fagat ustozlar uchun" });
  res.json({ sms: db.smsLog.filter((s) => s.teacherId === req.user.id) });
});

app.get('/api/director/sms-log', auth, (req, res) => {
  if (!isDirector(req)) return res.status(403).json({ error: "Fagat direktor uchun" });
  res.json({ sms: db.smsLog });
});

// ---------- ustoz o'quvchilari ----------
app.get('/api/my-students', auth, (req, res) => {
  if (!isTeacher(req)) return res.status(403).json({ error: "Fagat ustozlar uchun" });
  const classIds = db.classes.filter((c) => c.teacherId === req.user.id).map((c) => c.id);
  const students = db.users.filter((u) => u.role === 'student' && classIds.includes(u.classId));
  res.json({ students: students.map((s) => ({ id: s.id, displayName: s.displayName, className: s.className, coins: num(s.coins), classId: s.classId })) });
});

// ---------- ustoz coin tarqatishi ----------
app.post('/api/teacher/coins', auth, (req, res) => {
  if (!isTeacher(req)) return res.status(403).json({ error: "Fagat ustozlar" });
  const { studentId, amount, reason } = req.body || {};
  const student = db.users.find((u) => u.id === studentId && u.role === 'student');
  if (!student) return res.status(404).json({ error: "O'quvchi topilmadi" });
  const amt = num(amount, 0);
  if (amt <= 0) return res.status(400).json({ error: "Coin miqdori 0 dan katta bo'lishi kerak" });
  const budget = budgetForTeacher(req.user.id);
  if (budget.left < amt) return res.status(400).json({ error: "Oylik coin byudjeti tugadi. Direktorga murojaat qiling." });
  student.coins = num(student.coins) + amt;
  db.coinTransactions.push({ id: uid('ct'), teacherId: req.user.id, teacherName: req.user.displayName, studentId, studentName: student.displayName, amount: amt, reason: (reason || '').trim(), month: budget.month, createdAt: now() });
  writeJson('coin-transactions.json', db.coinTransactions);
  persistAll();
  res.json({ ok: true, coins: student.coins, budgetLeft: budgetForTeacher(req.user.id).left });
});

// ---------- direktor: byudjetlar ----------
app.get('/api/director/budgets', auth, (req, res) => {
  if (!isDirector(req)) return res.status(403).json({ error: "Fagat direktor uchun" });
  const month = monthKey();
  const rows = db.users.filter((u) => u.role === 'teacher').map((t) => {
    const b = db.coinBudgets.find((x) => x.teacherId === t.id && x.month === month);
    const distributed = db.coinTransactions.filter((x) => x.teacherId === t.id && x.month === month).reduce((a, x) => a + x.amount, 0);
    const amount = b ? b.amount : 500;
    return { id: t.id, displayName: t.displayName, subject: t.subject, amount, distributed, left: amount - distributed };
  });
  res.json({ month, teachers: rows });
});

app.post('/api/director/budgets', auth, (req, res) => {
  if (!isDirector(req)) return res.status(403).json({ error: "Fagat direktor uchun" });
  const { teacherId, amount } = req.body || {};
  const month = monthKey();
  let b = db.coinBudgets.find((x) => x.teacherId === teacherId && x.month === month);
  if (!b) {
    b = { id: uid('b'), teacherId, month, amount: num(amount), distributed: 0 };
    db.coinBudgets.push(b);
  } else {
    b.amount = num(amount, b.amount);
  }
  persistAll();
  res.json({ ok: true, budget: b });
});

// ---------- chat ----------
function dmRoom(a, b) {
  return 'dm_' + [a, b].sort().join('_');
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
    chats = [...classChats, ...dms];
  } else if (me.role === 'director') {
    const teachers = db.users.filter((u) => u.role === 'teacher');
    chats = [{
      roomId: 'all_teachers',
      type: 'group',
      title: 'Barcha ustozlar',
      subtitle: teachers.length + " ustoz",
      memberCount: teachers.length,
      avatarColor: '#6B4E9B',
      lastMessage: (() => { const m = db.messages.filter((x) => x.roomId === 'all_teachers'); return m.length ? m[m.length - 1] : null; })(),
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
      subtitle: "Umumiy sinf chati",
      memberCount: db.users.filter((u) => u.role === 'student' && u.classId === me.classId).length,
      avatarColor: '#22c55e',
      lastMessage: clsMsgs.length ? clsMsgs[clsMsgs.length - 1] : null,
    }];
  }
  res.json({ chats });
});

app.get('/api/chats/:roomId/messages', auth, (req, res) => {
  const msgs = db.messages.filter((m) => m.roomId === req.params.roomId);
  res.json({ messages: msgs });
});

app.post('/api/chats/:roomId/messages', auth, (req, res) => {
  const text = (req.body || {}).text;
  if (!text || !String(text).trim()) return res.status(400).json({ error: "Bo'sh xabar" });
  const msg = {
    id: uid('msg'),
    roomId: req.params.roomId,
    senderId: req.user.id,
    senderName: req.user.displayName,
    senderRole: req.user.role,
    text: String(text).trim(),
    createdAt: now(),
  };
  db.messages.push(msg);
  persistAll();
  res.json({ message: msg });
});

// ---------- o'quvchi dashboard ----------
app.get('/api/student/dashboard', auth, (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: "Fagat o'quvchilar uchun" });
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

app.listen(PORT, () => console.log('Intellekt Innovatsion Maktabi ishlamoqda: http://localhost:' + PORT));
