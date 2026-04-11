const axios = require('axios');

async function testPing() {
    try {
        console.log("Sending ping to http://localhost:3000/api/iot/data...");
        const response = await axios.post('http://localhost:3000/api/iot/data', {
            deviceCode: "ARDUINO-01",
            type: "ping"
        });
        console.log("Response:", response.data);
    } catch (e) {
        console.error("Error:", e.response ? e.response.data : e.message);
    }
}

testPing();
