require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const admin = require('firebase-admin');
const morgan = require('morgan'); // Logging

const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://scentryx-9dd99-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = admin.database();
const testRef = db.ref("testNode");
testRef.set({ message: "Hello from backend!" })
  .then(() => console.log("Realtime DB write success"))
  .catch(err => console.error("Realtime DB write error:", err));

const app = express();

app.use(express.json());
app.use(cors());

app.use(morgan('dev'));
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    console.log(`[BODY] ${req.method} ${req.url} -`, req.body);
  }
  next();
});

app.use('/api/devices', require('./routes/device-routes'));
app.use('/api/gas', require('./routes/gas-routes'));
app.use('/api/tokens', require('./routes/token-routes'));
app.use('/api/config', require('./routes/config-routes'));
app.use('/api/auth', require('./routes/auth.routes'));     
app.use('/api/alerts', require('./routes/alert.routes'));   
app.use('/api/readings', require('./routes/readings.routes')); 

// Test route
app.get('/', (req, res) => res.send('Gas Detector API Running'));

// MongoDB Connection
const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  console.error('Error: MONGO_URI not defined');
  process.exit(1);
}

mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
