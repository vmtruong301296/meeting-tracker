import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth';
import meetingRoutes from './routes/meetings';
import groupRoutes from './routes/groups';
import memberRoutes from './routes/members';
import taskRoutes from './routes/tasks';
import { errorHandler, notFound } from './middleware/error';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim());

app.use(helmet());
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error('CORS blocked'));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));

// rate limit on auth endpoints
app.use(
  '/auth',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false }),
);

app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.use('/auth', authRoutes);
app.use('/meetings', meetingRoutes);
app.use('/groups', groupRoutes);
app.use('/members', memberRoutes);
app.use('/tasks', taskRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
