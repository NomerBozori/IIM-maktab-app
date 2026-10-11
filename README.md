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
| `oquvchi1` … `oquvchi66` | 🎒 O'quvchi | Coinlar, baholar, reyting, chat |

Seed ma'lumotlar: 9 ustoz, **11 sinf (1, 2, 3, … 11)** va 66 o'quvchi (har sinfda
6 ta: 3 tasi A guruhda, 3 tasi B guruhda).

**Sinf nomi faqat raqam** — `1`, `2`, … `11` (harf sinf nomiga qo'shilmaydi).
Guruh esa o'quvchining o'zi tanlaydigan til yo'nalishi:
**A — rus tili**, **B — o'zbek tili** (masalan o'quvchi: `8-sinf · A — Rus tili`).

> ⚠️ Bu akkauntlar faqat namoyish uchun. Ilova demo hisoblar uchun
> «namuna parol» ogohlantirishini ko'rsatadi. Ishlab chiqarishda
> `SEED_DEMO=0` qo'ying yoki har bir demo hisobning parolini almashtiring
> (Sozlamalar → Parolni o'zgartirish).

---

## 👥 Rollar va imkoniyatlar

### 🎒 O'quvchi
- **Ixcham coin ko'rsatkichi** — o'quvchi ismi yonida oltin «coin» nishoni,
  tepada esa 15 sekundda yangilanib turuvchi kichik hisoblagich (katta 3×3
  panara olib tashlangan — endi asosiy mazmunga xalaqit bermaydi)
- **Kunlik dars jadvali** va **vazifalar**
- **Baholar** — fanlar bo'yicha (coin kartasi ostida, ixcham ro'yxat)
- **Reyting** — uchta alohida bo'lim: coinlar / davomat / oylik monitoring
- **Chat** — biriktirilgan ustozlar + sinf umumiy guruhi
- **Sozlamalar** — yorug'i / qorong'i / **avtomatik** rejim, **effektlar**
  (animatsiya) tugmasi, uz/ru/en til, FAQ, parol, ism
- **Tengdoshlar profili** — faqat statistika ko'rinadi
- **Sinf va guruh** — sarlavhada `8-sinf · A — Rus tili` ko'rinishida

### 👨‍🏫 Ustoz
- **Oylik coin byudjeti** — belgilangan miqdorni o'quvchilarga taqsimlash
- **Uy vazifasi berish** — sinf va fanga biriktirish
- **Haftalik dars jadvali** — soatlar bilan
- **Davomat (v2)** — har bir o'quvchi uchun **«keldi» / «kelmadi»**; kelmagan
  bo'lsa sabab majburiy (kasallik / oilaviy sabab / boshqa + izoh). Hamma
  o'quvchi belgilanmaguncha **saqlash tugmasi bloklanadi**; saqlangandan keyin
  **24 soat ichida tahrirlash** mumkin, keyin o'qish uchun ochiq bo'ladi
  (`ATT_EDIT_WINDOW_MINUTES` bilan sozlanadi)
- **Chat** — «Ustozlar va direktor» umumiy xonasi (barcha ustozlar + direktor)
  va o'z sinfidagi har bir o'quvchi bilan alohida
- **Sozlamalar** — o'quvchi bilan bir xil (reyting yo'q)

### 👔 Direktor
- **Oylik coin belgilash** — har bir ustozga alohida **yoki bir tugma bilan
  hammasiga birdan** (bitta miqdor kiriting → «Hammaga belgilash»)
- **Davomat nazorati** — kim davomatni to'ldirmaganini ko'rish
- **SMS** — davomat to'ldirilmagan ustozga ogohlantirish yuborish
  (`Bu ustoz {sinflar} sinf(lar)ining davomatini qilmadi. Iltimos, davomatni to'ldiring.`)
- **Chat** — «Ustozlar va direktor» umumiy xonasi
- **Sozlamalar** — o'quvchi bilan bir xil

---

## 🛠 Texnologiyalar

