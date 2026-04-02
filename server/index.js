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

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : null;

const isOriginAllowed = (origin) => {
  if (!origin) {
    return true;
  }

  if (!allowedOrigins || allowedOrigins.length === 0) {
    return true;
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
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
app.use(limiter);

// Routes Import
const eventRoutes = require('./routes/eventRoutes');
const teamRoutes = require('./routes/teamRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');

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

// Initialize Matchmaking WebSockets
require('./sockets/matchmakingSocket')(io);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Unifyr server is running successfully.' });
});

// API Routes
app.use('/api/events', eventRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
