require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const admin = require('firebase-admin');
const morgan = require('morgan');

console.log('🚀 Starting ScentryX Backend for Render...');

// Initialize Firebase
try {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://scentryx-9dd99-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
  console.log('Firebase initialized');
} catch (error) {
  console.log('Firebase initialization skipped:', error.message);
}

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());
app.use(morgan('dev'));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', req.body);
  }
  next();
});

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'scentryx-backend',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ==================== LOAD AND USE YOUR ROUTE FILES ====================
// Load route files
try {
  app.use('/api/devices', require('./routes/device-routes'));
  console.log('Loaded device routes');
} catch (err) {
  console.log('Failed to load device routes:', err.message);
}

try {
  app.use('/api/gas', require('./routes/gas-routes'));
  console.log('Loaded gas routes');
} catch (err) {
  console.log('Failed to load gas routes:', err.message);
}

try {
  app.use('/api/tokens', require('./routes/token-routes'));
  console.log('Loaded token routes');
} catch (err) {
  console.log('Failed to load token routes:', err.message);
}

try {
  app.use('/api/config', require('./routes/config-routes'));
  console.log('Loaded config routes');
} catch (err) {
  console.log('Failed to load config routes:', err.message);
}

try {
  app.use('/api/auth', require('./routes/auth.routes'));
  console.log('Loaded auth routes');
} catch (err) {
  console.log('Failed to load auth routes:', err.message);
}

try {
  app.use('/api/alerts', require('./routes/alert.routes'));
  console.log('Loaded alert routes');
} catch (err) {
  console.log('Failed to load alert routes:', err.message);
}

try {
  app.use('/api/readings', require('./routes/readings.routes'));
  console.log('Loaded readings routes');
} catch (err) {
  console.log('Failed to load readings routes:', err.message);
}

// ==================== ADDITIONAL DIRECT ROUTES ====================
// Echo test
app.post('/api/echo', (req, res) => {
  res.json({
    success: true,
    message: 'Echo from Render',
    received: req.body,
    timestamp: new Date().toISOString()
  });
});

// Test MongoDB connection
app.get('/api/debug/mongodb', (req, res) => {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected', 
    2: 'connecting',
    3: 'disconnecting'
  };
  
  res.json({
    success: true,
    mongodb: {
      state: states[state],
      readyState: state,
      host: mongoose.connection.host,
      name: mongoose.connection.name
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'ScentryX Gas Detector API',
    status: 'running',
    version: '1.0.0',
    hosted: 'Render.com',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    endpoints: {
      deviceRegistration: 'POST /api/devices',
      gasReading: 'POST /api/gas',
      authLogin: 'POST /api/auth/login',
      authRegister: 'POST /api/auth/register',
      alerts: 'GET /api/alerts',
      healthCheck: 'GET /health',
      echoTest: 'POST /api/echo'
    }
  });
});

// ==================== ERROR HANDLING ====================
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
    message: 'Internal server error'
  });
});

// ==================== DATABASE CONNECTION ====================
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (MONGODB_URI) {
  console.log('🔗 Connecting to MongoDB Atlas...');
  
  mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log('MongoDB Atlas connected!');
    console.log(`Database: ${mongoose.connection.name}`);
    
    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\nServer started on port ${PORT}`);
      console.log(`URL: https://scentryx-backend.onrender.com`);
      console.log(`Ready for ESP8266 connections!`);
      console.log('\n Available endpoints:');
      console.log('   POST /api/devices - Register device (saves to MongoDB)');
      console.log('   POST /api/gas     - Submit gas reading (saves to MongoDB)');
      console.log('   GET  /api/devices - List all devices (from MongoDB)');
      console.log('   GET  /api/gas     - List all readings (from MongoDB)');
      console.log('   GET  /health      - Health check');
    });
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    console.log('Exiting...');
    process.exit(1);
  });
} else {
  console.error('MONGO_URI not found in .env');
  process.exit(1);
}