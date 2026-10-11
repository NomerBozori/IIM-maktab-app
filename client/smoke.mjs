// ============================================================
//  Ishlah tekshiruvi (smoke test) — brauzer o'rniga Node+jsdom
//  React ilovasini render qilib, xatolarni ushlaydi.
//  Qoidalar:
//    * amal (click) act() ichida bajariladi
//    * tekshirish shundan keyin, shart bajarilguncha kutib turiladi
//    * kutish "xato bermadi" degani bilan tugaydi (qaytish qiymatiga qaramaydi)
// ============================================================
import { JSDOM } from 'jsdom';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { BrowserRouter } from 'react-router-dom';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:5173/',
  pretendToBeVisual: true,
});

// Node 21+ da ba'zi global'lar (navigator, localStorage) faqat o'qish uchun —
// shuning uchun ularni defineProperty bilan almashtiramiz.
function defineGlobal(name, value) {
  Object.defineProperty(globalThis, name, { value, writable: true, configurable: true });
}

global.window = dom.window;
global.document = dom.window.document;
defineGlobal('navigator', dom.window.navigator);
global.HTMLElement = dom.window.HTMLElement;
global.SVGElement = dom.window.SVGElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.Event = dom.window.Event;
global.MouseEvent = dom.window.MouseEvent;
global.KeyboardEvent = dom.window.KeyboardEvent;
global.CustomEvent = dom.window.CustomEvent;
global.getComputedStyle = dom.window.getComputedStyle;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);
// jsdom'da yo'q API'larni brauzerga moslab qo'yamiz
if (!dom.window.HTMLElement.prototype.scrollIntoView) {
  dom.window.HTMLElement.prototype.scrollIntoView = function () {};
}
if (!dom.window.Element.prototype.attachEvent) {
  dom.window.Element.prototype.attachEvent = function () {};
  dom.window.Element.prototype.detachEvent = function () {};
}

// --- Sana: test hafta kuniga bog'liq bo'lmasligi uchun "dushanba"ga
// suriladi (2026-10-12 - dushanba). Soat esa REAL yuradi: Date.now()
// muzlab qolsa kutish tsikllari (waitFor) hech qachon tugamaydi.
const RealDate = Date;
const DAY_SHIFT = RealDate.parse('2026-10-12T09:00:00') - RealDate.parse('2026-10-11T09:00:00'); // yakshanba → dushanba
const SUNDAY_OFFSET = RealDate.parse('2026-10-11T00:00:00') - (RealDate.now() - RealDate.now() % 86400000);
function FakeDate(...args) {
  if (args.length === 0) return new RealDate(RealDate.now() + SUNDAY_OFFSET + DAY_SHIFT);
  return new RealDate(...args);
}
FakeDate.prototype = RealDate.prototype;
FakeDate.now = () => RealDate.now();
FakeDate.parse = RealDate.parse;
FakeDate.UTC = RealDate.UTC;
defineGlobal('Date', FakeDate);

const __mem = new Map();
const memoryStorage = {
  getItem: (k) => (__mem.has(k) ? __mem.get(k) : null),
  setItem: (k, v) => __mem.set(String(k), String(v)),
  removeItem: (k) => __mem.delete(k),
  clear: () => __mem.clear(),
  key: (i) => [...__mem.keys()][i] ?? null,
  get length() {
    return __mem.size;
  },
};
defineGlobal('localStorage', memoryStorage);
defineGlobal('sessionStorage', memoryStorage);
Object.defineProperty(dom.window, 'localStorage', { value: memoryStorage, configurable: true });
global.IS_REACT_ACT_ENVIRONMENT = true;

const { install } = await import('./.smoke/fetchtest.mjs');
install();

// act(...) ogohlantirishi — test muhiti shovqini, ilova xatosi emas
const isActNoise = (txt) => txt.indexOf('not wrapped in act') !== -1;

