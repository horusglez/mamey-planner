import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { VAPID_PUBLIC_KEY, sendToUser } from '../lib/push.js';

export const pushRouter = Router();
pushRouter.use(requireAuth);

pushRouter.get('/vapid-public-key', (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY || null });
});

pushRouter.post('/subscribe', asyncHandler(async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'endpoint y keys requeridos' });
  }
  await pool.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
    [req.userId, endpoint, keys.p256dh, keys.auth]
  );
  res.status(201).json({ ok: true });
}));

pushRouter.delete('/subscribe', asyncHandler(async (req, res) => {
  const { endpoint } = req.body;
  if (endpoint) {
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2', [endpoint, req.userId]);
  } else {
    await pool.query('DELETE FROM push_subscriptions WHERE user_id = $1', [req.userId]);
  }
  res.status(204).end();
}));

pushRouter.get('/status', asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT COUNT(*)::int AS count FROM push_subscriptions WHERE user_id = $1', [req.userId]);
  res.json({ subscribed: result.rows[0].count > 0 });
}));

pushRouter.post('/test', asyncHandler(async (req, res) => {
  await sendToUser(req.userId, { title: '🥭 Mamey Planner', body: 'Así se ve un recordatorio. ¡Funciona!' });
  res.status(204).end();
}));
