import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { goalsRouter } from './routes/goals.js';
import { foodsRouter } from './routes/foods.js';
import { logsRouter } from './routes/logs.js';
import { metricsRouter } from './routes/metrics.js';
import { dashboardRouter } from './routes/dashboard.js';
import { recipesRouter } from './routes/recipes.js';
import { settingsRouter } from './routes/settings.js';
import { photosRouter } from './routes/photos.js';
import { exportRouter } from './routes/export.js';
import { pushRouter } from './routes/push.js';
import { aiRouter } from './routes/ai.js';
import { webauthnRouter } from './routes/webauthn.js';
import { startReminderScheduler } from './lib/reminderScheduler.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '8mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/foods', foodsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/photos', photosRouter);
app.use('/api/export', exportRouter);
app.use('/api/push', pushRouter);
app.use('/api/ai', aiRouter);
app.use('/api/webauthn', webauthnRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'internal error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`mamey-planner API listening on ${PORT}`));
startReminderScheduler();
