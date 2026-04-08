require('dotenv').config();
const express = require('express');
const path = require('path');
const config = require('./config');
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

const app = express();

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    console.log('Query params:', req.query);
  }
  next();
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/auth', authRoutes);
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(config.PORT, () => {
  console.log(`HR Helper server running at http://localhost:${config.PORT}`);
  console.log(`OAuth redirect URI: ${config.REDIRECT_URI}`);
});