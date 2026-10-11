// ============================================================
//  Smoke test (client/smoke.mjs) uchun muhit tayyorlash.
//
//  smoke.mjs ikkita faylni kutadi (ikkalasi ham git'ga tushmaydi):
//    client/.smoke/main.js      — App + AppProvider (React bundle)
//    client/.smoke/fetchtest.mjs — fetch'ni haqiqiy API serverga ulaydi
//
//  Ishlatish:  node build-smoke.mjs   (yoki: npm test)
// ============================================================
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const SMOKE = path.join(DIR, '.smoke');

fs.mkdirSync(SMOKE, { recursive: true });

// 1) Kirish nuqtasi: main.jsx render qiladi, shuning uchun alohida
//    "export only" fayl yozamiz.
const entry = path.join(SMOKE, 'entry.jsx');
fs.writeFileSync(
  entry,
  "export { default as App } from '../src/App.jsx';\n" + "export { AppProvider } from '../src/store.jsx';\n"
);

// 2) React/react-dom tashqarida qoladi (bitta nusxa bo'lishi shart —
//    aks holda "invalid hook call" xatosi chiqadi).
await build({
  entryPoints: [entry],
  outfile: path.join(SMOKE, 'main.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'node18',
  jsx: 'transform',
  define: { 'process.env.NODE_ENV': '"development"' },
  external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react-router-dom'],
  logLevel: 'warning',
});

// 3) fetch qatlami — smoke.mjs uni `./.smoke/fetchtest.mjs` dan oladi
fs.copyFileSync(path.join(DIR, 'smoke-fetch.mjs'), path.join(SMOKE, 'fetchtest.mjs'));

console.log('smoke: tayyor →  .smoke/main.js, .smoke/fetchtest.mjs');
