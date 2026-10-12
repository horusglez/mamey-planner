import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const metricsRouter = Router();
metricsRouter.use(requireAuth);

metricsRouter.get('/', asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM body_metrics WHERE user_id = $1 ORDER BY recorded_at DESC LIMIT 90',
    [req.userId]
  );
  res.json(result.rows);
}));

metricsRouter.post('/', asyncHandler(async (req, res) => {
  const { recordedAt, weightKg, bodyFatPct, waistCm, notes } = req.body;
  const result = await pool.query(
    `INSERT INTO body_metrics (user_id, recorded_at, weight_kg, body_fat_pct, waist_cm, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, recorded_at) DO UPDATE SET
       weight_kg = EXCLUDED.weight_kg, body_fat_pct = EXCLUDED.body_fat_pct,
       waist_cm = EXCLUDED.waist_cm, notes = EXCLUDED.notes
     RETURNING *`,
    [req.userId, recordedAt || new Date().toISOString().slice(0, 10), weightKg || null, bodyFatPct || null, waistCm || null, notes || null]
  );
  res.status(201).json(result.rows[0]);
}));

metricsRouter.delete('/:id', asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM body_metrics WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  res.status(204).end();
}));
