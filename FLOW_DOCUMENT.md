# Pathwise — Flow Document & Arsitektur Teknis

Dokumen ini menjelaskan seluruh alur data, logika, dan interaksi dalam aplikasi Pathwise Decision OS secara menyeluruh.

---

## 1. Alur Inisialisasi Aplikasi

```
Browser load pathwise_decision_os.html
        │
        ▼
Eksekusi <script> (inline, bottom of body)
        │
        ▼
Inisialisasi STATE object
  ├── STATE.decisions = localStorage.getItem('pw_decisions') || []
  ├── STATE.settings  = localStorage.getItem('pw_settings')  || {}
  ├── STATE.currentDecision = null
  ├── STATE.currentCategory = null
  └── STATE.weights = { money:5, time:5, growth:7, risk:4, energy:5, freedom:6 }
        │
        ▼
Cek: apakah STATE.decisions kosong?
  ├── YA → Inject demo decision "Should I take the Series A offer?"
  │         └── save() → tulis ke localStorage
  └── TIDAK → Lanjutkan
        │
        ▼
Set tanggal di #dash-date (jika element ada)
        │
        ▼
Halaman aktif = #page-landing (via CSS class .active default di HTML)
```

---

## 2. Alur Navigasi

```
User klik nav link / tombol
        │
        ▼
nav('page_name') dipanggil
        │
        ├── Hapus class .active dari semua .page
        ├── Hapus class .active dari semua .nav-link
        ├── Tambah .active ke #page-{name}
        ├── Tambah .active ke nav-link yang sesuai
        ├── window.scrollTo(0, 0)
        │
        └── Conditional render trigger:
              ├── 'dashboard' → renderDashboard()
              ├── 'detail'    → renderDetail()
              └── 'simulate'  → renderSimulate()
```

---

## 3. Alur Pembuatan Keputusan Baru

```
User di Landing Page / Dashboard
        │ klik "Start a Decision" / "+ New Decision"
        ▼
nav('create')
        │
        ▼
Tampilkan #page-create
  Form fields:
  ├── #dec-title     (text, required)
  ├── #dec-deadline  (date)
  ├── #dec-goal      (text)
  ├── #dec-notes     (textarea)
  ├── .cat-btn       (5 pilihan: Career/Business/Money/Project/Learning)
  └── #weights-grid  (6 range sliders: money, time, growth, risk, energy, freedom)
        │
        │ User mengisi form
        ▼
[Interaksi Weight Sliders]
  oninput="updateWeight('key', value)"
    └── STATE.weights[key] = parseInt(value)
        └── Update display #w-{key}-val (live preview angka)

[Interaksi Category Buttons]
  onclick="selectCat(this)"
    ├── Hapus .selected dari semua .cat-btn
    ├── Tambah .selected ke yang dipilih
    └── STATE.currentCategory = el.dataset.cat
        │
        │ User klik "Save Decision → Build Scenarios"
        ▼
saveDecision()
  ├── Validasi: title tidak boleh kosong → showToast jika kosong
  ├── Buat objek decision baru:
  │     id: 'd' + Date.now()
  │     title, category, deadline, goal, notes
  │     weights: { ...STATE.weights }
  │     scenarios: []
  │     reviews: []
  │     created: Date.now()
  ├── STATE.decisions.unshift(dec)    ← masukkan di depan array
  ├── STATE.currentDecision = dec
  ├── save()                          ← tulis ke localStorage
  ├── showToast('Decision saved ✓')
  └── openDecision(dec.id)            ← navigasi ke detail
```

---

## 4. Alur Detail Keputusan

```
openDecision(id)
  ├── Find dec = STATE.decisions.find(d => d.id === id)
  ├── STATE.currentDecision = dec
  └── nav('detail') → renderDetail()

renderDetail()
  ├── Ambil currentDecision atau decisions[0] sebagai fallback
  ├── Update header: #detail-cat, #detail-title, #detail-meta
  ├── computeScore(dec) → set #ov-score
  ├── Hitung confidence → set #ov-conf
  ├── Set #ov-scenarios, #ov-goal, #ov-notes
  ├── renderScenarioPaths(dec)
  ├── renderAnalysisTab(dec)
  └── renderReviewTab(dec)

[4 Tab Navigation]
  switchTab(name, element)
    ├── Hapus .active dari semua .detail-section
    ├── Hapus .active dari semua .detail-tab
    ├── Tambah .active ke #tab-{name}
    └── Tambah .active ke element yang diklik

Tabs:
  ├── Overview  (#tab-overview)  → score, confidence, goal, notes
  ├── Scenarios (#tab-scenarios) → Scenario Builder
  ├── Analysis  (#tab-analysis)  → renderAnalysisTab
  └── Review    (#tab-review)    → renderReviewTab
```

---

## 5. Alur Scenario Builder

