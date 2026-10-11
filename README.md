# 🎓 Intellekt Innovatsion Maktabi — Maktab boshqaruv tizimi

O'quvchi, ustoz va direktor uchun uchta alohida kabinetga ega to'liq funksional
maktab boshqaruv ilovasi. **Coin** (rag'bat) tizimi, davomat nazorati, reyting,
chat va sozlamalar — barchasi bir joyda.

> **Brend:** To'q ko'k `#1B3A5C` + oltin `#C9A227` — rasmiy logotip asosida.
> Batafsil: [`BREND-QOLLANMASI.md`](BREND-QOLLANMASI.md)

---

## 🚀 Ishga tushirish

### Mahalliy kompyuterda (development)

```bash
# 1) API server (port 4000)
cd server && npm install && node index.js

# 2) Veb-ilova (port 5173) — yangi terminal oynasida
cd client && npm install && npm run dev
```

Brauzerda **http://localhost:5173** ni oching.

### Bitta serverda (production)

Klient build qilingandan keyin Express server uni ham beradi — bitta URL yetarli:

```bash
npm install                 # barcha kutubxonalar
npm run build               # client/dist yaratiladi
npm start                   # http://localhost:4000
```

---

## ☁️ Internetga joylash (deploy)

Loyiha **bitta Node xizmati** sifatida ishlaydi (Express + build qilingan React).
Har qanday Node hostingiga to'g'ridan-to'g'ri yuklanadi.

| Xizmat | Sozlama |
|---|---|
| **Build command** | `npm run build` |
| **Start command** | `npm start` |
| **Health check** | `/api/health` |
| **Node versiyasi** | 20 yoki yuqori |

### Render.com (bepul) — tavsiya etiladi

1. https://dashboard.render.com → **New +** → **Blueprint**
2. Bu reponi tanlang (`NomerBozori/IIM-maktab-app`)
3. `render.yaml` avtomatik o'qiladi — **Apply** bosing
4. 2–3 daqiqadan keyin sayt tayyor 🎉

### Railway / Fly.io / VPS

```bash
git clone https://github.com/NomerBozori/IIM-maktab-app.git
cd IIM-maktab-app
npm install && npm run build && npm start
```

> ⚠️ **Netlify/Vercel** faqat statik saytlarni beradi — bu loyihaning
> Express serveri ishlamaydi. Ular uchun backend alohida kerak bo'ladi.

### Muhim eslatma — ma'lumotlar

Ma'lumotlar `server/data/*.json` fayllarida saqlanadi. Bepul hostinglarda
disk vaqtinchalik bo'lgani uchun **har deploy'da ma'lumotlar qayta
yaratiladi** (seed). Doimiy saqlash kerak bo'lsa, `server/index.js` dagi
`readJson`/`writeJson` funksiyalarini ma'lumotlar bazasiga o'tkazing.

---

## 🔐 Demo akkauntlar

Barcha parollar: **`1234`**

| Login | Rol | Kabinet |
|---|---|---|
| `director` | 👔 Direktor | Coin belgilash, davomat nazorati, SMS |
| `ustoz1` … `ustoz9` | 👨‍🏫 Ustoz | Byudjet, vazifa, jadval, davomat |
| `oquvchi1` … `oquvchi40` | 🎒 O'quvchi | Coinlar, baholar, reyting, chat |

Seed ma'lumotlar: 9 ustoz, 6 sinf (8-A, 8-B, 9-A, 9-B, 10-A, 11-A), 40 o'quvchi.

> ⚠️ Bu akkauntlar faqat namoyish uchun. Ilova demo hisoblar uchun
> «namuna parol» ogohlantirishini ko'rsatadi. Ishlab chiqarishda
> `SEED_DEMO=0` qo'ying yoki har bir demo hisobning parolini almashtiring
> (Sozlamalar → Parolni o'zgartirish).

---

## 👥 Rollar va imkoniyatlar

### 🎒 O'quvchi
- **3×3 coin panarasi** — markadagi katakda oylik coin yig'indisi, atrofdagi
  kataklarda fanlar bo'yicha baholar
- **Kunlik dars jadvali** — coinlar ostida
- **Vazifalar** — coinlar ustida
- **Reyting** — uchta alohida bo'lim: coinlar / davomat / oylik monitoring
- **Chat** — barcha biriktirilgan ustozlar + sinf umumiy guruhi
- **Sozlamalar** — yorug'i/qorong'i rejim, uz/ru/en til, FAQ, parol, ism
- **Tengdoshlar profili** — faqat statistika ko'rinadi

### 👨‍🏫 Ustoz
- **Oylik coin byudjeti** — belgilangan miqdorni o'quvchilarga taqsimlash
- **Uy vazifasi berish** — sinf va fanga biriktirish
- **Haftalik dars jadvali** — soatlar bilan
- **Davomat** — keldi / ketdi / kelmadi + avtomatik hisoblash
- **Chat** — sinf guruhlari + har bir o'quvchi bilan alohida
- **Sozlamalar** — o'quvchi bilan bir xil (reyting yo'q)

### 👔 Direktor
- **Har ustozga oylik coin belgilash**
- **Davomat nazorati** — kim davomatni to'ldirmaganini ko'rish
- **SMS** — davomat to'ldirilmagan ustozga ogohlantirish yuborish
  (`Bu ustoz {sinflar} sinf(lar)ining davomatini qilmadi. Iltimos, davomatni to'ldiring.`)
- **Chat** — barcha ustozlar bilan
- **Sozlamalar** — o'quvchi bilan bir xil

---

## 🛠 Texnologiyalar

| Qism | Texnologiya |
|---|---|
| **Backend** | Node.js + Express + CORS (CommonJS) |
| **Frontend** | React 18 + React Router 6 + Vite 5 |
| **Ma'lumotlar** | JSON fayllar (`server/data/`) — avtomatik seed |
| **Uslublar** | Sof CSS (o'zgaruvchilar + yorug'i/qorong'i rejim) |
| **Ikonkalar** | Inline SVG (tashqi kutubxona yo'q) |
| **Test** | Node + jsdom smoke test |

---

## 📁 Loyiha tuzilishi

```
school-app/
├── server/
│   ├── index.js           # To'liq REST API + xavfsizlik (port 4000)
│   ├── security-test.mjs  # 36 ta xavfsizlik tekshiruvi
│   ├── package.json
│   └── data/              # Avtomatik yaratiladigan JSON (git'da yo'q)
│
├── client/
│   ├── index.html        # Favicon = /logo.png
│   ├── vite.config.js    # /api → http://localhost:4000
│   ├── public/
│   │   └── logo.png      # Brend logotipi
│   ├── smoke.mjs         # Ishlash tekshiruvi (18 qadam)
│   ├── build-smoke.mjs   # Smoke muhitini tayyorlaydi (esbuild)
│   ├── smoke-fetch.mjs   # Test uchun vaqtinchalik API server
│   └── src/
│       ├── main.jsx
│       ├── store.jsx     # Kontekst, 3 tilli lug'at, API yordamchisi
│       ├── ui.jsx        # Umumiy komponentlar (Card, Button, Avatar, Logo…)
│       ├── App.jsx       # Layout + rollar bo'yicha marshrutlar
│       ├── styles.css    # Brend uslublari (ko'k + oltin)
│       └── pages/
│           ├── Login.jsx
│           ├── StudentHome.jsx
│           ├── Rankings.jsx
│           ├── ChatPage.jsx
│           ├── SettingsPage.jsx
│           ├── TeacherHome.jsx
│           ├── TeacherTasks.jsx
│           ├── TeacherSchedule.jsx
│           ├── TeacherAttendance.jsx
│           └── DirectorHome.jsx
│
├── .env.example          # Muhit o'zgaruvchilari namunasi (xavfsizlik sozlamalari)
├── BREND-QOLLANMASI.md   # Brend qo'llanmasi (ranglar, shrift, logo)
└── README.md
```

---

## 🛡 Xavfsizlik

### Nima qilingan

| Soha | Yechim |
|---|---|
| **Parollar** | `scrypt` (N=16384) + har hisob uchun alohida `salt`. Ochiq matnli parollar ishlatilmaydi; eski `users.json` fayllari birinchi ishga tushishda avtomatik hash'lanadi |
| **Sessiyalar** | `crypto.randomBytes(32)` token (256 bit), 8 soatlik TTL, har so'rovda yangilanadi, `POST /api/logout` bilan bekor qilinadi |
| **Parol almashtirish** | Joriy parol majburiy; yangisi kamida 8 belgi; boshqa qurilmalardagi sessiyalar avtomatik bekor qilinadi |
| **Rollar** | Har bir endpoint rolni tekshiradi (`student` / `teacher` / `director`). Direktor va Ustoz hisobi ochiq ro'yxatdan o'tish orqali ochilmaydi |
| **IDOR** | Ustoz faqat o'z sinfiga vazifa beradi, davomat qiladi va coin tarqatadi; o'quvchi faqat o'z sinfi vazifasini belgilaydi; chat xonalariga faqat a'zolar kiradi |
| **Brute-force** | Login: IP bo'yicha daqiqasiga limit + 5 marta xatodan keyin 15 daqiqa blok; ro'yxatdan o'tish va parol almashtirishda alohida limitlar |
| **CORS** | Faqat bir xil origin + `CORS_ORIGINS` ro'yxati (dev/preview uchun localhost va `*.e2b.app`) |
| **Sarlavhalar** | `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, HTTPS'da HSTS, prod build'da CSP; `x-powered-by` yashirilgan |
| **Input** | Barcha maydonlar bo'yicha uzunlik/format tekshiruvi (sana `YYYY-MM-DD`, status whitelist, login regex, chat 2000 belgi, JSON 1 MB) |
| **Ma'lumotlar** | `server/data/` papkasi `0700`, fayllar `0600`, atomar yozish (tmp + rename), javoblarda faqat oq ro'yxatdagi maydonlar |
| **Chat/rate** | Sessiyalar soni cheklangan (`MAX_SESSIONS`), chat javobi oxirgi 200 xabar bilan cheklangan |

### Sozlamalar (`.env`)

Namuna: [`.env.example`](.env.example) (`cp .env.example .env`).

| O'zgaruvchi | Standart | Tavsif |
|---|---|---|
| `PORT` | `4000` | Server porti |
| `DATA_DIR` | `server/data` | Ma'lumotlar papkasi (doimiy disk uchun) |
| `SEED_DEMO` | `1` | `0` — namuna hisoblar yaratilmaydi (tuzilma qoladi) |
| `ADMIN_LOGIN` / `ADMIN_PASSWORD` | bo'sh | `SEED_DEMO=0` bo'lganda birinchi ishga tushishda direktor hisobini yaratadi |
| `STAFF_INVITE_CODE` | bo'sh | Ustoz hisobini ochish uchun taklif kodi (bo'sh bo'lsa yopiq) |
| `PASSWORD_MIN_LENGTH` | `8` | Yangi parolning minimal uzunligi |
| `SESSION_TTL_MINUTES` | `480` | Sessiya umri (daqiqa) |
| `MAX_SESSIONS` | `5000` | Bir vaqtda saqlanadigan sessiyalar |
| `TRUST_PROXY` | `1` | Proxy ortida haqiqiy IP (`0` — to'g'ridan-to'g'ri ochiq bo'lsa) |
| `CORS_ORIGINS` | bo'sh | Qo'shimcha ruxsat etilgan origin'lar (vergul bilan) |
| `FRAME_ANCESTORS` | `*` | iframe siyosati; ishlab chiqarishda `'self' https://maktab.uz` |

### Ishlab chiqarishga chiqishdan oldin (checklist)

1. `SEED_DEMO=0` qo'ying (unda tizimga kirish uchun birinchi ishga tushishda
   `ADMIN_LOGIN` + `ADMIN_PASSWORD` bilan direktor hisobini yaratasiz) yoki demo
   hisoblarning parollarini almashtiring.
2. `STAFF_INVITE_CODE` — uzun tasodifiy kod; ustoz hisoblari shu kod bilan ochiladi.
3. `PASSWORD_MIN_LENGTH=10` (yoki ko'proq) va `NODE_ENV=production`.
4. Sayt **HTTPS** orqali ishlashi shart (sessiya tokeni `localStorage`da saqlanadi).
5. `FRAME_ANCESTORS` ni o'z domeningizga cheklang: `'self' https://maktab.uz`.
6. `server/data/` papkasini zaxiralang (backup) — bu yerda barcha ma'lumotlar.
7. Ma'lumotlar JSON fayllarda saqlanadi: katta maktab uchun ma'lumotlar bazasiga
   (PostgreSQL va h.k.) o'tish tavsiya etiladi.

> Sessiyalar xotirada (RAM) saqlanadi — server qayta ishga tushsa, hamma
> qaytadan kiradi. Bu xavfsizlik nuqtai nazaridan zararsiz.

---

## 🔌 API yo'llari

| Yo'l | Tavsif |
|---|---|
| `GET  /api/health` | Holat tekshiruvi |
| `POST /api/login` | Kirish |
| `POST /api/register` | Ro'yxatdan o'tish (faqat o'quvchi; ustoz — taklif kodi bilan) |
| `POST /api/logout` | Sessiyani bekor qilish |
| `GET  /api/me` | Joriy foydalanuvchi |
| `PUT  /api/me` | Ism/parolni almashtirish (joriy parol talab qilinadi) |
| `GET  /api/student/dashboard` | O'quvchi paneli (coin, baholar, jadval, vazifalar) |
| `GET  /api/rankings` | Reyting (coin / davomat / monitoring) |
| `GET  /api/students/:id/stats` | O'quvchi statistikasi |
| `GET  /api/schedule` | Dars jadvali |
| `GET  /api/tasks` | Vazifalar |
| `POST /api/tasks/:id/done` | Vazifani bajarildi deb belgilash |
| `POST /api/attendance` | Davomatni saqlash |
| `GET  /api/director/attendance-check` | Davomat nazorati |
| `POST /api/director/send-sms` | SMS yuborish |
| `GET  /api/director/sms-log` | Yuborilgan SMS lar |
| `GET  /api/director/budgets` | Ustoz byudjetlari |
| `GET  /api/teacher/coins` | Ustoz coin balansi |
| `GET  /api/my-students` | Ustozning o'quvchilari |
| `GET  /api/chats` | Chat xonalari |
| `GET  /api/chats/:roomId/messages` | Chat xabarlari (faqat xona a'zolariga) |
| `POST /api/chats/:roomId/messages` | Chatga xabar yuborish (faqat a'zolarga) |
| `POST /api/teacher/coins` | O'quvchiga coin berish (o'z sinfi doirasida) |
| `POST /api/director/budgets` | Ustoz byudjetini belgilash |

---

## ✅ Test

```bash
npm install                 # ildizda (skriptlar uchun)
npm --prefix server install
npm --prefix client install

npm run test:security       # 36 ta xavfsizlik tekshiruvi (haqiqiy API serverga qarshi)
npm test                    # 18 qadamli interfeys smoke testi (jsdom + haqiqiy API)
npm run test:all            # ikkalasi ketma-ket
```

**`test:security`** quyidagilarni tekshiradi: parol hash, token tasodifiyligi,
rollar bo'yicha ruxsatlar, IDOR (begona sinf/vazifa/chat/o'quvchi), brute-force
himoyasi, CORS, sarlavhalar, input validatsiya, fayl huquqlari (0600/0700).

**`npm test`** (18 qadam): login sahifasi → o'quvchi paneli → reyting → statistika
→ chat → sozlamalar (3 til + qorong'i rejim + FAQ) → ustoz paneli → vazifalar →
jadval → davomat → direktor paneli → SMS → chat. Test hafta kuniga bog'liq emas
(sana qat'iy «dushanba» qilib olinadi) va o'zi vaqtinchalik API serverni ishga
tushiradi (`client/smoke-fetch.mjs`).

---

## 🌍 Tillar

Butun interfeys **3 tilda**: `uz` (O'zbekcha), `ru` (Русский), `en` (English).
Sozlamalar → Til bo'limidan almashadi va `localStorage` da saqlanadi.

---

## 🎨 Yorug'i / Qorong'i rejim

Sozlamalar → Ko'rinish bo'limidan almashadi. Ranglar logotipdan olingan:
ko'k `#1B3A5C`, oltin `#C9A227`, qorong'i fon `#081422` / `#0C1B2E`.

---

## 📄 Litsenziya

MIT
