import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const exportRouter = Router();
exportRouter.use(requireAuth);

exportRouter.get('/', asyncHandler(async (req, res) => {
  const [profile, goals, logs, metrics] = await Promise.all([
    pool.query(
      'SELECT email, name, sex, birth_date, height_cm, activity_level, created_at FROM users WHERE id = $1',
      [req.userId]
    ),
    pool.query('SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at', [req.userId]),
    pool.query(
      `SELECT l.logged_at, l.meal_type, l.quantity_g, l.calories, l.protein_g, l.carbs_g, l.fat_g, f.name AS food_name
       FROM food_logs l JOIN foods f ON f.id = l.food_id
       WHERE l.user_id = $1 ORDER BY l.logged_at`,
      [req.userId]
    ),
    pool.query('SELECT recorded_at, weight_kg, body_fat_pct, waist_cm, notes FROM body_metrics WHERE user_id = $1 ORDER BY recorded_at', [req.userId]),
  ]);

  res.setHeader('Content-Disposition', 'attachment; filename="mamey-planner-datos.json"');
  res.json({
    exported_at: new Date().toISOString(),
    profile: profile.rows[0],
    goals: goals.rows,
    food_logs: logs.rows,
    body_metrics: metrics.rows,
  });
}));