```
User di Tab Scenarios
        │ klik "+ Add Path"
        ▼
addScenario()
  ├── Buat skenario default:
  │     id: 's' + Date.now()
  │     name: 'Path N' (N = jumlah skenario + 1)
  │     income: 5, learning: 5, stress: 5, time: 5
  │     probability: 0.5, cost: 0, freedom: 5
  ├── dec.scenarios.push(scenario)
  ├── save()
  ├── renderDetail()
  └── switchTab('scenarios', ...)

[Tampilan Scenario Card]
renderScenarioPaths(dec)
  Untuk setiap skenario:
  ├── computeScenarioScore(s, dec.weights) → tampilkan skor
  ├── Tandai "Best path" jika skor tertinggi
  ├── Render 6 slider: income, learning, stress, time, probability, freedom
  └── onchange pada nama → updateScenarioName(i, value)

[User mengubah slider]
  oninput="updateScenarioMetric(i, 'key', value)"
    ├── Convert value: probability → /10, lainnya → parseInt
    ├── STATE.currentDecision.scenarios[i][key] = v
    ├── save()
    └── setTimeout(100ms) → renderScenarioPaths + renderDetail
          (delay kecil untuk menghindari terlalu banyak re-render)

[User klik × pada skenario]
  removeScenario(i)
    ├── dec.scenarios.splice(i, 1)
    ├── save()
    └── renderDetail() + switchTab('scenarios')
```

---

## 6. Alur Scoring Engine (Detail)

```
computeScenarioScore(scenario s, weights w)

INPUT:
  s = { income, learning, stress, time, probability, freedom }
  w = { money, time, growth, risk, energy, freedom }  (masing-masing 0–10)

STEP 1: Normalisasi bobot
  wTotal = w.money + w.growth + w.energy + w.risk + w.time + w.freedom
  wNorm.X = w.X / wTotal

STEP 2: Hitung raw score
  raw = (s.income * wNorm.money * 10)
      + (s.learning * wNorm.growth * 10)
      + ((10 - s.stress) * wNorm.energy * 10)   ← stress diinversi
      + (s.time * wNorm.time * 10)
      + (s.freedom * wNorm.freedom * 10)
      + (s.probability * 10 * (1 - wNorm.risk))  ← risk mengurangi pengaruh probabilitas

STEP 3: Normalisasi ke 0–100
  score = Math.round(Math.min(100, Math.max(0, raw * 10)))

OUTPUT: Integer 0–100

─────────────────────────────────────────

computeScore(decision dec)
  Rata-rata skor semua skenario
  Fallback: return 30 jika tidak ada skenario

getBestScenario(decision dec)
  reduce() → skenario dengan skor tertinggi
```

---

## 7. Alur Analysis Tab

```
renderAnalysisTab(dec)

Guard: jika tidak ada skenario → tampilkan pesan

Hitung:
  scores = dec.scenarios.map(s => computeScenarioScore(s, dec.weights))
  best   = skor tertinggi
  worst  = skor terendah
  gap    = best.score - worst.score

Render:
  ├── [Stat Cards 3-col]
  │     ├── Best path name (warna hijau)
  │     ├── Gap score / "regret risk" (warna ungu)
  │     └── Max stress exposure = max(s.stress * 10)% (warna amber)
  │
  ├── [Scenario Comparison]
  │     Progress bar per skenario (score/100 width)
  │
  └── [Heuristic Insights]  (aturan if/else sederhana)
        ├── gap > 25 → "⚠ High regret risk"
        ├── ada s.stress > 7 → "⚠ High stress scenario"
        ├── scenarios.length < 3 → "💡 Consider adding third scenario"
        └── Selalu: "✓ Scoring is deterministic"
```

---

## 8. Alur Review Tab

```
renderReviewTab(dec)
  Jika reviews kosong → tampilkan pesan "No reviews yet"
  Jika ada → map reviews ke HTML entry (tanggal + note)

addReview()
  ├── Buka native browser prompt()
  ├── Jika user cancel atau kosong → return
  ├── dec.reviews.push({ date: Date.now(), note })
  ├── save()
  └── renderDetail() + switchTab('review')
```

---

## 9. Alur Simulasi & Visualisasi

```
nav('simulate') → renderSimulate()

renderSimulate()
  ├── Ambil currentDecision atau decisions[0]
  ├── Guard: jika tidak ada skenario → empty state
  │
  ├── Hitung scores[] per skenario
  ├── Definisi metrics = ['Income','Learning','Stress','Time','Freedom']
  ├── colors[] = ['#8B5CF6','#D946EF','#22C55E','#F59E0B','#3B82F6']
  │
  ├── Siapkan radarData:
  │     Per metric, per skenario: nilai * 10 (normalisasi ke 100)
  │
  ├── Siapkan timelineData (Q1–Q8):
  │     Per skenario: base_score * (0.5 + i*0.07) + random noise
  │
  ├── Render innerHTML:
  │     ├── Radar chart container (#radar-chart)
  │     ├── Line chart container (#line-chart)
  │     ├── Score Breakdown cards
  │     └── Uncertainty Bands
  │
  └── setTimeout(50ms) → drawCharts(radarData, timelineData, dec, colors)

drawCharts()
  ├── drawRadar()  → Canvas polygon per skenario
  └── drawLine()   → Canvas line chart + legend + dots
```

