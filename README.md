# Pathwise — Decision Operating System

> **"Model decisions. Explore outcomes. Choose intentionally."**

Pathwise adalah aplikasi web single-file yang membantu pengguna membuat keputusan secara terstruktur dan berbasis data. Tidak ada login, tidak ada server, tidak ada cloud — semua data tersimpan lokal di browser pengguna.

---

## Daftar Isi

- [Overview](#overview)
- [Fitur Utama](#fitur-utama)
- [Struktur File](#struktur-file)
- [Arsitektur Aplikasi](#arsitektur-aplikasi)
- [State Management](#state-management)
- [Scoring Engine](#scoring-engine)
- [Halaman & Navigasi](#halaman--navigasi)
- [Komponen Dashboard](#komponen-dashboard)
- [Alur Pembuatan Keputusan](#alur-pembuatan-keputusan)
- [AI Advisor](#ai-advisor)
- [Visualisasi Data](#visualisasi-data)
- [Data Persistence](#data-persistence)
- [Pengaturan (Settings)](#pengaturan-settings)
- [Responsivitas](#responsivitas)
- [Cara Menjalankan](#cara-menjalankan)
- [Pengembangan Lanjutan](#pengembangan-lanjutan)

---

## Overview

Pathwise adalah **Decision Operating System** berbasis browser. Tujuannya adalah membantu pengguna mengambil keputusan besar (karier, bisnis, keuangan, proyek) dengan pendekatan sistematis:

1. Definisikan keputusan dan bobot prioritas pribadi
2. Bangun beberapa skenario/jalur alternatif
3. Biarkan mesin scoring menghitung skor komposit setiap jalur
4. Analisis, ekspor, dan tinjau kembali keputusan tersebut dari waktu ke waktu

Aplikasi ini sepenuhnya berjalan di browser (vanilla HTML + CSS + JavaScript) tanpa dependensi backend.

---

## Fitur Utama

| Fitur | Deskripsi |
|---|---|
| **Weighted Scoring** | Pengguna mengatur bobot untuk 6 dimensi: Money, Time, Growth, Risk, Energy, Freedom |
| **Scenario Builder** | Buat dan bandingkan beberapa skenario dengan metrik yang dapat disesuaikan |
| **Visual Simulation** | Radar chart, line chart proyeksi, dan uncertainty bands |
| **AI Advisor** | Opsional — analisis tradeoff menggunakan OpenRouter API (BYOK) |
| **Fully Local** | Data tersimpan di `localStorage` browser, tidak ada server |
| **Export JSON** | Ekspor satu keputusan atau semua keputusan sebagai file JSON |
| **Decision Reviews** | Tandai dan catat bagaimana keputusan "menua" dari waktu ke waktu |
| **Regret Score** | Heuristik otomatis untuk menilai risiko penyesalan antar skenario |

---

## Struktur File

Pathwise adalah **aplikasi single-file**. Seluruh kode berada dalam satu file `pathwise_decision_os.html`:

```
pathwise_decision_os.html
├── <head>
│   ├── Meta & viewport
│   ├── Google Fonts (Inter, JetBrains Mono)
│   ├── Recharts CDN (diimpor tapi digantikan Canvas API)
│   └── <style> — Seluruh CSS (~200 baris)
│
└── <body>
    ├── <nav> — Navigasi global fixed
    ├── #page-landing — Halaman utama/marketing
    ├── #page-dashboard — Dashboard bento grid
    ├── #page-create — Form buat keputusan baru
    ├── #page-detail — Detail & scenario builder keputusan
    ├── #page-simulate — Simulasi visual
    ├── #page-settings — Pengaturan & data management
    ├── #toast — Notifikasi toast global
    └── <script> — Seluruh JavaScript (~470 baris)
        ├── STATE & save()
        ├── nav()
        ├── Dashboard renderers
        ├── Scoring Engine
        ├── Create Decision
        ├── Decision Detail & Tabs
        ├── Scenario Builder
        ├── Simulate & Chart renderers
        └── Settings
```

---

## Arsitektur Aplikasi

Pathwise menggunakan pola **SPA (Single Page Application)** sederhana tanpa framework:

```
┌─────────────────────────────────────┐
│              Browser                │
│                                     │
│  ┌──────────┐    ┌───────────────┐  │
│  │  STATE   │◄──►│  localStorage │  │
│  │ (JS obj) │    └───────────────┘  │
│  └────┬─────┘                       │
│       │ nav(page)                   │
│  ┌────▼─────────────────────────┐   │
│  │         Page Router          │   │
│  │  landing / dashboard /       │   │
│  │  create / detail /           │   │
│  │  simulate / settings         │   │
│  └────┬─────────────────────────┘   │
│       │ render functions            │
│  ┌────▼─────────────────────────┐   │
│  │         DOM Renderers        │   │
│  │  renderDashboard()           │   │
│  │  renderDetail()              │   │
│  │  renderSimulate()            │   │
│  │  computeScenarioScore()      │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

Tidak ada virtual DOM, tidak ada reactive framework. Semua update UI dilakukan dengan `innerHTML` dan manipulasi DOM langsung.

---

## State Management

Seluruh data aplikasi tersimpan dalam objek global `STATE`:

```javascript
const STATE = {
  decisions: [],         // Array semua keputusan
  settings: {},          // Pengaturan app (apiKey, dll)
  currentDecision: null, // Keputusan yang sedang aktif/dilihat
  currentCategory: null, // Kategori yang dipilih saat membuat keputusan
  weights: {             // Default bobot global (saat form create)
    money: 5,
    time: 5,
    growth: 7,
    risk: 4,
    energy: 5,
    freedom: 6
  }
};
```

### Struktur Data Keputusan (`Decision Object`)

```javascript
{
  id: "d1234567890",          // Timestamp-based unique ID
  title: "Should I take...",  // Judul keputusan
  category: "Career",         // Career | Business | Money | Project | Learning
  deadline: "2025-08-01",     // Tanggal deadline (opsional)
  goal: "Maximize learning",  // Tujuan utama
  notes: "...",               // Catatan & constraints
  weights: {                  // Bobot pribadi pengguna (0–10)
    money: 6,
    time: 5,
    growth: 9,
    risk: 4,
    energy: 6,
    freedom: 7
  },
  scenarios: [                // Array skenario/jalur alternatif
    {
      id: "s1234567890",
      name: "Path Name",
      income: 8,              // 0–10
      learning: 9,            // 0–10
      stress: 7,              // 0–10 (lebih tinggi = lebih stres)
      time: 8,                // 0–10
      probability: 0.7,       // 0.0–1.0
      cost: 0,                // (field cadangan)
      freedom: 4              // 0–10
    }
  ],
  reviews: [                  // Array catatan review
    {
      date: 1700000000000,    // Unix timestamp
      note: "..."
    }
  ],
  created: 1700000000000      // Unix timestamp pembuatan
}
```

### Persistensi

```javascript
function save() {
  localStorage.setItem('pw_decisions', JSON.stringify(STATE.decisions));
  localStorage.setItem('pw_settings', JSON.stringify(STATE.settings));
}
```

Data di-load saat halaman pertama kali dibuka melalui inisialisasi `STATE`. Jika tidak ada data, satu contoh keputusan demo otomatis dibuat (seed data).

---

## Scoring Engine

Inti aplikasi ada pada fungsi `computeScenarioScore()`. Scoring bersifat **deterministik** — tidak ada AI, tidak ada black box.

### Formula

```javascript
function computeScenarioScore(scenario, weights) {
  // 1. Normalisasi bobot agar total = 1
  const wTotal = money + growth + energy + risk + time + freedom;
  const wNorm = {
    money:   w.money   / wTotal,
    growth:  w.growth  / wTotal,
    energy:  w.energy  / wTotal,
    risk:    w.risk    / wTotal,
    time:    w.time    / wTotal,
    freedom: w.freedom / wTotal
  };

  // 2. Hitung skor raw (setiap dimensi berkontribusi berdasarkan bobot)
  const raw =
    (income)          * wNorm.money   * 10 +   // Income (0–10)
    (learning)        * wNorm.growth  * 10 +   // Learning/Growth (0–10)
    (10 - stress)     * wNorm.energy  * 10 +   // Energy = kebalikan stress
    (time)            * wNorm.time    * 10 +   // Time flexibility
    (freedom)         * wNorm.freedom * 10 +   // Autonomy
    (probability*10)  * (1 - wNorm.risk);      // Probability, dikurangi faktor risk

  // 3. Normalisasi ke 0–100
  return Math.round(Math.min(100, Math.max(0, raw * 10)));
}
```

### Confidence Score

Confidence dihitung dari jumlah skenario yang sudah dibuat:

```
0 skenario → 20%
1 skenario → 55%
2 skenario → 70%
3 skenario → 80%
dst. (maksimum 95%)
```

### Regret Score

Selisih skor antara dua skenario pertama:

- **Low** → selisih ≤ 8 poin
- **Medium** → selisih 9–20 poin
- **High** → selisih > 20 poin

---

## Halaman & Navigasi

Navigasi dikelola oleh fungsi `nav(page)`:

```javascript
function nav(page) {
  // Sembunyikan semua halaman
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Tampilkan halaman yang dipilih
  document.getElementById('page-' + page).classList.add('active');
  // Trigger render jika perlu
  if (page === 'dashboard') renderDashboard();
  if (page === 'detail')    renderDetail();
  if (page === 'simulate')  renderSimulate();
}
```

### Daftar Halaman

| Page ID | Route | Deskripsi |
|---|---|---|
| `page-landing` | `/` (default) | Marketing page, How it Works, Features, FAQ |
| `page-dashboard` | `dashboard` | Bento grid overview semua metrik keputusan aktif |
| `page-create` | `create` | Form input keputusan baru |
| `page-detail` | `detail` | Detail keputusan + 4 tab (Overview, Scenarios, Analysis, Review) |
| `page-simulate` | `simulate` | Visualisasi radar chart + line chart + uncertainty bands |
| `page-settings` | `settings` | API key, toggle UI, data export/clear |

---

## Komponen Dashboard

Dashboard menggunakan layout **bento grid** (4 kolom, auto rows):

| Widget | Element ID | Deskripsi |
|---|---|---|
| Current Decision | `#card-current` | Judul, progress bar, tombol aksi — span 2 kolom, 2 baris |
| Focus Meter | `#focus-meter` | Bar chart bobot keputusan (Money, Learning, Energy, Risk) |
| Decision Health | `#health-content` | Ring progress confidence score |
| Future Snapshot | `#snapshot-content` | Proyeksi skor komposit 6 bulan, 1 tahun, 3 tahun |
| Scenario Canvas | `#scenario-canvas` | Preview 2 skenario teratas dengan mini bar chart |
| AI Insight | `#ai-insight` | Heuristik lokal (atau AI jika API key tersedia) |
| Regret Score | `#regret-content` | Low / Medium / High berdasarkan selisih skor |
| Momentum | `#momentum-content` | Streak review (saat ini hardcoded 3 hari) |

---

## Alur Pembuatan Keputusan

```
[Landing Page]
      │
      ▼ "Start a Decision"
[Create Page]
  ├── Input: Title (wajib), Deadline, Goal
  ├── Pilih Category (Career/Business/Money/Project/Learning)
  ├── Atur 6 Weight sliders (Money, Time, Growth, Risk, Energy, Freedom)
  ├── Notes & Constraints
  └── [Save Decision]
      │
      ▼ saveDecision() → openDecision()
[Detail Page]
  ├── Tab: Overview
  │     └── Composite Score, Confidence, Jumlah Skenario, Goal, Notes
  ├── Tab: Scenarios (Scenario Builder)
  │     ├── [+ Add Path] → addScenario()
  │     ├── Edit nama skenario
  │     ├── Atur 6 slider per skenario: Income, Learning, Stress, Time, Probability, Freedom
  │     └── Live score update per skenario
  ├── Tab: Analysis
  │     ├── Best/Worst path
  │     ├── Score gap (regret risk)
  │     ├── Max stress exposure
  │     ├── Comparison progress bars
  │     └── Heuristic insights (warning flags)
  └── Tab: Review
        ├── Daftar review entries
        └── [+ Add Review Entry] → prompt() → addReview()
      │
      ▼ "Simulate →"
[Simulate Page]
  ├── Radar Chart (Canvas) — perbandingan metrik antar skenario
  ├── Line Chart (Canvas) — proyeksi skor 8 kuartal
  ├── Score Breakdown cards per skenario
  └── Uncertainty Bands per skenario
```

---

## AI Advisor

AI Advisor bersifat **opsional** dan memerlukan API key dari OpenRouter.

Konfigurasi di halaman Settings:
- Input field type `password` untuk menyimpan `sk-or-...` key
- Key disimpan di `STATE.settings.apiKey` → `localStorage`

System prompt yang digunakan (hardcoded):
```
"You are a decision analyst. Analyze tradeoffs, blind spots, and hidden assumptions. Do not choose for the user."
```

**Catatan:** Pada versi saat ini, integrasi API call ke OpenRouter belum diimplementasikan dalam kode. Widget AI Insight di dashboard menggunakan heuristik lokal (array string statis yang dipilih secara random).

---

## Visualisasi Data

Visualisasi menggunakan **HTML Canvas API** langsung (bukan library Recharts meskipun CDN-nya di-include di `<head>`).

### Radar Chart (`drawRadar`)

- Canvas 300×220px
- 5 sumbu: Income, Learning, Stress, Time, Freedom
- 4 ring grid
- Setiap skenario digambar sebagai polygon berwarna dengan opacity fill

### Line Chart (`drawLine`)

- Canvas 400×220px
- 8 data points (Q1–Q8) dengan proyeksi skor yang dihitung dari skor dasar + growth factor + random noise
- Legend warna per skenario

### Uncertainty Bands

- Dihitung dari: `low = score - (1 - probability) * 20`, `high = score + probability * 12`
- Divisualisasikan sebagai range bar per skenario

---

## Data Persistence

| Data | Key localStorage | Format |
|---|---|---|
| Semua keputusan | `pw_decisions` | JSON array of Decision objects |
| Settings | `pw_settings` | JSON object `{ apiKey: "..." }` |

**Tidak ada sinkronisasi cloud.** Jika pengguna membersihkan data browser atau membuka di browser lain, data akan hilang.

Export tersedia melalui:
- `exportDecision()` — ekspor keputusan aktif sebagai `{title}.json`
- `exportAll()` — ekspor semua keputusan sebagai `pathwise-export.json`

---

## Pengaturan (Settings)

| Setting | Tipe | Deskripsi |
|---|---|---|
| OpenRouter API Key | Input password | Untuk AI Advisor (disimpan lokal) |
| Animations | Toggle | Aktifkan/nonaktifkan animasi fadeUp |
| Reduced motion | Toggle | Aksesibilitas (saat ini UI only, belum fungsional) |
| Show streak counter | Toggle | Tampilkan momentum streak (saat ini UI only) |
| Export all data | Button | Download `pathwise-export.json` |
| Clear all decisions | Button | Hapus semua data (`STATE.decisions = []`) |

---

## Responsivitas

Breakpoint CSS yang digunakan:

```css
/* Tablet */
@media (max-width: 700px) {
  .bento { grid-template-columns: 1fr 1fr }
  .span2, .span3, .span4 { grid-column: span 2 }
  .form-row, .cat-grid, .two-col, .three-col, 
  .weight-grid, .path-metrics, .scenario-cards { grid-template-columns: 1fr }
}

/* Mobile */
@media (max-width: 480px) {
  .bento { grid-template-columns: 1fr }
  .span2, .span3, .span4 { grid-column: span 1 }
  .nav-link { display: none }
}
```

Di mobile, nav link disembunyikan. Hanya logo dan tombol "+ New Decision" yang tampil.

---

## Cara Menjalankan

Tidak memerlukan build step, server, atau instalasi apapun.

```bash
# Cukup buka file di browser
open pathwise_decision_os.html

# Atau drag & drop file ke browser window
```

Kompatibel dengan semua browser modern (Chrome, Firefox, Safari, Edge) yang mendukung:
- `localStorage`
- HTML Canvas API
- CSS Grid & Custom Properties
- `backdrop-filter`

---

## Pengembangan Lanjutan

Beberapa area yang dapat dikembangkan:

**Fungsionalitas**
- Implementasi actual API call ke OpenRouter untuk AI Advisor
- Persistence menggunakan IndexedDB untuk kapasitas lebih besar
- Undo/Redo untuk perubahan skenario
- Drag & drop untuk reorder skenario
- Momentum streak yang benar-benar dihitung dari tanggal review

**UI/UX**
- Dark/Light mode toggle
- Export ke PDF (decision snapshot)
- Sharing keputusan via URL (encoded state)
- Keyboard shortcuts untuk navigasi

**Data**
- Import keputusan dari JSON
- Sync opsional via pastebin/gist
- Backup reminder notification

**Analitik**
- Riwayat keputusan dengan timeline view
- Statistik agregat (rata-rata stress, win rate skenario, dll)
- Comparison antar keputusan

---

*Pathwise v1.0 — Dibuat untuk berpikir serius, bukan productivity theatre.*
