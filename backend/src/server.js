const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/authRoutes');
const binRoutes = require('./routes/binRoutes');
const collectionRoutes = require('./routes/collectionRoutes');
const adminRoutes = require('./routes/adminRoutes');
app.use('/api/auth', authRoutes);
app.use('/api/bins', binRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/admin', adminRoutes);

// Simple health route
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'SmartBin backend' });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartbin';

mongoose
  .connect(MONGO_URI, { autoIndex: true })
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    // still start server so health endpoints may help debugging (optional)
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (Mongo disconnected)`);
    });
  });
