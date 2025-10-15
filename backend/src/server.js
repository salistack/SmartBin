const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Import IoT simulator
const { startIoTSimulation } = require('./utils/iotSimulator');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/authRoutes');
const binRoutes = require('./routes/binRoutes'); // 🟢 add this
const customerRoutes = require('./routes/customerRoutes'); // import customer routes
app.use('/api/customers', customerRoutes);                // register customer routes

app.use('/api/auth', authRoutes);
app.use('/api/bins', binRoutes); // 🟢 register bin routes


// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'SmartBin backend' });
});

// DB + Server start
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartbin';

mongoose
  .connect(MONGO_URI, { autoIndex: true })
  .then(() => {
    console.log('✅ Connected to MongoDB');

    // Start IoT simulation
    startIoTSimulation();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    app.listen(PORT, () => {
      console.log(`⚠️ Server running on port ${PORT} (Mongo disconnected)`);
    });
  });
