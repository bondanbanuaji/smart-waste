#include <Servo.h>
#include <ArduinoJson.h>

// PIN
const int trigPin = 9;
const int echoPin = 10;
const int soilPin = A0; 
const int servoPin = 6;

// SISTEM BARU (SIMPLE & TEGAS)
int thresholdBasah = 150;          // 🔥 batas utama
int thresholdDeteksiObjek = 80;    // trigger awal
int thresholdDelta = 20;           // perubahan minimal

const char* deviceCode = "ARDUINO-01";

Servo myServo;

bool waitingSoilTrigger = false;
bool isManualMode = false; // Flag mode pintu dikontrol web

unsigned long triggerTime = 0;
int baseSoil = 0;

// Variabel Simulasi Kapasitas
int simOrganic = 0;
int simInorganic = 0;

// POSISI
int posStandby   = 90;
int posOrganic   = 40;
int posInorganic = 140;

float currentPos = 90;

/*
 * BACA SOIL LEBIH STABIL
 */
int readSoilSmooth() {
  int total = 0;
  for (int i = 0; i < 5; i++) {
    total += analogRead(soilPin);
    delay(3);
  }
  return total / 5;
}

/*
 * SETUP
 */
void setup() {
  Serial.begin(9600);

  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);

  myServo.attach(servoPin, 500, 2400);
  myServo.write(posStandby);
  delay(300);
  myServo.detach();

  Serial.println("=== SMART BIN READY (SIMPLE MODE) ===");
}

/*
 * GERAK HALUS
 */
void smoothMove(int targetPos) {
  myServo.attach(servoPin, 500, 2400);

  float pos = currentPos;

  while (abs(pos - targetPos) > 0.5) {
    float speed = (targetPos - pos) * 0.12;

    if (speed > 3) speed = 3;
    if (speed < -3) speed = -3;

    pos += speed;
    myServo.write((int)pos);
    delay(20);
  }

  myServo.write(targetPos);
  currentPos = targetPos;

  delay(200);
  myServo.detach();
}

/*
 * LOOP
 */
void loop() {
  // ================= 0. CEK PERINTAH WEBSITE =================
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    
    if (cmd == "CMD:OPEN_ORGANIC") {
      isManualMode = true;
      waitingSoilTrigger = false;
      Serial.println("[INFO] OVERRIDE: Pintu Organik DIBUKA");
      smoothMove(posOrganic);
    } else if (cmd == "CMD:OPEN_INORGANIC") {
      isManualMode = true;
      waitingSoilTrigger = false;
      Serial.println("[INFO] OVERRIDE: Pintu Anorganik DIBUKA");
      smoothMove(posInorganic);
    } else if (cmd == "CMD:CLOSE") {
      isManualMode = false;
      Serial.println("[INFO] AUTO MODE: Pintu DITUTUP");
      smoothMove(posStandby);
    }
  }

  // Jika sedang mode manual, jangan baca sensor (bypass)
  if (isManualMode) {
    delay(100);
    return;
  }

  // ================= ULTRASONIC =================
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH);
  int distance = duration * 0.034 / 2;

  Serial.print("[ULTRA] Distance: ");
  Serial.println(distance);

  // DETEKSI OBJEK MASUK
  if (distance > 1 && distance < 6 && !waitingSoilTrigger) {
    Serial.println(">> OBJEK MASUK");

    waitingSoilTrigger = true;
    triggerTime = millis();

    baseSoil = readSoilSmooth();

    Serial.print(">> BASE SOIL: ");
    Serial.println(baseSoil);
  }

  // ================= SOIL MONITOR =================
  if (waitingSoilTrigger) {

    int soilNow = readSoilSmooth();
    int delta = abs(soilNow - baseSoil);

    Serial.print("[SOIL] ");
    Serial.print(soilNow);
    Serial.print(" | DELTA: ");
    Serial.println(delta);

    // 🔥 TRIGGER (sensitif)
    if (soilNow > thresholdDeteksiObjek || delta > thresholdDelta) {

      Serial.println(">> SOIL TERPICU");

      waitingSoilTrigger = false;

      // SAMPLING FINAL
      long total = 0;
      for (int i = 0; i < 10; i++) {
        total += readSoilSmooth();
        delay(20);
      }

      int rataSoil = total / 10;

      Serial.print(">> RATA SOIL: ");
      Serial.println(rataSoil);

      String wasteType;

      // 🔥 LOGIKA BARU (SIMPLE)
      if (rataSoil >= thresholdBasah) {
        wasteType = "ORGANIC";
        Serial.println(">> HASIL: BASAH / ORGANIC");
        simOrganic = min(100, simOrganic + 5); 
        smoothMove(posOrganic);
      } else {
        wasteType = "INORGANIC";
        Serial.println(">> HASIL: KERING / INORGANIC");
        simInorganic = min(100, simInorganic + 5);
        smoothMove(posInorganic);
      }

      delay(1000);
      smoothMove(posStandby);

      sendJsonData(wasteType, rataSoil);
    }

    // TIMEOUT
    if (millis() - triggerTime > 3000) {
      Serial.println(">> TIMEOUT (SOIL TIDAK AKTIF)");
      waitingSoilTrigger = false;
    }
  }

  delay(80);
}

/*
 * JSON
 */
void sendJsonData(String type, int moisture) {
  StaticJsonDocument<128> doc;

  doc["deviceCode"] = deviceCode;
  doc["wasteType"] = type;
  doc["moistureValue"] = moisture;
  
  // Gunakan variabel simulasi agar dashboard terlihat akurat/bergerak
  doc["organicLevel"] = simOrganic;
  doc["inorganicLevel"] = simInorganic;

  Serial.print("DATA_START:");
  serializeJson(doc, Serial);
  Serial.println(":DATA_END");
}