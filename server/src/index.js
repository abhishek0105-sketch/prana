require('dotenv').config();
const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const cors    = require('cors');
const helmet  = require('helmet');

// ── Startup guard — crash loud if secrets are missing ──────────
const REQUIRED_ENV = ['JWT_SECRET'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`\n❌  Missing required env var: ${key}\n   Set it in your .env file.\n`);
    process.exit(1);
  }
}

// ── CORS: allow the frontend origin only ───────────────────────
// In development: Vite on 5173. In production: your real domain.
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['https://localhost:5173', 'http://localhost:5173'];

const corsOptions = {
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, Postman, same-origin)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
};

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: corsOptions });

// ── Security headers ───────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false, // needed for video/WebRTC
  contentSecurityPolicy: false,     // managed by the frontend (Vite)
}));

app.use(cors(corsOptions));

// Limit request body to 50 KB — blocks payload-bloat attacks
app.use(express.json({ limit: '50kb' }));

// Make socket.io instance available in all route handlers via req.io
app.use((req, _, next) => { req.io = io; next(); });

// ── Routes ─────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/friends',  require('./routes/friends'));
app.use('/api/hangouts', require('./routes/hangouts'));
app.use('/api/places',   require('./routes/places'));
app.use('/api/payments', require('./routes/payments'));

app.get('/api/health', (_, res) => res.json({ status: 'ok', app: 'PRANA' }));

// ── 404 catch-all ──────────────────────────────────────────────
app.use((_, res) => res.status(404).json({ error: 'Not found' }));

// ── Global error handler ───────────────────────────────────────
app.use((err, _req, res, _next) => {
  // Don't leak stack traces in production
  const isDev = process.env.NODE_ENV !== 'production';
  console.error('[error]', err.message);
  res.status(err.status || 500).json({
    error: isDev ? err.message : 'Internal server error',
  });
});

require('./socket')(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`\n✅  PRANA Server — port ${PORT}  (${process.env.NODE_ENV || 'development'})\n`);
});