const errors = [];
console.error = (...args) => {
  const txt = args.map((a) => (a && a.stack) || String(a)).join(' ');
  if (isActNoise(txt)) return;
  errors.push(txt);
};

const appMod = await import('./.smoke/main.js');
const App = appMod.App;
const { AppProvider } = appMod;

const container = document.getElementById('root');
const root = createRoot(container);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- yordamchilar ----------
function nav(text) {
  const btns = [...document.querySelectorAll('.nav-item')];
  const b = btns.find((x) => x.textContent.includes(text));
  if (!b) {
    throw new Error(
      "'" + text + "' menyusi topilmadi. Mavjud: " + btns.map((x) => x.textContent.trim()).join(' | ')
    );
  }
  return b;
}

function need(sel, label) {
  const el = document.querySelector(sel);
  if (!el) throw new Error(label + ' (' + sel + ') topilmadi');
  return el;
}

function findBtn(text, sel) {
  return [...document.querySelectorAll(sel || '.btn')].find((b) => b.textContent.includes(text));
}

function setValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, value);
  // Oddiy DOM hodisasi (ilova o'z tinglovchisini qo'shgan bo'lsa ishlaydi)
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  input.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  // React 18 + jsdom birikmasida DOM hodisasi React'ning onChange'ini
  // uyg'otmaydi — shu sababli React props'idagi onChange'ni to'g'ridan-to'g'ri
  // chaqiramiz (bu — react-dom/test-utils'dagi Simulate.change bilan bir xil yo'l).
  const key = Object.keys(input).find((k) => k.startsWith('__reactProps$'));
  const props = key ? input[key] : null;
  const change = props && (props.onChange || props.onInput);
  if (typeof change === 'function') {
    change({
      target: input,
      currentTarget: input,
      type: 'change',
      nativeEvent: { target: input },
      persist() {},
      preventDefault() {},
      stopPropagation() {},
    });
  }
}

// shart bajarilguncha kutish: "xato bermadi" = muvaffaqiyat
async function waitFor(fn, label, timeout = 8000) {
  const t0 = Date.now();
  for (;;) {
    try {
      fn();
      return;
    } catch (e) {
      if (Date.now() - t0 > timeout) throw new Error(label + ' — kutib bo\'lmadi: ' + e.message);
    }
    await act(async () => {
      await sleep(70);
    });
  }
}

async function doStep(name, fn) {
  try {
    await act(async () => {
      await fn();
    });
    return true;
  } catch (e) {
    console.log('FAIL ' + name + ' (amal): ' + (e && e.message));
    process.exitCode = 1;
    return false;
  }
}

async function checkStep(name, fn, timeout) {
  try {
    await waitFor(fn, name, timeout);
    console.log('OK   ' + name + ' → HTML: ' + container.innerHTML.length + ' bayt');
  } catch (e) {
    console.log('FAIL ' + name + ': ' + (e && e.message));
    process.exitCode = 1;
  }
}

async function step(name, action, check, timeout) {
  if (await doStep(name, action)) await checkStep(name, check, timeout);
}

// ============================================================
//  1. Birinchi render
// ============================================================
await step(
  'birinchi render (login sahifasi)',
  async () => {
    root.render(
      React.createElement(BrowserRouter, null, React.createElement(AppProvider, null, React.createElement(App)))
    );
  },
  () => {
    need('.login-page', 'login sahifasi');
    need('.brand-txt b', 'brend nomi');
    if (!document.querySelector('img[src="/logo.png"]')) throw new Error('logo rasmi topilmadi');
    if (document.body.innerHTML.indexOf('Innovatsion Maktabi') === -1) throw new Error("maktab nomi ko'rinmadi");
    if (document.body.innerHTML.indexOf('Bilim') === -1) throw new Error('shiori (tagline) topilmadi');
  },
  10000
);

