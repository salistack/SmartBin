const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const config = require('./config');
const { globalErrorHandler, notFoundHandler } = require('./middlewares/errorMiddleware');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/authRoutes');
const binRoutes = require('./routes/binRoutes');
const collectionRoutes = require('./routes/collectionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/bins', binRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);

// Simple health route
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: config.app.name,
    version: config.app.version,
    environment: config.nodeEnv
  });
});

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(globalErrorHandler);

// Connect to MongoDB and start server
mongoose
  .connect(config.mongoUri, { autoIndex: true })
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    // still start server so health endpoints may help debugging (optional)
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port} (Mongo disconnected)`);
    });
  });
