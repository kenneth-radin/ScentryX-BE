const http = require('http');

// Simulate ESP8266 request
function sendDeviceRegistration() {
  const options = {
    hostname: '192.168.1.13', // Your backend IP
    port: 3000,
    path: '/api/devices',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'ESP8266-Client'
    },
  };

  const data = JSON.stringify({
    name: "Kitchen Sensor",
    location: "Kitchen",
    deviceId: "kitchen-sensor-001"
  });

  console.log('📤 Sending ESP8266 device registration...');
  console.log('Data:', data);

  const req = http.request(options, (res) => {
    console.log(`\n📥 Response Status: ${res.statusCode}`);
    console.log('Headers:', JSON.stringify(res.headers, null, 2));
    
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        console.log('\n✅ Response Body:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('\n📄 Raw Response:', body);
      }
    });
  });

  req.on('error', (e) => {
    console.error('\n❌ Request Error:', e.message);
    console.log('\nTroubleshooting:');
    console.log('1. Is the server running? (npm start)');
    console.log('2. Is the IP correct? Current:', options.hostname);
    console.log('3. Check firewall: sudo ufw allow 3000');
    console.log('4. Check if server is listening on all interfaces');
  });

  req.write(data);
  req.end();
}

// Also test simple endpoint
function testSimpleEndpoint() {
  const options = {
    hostname: '192.168.1.13',
    port: 3000,
    path: '/api/devices/simple',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const data = JSON.stringify({
    name: "Test Device",
    deviceId: "test-001"
  });

  const req = http.request(options, (res) => {
    console.log(`\n🔧 Simple endpoint test: ${res.statusCode}`);
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => console.log('Response:', body));
  });

  req.on('error', (e) => console.error('Simple test error:', e.message));
  req.write(data);
  req.end();
}

// Run tests
console.log('🔧 Testing ESP8266 Backend Connection');
console.log('=====================================');
sendDeviceRegistration();

// Wait and test simple endpoint too
setTimeout(testSimpleEndpoint, 2000);