// ============================================================
//  2. O'quvchi demo akkauntga kirish
// ============================================================
await step(
  "o'quvchi akkauntiga kirish",
  async () => {
    const rows = [...document.querySelectorAll('.demo-row')];
    if (!rows.length) throw new Error('demo akkauntlar topilmadi');
    rows[0].click();
  },
  () => {
    need('.student-home', 'student-home');
    // Coinlar ixcham ko'rinishda: sarlavhada chip + o'ng ustunda kichik karta
    need('.coin-chip', 'coin chip (sarlavha yonida)');
    need('.coins-compact', 'ixcham coin kartasi');
    if (document.querySelector('.coin-grid')) throw new Error("katta 3×3 panara hali ham ko'rinib turibdi");
    need('.topbar-coins', "yuqori paneldagi coin ko'rsatkichi");
    need('.subject-grid', 'fanlar boyicha baholar');
    need('.lesson-list', 'dars jadvali');
    need('.task-list', 'vazifalar');
    need('.sidebar .brand-mark img', 'sidebar logotipi');
  },
  8000
);

// ============================================================
//  3. Reyting
// ============================================================
await step(
  'reyting sahifasi',
  async () => {
    nav('Reyting').click();
  },
  () => {
    need('.podium', 'podium');
    const cards = document.querySelectorAll('.podium-card');
    if (cards.length < 3) throw new Error('podium kartalari kam: ' + cards.length);
  },
  8000
);

// ============================================================
//  4. Reyting: o'quvchi statistikasi
// ============================================================
await step(
  "reyting: o'quvchi statistikasini ko'rish",
  async () => {
    const btn = document.querySelector('.podium-card');
    if (!btn) throw new Error('podium karta topilmadi');
    btn.click();
  },
  () => {
    need('.stats-modal', 'statistika modali');
    const close = document.querySelector('.modal-head .icon-btn');
    if (close) close.click();
  },
  8000
);

// ============================================================
//  5. Chat
// ============================================================
await step(
  'chat sahifasi',
  async () => {
    nav('Chat').click();
  },
  () => {
    need('.chat-page', 'chat');
    const rooms = document.querySelectorAll('.chat-room, .room-item, .chat-list > *');
    if (!rooms.length) throw new Error('chat xonalari topilmadi');
  },
  8000
);

// ============================================================
//  6. Sozlamalar
// ============================================================
await step(
  'sozlamalar sahifasi',
  async () => {
    nav('Sozlamalar').click();
  },
  () => {
    need('.settings-page', 'sozlamalar');
    need('.faq-q', 'FAQ savoli');
  },
  8000
);

await doStep('sozlamalar: korinish / til / FAQ', async () => {
  const pause = () => sleep(40); // React qayta render qilishiga imkon
  const dark = [...document.querySelectorAll('.theme-opt')].find((b) => b.textContent.includes("Qorong'i"));
  if (!dark) throw new Error("qorong'i rejim tugmasi topilmadi");
  dark.click();
  await pause();
  const auto = [...document.querySelectorAll('.theme-opt')].find((b) => b.textContent.includes('Avtomatik'));
  if (auto) auto.click();
  await pause();
  const effects = document.querySelector('.switch');
  if (effects) effects.click(); // effektlarni o'chirib ko'ramiz
  await pause();
  const ru = [...document.querySelectorAll('.lang-opt')].find((b) => b.textContent.includes('Русский'));
  if (!ru) throw new Error('rus tili tugmasi topilmadi');
  ru.click();
  await pause();
  const en = [...document.querySelectorAll('.lang-opt')].find((b) => b.textContent.includes('English'));
  if (!en) throw new Error('ingliz tili tugmasi topilmadi');
  en.click();
  await pause();
  const uz = [...document.querySelectorAll('.lang-opt')].find((b) => b.textContent.includes("O'zbek"));
  if (!uz) throw new Error("o'zbek tili tugmasi topilmadi");
  uz.click();
  await pause();
  // FAQ: birinchisi standart bo'yicha ochiq; boshqasini ochib ko'ramiz
  const faqs = document.querySelectorAll('.faq-q');
  faqs[faqs.length > 1 ? 1 : 0].click();
});