### Detail Radar Chart (`drawRadar`)

```
Canvas: 300×220px
cx=150, cy=110, r=80

Loop 4 rings:
  Gambar polygon grid (opacity rendah)

Loop n metrics:
  Gambar garis radial dari center ke tepi
  Tulis label metric di ujung garis

Per skenario:
  Ambil nilai (0–1) per metric
  Gambar polygon warna skenario
  Fill dengan warna + opacity 22
  Stroke dengan warna penuh, lineWidth 1.5
```

### Detail Line Chart (`drawLine`)

```
Canvas: 400×220px
Padding: top=20, right=20, bottom=30, left=40

5 horizontal gridlines (0, 25, 50, 75, 100)
Label Q1–Q8 di sumbu X

Per skenario:
  ctx.beginPath()
  Loop Q1–Q8: plot (x, y) berdasarkan skor
  ctx.stroke() dengan warna skenario
  Loop lagi: gambar dot (arc r=3) di setiap titik

Legend: kotak warna + nama skenario (atas kiri)
```

---

## 10. Alur Dashboard Render

```
renderDashboard()
  ├── Update #dash-date (tanggal hari ini)
  ├── dec = STATE.decisions[0]  ← selalu decisions terbaru
  │
  ├── renderCurrentDecision(dec)
  │     ├── Hitung computeScore(dec)
  │     ├── Hitung sisa hari dari deadline
  │     └── Render: tag kategori, judul, progress bar, tombol
  │
  ├── renderFocusMeter(dec)
  │     └── Render 4 meter bar: Money, Learning, Energy, Risk
  │         (diambil dari dec.weights)
  │
  ├── renderHealth(dec)
  │     ├── Hitung confidence (berdasarkan jumlah skenario)
  │     └── Render SVG ring dengan stroke-dasharray
  │
  ├── renderSnapshot(dec)
  │     ├── Ambil getBestScenario(dec)
  │     ├── Proyeksi: 6mo = income*4, 1yr = income*9, 3yr = income*28
  │     │   (+ random noise untuk variasi visual)
  │     └── Render 3-kolom timeline
  │
  ├── renderScenarioCanvas(dec)
  │     └── Tampilkan 2 skenario pertama dengan mini bar Income/Learning/Freedom
  │
  ├── renderAIInsight(dec)
  │     └── Pilih random dari 4 string heuristik lokal
  │         (AI call belum diimplementasi)
  │
  ├── renderRegret(dec)
  │     ├── diff = |score(s[0]) - score(s[1])|
  │     ├── level: High (>20) / Medium (>8) / Low
  │     └── Render level dengan warna sesuai (red/amber/green)
  │
  └── renderMomentum()
        └── Hardcoded streak = 3, render 7 dot (3 aktif, 4 tidak)
```

---

## 11. Alur Export Data

```
[Export Satu Keputusan]
exportDecision()
  ├── Ambil STATE.currentDecision
  ├── JSON.stringify(dec, null, 2)
  ├── Buat Blob type application/json
  ├── createElement('a'), set href + download filename
  ├── a.click()  ← trigger download
  └── showToast('Decision exported ✓')

[Export Semua]
exportAll()
  ├── JSON.stringify(STATE.decisions, null, 2)
  ├── download sebagai 'pathwise-export.json'
  └── showToast('All data exported ✓')

[Clear Data]
clearData()
  ├── confirm() dialog
  ├── STATE.decisions = []
  ├── save()
  ├── showToast('Data cleared')
  └── nav('landing')
```

---

## 12. Alur Toast Notification

```
showToast(message)
  ├── Set #toast.textContent = message
  ├── #toast.classList.add('show')
  │     CSS: transform translateY(0) ← muncul dari bawah
  └── setTimeout(2500ms) → #toast.classList.remove('show')
        CSS: transform translateY(100px) ← hilang ke bawah
```

---

## 13. Alur Settings

```
[Save API Key]
saveApiKey()
  ├── Ambil value dari #api-key-input
  ├── Validasi tidak kosong
  ├── STATE.settings.apiKey = key
  ├── save()
  └── showToast('API key saved locally ✓')

[Toggle UI]
  onclick="this.classList.toggle('on')"
  (hanya visual, belum ada efek fungsional pada animasi/motion)
```

---

