/**
 * SMART WASTE SERIAL BRIDGE (DYNAMIC VERSION)
 * Script ini berfungsi sebagai jembatan antara Arduino Uno (Serial) 
 * dan Website Next.js (API) secara otomatis (Plug & Play).
 */

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const axios = require('axios');
const dgram = require('dgram');

// --- KONFIGURASI AWAL ---
const BAUD_RATE = 9600;
const SERVER_BROADCAST_PORT = 8888; // Port untuk mendengarkan server
const DISCOVERY_PORT = 8889;        // Port untuk memberi tahu server kita online
const BROADCAST_ADDR = '192.168.1.255'; // SESUAIKAN: Alamat broadcast subnet Anda (biasanya diakhiri .255)
const DEVICE_CODE = 'ARDUINO-01';

// Variabel Dinamis
let API_URL = '';
let serverFound = false;

console.log('🚀 Smart Waste Serial Bridge Starting...');
console.log('🔍 Mencari Server di jaringan lokal...');

/**
 * STEP 1: Mencari Server secara Dinamis via UDP
 */
function listenForServer() {
    const server = dgram.createSocket('udp4');

    server.on('message', (msg, rinfo) => {
        try {
            const data = JSON.parse(msg.toString());
            if (data.app === 'smart-waste' && !serverFound) {
                serverFound = true;
                API_URL = `http://${data.ip}:${data.port}/api/iot/data`;
                
                console.log('=======================================');
                console.log('✅ SERVER DITEMUKAN!');
                console.log('📍 IP Server   : ' + data.ip);
                console.log('🔗 API Endpoint : ' + API_URL);
                console.log('=======================================');

                // Lanjut ke Step 2 setelah server ditemukan
                startBridge();
            }
        } catch (e) { /* Bukan pesan server kita */ }
    });

    server.bind(SERVER_BROADCAST_PORT, () => {
        console.log('📡 Menunggu sinyal broadcast dari Website...');
    });
}

/**
 * STEP 2: Menjalankan Heartbeart (UDP & HTTP)
 */

// 2a. UDP Discovery (Agar Server Tahu Kita Online di jaringan)
function startDiscoveryHeartbeat() {
    const client = dgram.createSocket('udp4');
    const message = JSON.stringify({
        app: 'smart-waste-announce',
        deviceCode: DEVICE_CODE,
        type: 'BRIDGE'
    });

    client.bind(() => {
        client.setBroadcast(true);
        setInterval(() => {
            if (serverFound) {
                client.send(message, 0, message.length, DISCOVERY_PORT, BROADCAST_ADDR);
            }
        }, 3000);
    });
}

function startStatusHeartbeat() {
    const sendPing = async () => {
        if (serverFound && API_URL) {
            try {
                console.log('💓 Sending status heartbeat...');
                await axios.post(API_URL, {
                    deviceCode: DEVICE_CODE,
                    type: 'ping'
                });
            } catch (error) {
                console.error('⚠️ Heartbeat failed:', error.message);
            }
        }
    };
    
    sendPing(); // Eksekusi langsung
    setInterval(sendPing, 30000); // Eksekusi setiap 30 detik
}

async function findArduinoPort() {
    const ports = await SerialPort.list();
    const arduinoPort = ports.find(port => 
        (port.manufacturer && port.manufacturer.includes('Arduino')) || 
        (port.pnpId && port.pnpId.includes('USB')) ||
        (port.friendlyName && port.friendlyName.includes('Arduino'))
    );

    if (arduinoPort) {
        console.log('🔍 Mendeteksi Arduino di port: ' + arduinoPort.path);
        return arduinoPort.path;
    }
    console.log('⚠️ Arduino tidak terdeteksi otomatis. Gunakan default...');
    return process.platform === 'win32' ? 'COM3' : '/dev/ttyUSB0';
}

async function startBridge() {
    try {
        const portPath = await findArduinoPort();
        const port = new SerialPort({ path: portPath, baudRate: BAUD_RATE });
        const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

        // Jalankan Heartbeat
        startDiscoveryHeartbeat();
        startStatusHeartbeat();

        port.on('open', () => {
            console.log('✅ Serial Port Terhubung: ' + portPath);
            console.log('🚀 Sistem SIAP mengirim data ke Website!');
        });

        parser.on('data', async (line) => {
            console.log('[Arduino]: ' + line);

            if (line.indexOf('DATA_START:') !== -1) {
                try {
                    const jsonString = line.split('DATA_START:')[1].split(':DATA_END')[0];
                    const data = JSON.parse(jsonString);

                    console.log('📡 Mengirim ke Server...');
                    const response = await axios.post(API_URL, data);
                    
                    if (response.data && response.data.success) {
                        console.log('✅ Terkirim ke Dashboard!');
                    } else {
                        console.log('❌ Server menolak data');
                    }
                } catch (error) {
                    console.error('⚠️ Error POST:', error.message);
                }
            }
        });

        port.on('error', (err) => {
            console.error('❌ Error Serial:', err.message);
            process.exit(1);
        });

    } catch (err) {
        console.error('❌ Gagal Bridge:', err.message);
    }
}

/**
 * STEP 3: Handle Graceful Shutdown
 * Mengirim sinyal offline ke server saat script dimatikan (Ctrl+C)
 */
async function handleShutdown() {
    if (serverFound && API_URL) {
        console.log('\n🛑 Shutting down... Sending offline signal...');
        try {
            await axios.post(API_URL, {
                deviceCode: DEVICE_CODE,
                type: 'offline'
            });
            console.log('✅ Offline signal sent.');
        } catch (error) {
            console.error('⚠️ Failed to send offline signal:', error.message);
        }
    }
    process.exit(0);
}

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

// Mulai dari mendengarkan server
listenForServer();
