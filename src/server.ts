import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';
import { healthRouter } from './tools/health.js';
import { kbRouter } from './tools/kb-public.js';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
const HAS_SECURITY = Boolean(process.env.SECURITY_SECRET_KEY);

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

app.use('/health', healthRouter);
app.use('/api/kb', kbRouter(prisma));

app.get('/api/admin/_gate', (_req, res) => {
  if (!HAS_SECURITY) return res.status(503).json({ ok: false, reason: 'Security not configured' });
  res.json({ ok: true });
});

app.get('/', (_req, res) => res.type('text/plain').send('FixGeni API is running'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[fixgeni] listening on ${PORT} (security=${HAS_SECURITY ? 'on' : 'off'})`);
});
