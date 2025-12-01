require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

console.log('🚀 Starting Gas Detector Backend for Render...');

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body));
  }
  next();
});

// ==================== DATABASE MODELS ====================
// Simple in-memory storage for demo (or use your existing models)
const devices = new Map();
const readings = [];

// ==================== API ROUTES ====================
// Health check (required for Render)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'gas-detector-api',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Device registration
app.post('/api/devices', (req, res) => {
  console.log('📱 Device registration:', req.body);
  
  const { deviceId, name, location } = req.body;
  
  if (!deviceId || !name) {
    return res.status(400).json({
      success: false,
      message: 'deviceId and name are required'
    });
  }
  
  // Store device
  devices.set(deviceId, {
    deviceId,
    name,
    location: location || 'Unknown',
    registeredAt: new Date().toISOString(),
    lastSeen: new Date().toISOString()
  });
  
  console.log(`✅ Device registered: ${deviceId} - ${name}`);
  
  res.status(201).json({
    success: true,
    message: 'Device registered successfully',
    device: devices.get(deviceId),
    totalDevices: devices.size
  });
});

// Gas reading submission
app.post('/api/gas', (req, res) => {
  console.log('📊 Gas reading received:', req.body);
  
  const { deviceId, gasValue, status } = req.body;
  
  if (!deviceId || gasValue === undefined || !status) {
    return res.status(400).json({
      success: false,
      message: 'deviceId, gasValue, and status are required'
    });
  }
  
  // Create reading record
  const reading = {
    deviceId,
    gasValue,
    status,
    timestamp: new Date().toISOString(),
    id: readings.length + 1
  };
  
  readings.push(reading);
  
  // Update device last seen
  if (devices.has(deviceId)) {
    devices.get(deviceId).lastSeen = new Date().toISOString();
  }
  
  console.log(`📈 Gas: ${deviceId} - ${gasValue}% - ${status}`);
  
  // Check for high gas
  if (gasValue > 50) {
    console.log(`🚨 HIGH GAS ALERT: ${deviceId} - ${gasValue}%`);
  }
  
  res.status(201).json({
    success: true,
    message: 'Gas reading saved',
    reading,
    totalReadings: readings.length
  });
});

// Get all devices
app.get('/api/devices', (req, res) => {
  const deviceList = Array.from(devices.values());
  res.json({
    success: true,
    devices: deviceList,
    count: deviceList.length
  });
});

// Get all readings
app.get('/api/gas', (req, res) => {
  res.json({
    success: true,
    readings: readings.slice(-100), // Last 100 readings
    count: readings.length
  });
});

// Get device readings
app.get('/api/gas/:deviceId', (req, res) => {
  const deviceReadings = readings.filter(r => r.deviceId === req.params.deviceId);
  res.json({
    success: true,
    readings: deviceReadings,
    count: deviceReadings.length
  });
});

// Echo endpoint (for testing)
app.post('/api/echo', (req, res) => {
  res.json({
    success: true,
    message: 'Echo from Render backend',
    received: req.body,
    timestamp: new Date().toISOString(),
    server: 'render'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Gas Detector API',
    status: 'running',
    version: '1.0.0',
    hosted: 'Render.com',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    stats: {
      devices: devices.size,
      readings: readings.length
    },
    endpoints: {
      deviceRegistration: 'POST /api/devices',
      gasReading: 'POST /api/gas',
      listDevices: 'GET /api/devices',
      listReadings: 'GET /api/gas',
      healthCheck: 'GET /health',
      echoTest: 'POST /api/echo'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message
  });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (MONGODB_URI) {
  console.log('🔗 Connecting to MongoDB Atlas...');
  
  mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log('✅ MongoDB Atlas connected!');
    console.log(`Database: ${mongoose.connection.name}`);
    
    startServer();
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.log('⚠️ Starting with in-memory storage only');
    startServer();
  });
} else {
  console.log('⚠️ No MongoDB URI found, using in-memory storage');
  startServer();
}

function startServer() {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✅ Server started on port ${PORT}`);
    console.log(`📡 Server is ready for ESP8266 connections!`);
    console.log(`🌍 Local: http://localhost:${PORT}`);
    console.log(`🚀 Once deployed on Render, your ESP8266 will connect to:`);
    console.log(`   https://your-app-name.onrender.com`);
  });
}