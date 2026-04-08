# Panduan Setup IoT Smart Waste (Arduino Uno)

Karena Arduino Uno tidak memiliki WiFi bawaan, sistem ini menggunakan metode **Serial Bridge** lewat kabel USB untuk terhubung ke website.

## 1. Persiapan Software
Pastikan Anda sudah menginstal aplikasi **Arduino IDE** dan library berikut:
- **ArduinoJson** (Oleh Benoit Blanchon) -> Cari di *Library Manager*.
- **Servo** (Bawaan Arduino).

## 2. Skema Pinout (Arduino Uno)
Hubungkan kabel ke pin berikut:

| Komponen | Pin Arduino Uno | Keterangan |
|---|---|---|
| **Ultrasonic DETEKSI** | Trig: 9, Echo: 10 | Deteksi benda masuk |
| **Soil Moisture** | A0 | Sensor klasifikasi |
| **Servo Motor** | 6 | Pemilah sampah |

## 3. Cara Instalasi & Menjalankan Sistem

### Langkah 1: Flash Arduino
1. Buka file `smart_waste.ino` di Arduino IDE.
2. Pilih Board: **Arduino Uno**.
3. Pilih Port yang sesuai dan klik **Upload**.

### Langkah 2: Setup Bridge di Laptop
Agar data dari Arduino bisa sampai ke website, Anda harus menjalankan script 'jembatan' di laptop yang terhubung ke Arduino:
1. Pastikan **Node.js** sudah terinstall di laptop.
2. Buka terminal/CMD di folder `iot`.
3. Instal library pembantu (hanya sekali):
   ```bash
   npm install serialport axios
   ```
4. Jalankan Bridge Script:
   ```bash
   node serial_bridge.js
   ```

### Langkah 3: Jalankan Website
1. Jalankan dashboard Next.js Anda (`npm run dev`).
2. Data pembacaan sampah akan otomatis muncul di dashboard setiap kali Arduino mendeteksi sampah.

## ⚠️ Troubleshooting Jaringan & Discovery Scan
Jika saat Anda mengklik tombol **"Scan Device Sekitar"** di dashboard dan alat tidak muncul, lakukan pengecekan berikut:

1. **Firewall Windows (Laptop Teman)**:
   - Buka *Windows Defender Firewall*.
   - Pilih *Allow an app or feature through Windows Defender Firewall*.
   - Pastikan aplikasi **Node.js** dicentang untuk jaringan *Private* dan *Public*.
   - Jika masih tidak muncul, coba matikan firewall sementara untuk pengujian.

2. **Cek Port UDP**:
   - Pastikan Port **8888** (Server) dan **8889** (Discovery) tidak diblokir oleh router.
   - Pastikan router **TIDAK** dalam mode *AP Isolation* (fitur yang memisahkan komunikasi antar perangkat di WiFi yang sama).

3. **Log Diagnostik**:
   - Di laptop teman, pastikan muncul log: `📡 [Discovery] Heartbeat signal sent to network...`
   - Di terminal server Anda, pastikan muncul log: `📡 [Nearby Discovery] Sinyal diterima dari ARDUINO-01`
