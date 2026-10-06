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

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
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

const __mem = new Map();
global.localStorage = {
  getItem: (k) => (__mem.has(k) ? __mem.get(k) : null),
  setItem: (k, v) => __mem.set(String(k), String(v)),
  removeItem: (k) => __mem.delete(k),
  clear: () => __mem.clear(),
  key: (i) => [...__mem.keys()][i] ?? null,
  get length() {
    return __mem.size;
  },
};
global.sessionStorage = global.localStorage;
Object.defineProperty(dom.window, 'localStorage', { value: global.localStorage, configurable: true });
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
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
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
    const grid = need('.coin-grid', 'coin grid');
    if (grid.children.length !== 9) throw new Error("coin-grid da 9 katak yo'q: " + grid.children.length);
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

await doStep('sozlamalar: korinish / til / FAQ', () => {
  const dark = [...document.querySelectorAll('.theme-opt')].find((b) => b.textContent.includes("Qorong'i"));
  if (!dark) throw new Error("qorong'i rejim tugmasi topilmadi");
  dark.click();
  const ru = [...document.querySelectorAll('.lang-opt')].find((b) => b.textContent.includes('Русский'));
  if (!ru) throw new Error('rus tili tugmasi topilmadi');
  ru.click();
  const en = [...document.querySelectorAll('.lang-opt')].find((b) => b.textContent.includes('English'));
  if (!en) throw new Error('ingliz tili tugmasi topilmadi');
  en.click();
  const uz = [...document.querySelectorAll('.lang-opt')].find((b) => b.textContent.includes("O'zbek"));
  if (!uz) throw new Error("o'zbek tili tugmasi topilmadi");
  uz.click();
  // FAQ: birinchisi standart bo'yicha ochiq; boshqasini ochib ko'ramiz
  const faqs = document.querySelectorAll('.faq-q');
  faqs[faqs.length > 1 ? 1 : 0].click();
});

await checkStep(
  'sozlamalar natijalari (dark + 3 til + FAQ)',
  () => {
    if (document.documentElement.getAttribute('data-theme') !== 'dark') throw new Error('dark mode ishlamadi');
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
//  10. Ustoz: davomat
// ============================================================
await step(
  'ustoz: davomat sahifasi',
  async () => {
    nav('Davomat').click();
  },
  () => {
    need('.teacher-attendance', 'davomat');
    const btn = document.querySelector('.att-btn');
    if (btn) btn.click();
  },
  8000
);

await checkStep('ustoz: davomatni saqlash', () => {
  const save = findBtn('Davomatni saqlash');
  if (!save) throw new Error('saqlash tugmasi topilmadi');
  save.click();
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

await checkStep('direktor: SMS log + coin belgilash', () => {
  need('.sms-log', 'SMS log');
  const input = document.querySelector('.tiny-input');
  if (input) setValue(input, '777');
  const save = findBtn('Coin belgilash');
  if (save) save.click();
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
if (errors.length) {
  console.log('React xatoliklar: ' + errors.length);
  errors.slice(0, 12).forEach((e, i) => console.log((i + 1) + '. ' + e.split('\n')[0]));
  process.exitCode = 1;
} else {
  console.log("React xatoliklar yo'q ✓");
}
