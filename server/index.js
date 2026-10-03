const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const initDb = require('./config/initDb');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters long');
}

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const uploadRoutes = require('./routes/upload');
const { sharePost } = require('./controllers/shareController');

const app = express();
const PORT = process.env.PORT || 5000;
let dbReady = false;

// Render terminates TLS and forwards the original client IP to Express.
app.set('trust proxy', 1);

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Bind the port before database initialization so Render can wake the service.
app.use('/api', (req, res, next) => {
  if (req.path === '/health' || dbReady) return next();
  return res.status(503).json({ error: 'Server is starting. Please retry shortly.' });
});

// Routes
app.get('/share/:slug', sharePost);
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/uploads', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  if (!dbReady) return res.status(503).json({ status: 'starting' });
  return res.json({ status: 'ok' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handling middleware (must be after routes)
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ 
    error: err.message || 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { details: err.stack })
  });
});

// Start server
const start = async () => {
  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  try {
    await initDb();
    dbReady = true;
    console.log('Database ready');
  } catch (err) {
    console.error('Failed to start server:', err.message);
    server.close();
    process.exit(1);
  }
};

start();
