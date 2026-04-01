# Smart-Trash Website — Implementation Plan
> Berdasarkan laporan "Smart Waste Management Berbasis IoT" — Kelompok II, STT Wastukancana 2026
> Tech stack: Next.js 14 (App Router) · MySQL · Prisma ORM · Tailwind CSS · shadcn/ui

---

## Daftar Isi
1. [Project Structure](#1-project-structure)
2. [Database Schema](#2-database-schema)
3. [Environment Variables](#3-environment-variables)
4. [API Endpoints](#4-api-endpoints)
5. [Halaman & Fitur](#5-halaman--fitur)
6. [Komponen UI](#6-komponen-ui)
7. [IoT Integration Flow](#7-iot-integration-flow)
8. [Realtime System (SSE)](#8-realtime-system-sse)
9. [Authentication](#9-authentication)
10. [Notification Logic](#10-notification-logic)
11. [Urutan Implementasi (Fase)](#11-urutan-implementasi-fase)
12. [Rencana Pengujian](#12-rencana-pengujian)

---

## 1. Project Structure

```
smart-trash/
│
├── app/                              # Next.js App Router
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx              # Halaman login admin/petugas
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx                # Layout dashboard (sidebar + header)
│   │   ├── page.tsx                  # Dashboard utama (redirect ke /dashboard)
│   │   └── dashboard/
│   │       ├── page.tsx              # Halaman utama dashboard
│   │       ├── history/
│   │       │   └── page.tsx          # Riwayat pembuangan sampah
│   │       └── devices/
│   │           └── page.tsx          # Manajemen device ESP32
│   │
│   └── api/
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.ts          # NextAuth handler
│       │
│       ├── iot/
│       │   └── data/
│       │       └── route.ts          # POST — menerima data dari ESP32
│       │
│       ├── dashboard/
│       │   └── route.ts              # GET — summary data untuk dashboard
│       │
│       ├── capacity/
│       │   └── route.ts              # GET — status kapasitas terbaru per device
│       │
│       ├── events/
│       │   └── route.ts              # GET — riwayat waste events (dengan filter & paginasi)
│       │
│       ├── notifications/
│       │   └── route.ts              # GET — list notifikasi · PATCH — mark as read
│       │
│       ├── devices/
│       │   └── route.ts              # GET, POST — manajemen device
│       │
│       └── sse/
│           └── route.ts              # GET — Server-Sent Events stream realtime
│
├── components/
│   ├── ui/                           # shadcn/ui base components
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── NotificationBell.tsx
│   ├── dashboard/
│   │   ├── CapacityCard.tsx          # Card indikator kapasitas per wadah
│   │   ├── WasteBarChart.tsx         # Bar chart organik vs anorganik
│   │   ├── WasteLineChart.tsx        # Line chart tren harian/mingguan
│   │   ├── RecentEventTable.tsx      # Tabel 5 event terakhir
│   │   └── AlertBanner.tsx           # Banner "Segera Angkut!" merah
│   └── shared/
│       ├── StatusBadge.tsx           # Badge organic/inorganic
│       └── LoadingSkeleton.tsx
│
├── lib/
│   ├── db.ts                         # Prisma client singleton
│   ├── sse.ts                        # SSE EventEmitter global
│   ├── auth.ts                       # NextAuth config
│   └── utils.ts                      # Helper functions
│
├── prisma/
│   └── schema.prisma                 # Database schema
│
├── hooks/
│   ├── useSSE.ts                     # Custom hook subscribe ke SSE stream
│   └── useCapacity.ts                # Hook polling/realtime kapasitas
│
├── types/
│   └── index.ts                      # TypeScript type definitions
│
└── .env.local                        # Environment variables
```

---

## 2. Database Schema

Berdasarkan ERD di laporan (Gambar 3.3), berikut schema lengkapnya:

### Tabel: `User`
Menyimpan akun admin dan petugas yang bisa login ke dashboard.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | String (CUID) | Primary key |
| name | String | Nama lengkap |
| email | String UNIQUE | Email login |
| password | String | Hashed password (bcrypt) |
| role | Enum | `ADMIN` atau `OFFICER` |
| createdAt | DateTime | Waktu registrasi |
| updatedAt | DateTime | Waktu update terakhir |

---

### Tabel: `Device`
Menyimpan data setiap unit ESP32 / smart trash bin yang terdaftar.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | String (CUID) | Primary key |
| deviceCode | String UNIQUE | Kode unik device, contoh: `ESP32-01` |
| name | String | Nama lokasi, contoh: "Ruang Kelas A" |
| location | String | Deskripsi lokasi fisik |
| isActive | Boolean | Status device aktif/nonaktif |
| lastPingAt | DateTime? | Timestamp terakhir kirim data |
| createdAt | DateTime | Waktu registrasi |

---

### Tabel: `WasteEvent`
Mencatat setiap kejadian pembuangan sampah yang terdeteksi sensor.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | String (CUID) | Primary key |
| deviceId | String | Foreign key → Device |
| wasteType | Enum | `ORGANIC` (basah/wet) atau `INORGANIC` (kering/dry) |
| moistureValue | Float | Nilai raw sensor kelembapan (0–100) |
| detectedAt | DateTime | Timestamp saat sampah terdeteksi |

Relasi: `Device` 1 → N `WasteEvent`

---

### Tabel: `CapacityLog`
Mencatat log kapasitas wadah organik dan anorganik dari sensor ultrasonik.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | String (CUID) | Primary key |
| deviceId | String | Foreign key → Device |
| organicLevel | Int | Kapasitas wadah organik dalam persen (0–100) |
| inorganicLevel | Int | Kapasitas wadah anorganik dalam persen (0–100) |
| recordedAt | DateTime | Timestamp pengukuran |

Relasi: `Device` 1 → N `CapacityLog`

---

### Tabel: `Notification`
Menyimpan history notifikasi "Segera Angkut!" yang pernah muncul.

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | String (CUID) | Primary key |
| deviceId | String | Foreign key → Device |
| type | Enum | `CAPACITY_FULL` (satu-satunya type saat ini) |
| wadahType | Enum | `ORGANIC` atau `INORGANIC` |
| capacityValue | Int | Nilai kapasitas saat notifikasi dipicu (≥90) |
| isRead | Boolean | Status sudah dibaca atau belum |
| createdAt | DateTime | Waktu notifikasi dibuat |

Relasi: `Device` 1 → N `Notification`

---

### Aturan Relasi Antar Tabel

```
User          (tidak berelasi langsung ke data IoT)
Device        1 ──< WasteEvent
Device        1 ──< CapacityLog
Device        1 ──< Notification
```

---

## 3. Environment Variables

File `.env.local` yang harus dibuat di root project:

```
# ─── Database ────────────────────────────────────
DATABASE_URL="mysql://root:PASSWORD@localhost:3306/smart_trash_db"

# ─── NextAuth ────────────────────────────────────
NEXTAUTH_SECRET="isi-dengan-random-string-panjang"
NEXTAUTH_URL="http://localhost:3000"

# ─── IoT Local Network ───────────────────────────
# IP mesin yang menjalankan Next.js di jaringan lokal
# Cek dengan: ipconfig (Windows) atau ifconfig (Linux/Mac)
NEXT_PUBLIC_SERVER_LOCAL_IP="192.168.1.100"
NEXT_PUBLIC_SERVER_PORT="3000"

# ─── Threshold Notifikasi ────────────────────────
CAPACITY_ALERT_THRESHOLD=90

# ─── Sensor Threshold (untuk referensi) ──────────
# Nilai di bawah ini = sampah ORGANIK (basah)
MOISTURE_THRESHOLD=500
```

---

## 4. API Endpoints

### 4.1 IoT Endpoint (dikonsumsi ESP32)

#### `POST /api/iot/data`
Endpoint utama yang menerima data JSON dari ESP32 via HTTP POST.

**Request body (JSON dari ESP32):**
```json
{
  "deviceCode": "ESP32-01",
  "wasteType": "ORGANIC",
  "moistureValue": 720,
  "organicLevel": 45,
  "inorganicLevel": 32
}
```

**Logika yang dijalankan server:**
1. Cari Device berdasarkan `deviceCode`
2. Update field `lastPingAt` di Device
3. Simpan record baru ke tabel `WasteEvent`
4. Simpan record baru ke tabel `CapacityLog`
5. Cek apakah `organicLevel >= 90` atau `inorganicLevel >= 90`
   - Jika ya: buat record baru di tabel `Notification` (hanya jika belum ada notifikasi unread untuk device + wadah yang sama)
6. Broadcast SSE event `"data-update"` ke semua client browser yang tersambung
7. Return `{ success: true }`

**Response sukses:**
```json
{ "success": true, "eventId": "clxxx..." }
```

**Response error:**
```json
{ "success": false, "error": "Device not found" }
```

---

### 4.2 Dashboard Endpoints (dikonsumsi Frontend)

#### `GET /api/dashboard`
Mengembalikan semua data yang dibutuhkan halaman dashboard utama dalam satu request.

**Response shape:**
```json
{
  "devices": [
    {
      "id": "...",
      "deviceCode": "ESP32-01",
      "name": "Ruang Kelas A",
      "location": "Gedung B Lt. 2",
      "isActive": true,
      "lastPingAt": "2026-04-02T10:30:00Z",
      "latestCapacity": {
        "organicLevel": 92,
        "inorganicLevel": 45,
        "recordedAt": "2026-04-02T10:30:00Z"
      }
    }
  ],
  "stats": {
    "totalEventToday": 24,
    "totalOrganicToday": 15,
    "totalInorganicToday": 9,
    "totalEventThisWeek": 142
  },
  "unreadNotificationCount": 3
}
```

---

#### `GET /api/events?deviceId=&type=&page=&limit=`
Mengembalikan riwayat waste events dengan filter opsional dan paginasi.

Query params:
- `deviceId` — filter by device (opsional)
- `type` — `ORGANIC` | `INORGANIC` (opsional)
- `page` — halaman (default: 1)
- `limit` — jumlah per halaman (default: 20)

**Response shape:**
```json
{
  "data": [
    {
      "id": "...",
      "deviceCode": "ESP32-01",
      "deviceName": "Ruang Kelas A",
      "wasteType": "ORGANIC",
      "moistureValue": 720,
      "detectedAt": "2026-04-02T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

---

#### `GET /api/capacity?deviceId=&range=`
Mengembalikan data kapasitas untuk chart tren.

Query params:
- `deviceId` — wajib
- `range` — `"today"` | `"week"` | `"month"` (default: `"today"`)

**Response shape:**
```json
{
  "deviceId": "...",
  "range": "today",
  "data": [
    { "time": "08:00", "organicLevel": 10, "inorganicLevel": 5 },
    { "time": "09:00", "organicLevel": 25, "inorganicLevel": 18 },
    { "time": "10:30", "organicLevel": 92, "inorganicLevel": 45 }
  ]
}
```

---

#### `GET /api/notifications?isRead=`
Mengembalikan list notifikasi.

Query params:
- `isRead` — `"true"` | `"false"` (opsional, tanpa filter = semua)

**Response shape:**
```json
{
  "data": [
    {
      "id": "...",
      "deviceName": "Ruang Kelas A",
      "wadahType": "ORGANIC",
      "capacityValue": 92,
      "isRead": false,
      "createdAt": "2026-04-02T10:30:00Z"
    }
  ]
}
```

---

#### `PATCH /api/notifications`
Menandai notifikasi sebagai sudah dibaca.

**Request body:**
```json
{ "ids": ["clxxx1", "clxxx2"] }
```
atau untuk mark all:
```json
{ "markAll": true }
```

---

#### `GET /api/sse`
Endpoint Server-Sent Events. Browser tetap tersambung dan menerima push event dari server saat ESP32 kirim data baru.

Event yang dikirim: `event: data-update` dengan payload JSON berisi data terbaru device.

---

### 4.3 Auth Endpoints

#### `POST /api/auth/[...nextauth]`
Dihandle otomatis oleh NextAuth.js. Mendukung credentials provider (email + password).

---

#### `GET/POST /api/devices`
- `GET` — list semua device terdaftar
- `POST` — tambah device baru (hanya role `ADMIN`)

---

## 5. Halaman & Fitur

### 5.1 Halaman Login — `/login`

**Deskripsi:** Pintu masuk sistem. Hanya user yang terdaftar yang bisa mengakses dashboard.

**Elemen UI:**
- Logo / branding "Smart Trash"
- Form dengan field Email dan Password
- Tombol "Masuk"
- Pesan error bila kredensial salah

**Logika:**
- Gunakan NextAuth `signIn("credentials", ...)` 
- Jika belum login, semua route `/dashboard/*` otomatis redirect ke `/login`
- Jika sudah login, akses `/login` redirect ke `/dashboard`

**Role yang bisa login:** `ADMIN` dan `OFFICER`

---

### 5.2 Halaman Dashboard Utama — `/dashboard`

**Deskripsi:** Halaman utama setelah login. Menampilkan overview kondisi semua tempat sampah secara real-time.

**Section A — Alert Banner (conditional)**
- Tampil hanya ketika ada device dengan kapasitas ≥ 90%
- Background merah, teks "⚠️ Segera Angkut! [Nama Device] — Wadah [Organik/Anorganik] penuh ([X]%)"
- Bisa ada lebih dari satu banner (jika multiple device penuh)
- Tombol "Tandai Sudah Diangkut" untuk dismiss

**Section B — Capacity Cards**
- Satu card per device yang terdaftar
- Setiap card menampilkan:
  - Nama device dan lokasi
  - Dua progress bar: satu untuk wadah Organik, satu untuk Anorganik
  - Persentase kapasitas masing-masing
  - Warna progress bar berubah: hijau (0–69%) → kuning (70–89%) → merah (≥90%)
  - Status koneksi device: "Online" (ping dalam 5 menit terakhir) atau "Offline"
  - Timestamp "Terakhir update: X menit lalu"

**Section C — Statistik Hari Ini**
- 4 buah stat card kecil:
  - Total pembuangan hari ini
  - Total sampah Organik hari ini
  - Total sampah Anorganik hari ini
  - Total pembuangan minggu ini

**Section D — Chart Pembuangan (Bar Chart)**
- Perbandingan jumlah sampah Organik vs Anorganik
- Default tampil data 7 hari terakhir
- Filter: Hari ini / 7 hari / 30 hari
- Filter device (jika lebih dari satu device)

**Section E — Tabel Event Terbaru**
- 5 event pembuangan terbaru dari semua device
- Kolom: Waktu, Device, Jenis Sampah, Kadar Kelembapan
- Tombol "Lihat Semua" mengarah ke halaman History

**Behavior Realtime:**
- Dashboard subscribe ke `/api/sse`
- Setiap kali ESP32 kirim data, capacity cards dan statistik langsung update tanpa refresh halaman

---

### 5.3 Halaman History — `/dashboard/history`

**Deskripsi:** Riwayat lengkap semua event pembuangan sampah.

**Fitur:**
- Tabel dengan semua waste events
- Filter: by device, by tipe sampah (Organik/Anorganik), by rentang tanggal
- Paginasi (20 data per halaman)
- Kolom: No, Waktu, Device, Lokasi, Jenis Sampah, Kadar Kelembapan (nilai sensor)

---

### 5.4 Halaman Devices — `/dashboard/devices`
*(Hanya untuk role ADMIN)*

**Deskripsi:** Manajemen daftar device ESP32 yang terdaftar.

**Fitur:**
- Tabel list semua device beserta status online/offline, kapasitas terkini
- Tombol "Tambah Device" → form modal dengan field: Kode Device, Nama, Lokasi
- Status aktif/nonaktif bisa di-toggle

---

## 6. Komponen UI

### 6.1 Layout Components

**`Sidebar`**
- Logo di bagian atas
- Menu navigasi: Dashboard, History, Devices (conditional by role)
- Di bagian bawah: info nama user yang login + tombol Logout

**`Header`**
- Judul halaman aktif
- Notification Bell icon dengan badge jumlah unread
- Klik bell → dropdown list notifikasi terbaru

**`NotificationBell`**
- Icon lonceng
- Badge merah dengan angka unread notification
- Dropdown ketika diklik: list notifikasi "Segera Angkut!" yang belum dibaca
- Tombol "Tandai semua dibaca"

---

### 6.2 Dashboard Components

**`CapacityCard`**

Props yang dibutuhkan:
- `deviceName` — nama device
- `location` — lokasi
- `organicLevel` — persentase 0–100
- `inorganicLevel` — persentase 0–100
- `isOnline` — boolean
- `lastUpdate` — timestamp

Behavior:
- Progress bar warna dinamis berdasarkan level
- Animasi smooth saat level update via SSE
- Pulse animation merah jika level ≥ 90%

---

**`WasteBarChart`**

Props:
- `data` — array of `{ label: string, organic: number, inorganic: number }`
- `title` — judul chart

Menggunakan library Recharts. Dua bar per grup (organic = hijau, inorganic = abu-abu).

---

**`WasteLineChart`**

Props:
- `data` — array of `{ time: string, organicLevel: number, inorganicLevel: number }`
- `deviceName` — nama device

Menampilkan tren kapasitas wadah sepanjang hari.

---

**`AlertBanner`**

Props:
- `alerts` — array of `{ deviceName, wadahType, capacityValue, notificationId }`

Tampil di paling atas dashboard jika `alerts.length > 0`.
Setiap alert punya tombol dismiss yang memanggil `PATCH /api/notifications`.

---

**`RecentEventTable`**

Props:
- `events` — array 5 event terbaru

Tabel sederhana, tidak ada paginasi.

---

### 6.3 Shared Components

**`StatusBadge`** — pill dengan warna: hijau untuk `ORGANIC`, biru abu untuk `INORGANIC`

**`LoadingSkeleton`** — skeleton loading untuk cards dan chart saat data pertama kali dimuat

---

## 7. IoT Integration Flow

### Alur lengkap dari sensor ke dashboard:

```
[Sensor Ultrasonik HC-SR04]  ──→  Deteksi objek masuk
[Sensor Kelembapan Tanah]    ──→  Baca nilai moisture

ESP32 (Processing Layer):
  - Baca nilai sensor ultrasonik untuk kapasitas organik & anorganik
  - Baca nilai sensor kelembapan
  - Tentukan wasteType:
      moisture < THRESHOLD  → "INORGANIC" (kering/dry)
      moisture >= THRESHOLD → "ORGANIC"   (basah/wet)
  - Gerakkan motor servo ke arah wadah yang tepat (OUTPUT fisik)
  - Kirim HTTP POST ke http://{SERVER_LOCAL_IP}:{PORT}/api/iot/data
    dengan payload JSON

[Next.js API /api/iot/data]:
  - Validasi payload
  - Simpan ke WasteEvent
  - Simpan ke CapacityLog
  - Trigger notifikasi jika kapasitas ≥ 90%
  - Broadcast SSE ke semua browser

[Browser Dashboard]:
  - Menerima SSE event
  - Update capacity cards
  - Tampilkan alert banner jika ada notifikasi baru
```

### Konfigurasi IP di ESP32

ESP32 perlu di-set dengan IP lokal server. IP ini disimpan sebagai variabel di firmware ESP32. Cara mendapatkan IP server: jalankan `ipconfig` (Windows) atau `ifconfig` (Linux/Mac) di mesin yang menjalankan Next.js, lihat IP di adapter WiFi.

Format endpoint yang di-hit ESP32: `http://192.168.x.x:3000/api/iot/data`

---

## 8. Realtime System (SSE)

### Cara kerja SSE di project ini:

1. **`lib/sse.ts`** — berisi satu global `EventEmitter` yang hidup selama server berjalan
2. **`/api/iot/data` (POST)** — setelah simpan data ke DB, emit event ke emitter
3. **`/api/sse` (GET)** — browser connect ke sini, mendapat `ReadableStream` yang keeps-alive. Subscribe ke emitter dan push data ke stream setiap ada event baru
4. **`hooks/useSSE.ts`** — custom hook di frontend yang menggunakan browser `EventSource` API untuk subscribe ke `/api/sse`. Setiap menerima event, update state lokal
5. Dashboard page menggunakan `useSSE` hook → state terupdate → UI re-render otomatis

### Event yang dikirim via SSE:

```
event: data-update
data: {
  "deviceId": "...",
  "deviceCode": "ESP32-01",
  "organicLevel": 92,
  "inorganicLevel": 45,
  "wasteType": "ORGANIC",
  "hasAlert": true,
  "alertWadah": "ORGANIC"
}
```

---

## 9. Authentication

Menggunakan **NextAuth.js** dengan **Credentials Provider**.

### Alur login:
1. User input email + password di `/login`
2. NextAuth memanggil `authorize()` callback
3. Cek email di database, verifikasi password dengan bcrypt
4. Jika valid → buat session dengan data: `{ id, name, email, role }`
5. Redirect ke `/dashboard`

### Route Protection:
Semua route di bawah `/dashboard` dilindungi oleh middleware Next.js (`middleware.ts`). Jika tidak ada session yang valid, redirect ke `/login`.

### Role-based access:
- `OFFICER` — bisa akses Dashboard, History
- `ADMIN` — bisa akses semua termasuk halaman Devices (tambah/edit device)

### Seed data awal (akun default):
- Admin: `admin@smarttrash.com` / `admin123`
- Officer: `petugas@smarttrash.com` / `petugas123`

---

## 10. Notification Logic

### Aturan pembuatan notifikasi:

Notifikasi "Segera Angkut!" dibuat oleh server **hanya jika** kondisi berikut terpenuhi:
1. `organicLevel >= 90` ATAU `inorganicLevel >= 90`
2. Belum ada notifikasi dengan `isRead = false` untuk kombinasi `deviceId` + `wadahType` yang sama

Tujuan aturan ke-2: mencegah spam notifikasi. Notifikasi baru hanya dibuat setelah notifikasi sebelumnya sudah di-mark as read (artinya petugas sudah mengosongkan wadah).

### Tampilan notifikasi di UI:
- Notification Bell di header menampilkan count unread
- Klik bell → dropdown list notifikasi unread terbaru
- Di dashboard: `AlertBanner` merah di bagian atas
- Tombol "Tandai Sudah Diangkut" pada banner → PATCH `/api/notifications` → `isRead = true` → banner hilang + count bell berkurang

---

## 11. Urutan Implementasi (Fase)

### Fase 1 — Setup Project & Database
1. Init project Next.js 14 dengan TypeScript dan Tailwind CSS
2. Install semua dependencies (Prisma, NextAuth, shadcn/ui, Recharts, etc.)
3. Setup database MySQL local, buat database `smart_trash_db`
4. Buat file `prisma/schema.prisma` dengan semua model (User, Device, WasteEvent, CapacityLog, Notification)
5. Jalankan `prisma migrate dev` untuk generate tabel
6. Buat file `lib/db.ts` untuk Prisma client singleton
7. Buat seed script untuk insert akun admin, akun petugas, dan satu device dummy `ESP32-01`

### Fase 2 — Authentication
1. Install dan konfigurasi NextAuth.js
2. Buat `lib/auth.ts` dengan Credentials Provider + bcrypt verify
3. Buat `app/api/auth/[...nextauth]/route.ts`
4. Buat halaman `/login` dengan form sederhana
5. Buat `middleware.ts` untuk protect semua route `/dashboard/*`
6. Test login dengan akun seed

### Fase 3 — IoT API Endpoint
1. Buat `lib/sse.ts` dengan EventEmitter global
2. Buat `app/api/iot/data/route.ts` dengan semua logika (simpan WasteEvent, CapacityLog, trigger notifikasi, emit SSE)
3. Buat `app/api/sse/route.ts` untuk SSE stream
4. Test endpoint dengan tools seperti Postman atau curl (simulasikan POST dari ESP32)

### Fase 4 — Dashboard Backend (API Routes)
1. Buat `app/api/dashboard/route.ts`
2. Buat `app/api/events/route.ts` dengan filter + paginasi
3. Buat `app/api/capacity/route.ts`
4. Buat `app/api/notifications/route.ts` (GET + PATCH)
5. Buat `app/api/devices/route.ts` (GET + POST)

### Fase 5 — Layout & Shared Components
1. Install shadcn/ui components yang dibutuhkan (Card, Button, Badge, Table, Dialog, Progress, etc.)
2. Buat `components/layout/Sidebar.tsx`
3. Buat `components/layout/Header.tsx` dengan NotificationBell
4. Buat `app/(dashboard)/layout.tsx` yang menggabungkan Sidebar + Header
5. Buat `components/shared/StatusBadge.tsx` dan `LoadingSkeleton.tsx`

### Fase 6 — Dashboard Page (UI)
1. Buat `hooks/useSSE.ts`
2. Buat `components/dashboard/CapacityCard.tsx`
3. Buat `components/dashboard/AlertBanner.tsx`
4. Buat `components/dashboard/WasteBarChart.tsx` menggunakan Recharts
5. Buat `components/dashboard/WasteLineChart.tsx`
6. Buat `components/dashboard/RecentEventTable.tsx`
7. Rakit semua komponen di `app/(dashboard)/dashboard/page.tsx`
8. Koneksikan dengan SSE hook untuk realtime update

### Fase 7 — Halaman History & Devices
1. Buat `app/(dashboard)/dashboard/history/page.tsx` dengan tabel + filter + paginasi
2. Buat `app/(dashboard)/dashboard/devices/page.tsx` dengan tabel dan form tambah device

### Fase 8 — Polish & Testing
1. Pastikan semua halaman responsive (mobile-friendly)
2. Loading states dan error states di semua halaman
3. Empty states (jika belum ada data)
4. Test integrasi penuh dengan ESP32 fisik di jaringan yang sama
5. Jalankan rencana pengujian (Black Box, White Box, UAT)

---

## 12. Rencana Pengujian

Berdasarkan Bab 3.5 laporan.

### Black Box Testing

| No | Skenario Uji | Langkah | Hasil yang Diharapkan |
|---|---|---|---|
| BB-01 | Login dengan kredensial valid | Input email + password yang benar, klik Masuk | Redirect ke `/dashboard`, session terbentuk |
| BB-02 | Login dengan kredensial salah | Input password yang salah | Pesan error "Email atau password salah" muncul |
| BB-03 | Akses dashboard tanpa login | Buka URL `/dashboard` langsung di browser baru | Redirect ke `/login` |
| BB-04 | Dashboard tampil data realtime | ESP32 kirim POST data baru | Capacity card update tanpa refresh halaman dalam <2 detik |
| BB-05 | Notifikasi kapasitas ≥ 90% | Kirim data dengan `organicLevel: 92` | Alert banner merah muncul di dashboard, count bell bertambah |
| BB-06 | Notifikasi tidak duplikat | Kirim data kapasitas ≥ 90% dua kali berturut-turut sebelum di-read | Hanya satu notifikasi baru yang dibuat di database |
| BB-07 | Mark notifikasi as read | Klik tombol "Tandai Sudah Diangkut" | Alert banner hilang, count bell berkurang |
| BB-08 | Filter riwayat by tipe | Di halaman History, filter "Organik" | Tabel hanya menampilkan event bertipe ORGANIC |
| BB-09 | Paginasi history | Klik halaman 2 di tabel history | Data halaman berikutnya dimuat |
| BB-10 | Tambah device baru (Admin) | Isi form tambah device, submit | Device baru muncul di daftar, bisa menerima data |

---

### White Box Testing

| No | Skenario Uji | Yang Diuji | Cara Verifikasi |
|---|---|---|---|
| WB-01 | Klasifikasi sampah ORGANIK | Nilai moisture ≥ threshold → wasteType = ORGANIC | Kirim POST dengan `moistureValue: 720` (≥ 500), cek record di DB |
| WB-02 | Klasifikasi sampah ANORGANIK | Nilai moisture < threshold → wasteType = INORGANIC | Kirim POST dengan `moistureValue: 200` (< 500), cek record di DB |
| WB-03 | Trigger notifikasi | organicLevel ≥ 90 → record Notification dibuat | Kirim POST dengan `organicLevel: 95`, cek tabel Notification di DB |
| WB-04 | Tidak trigger notifikasi | organicLevel < 90 → tidak ada Notification baru | Kirim POST dengan `organicLevel: 85`, pastikan tidak ada record baru di Notification |
| WB-05 | Format JSON dari ESP32 diterima | API menerima dan parse JSON dengan benar | Cek log server, pastikan tidak ada parsing error |
| WB-06 | Data tersimpan ke DB | Setiap POST dari ESP32 → record di WasteEvent dan CapacityLog | Cek kedua tabel setelah POST, harus ada record baru dengan timestamp benar |
| WB-07 | SSE broadcast bekerja | Setelah POST, semua browser yang connect ke /api/sse menerima event | Buka dashboard di 2 tab berbeda, kirim POST, keduanya harus update |
| WB-08 | Auth middleware berjalan | Request tanpa session ke /dashboard → 302 redirect | Cek response header dari request tanpa cookie session |

---

### User Acceptance Testing (UAT)

| No | Aspek | Pertanyaan ke Pengguna (Petugas/Admin) | Target |
|---|---|---|---|
| UAT-01 | Kemudahan navigasi | "Apakah kamu bisa menemukan status tempat sampah tanpa bantuan?" | ≥ 80% bilang ya |
| UAT-02 | Keterbacaan kapasitas | "Apakah indikator kapasitas mudah dipahami?" | ≥ 80% bilang ya |
| UAT-03 | Efektivitas notifikasi | "Apakah notifikasi membantu kamu tahu kapan harus mengosongkan tempat sampah?" | ≥ 80% bilang ya |
| UAT-04 | Kecepatan informasi | "Apakah informasi di dashboard terasa sudah up-to-date?" | ≥ 80% bilang ya |
| UAT-05 | Akurasi pemilahan | "Setelah melihat data, apakah kamu merasa sistem memilah sampah dengan benar?" | ≥ 70% bilang ya |

---

*Plan ini mencakup seluruh requirement dari laporan Kelompok II. Semua bagian Bab III (Perancangan & Metodologi) dan Bab IV (Implementasi) sudah dipetakan ke task konkret yang siap dieksekusi oleh AI agent.*