await checkStep('sozlamalar: effektlar o\'chirildi', () => {
  if (document.documentElement.getAttribute('data-effects') !== 'off') throw new Error('effektlar o\'chirilmadi');
}, 8000);

await doStep('sozlamalar: effektlarni qayta yoqamiz', () => {
  const sw = document.querySelector('.switch');
  if (!sw) throw new Error('effektlar tugmasi topilmadi');
  sw.click();
});

await checkStep(
  'sozlamalar natijalari (avtomatik mavzu + effektlar + til + FAQ)',
  () => {
    const theme = document.documentElement.getAttribute('data-theme');
    if (theme !== 'dark' && theme !== 'light') throw new Error('mavzu qo\'llanmadi: ' + theme);
    if (document.documentElement.getAttribute('data-effects') !== 'on') throw new Error('effektlar yoqilmadi');
    if (document.documentElement.getAttribute('lang') !== 'uz') throw new Error('til uz ga qaytmadi');
    if (!document.querySelector('.faq-a, .faq-item.open')) throw new Error('FAQ javobi ochilmadi');
  },
  8000
);

// ============================================================
//  7. Chiqish va ustozga kirish
// ============================================================
await step(
  'chiqish va ustoz akkauntiga kirish',
  async () => {
    const out = document.querySelector('.nav-item.logout');
    if (!out) throw new Error('chiqish tugmasi topilmadi');
    out.click();
  },
  () => {
    const rows = [...document.querySelectorAll('.demo-row')];
    if (!rows.length) throw new Error('chiqishdan keyin login sahifasi kelmadi');
    rows[1].click();
  },
  8000
);

await checkStep('ustoz paneli (byudjet, coin, vazifa)', () => {
  need('.teacher-home', 'teacher-home');
  need('.budget-figures', 'coin byudjeti');
}, 8000);

await step(
  'ustoz: umumiy chat (ustozlar + direktor)',
  async () => {
    nav('Chat').click();
  },
  () => {
    need('.chat-page', 'chat');
    const items = [...document.querySelectorAll('.chat-item')];
    const staff = items.find((x) => x.textContent.includes('Ustozlar va direktor'));
    if (!staff) throw new Error('umumiy xona topilmadi. Mavjud: ' + items.map((x) => x.textContent.trim().slice(0, 24)).join(' | '));
    staff.click();
  },
  8000
);

// ============================================================
//  8. Ustoz: vazifalar
// ============================================================
await step(
  'ustoz: vazifalar sahifasi',
  async () => {
    nav('Vazifalar').click();
  },
  () => {
    need('.teacher-tasks', 'vazifalar sahifasi');
  },
  8000
);

// ============================================================
//  9. Ustoz: dars jadvali
// ============================================================
await step(
  'ustoz: dars jadvali (bugun + hafta)',
  async () => {
    nav('Dars jadvali').click();
  },
  () => {
    need('.teacher-schedule', 'jadval');
    const week = [...document.querySelectorAll('.tab')].find((b) => b.textContent.includes('Hafta'));
    if (week) week.click();
  },
  8000
);

// ============================================================
//  10. Ustoz: davomat (yangi qoidalar)
//     * keldi / kelmadi (ketdi yo'q)
//     * kelmadi uchun sabab majburiy
//     * hamma belgilanmaguncha saqlanmaydi
//     * 24 soat ichida tahrir mumkin
// ============================================================
await step(
  'ustoz: davomat sahifasi',
  async () => {
    nav('Davomat').click();
  },
  () => {
    need('.teacher-attendance', 'davomat');
    const rows = document.querySelectorAll('.att-row');
    if (rows.length < 2) throw new Error("o'quvchi qatorlari kam: " + rows.length);
    // "Ketdi" tugmasi bo'lmasligi kerak
    const labels = [...document.querySelectorAll('.att-btn')].map((b) => b.textContent).join('|');
    if (labels.includes('Ketdi')) throw new Error('eski "Ketdi" tugmasi hali ham bor');
    // Chala saqlashga urinamiz: birinchi o'quvchini "kelmadi" qilamiz
    const bad = document.querySelector('.att-btn.bad');
    if (bad) bad.click();
  },
  8000
);