## 14. Ringkasan Fungsi JavaScript

| Fungsi | Tipe | Deskripsi |
|---|---|---|
| `save()` | Utility | Simpan STATE ke localStorage |
| `nav(page)` | Navigation | Pindah halaman, trigger render |
| `toggleFaq(el)` | UI | Toggle FAQ accordion |
| `renderDashboard()` | Render | Render semua widget dashboard |
| `renderCurrentDecision(dec)` | Render | Widget keputusan aktif |
| `renderFocusMeter(dec)` | Render | Widget focus meter |
| `renderHealth(dec)` | Render | Widget confidence ring |
| `renderSnapshot(dec)` | Render | Widget proyeksi future |
| `renderScenarioCanvas(dec)` | Render | Widget scenario mini-view |
| `renderAIInsight(dec)` | Render | Widget AI insight (heuristik) |
| `renderRegret(dec)` | Render | Widget regret score |
| `renderMomentum()` | Render | Widget streak dots |
| `computeScenarioScore(s, w)` | Logic | Hitung skor skenario (0–100) |
| `computeScore(dec)` | Logic | Rata-rata skor semua skenario |
| `getBestScenario(dec)` | Logic | Skenario dengan skor tertinggi |
| `selectCat(el)` | Form | Pilih kategori keputusan |
| `updateWeight(key, val)` | Form | Update bobot live |
| `saveDecision()` | Form | Simpan keputusan baru |
| `openDecision(id)` | Navigation | Buka keputusan di detail page |
| `renderDetail()` | Render | Render seluruh detail page |
| `switchTab(name, el)` | UI | Switch tab di detail page |
| `renderScenarioPaths(dec)` | Render | Render semua scenario cards |
| `addScenario()` | Data | Tambah skenario baru |
| `removeScenario(i)` | Data | Hapus skenario ke-i |
| `updateScenarioName(i, val)` | Data | Update nama skenario |
| `updateScenarioMetric(i, key, val)` | Data | Update metrik skenario |
| `renderAnalysisTab(dec)` | Render | Render tab analisis |
| `renderReviewTab(dec)` | Render | Render tab review |
| `addReview()` | Data | Tambah review entry |
| `exportDecision()` | Export | Export JSON satu keputusan |
| `renderSimulate()` | Render | Render halaman simulasi |
| `drawCharts(...)` | Visual | Dispatch draw radar + line |
| `drawRadar(...)` | Visual | Gambar radar chart via Canvas |
| `drawLine(...)` | Visual | Gambar line chart via Canvas |
| `saveApiKey()` | Settings | Simpan API key ke state |
| `exportAll()` | Settings | Export semua keputusan JSON |
| `clearData()` | Settings | Hapus semua data |
| `showToast(msg)` | UI | Tampilkan notifikasi toast |

---

## 15. Diagram Relasi Data

```
STATE
  └── decisions[]
        └── Decision
              ├── id, title, category, deadline, goal, notes, created
              ├── weights { money, time, growth, risk, energy, freedom }
              ├── scenarios[]
              │     └── Scenario
              │           ├── id, name
              │           ├── income (0–10)
              │           ├── learning (0–10)
              │           ├── stress (0–10)
              │           ├── time (0–10)
              │           ├── probability (0.0–1.0)
              │           ├── cost (0, cadangan)
              │           └── freedom (0–10)
              └── reviews[]
                    └── Review
                          ├── date (timestamp)
                          └── note (string)
```

---

## 16. CSS Design System

```
CSS Variables (Design Tokens):
  Backgrounds:  --bg (#09090B), --bg2, --bg3, --bg4
  Borders:      --border (6% white), --border2 (10% white)
  Text:         --text (#FAFAFA), --sub (#A1A1AA), --sub2 (#71717A)
  Accent:       --purple (#8B5CF6), --purple2, --pink (#D946EF)
  Semantic:     --green (#22C55E), --amber (#F59E0B), --red (#EF4444), --blue (#3B82F6)
  Border radius: --r (16px), --r2 (12px), --r3 (8px)
  Typography:   --font ('Inter'), --mono ('JetBrains Mono')

Component Patterns:
  .card         → bg3 + border + radius-16 + padding-20
  .stat-card    → bg3 + border + radius-12 + padding-20
  .btn-primary  → purple background, white text
  .btn-ghost    → transparent + border
  .tag          → pill badge (purple/green/amber/red variants)
  .pbar         → progress bar dengan gradient fill
  .meter-row    → horizontal meter dengan label
  .ring         → SVG circular progress

Animation:
  fadeUp        → opacity 0→1, translateY 12px→0 (0.3s)
  pulse         → opacity 1→0.4 (2s infinite, untuk AI insight dot)
  Stagger:      .anim-1 hingga .anim-8 (delay 50ms increment)
```

---

*Pathwise v1.0 — Flow Document*
