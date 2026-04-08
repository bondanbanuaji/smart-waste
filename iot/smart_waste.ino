#include <Servo.h>
#include <ArduinoJson.h>

/*
 * ==========================================
 * KONFIGURASI PIN (ARDUINO UNO)
 * ==========================================
 */

// 1. Sensor Ultrasonic DETEKSI DEPAN
const int trigPin = 9;
const int echoPin = 10;

// 2. Sensor Soil Moisture
const int soilPin = A0; 

// 3. Servo Motor
const int servoPin = 6;

// 4. Konfigurasi Sistem
int thresholdBasah = 500;
const char* deviceCode = "ARDUINO-01"; // Identitas alat di dashboard

/* 
 * ==========================================
 * GLOBAL OBJECTS & VARIABLES
 * ==========================================
 */
Servo myServo;
bool objectDetected = false;

// Variabel Simulasi Kapasitas
int simOrganic = 0;
int simInorganic = 0;

void setup() {
  // Gunakan 9600 agar stabil di Arduino Uno
  Serial.begin(9600); 

  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);

  myServo.attach(servoPin);
  myServo.write(90); // Posisi Standby

  Serial.println("\n=======================================");
  Serial.println(" SMART TRASH BIN - ARDUINO UNO READY ");
  Serial.println("=======================================");
  Serial.print("Threshold Basah = "); Serial.println(thresholdBasah);
  Serial.println("Menunggu sampah...");
  Serial.println("");
}

void loop() {
  // --- 1. BACA ULTRASONIK (DETEKSI) ---
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH);
  int distance = duration * 0.034 / 2;

  // --- 2. LOGIKA DETEKSI JALAN ---
  if (distance > 1 && distance < 6 && objectDetected == false) {
    objectDetected = true;

    Serial.println("\n[!] OBJEK TERDETEKSI");
    Serial.println("Menstabilkan sensor...");
    delay(1500);

    // BACA SENSOR BEBERAPA KALI (AVERAGING)
    long total = 0;
    int jumlahBaca = 10;
    Serial.println("Mulai pembacaan sensor soil (Sampling)...");

    for (int i = 0; i < jumlahBaca; i++) {
      int val = analogRead(soilPin);
      total += val;
      Serial.print("Sample "); Serial.print(i + 1);
      Serial.print(" : "); Serial.println(val);
      delay(200);
    }

    int rataSoil = total / jumlahBaca;
    Serial.print("Rata-rata Soil = "); Serial.println(rataSoil);

    // KLASIFIKASI & SERVO MOVE
    String wasteType;
    if (rataSoil > thresholdBasah) {
      wasteType = "ORGANIC";
      Serial.println(">>> SAMPAH BASAH TERDETEKSI <<<");
      simOrganic = min(100, simOrganic + 5); // Simulasi: Naik 5%
      myServo.write(0);
      delay(2500);
    } else {
      wasteType = "INORGANIC";
      Serial.println(">>> SAMPAH KERING TERDETEKSI <<<");
      simInorganic = min(100, simInorganic + 5); // Simulasi: Naik 5%
      myServo.write(180);
      delay(2500);
    }

    // KIRIM DATA KE WEBSITE LEWAT SERIAL JSON
    // Data ini akan dibaca oleh script bridge di laptop
    sendJsonData(wasteType, rataSoil);

    // KEMBALI KE STANDBY
    Serial.println("Mengembalikan servo ke posisi standby...");
    myServo.write(90);
    delay(1500);

    Serial.println("=======================================");
    Serial.println("Sistem siap menerima sampah berikutnya");
    Serial.println("=======================================");
    
    objectDetected = false;
  }

  delay(300); 
}

/*
 * ==========================================
 * HELPER FUNCTIONS
 * ==========================================
 */

/**
 * Mengirim data dalam format JSON melalui Serial USB.
 * Format ini yang akan dibaca oleh Node.js Bridge.
 */
void sendJsonData(String type, int moisture) {
  StaticJsonDocument<128> doc;
  doc["deviceCode"] = deviceCode;
  doc["wasteType"] = type;
  doc["moistureValue"] = moisture;
  
  // Data kapasitas (menggunakan variabel simulasi)
  doc["organicLevel"] = simOrganic;
  doc["inorganicLevel"] = simInorganic;

  // Kirim JSON ke Serial dengan marker khusus agar mudah dibaca bridge
  Serial.print("DATA_START:");
  serializeJson(doc, Serial);
  Serial.println(":DATA_END");
}