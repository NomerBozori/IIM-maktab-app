# Intellekt Innovatsion Maktabi — Brend qo'llanmasi

Ilova **butunlay** rasmiy logotipga moslandi: ranglar, shrift va brend belgisi.

---

## 1. Brend palitrasi (logotipdan olingan)

| O'zgaruvchi | Qiymat | Qayerda ishlatiladi |
|---|---|---|
| `--accent` | `#1B3A5C` | Asosiy rang: tugmalar, sarlavhalar, faol menyu, grafiklar |
| `--accent-2` | `#2E6DA4` | Ikkinchi darajali aksent (grafik, havolalar) |
| `--gold` / `--accent-3` | `#C9A227` | Coinlar, reyting, yulduzchalar, chegara chiziqlari |
| `--gold-2` | `#E8C766` | Qorong'i rejimdagi oltin |
| `--gold-deep` | `#A8871F` | Yozuv ustidagi oltin (yorug'i rejim) |
| `--navy-deep` | `#14293F` | Gradient tugmalar, chuqur fon |

### Qorong'i rejim (logotipdagi toq ko'k)

| O'zgaruvchi | Qiymat |
|---|---|
| `--bg` | `#081422` |
| `--bg-soft` / `--sidebar` | `#0C1B2E` |
| `--card` | `#102438` |
| `--card-2` | `#16304A` |
| `--line` | `#1E3A57` |

### Yorug'i rejim

| O'zgaruvchi | Qiymat |
|---|---|
| `--bg` | `#F4F6F9` |
| `--card` | `#FFFFFF` |
| `--card-2` | `#F3F6FA` |
| `--line` | `#E2E8F0` |

### Rollar ranglari

| Rol | Rang | Sabab |
|---|---|---|
| **O'quvchi** | `#C9A227` (oltin) | Coin = oltin |
| **Ustoz** | `#1B3A5C` (to'q ko'k) | Logotipning asosiy rangi |
| **Direktor** | `#6B4E9B` (binafsha) | Uchinchi rol uchun ajratilgan rang |

---

## 2. Logotip qayerda ko'rinadi

| Joy | O'lcham | Tavsif |
|---|---|---|
| Brauzer ikonkasi (favicon) | — | `client/index.html` → `/logo.png` |
| Login sahifasi (hero) | 84 px | Oltin halqali oq doira ichida |
| Login sahifasi (shiori) | — | `Bilim • Innovatsiya • Intellekt` |
| Yon panel (sidebar) | 38 px | Oltin chegara, oq fon |
| Mobil tepa panel | 30 px | Faqat telefon/planshetda |

---

## 3. Shrift (tipografiya)

Logotipdagi **INTELLEKT** yozuvi serifli — shuning uchun:

- **Sarlavhalar** (`h1`–`h4`) — `Georgia, 'Times New Roman', serif`
- **Brend nomi** (`.brand-txt b`) — Georgia, katta harflar, keng harflar oralig'i (`letter-spacing: .07em`)
- **Shiori** (`.tagline`) — keng harflar oralig'i, oltin rang, ikki yondan chiziq
- **Asosiy matn** — Inter / Segoe UI / system-ui

---

## 4. Nima o'zgartirildi

### Ranglar
- Barcha eski to'q sariq (`#f97316`, `#f59e0b`), ko'k (`#3b82f6`) va binafsha (`#a855f5`) ranglar **butunlay** olib tashlandi.
- 100+ joyda `rgba()` shaffofliklari ham brend ranglariga o'tkazildi.
- Semantik ranglar brendga moslab chuqurlashtirildi: yashil `#1F6B4A`, sariq `#A8871F`, qizil `#C0503F`.

### Komponentlar
- `.btn` — ko'k gradient
- `.nav-item.active` — oltin chap chiziq + ko'k fon
- `.coin-cell.on` / `.coin-cell.center` — oltin gradient
- `.podium-card.place1` — oltin urg'u
- `.msg.mine` — ko'k puflak (o'z xabari)
- `.rank-badge.top` — oltin medal
- `.stat.blue` / `.stat.orange` — ko'k / oltin
- `.theme-opt.active`, `.lang-opt.active`, `.input:focus` — ko'k
- `.login-hero` fon nurlari — ko'k + oltin

### Server
- `server/index.js` dagi avatar palitasi (`colors`) brendga moslandi:
  `#C9A227, #1B3A5C, #2E6DA4, #6B4E9B, #1F6B4A, #A8871F, #C0503F, #14B8A6`

---

## 5. Tuzatilgan xatolar (brend ishi davomida)

1. **`Rankings.jsx`** — statistikani yopgandan keyin `open` `null` bo'lib qolib, ilova qulab tushardi. Endi `{stats && open && ...}`.
2. **`ChatPage.jsx`** — `scrollIntoView` ba'zi muhitlarda mavjud emas; endi tekshirilgan holda chaqiriladi.
3. **Testlar** (`smoke.mjs`) — bosish va tekshirish ajratildi, shartsiz kutish qo'shildi. **18/18 qadam o'tadi, React xatoliklar yo'q.**

---

## 6. Ishga tushirish

```bash
# 1) API server (port 4000)
cd server && node index.js

# 2) Veb-ilova (port 5173)
cd client && npm run dev
```

**Demo akkauntlar** (parol `1234`): `oquvchi1` (o'quvchi), `ustoz1` (ustoz), `director` (direktor)
