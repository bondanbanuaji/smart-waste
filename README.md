# 🗑️ Smart Waste Management System

Sistem manajemen sampah pintar berbasis IoT yang mengintegrasikan perangkat keras ESP32 dengan dashboard Fullstack Next.js secara realtime.

## 🚀 Fitur Utama

- **Realtime Dashboard**: Pantau kapasitas wadah sampah secara langsung tanpa refresh halaman (Powered by SSE).
*   **Klasifikasi Sampah Otomatis**: Membedakan sampah **Organik** dan **Anorganik** menggunakan sensor moisture.
- **Sistem Notifikasi**: Peringatan otomatis "Segera Angkut!" jika kapasitas wadah mencapai ≥90%.
- **History & Statistik**: Laporan riwayat pembuangan sampah lengkap dengan grafik tren harian/mingguan.
- **Multitenant/Multi-device**: Mendukung banyak perangkat tempat sampah dalam satu dashboard.

## 🛠️ Teknologi yang Digunakan

### Website (Fullstack)
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS & shadcn/ui
- **Database**: MySQL with Prisma ORM
- **Realtime**: Server-Sent Events (SSE)
- **Auth**: NextAuth.js

### IoT (Hardware)
- **Microcontroller**: ESP32 (DevKit V1)
- **Sensors**: 2x HC-SR04 (Ultrasonic), Moisture Sensor
- **Actuator**: Servo Motor (Pemilah sampah)
- **Protocol**: HTTP POST (JSON)

## 📦 Persiapan Instalasi

### 1. Website Setup
1. Clone repositori ini.
2. Instal dependensi:
   ```bash
   npm install
   ```
3. Sesuaikan file `.env.local` (gunakan `.env.example` sebagai referensi). Pastikan `DATABASE_URL` dan `NEXT_PUBLIC_SERVER_LOCAL_IP` sudah benar.
4. Jalankan migrasi database:
   ```bash
   npx prisma migrate dev
   ```
5. Jalankan server:
   ```bash
   npm run dev
   ```

### 2. IoT Setup
Panduan lengkap untuk konfigurasi ESP32 dapat ditemukan di:
👉 **[Panduan Setup IoT (Bahasa Indonesia)](iot/setup_iot.md)**

## 🌐 Integrasi Jaringan Lokal
Sistem ini menggunakan fitur **UDP Auto-Discovery**:
1. Laptop (Server) dan ESP32 wajib berada di **WiFi yang sama**.
2. Anda **tidak perlu menginput IP laptop** ke dalam kodingan ESP32. Selama website sedang berjalan (`npm run dev`), ESP32 akan mencari dan menemukan IP laptop Anda secara otomatis.
3. Cukup masukkan nama WiFi (SSID) dan Password di file `smart_waste.ino` sebelum melakukan upload.
4. Jika koneksi gagal, pastikan Firewall laptop Anda memberikan izin untuk **Port UDP 8888**.

---
Dikembangkan oleh Tim Smart Waste 2026.