await checkStep('ustoz: "kelmadi" uchun sabab tanlanadi', () => {
  const reason = need('.att-reason', 'sabab bloki');
  const kasallik = [...reason.querySelectorAll('.reason-btn')].find((b) => b.textContent.includes('Kasallik'));
  if (!kasallik) throw new Error('Kasallik tugmasi topilmadi');
  kasallik.click();
  // Hamma belgilanmaguncha saqlash tugmasi o'chirilgan (disabled)
  const save = findBtn('Davomatni saqlash') || findBtn('Davomatni yangilash');
  if (!save) throw new Error('saqlash tugmasi topilmadi');
  if (!save.disabled) throw new Error('hamma belgilanmasdan saqlash tugmasi faol');
}, 8000);

await step(
  'ustoz: hamma o\'quvchini belgilab saqlash',
  async () => {
    // Qolgan o'quvchilarni "keldi" qilamiz
    [...document.querySelectorAll('.att-btn.good')].forEach((b) => {
      if (!b.classList.contains('active')) b.click();
    });
  },
  () => {
    const save = findBtn('Davomatni saqlash');
    if (!save) throw new Error('saqlash tugmasi topilmadi');
    if (save.disabled) throw new Error('hamma belgilangandan keyin ham tugma faol emas');
    save.click();
  },
  8000
);

await checkStep('ustoz: davomat saqlandi va tahrir oynasi ko\'rinadi', () => {
  const ok = document.querySelector('.alert.ok');
  if (!ok) throw new Error("saqlangani haqida xabar yo'q");
  const locked = need('.att-locked', 'tahrir holati');
  if (!locked.textContent.trim()) throw new Error('tahrir holati matni bo\'sh');
}, 8000);

await step(
  'ustoz: davomatni 24 soat ichida tahrirlash',
  async () => {
    // Bitta o'quvchini "kelmadi" qilib, sababini almashtiramiz
    const bad = document.querySelector('.att-btn.bad');
    if (bad) bad.click();
  },
  () => {
    const reason = need('.att-reason', 'sabab bloki');
    const oilaviy = [...reason.querySelectorAll('.reason-btn')].find((b) => b.textContent.includes('Oilaviy'));
    if (!oilaviy) throw new Error('Oilaviy sabab tugmasi topilmadi');
    oilaviy.click();
  },
  8000
);

await checkStep('ustoz: davomat yangilandi (dublikat yo\'q)', () => {
  const save = findBtn('Davomatni yangilash');
  if (!save) throw new Error('"Davomatni yangilash" tugmasi topilmadi');
  if (save.disabled) throw new Error('yangilash tugmasi faol emas');
  save.click();
}, 8000);

await checkStep('ustoz: yangilangan davomat hisoblanadi', () => {
  const compute = findBtn('Davomatni hisoblash');
  if (compute) compute.click();
  const ok = document.querySelector('.alert.ok');
  if (!ok) throw new Error('yangilangani haqida xabar yo\'q');
}, 8000);

// ============================================================
//  11. Chiqish va direktor
// ============================================================
await step(
  'chiqish va direktor akkauntiga kirish',
  async () => {
    const out = document.querySelector('.nav-item.logout');
    if (!out) throw new Error('chiqish tugmasi topilmadi');
    out.click();
  },
  () => {
    const rows = [...document.querySelectorAll('.demo-row')];
    if (!rows.length) throw new Error('login sahifasi kelmadi');
    rows[2].click();
  },
  8000
);