| Qism | Texnologiya |
|---|---|
| **Backend** | Node.js + Express + CORS (CommonJS) |
| **Frontend** | React 18 + React Router 6 + Vite 5 |
| **Ma'lumotlar** | JSON fayllar (`server/data/`) — avtomatik seed |
| **Uslublar** | Sof CSS (o'zgaruvchilar, yorug'i/qorong'i/avtomatik rejim, animatsiyalar) |
| **Ikonkalar** | Inline SVG (tashqi kutubxona yo'q) |
| **Test** | Node + jsdom smoke test |

---

## 📁 Loyiha tuzilishi

```
school-app/
├── server/
│   ├── index.js           # To'liq REST API + xavfsizlik (port 4000)
│   ├── security-test.mjs  # 47 ta xavfsizlik tekshiruvi
│   ├── package.json
│   └── data/              # Avtomatik yaratiladigan JSON (git'da yo'q)
│
├── client/
│   ├── index.html        # Favicon = /logo.png
│   ├── vite.config.js    # /api → http://localhost:4000
│   ├── public/
│   │   └── logo.png      # Brend logotipi
│   ├── smoke.mjs         # Ishlash tekshiruvi (28 tekshiruv qadami)
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
| **Davomat** | Faqat o'z sinfi; hamma o'quvchi belgilanmaguncha saqlanmaydi; saqlangandan keyin `ATT_EDIT_WINDOW_MINUTES` (standart 24 soat) ichida tahrirlanadi, keyin 403 |
| **Chat xonalari** | «Ustozlar va direktor» xonasi — faqat ustoz/direktor; o'quvchi bilan shaxsiy yozishma — faqat o'sha o'quvchining ustozlari |

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
| `ATT_EDIT_WINDOW_MINUTES` | `1440` | Saqlangan davomatni tahrirlash oynasi (daqiqa; `0` — umuman tahrirlanmaydi) |
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
| `GET  /api/classes` | Sinflar ro'yxati (1…11) va guruhlar (A — rus, B — o'zbek) — ochiq ma'lumot |
| `POST /api/attendance` | Davomatni saqlash (hammasi belgilanmaguncha 400; 24 soatdan keyin 403) |
| `GET  /api/attendance` | Kunning davomati + tahrirlash oynasi (`canEdit`, `editableUntil`) |
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
| `POST /api/director/budgets` | Bitta ustoz byudjetini belgilash |
| `POST /api/director/budgets/all` | **Barcha ustozga birdan** oylik coin belgilash |

---

## ✅ Test

```bash
npm install                 # ildizda (skriptlar uchun)
npm --prefix server install
npm --prefix client install

npm run test:security       # 47 ta xavfsizlik tekshiruvi (haqiqiy API serverga qarshi)
npm test                    # 28 tekshiruvli interfeys smoke testi (jsdom + haqiqiy API)
npm run test:all            # ikkalasi ketma-ket
```

**`test:security`** quyidagilarni tekshiradi: parol hash, token tasodifiyligi,
rollar bo'yicha ruxsatlar, IDOR (begona sinf/vazifa/chat/o'quvchi), brute-force
himoyasi, CORS, sarlavhalar, input validatsiya, fayl huquqlari (0600/0700).

**`npm test`** (28 tekshiruv): login sahifasi → ro'yxatdan o'tishdagi sinf tanlovi
(sinf nomida harf yo'qligi: faqat `1…11` va A/B guruh) → o'quvchi paneli (ixcham
coin nishoni, 3×3 panara yo'qligi, `8-sinf · A — Rus tili` ko'rinishi) → reyting → statistika → chat → sozlamalar
(3 mavzu rejimi, effektlar tugmasi, 3 til, FAQ) → ustoz paneli → umumiy
«Ustozlar va direktor» xonasi → vazifalar → jadval → yangi davomat oqimi
(sabab tanlash, to'liq belgilanmaguncha saqlashning bloklanishi, saqlash,
24 soatlik tahrir) → direktor paneli → SMS → «Hammaga belgilash» (barcha
ustozga bir xil coin) → chat. Test hafta kuniga bog'liq emas (sana
«dushanba»ga suriladi) va o'zi vaqtinchalik API serverni ishga tushiradi
(`client/smoke-fetch.mjs`).

> Eslatma: davomatning qulflanishi (`ATT_EDIT_WINDOW_MINUTES=0` → 403) va
> tahrir oynasi server tomondan `test:security` ichida alohida sinaladi.

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
