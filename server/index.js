require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const hpp = require('hpp');
const { rateLimit } = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');

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

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : (isProduction ? [] : defaultDevOrigins);

if (isProduction && allowedOrigins.length === 0) {
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

  if (allowedOrigins.length === 0) {
    return false;
  }

  return allowedOrigins.includes(origin);
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
const notificationService = require('./services/notificationService');

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

// Initialize Global Notification Service
notificationService.init(io);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Unifyr server is running successfully.' });
});

// API Routes
app.use('/api/events', eventRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/utsav', utsavRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
