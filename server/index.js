require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const hpp = require('hpp');
const { rateLimit } = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const { pool } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';
const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX || (isProduction ? 600 : 5000));
const defaultDevOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const configuredOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : (isProduction ? [] : defaultDevOrigins);

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wildcardToRegex = (pattern = '') => {
  if (!pattern.includes('*')) return null;
  return new RegExp(`^${escapeRegex(pattern).replace(/\\\*/g, '.*')}$`);
};

const originMatchers = configuredOrigins.map((pattern) => ({
  pattern,
  regex: wildcardToRegex(pattern),
}));

if (isProduction && originMatchers.length === 0) {
  throw new Error('CORS_ORIGIN must be set in production.');
}

// Respect X-Forwarded-For on Railway/reverse proxies so users don't share one IP bucket.
if (isProduction) {
  app.set('trust proxy', 1);
}

const isOriginAllowed = (origin) => {
  if (!origin) {
    return true;
  }

  if (originMatchers.length === 0) {
    return false;
  }

  const isConfiguredAllowed = originMatchers.some(({ pattern, regex }) => {
    if (regex) return regex.test(origin);
    return pattern === origin;
  });

  if (isConfiguredAllowed) {
    return true;
  }

  if (!isProduction) {
    try {
      const { hostname } = new URL(origin);
      const isPrivateIPv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)
        && hostname.split('.').map(Number).every((value) => value >= 0 && value <= 255)
        && (
          hostname.startsWith('10.')
          || hostname.startsWith('192.168.')
          || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
        );

      if (hostname === 'localhost' || hostname === '127.0.0.1' || isPrivateIPv4) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
};

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(hpp());

// Global Rate Limiting (in-memory store — no Redis needed)
const limiter = rateLimit({
  windowMs: rateLimitWindowMs,
  limit: rateLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many requests. Please wait a minute and try again.' },
});
app.use('/api', limiter);

// Routes Import
const eventRoutes = require('./routes/eventRoutes');
const teamRoutes = require('./routes/teamRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const utsavRoutes = require('./routes/utsavRoutes');
const adminRoutes = require('./routes/adminRoutes');
const aiRoutes = require('./routes/aiRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const wordConnectRoutes = require('./routes/wordConnectRoutes');
const notificationService = require('./services/notificationService');
const chatModel = require('./models/chatModel');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

// Matchmaking + realtime chat socket handlers
require('./sockets/matchmakingSocket')(io);

// Initialize Global Notification Service
notificationService.init(io);

// Health Check with DB ping
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Unifyr backend is running.',
    health: '/health',
  });
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'OK', message: 'Unifyr server and database are healthy.' });
  } catch (err) {
    console.error('[Health] DB Connection Error:', err.message);
    res.status(503).json({ status: 'ERROR', message: 'Database unreachable' });
  }
});

// API Routes
app.use('/api/events', eventRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/utsav', utsavRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/wordconnect', wordConnectRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? (status < 500 ? err.message : 'Internal server error')
    : (err.message || 'Internal server error');
  const details = err.details;
  
  res.status(status).json({ 
    message,
    ...(details ? { details } : {})
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  // Cleanup expired offline messages every 6 hours
  const runCleanup = async () => {
    try {
      await chatModel.deleteExpiredOfflineMessages();
      // Deletion of old chat sessions is disabled to keep history persistent
      // await chatModel.deleteOldChatSessions(5); 
    } catch (err) {
      console.error('[Cleanup] Error:', err.message);
    }
  };

  // Run once on startup, then every 6 hours
  runCleanup();
  setInterval(runCleanup, 6 * 60 * 60 * 1000);
});

// Graceful Shutdown
const shutdown = () => {
  console.log('[Server] Graceful shutdown initiation...');
  server.close(() => {
    console.log('[Server] HTTP server closed.');
    pool.end(() => {
      console.log('[Server] DB pool closed. Process exiting.');
      process.exit(0);
    });
  });
  // Force exit after 10s if graceful shutdown fails
  setTimeout(() => {
    console.error('[Server] Could not close connections in time, forceful exit.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
