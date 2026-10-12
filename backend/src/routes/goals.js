import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { estimateTDEE, suggestGoalTargets } from '../lib/calc.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const goalsRouter = Router();
goalsRouter.use(requireAuth);

goalsRouter.get('/active', asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM goals WHERE user_id = $1 AND active = true ORDER BY created_at DESC LIMIT 1',
    [req.userId]
  );
  res.json(result.rows[0] || null);
}));

// Suggests calorie/macro targets from the user's profile + latest weight, without saving.
goalsRouter.post('/suggest', asyncHandler(async (req, res) => {
  const { goalType } = req.body;
  const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.userId]);
  const user = userResult.rows[0];
  if (!user.height_cm || !user.birth_date || !user.sex) {
    return res.status(400).json({ error: 'complete profile (sex, birth_date, height_cm) first' });
  }
  const metricResult = await pool.query(
    'SELECT weight_kg FROM body_metrics WHERE user_id = $1 AND weight_kg IS NOT NULL ORDER BY recorded_at DESC LIMIT 1',
    [req.userId]
  );
  const weightKg = metricResult.rows[0]?.weight_kg;
  if (!weightKg) return res.status(400).json({ error: 'log a weight entry first' });

  const age = Math.floor((Date.now() - new Date(user.birth_date).getTime()) / (365.25 * 24 * 3600 * 1000));
  const tdee = estimateTDEE({ sex: user.sex, weightKg, heightCm: user.height_cm, age, activityLevel: user.activity_level });
  const suggestion = suggestGoalTargets({ tdee, goalType, weightKg });
  res.json({ tdee, ...suggestion });
}));

goalsRouter.post('/', asyncHandler(async (req, res) => {
  const { goalType, targetCalories, targetProteinG, targetCarbsG, targetFatG, targetWeightKg } = req.body;
  await pool.query('UPDATE goals SET active = false WHERE user_id = $1 AND active = true', [req.userId]);
  const result = await pool.query(
    `INSERT INTO goals (user_id, goal_type, target_calories, target_protein_g, target_carbs_g, target_fat_g, target_weight_kg)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [req.userId, goalType, targetCalories, targetProteinG, targetCarbsG, targetFatG, targetWeightKg || null]
  );
  res.status(201).json(result.rows[0]);
}));

goalsRouter.delete('/:id', asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM goals WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  res.status(204).end();
}));