await checkStep('direktor paneli (davomat nazorati)', () => {
  need('.director-home', 'director-home');
  need('.monitor-list', 'davomat nazorati');
  need('.monitor-row', 'nazorat qatori');
}, 15000);

await checkStep("direktor: SMS yuborish tugmasi (davomat qilmagan ustozlar)", () => {
  if (!findBtn('SMS yuborish')) throw new Error('SMS yuborish tugmasi topilmadi');
}, 15000);

await doStep('direktor: SMS yuborish', () => {
  const sms = findBtn('SMS yuborish');
  if (!sms) throw new Error('SMS yuborish tugmasi topilmadi');
  sms.click();
});

await doStep('direktor: hamma ustozga birdan limit yozish (650)', () => {
  need('.budget-all', 'hammaga birdan bloki');
  const input = document.querySelector('.budget-all .input');
  if (!input) throw new Error('umumiy miqdor maydoni topilmadi');
  setValue(input, '650');
});

// Muhim: yozish va bosish ALOHIDA act doiralarida bo'lishi kerak —
// aks holda bosish eski (yangilanmagan) holat bilan ishlaydi.
await doStep('direktor: hamma ustozga birdan limit belgilash', () => {
  const all = findBtn('Hammaga belgilash');
  if (!all) throw new Error('"Hammaga belgilash" tugmasi topilmadi');
  all.click();
});

await checkStep('direktor: "hammaga belgilash" bajarildi', () => {
  const ok = document.querySelector('.alert.ok');
  if (!ok) throw new Error("belgilangani haqida xabar yo'q");
}, 8000);

await checkStep('direktor: limit hammaniki bir xil bo\'ldi', () => {
  // "Hammaga belgilash" dan keyin jadvaldagi "qolgan" ustuni (amount − tarqatilgan)
  // har bir ustoz uchun 650 bo'lishi kerak.
  const block = document.querySelector('.budget-all');
  if (!block) throw new Error('hammaga belgilash bloki topilmadi');
  const card = block.closest('.card') || block.parentElement;
  const cells = [...card.querySelectorAll('table.table tbody tr td.right.strong')].map((c) => c.textContent.trim());
  if (!cells.length) throw new Error('ustozlar jadvali topilmadi');
  const wrong = cells.filter((v) => v !== '650');
  if (wrong.length) {
    const ok = document.querySelector('.alert.ok');
    throw new Error('hamma ustozga 650 qo\'yilmadi: ' + cells.join(',') + ' | xabar: ' + (ok ? ok.textContent : 'yo\'q'));
  }
}, 8000);

await checkStep('direktor: SMS log', () => {
  need('.sms-log', 'SMS log');
}, 8000);

// ============================================================
//  12. Direktor: barcha ustozlar chati
// ============================================================
await step(
  'direktor: barcha ustozlar chati',
  async () => {
    nav('Chat').click();
  },
  () => {
    need('.chat-page', 'direktor chati');
    const input = document.querySelector('.chat-input input');
    if (input) setValue(input, 'Salom ustozlar!');
    const send = document.querySelector('.chat-input .btn');
    if (send) send.click();
  },
  8000
);

console.log('\n=== NATIJA ===');
process.on('exit', (code) => {
  // jsdom va sahifalardagi setInterval taymerlari jarayonni ushlab qolmasin
  if (code === 0 && process.exitCode !== 1) console.log('smoke: tugadi');
});
if (errors.length) {
  console.log('React xatoliklar: ' + errors.length);
  errors.slice(0, 12).forEach((e, i) => console.log((i + 1) + '. ' + e.split('\n')[0]));
  process.exitCode = 1;
} else {
  console.log("React xatoliklar yo'q ✓");
}

// Chat sahifasi va boshqa sahifalardagi taymerlar to'xtatilsin —
// aks holda Node jarayoni osilib qoladi.
dom.window.close();
setTimeout(() => process.exit(process.exitCode || 0), 50);
