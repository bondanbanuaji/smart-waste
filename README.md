# 🗑️ Smart Waste Management System

Sistem manajemen sampah pintar terintegrasi berbasis **IoT (Internet of Things)** yang menghubungkan perangkat keras **Arduino Uno** dengan dashboard **Fullstack Next.js** secara *real-time*. Sistem ini dirancang untuk mengotomatisasi pemilahan sampah dan memantau kapasitas wadah secara akurat melalui jaringan lokal.

## 🚀 Fitur Utama

- **Real-time Monitoring Dashboard**: Visualisasi data statistik dan kapasitas wadah tanpa *delay* menggunakan teknologi **Server-Sent Events (SSE)**.
- **Auto-Prepend History Feed**: Setiap aktivitas pembuangan sampah akan muncul secara instan di urutan teratas tabel riwayat tanpa perlu memuat ulang halaman.
- **Klasifikasi Sampah Cerdas**: Memisahkan sampah secara otomatis menjadi kategori **Organik** dan **Anorganik** melalui sensor kelembapan.
- **Sistem Notifikasi Bahaya**: Pengiriman peringatan otomatis (Pop-up/Alert) jika kapasitas salah satu wadah mencapai ambang batas kritis (≥90%).
- **Dynamic Device Discovery**: Fitur *Plug & Play* yang memungkinkan unit tempat sampah menemukan IP Server secara otomatis di jaringan lokal (UDP Broadcast).
- **Laporan Analitik**: Grafik mingguan interaktif untuk memantau tren volume sampah yang masuk.

## 🛠️ Arsitektur Teknologi

### Website (Real-time Core)
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS & Shadcn/UI (Premium Dark/Light Mode)
- **Database**: MySQL dengan Prisma ORM
- **Authentication**: NextAuth.js
- **Streaming**: Server-Sent Events (SSE) untuk sinkronisasi data instan.

### IoT & Bridge (Hardware Interface)
- **Microcontroller**: Arduino Uno R3
- **Sensors**: Ultrasonic (Deteksi objek), Soil Moisture (Klasifikasi), Servo MG995 (Actuator).
- **Secondary Server (Bridge)**: Node.js Serial Bridge (Penghubung antara komunikasi Serial USB Arduino ke REST API Next.js).
- **Discovery Protocol**: UDP Discover (Port 8888 & 8889).

## 📦 Panduan Instalasi & Penggunaan

### 1. Persiapan Website (Server Center)
1. Clone repositori ini ke laptop server.
2. Instal semua dependensi:
   ```bash
   npm install
   ```
3. Konfigurasi file `.env.local`:
   - Sesuaikan `DATABASE_URL` dengan MySQL Anda.
   - Atur `NEXT_PUBLIC_SERVER_LOCAL_IP` dengan IP lokal laptop Anda (misal: `192.168.150.161`).
4. Jalankan migrasi database:
   ```bash
   npx prisma migrate dev
   ```
5. Jalankan aplikasi:
   ```bash
   npm run dev
   ```

### 2. Persiapan IoT (Perangkat Keras)
1. **Arduino**: Unggah firmware `smart_waste.ino` yang berada di folder `/iot` ke papan Arduino Uno.
2. **Serial Bridge**: Script ini harus dijalankan di laptop yang terhubung ke USB Arduino.
   - Pastikan Node.js terinstal.
   - Masuk ke folder `/iot` dan jalankan:
     ```bash
     node serial_bridge.js
     ```
3. **Koneksi**: Script bridge akan secara otomatis mencari Server di jaringan lokal dan mulai mengirimkan data deteksi sampah.

## 🌐 Dokumentasi Teknis Lanjutan
Informasi lebih mendalam mengenai skema kabel, pengaturan firewall, dan troubleshooting dapat diakses melalui dokumen berikut:
👉 **[Panduan Integrasi Perangkat Keras (Bahasa Indonesia)](iot/setup_iot.md)**

---
**Smart Waste Project 2026** - *Mewujudkan Kebersihan yang Akurat dan Digital.*
