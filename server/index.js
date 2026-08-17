import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './db.js';
import authRoutes from './routes/auth.js';
import requestsRoutes from './routes/requests.js';
import paymentsRoutes from './routes/payments.js';
import matchesRoutes from './routes/matches.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

import startCronJobs from './cron.js';
startCronJobs();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/payments', paymentsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 TeamUP Server running on http://localhost:${PORT}`);
});
