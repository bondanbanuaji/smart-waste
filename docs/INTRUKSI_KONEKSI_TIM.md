# 🤝 Panduan Sinkronisasi Multi-Laptop (Server & IoT Bridge)

Panduan ini menjelaskan langkah-langkah untuk menghubungkan **Laptop Anda (Server)** dengan **Laptop Teman (IoT Bridge)** agar data dari Arduino Uno bisa tersinkronisasi secara *real-time* ke dashboard web.

---

## 🏗️ Arsitektur Sistem
1.  **Laptop A (Anda)**: Berfungsi sebagai **Server Utama**. Menjalankan Website Next.js dan Database MySQL.
2.  **Laptop B (Teman)**: Berfungsi sebagai **IoT Bridge**. Terhubung ke Arduino Uno via USB dan menjalankan script `serial_bridge.js`.

---

## 📶 Prasyarat Jaringan (PENTING!)
*   Kedua laptop **WAJIB** berada dalam satu jaringan WiFi yang sama.
*   Pastikan WiFi Anda tidak dalam mode "Isolasi AP" (biasanya WiFi publik/kantor tertentu memblokir komunikasi antar laptop).
*   **WiFi Rekomendasi**: Gunakan Hotspot HP jika WiFi publik bermasalah.

---

## 💻 Langkah 1: Persiapan di Laptop SERVER (Anda)

1.  **Cek IP Lokal Anda**:
    *   **Jika Anda menggunakan Windows**:
        *   Buka Command Prompt (CMD), ketik: `ipconfig`
        *   Cari bagian **IPv4 Address** (Contoh: `192.168.150.161`).
    *   **Jika Anda menggunakan Linux (Arch, Ubuntu, dll)**:
        *   Buka Terminal, ketik: `ifconfig` (atau `ip addr show` jika `ifconfig` tidak ada).
        *   Cari bagian `inet` di bawah interface `wlan0` atau `eth0`.
2.  **Konfigurasi `.env.local`**:
    *   Buka file `.env.local` di folder proyek Anda.
    *   Pastikan baris berikut sudah sesuai dengan IP Anda:
        ```env
        NEXT_PUBLIC_SERVER_LOCAL_IP="192.168.150.161"
        NEXT_PUBLIC_SERVER_PORT="3000"
        ```
3.  **Buka Firewall (Penting!)**:
    *   Izinkan aplikasi **Node.js** melalui Windows/Linux Firewall.
    *   Izinkan akses pada port **UDP 8888** agar laptop teman bisa menemukan server Anda secara otomatis.
4.  **Jalankan Website**:
    ```bash
    npm run dev
    ```
    *Biarkan terminal ini tetap terbuka.*

---

## 🔌 Langkah 2: Persiapan di Laptop BRIDGE (Teman)

1.  **Sambungkan Hardware**:
    *   Colokkan Arduino Uno ke USB laptop teman.
    *   Pastikan Arduino sudah di-*flash* dengan file `smart_waste.ino`.
2.  **Setup Node.js**:
    *   Copy folder `iot/` dari proyek Anda ke laptop teman.
    *   Di terminal laptop teman (di dalam folder `iot`), instal library pembantu:
        ```bash
        npm install serialport axios dgram
        ```
3.  **Jalankan Bridge Script**:
    ```bash
    node serial_bridge.js
    ```
4.  **Verifikasi Log di Laptop Teman**:
    *   Tunggu hingga muncul pesan: `✅ SERVER DITEMUKAN!`
    *   Akan muncul IP laptop Anda secara otomatis di sana.

---

## 📈 Langkah 3: Verifikasi Sinkronisasi

1.  Buka browser di laptop Anda: `http://localhost:3000/dashboard/devices`.
2.  Klik tombol **"Scan Device Sekitar"**.
3.  Jika sinkronisasi berhasil, unit **ARDUINO-01** akan terdeteksi di radar.
4.  Klik **"Hubungkan"** untuk mendaftarkannya.
5.  **Test Real-time**: Masukkan tangan/objek ke depan sensor di Arduino teman Anda. Lihat halaman Dashboard Home, angka dan grafik akan berubah secara instan!

---

## ⚠️ Troubleshooting (Jika Tidak Konek)

1.  **Server Tidak Ditemukan?**
    *   Cek apakah Laptop Teman bisa melakukan `ping` ke IP Laptop Anda.
    *   Pastikan port 3000 tidak diblokir.
2.  **Status "Terputus" Terus?**
    *   Cek apakah script `serial_bridge.js` masih jalan.
    *   Pastikan kabel USB Arduino tidak longgar.
3.  **Data Tidak Masuk?**
    *   Cek log di terminal `npm run dev`. Jika ada error database, pastikan MySQL Anda aktif.

---
*Dokumentasi ini dibuat untuk mempermudah kolaborasi tim Smart Waste.*
