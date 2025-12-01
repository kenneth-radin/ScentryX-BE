// Test the server from command line
const http = require('http');

const testEndpoints = [
  { method: 'GET', path: '/api/health', data: null },
  { method: 'POST', path: '/api/devices/simple', data: {
    deviceId: 'test-device-001',
    name: 'Test Device',
    location: 'Test Lab'
  }},
  { method: 'POST', path: '/api/devices', data: {
    deviceId: 'kitchen-sensor-001',
    name: 'Kitchen Sensor',
    location: 'Kitchen'
  }},
  { method: 'POST', path: '/api/gas', data: {
    deviceId: 'kitchen-sensor-001',
    gasValue: 45,
    status: 'NORMAL'
  }}
];

const host = 'localhost';
const port = 3000;

function testEndpoint(index) {
  if (index >= testEndpoints.length) {
    console.log('\n✅ All tests completed!');
    return;
  }

  const test = testEndpoints[index];
  console.log(`\n🔍 Testing: ${test.method} ${test.path}`);
  
  const options = {
    hostname: host,
    port: port,
    path: test.path,
    method: test.method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
    
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        console.log('Response:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('Response:', body);
      }
      
      // Test next endpoint after delay
      setTimeout(() => testEndpoint(index + 1), 1000);
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Error: ${e.message}`);
    setTimeout(() => testEndpoint(index + 1), 1000);
  });

  if (test.data) {
    req.write(JSON.stringify(test.data));
  }
  
  req.end();
}

console.log('🚀 Starting backend tests...');
console.log(`📡 Server: ${host}:${port}`);
testEndpoint(0);