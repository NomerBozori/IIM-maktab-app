# 🎓 Intellekt Innovatsion Maktabi — Maktab boshqaruv tizimi

O'quvchi, ustoz va direktor uchun uchta alohida kabinetga ega to'liq funksional
maktab boshqaruv ilovasi. **Coin** (rag'bat) tizimi, davomat nazorati, reyting,
chat va sozlamalar — barchasi bir joyda.

> **Brend:** To'q ko'k `#1B3A5C` + oltin `#C9A227` — rasmiy logotip asosida.
> Batafsil: [`BREND-QOLLANMASI.md`](BREND-QOLLANMASI.md)

---

## 🚀 Ishga tushirish

```bash
# 1) API server (port 4000)
cd server
npm install
node index.js

# 2) Veb-ilova (port 5173) — yangi terminal oynasida
cd client
npm install
npm run dev
```

Keyin brauzerda **http://localhost:5173** manzilini oching.

---

## 🔐 Demo akkauntlar

Barcha parollar: **`1234`**

| Login | Rol | Kabinet |
|---|---|---|
| `director` | 👔 Direktor | Coin belgilash, davomat nazorati, SMS |
| `ustoz1` … `ustoz9` | 👨‍🏫 Ustoz | Byudjet, vazifa, jadval, davomat |
| `oquvchi1` … `oquvchi40` | 🎒 O'quvchi | Coinlar, baholar, reyting, chat |

Seed ma'lumotlar: 9 ustoz, 6 sinf (8-A, 8-B, 9-A, 9-B, 10-A, 11-A), 40 o'quvchi.

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
│   ├── index.js          # To'liq REST API (port 4000)
│   ├── package.json
│   └── data/             # Avtomatik yaratiladigan JSON (git'da yo'q)
│
├── client/
│   ├── index.html        # Favicon = /logo.png
│   ├── vite.config.js    # /api → http://localhost:4000
│   ├── public/
│   │   └── logo.png      # Brend logotipi
│   ├── smoke.mjs         # Ishlash tekshiruvi (18 qadam)
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
├── BREND-QOLLANMASI.md   # Brend qo'llanmasi (ranglar, shrift, logo)
└── README.md
```

---

## 🔌 API yo'llari

| Yo'l | Tavsif |
|---|---|
| `GET  /api/health` | Holat tekshiruvi |
| `POST /api/login` | Kirish |
| `POST /api/register` | Ro'yxatdan o'tish |
| `GET  /api/me` | Joriy foydalanuvchi |
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
| `GET  /api/chats/:roomId/messages` | Chat xabarlari |

---

## ✅ Test

```bash
cd client
npm install
node smoke.mjs
```

**18 qadam** o'tadi va React xatoliklar yo'q:
login sahifasi → o'quvchi paneli → reyting → statistika → chat → sozlamalar
(3 til + qorong'i rejim + FAQ) → ustoz paneli → vazifalar → jadval → davomat
→ direktor paneli → SMS → chat.

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
