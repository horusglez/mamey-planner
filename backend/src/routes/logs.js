import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const logsRouter = Router();
logsRouter.use(requireAuth);

logsRouter.get('/', asyncHandler(async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const result = await pool.query(
    `SELECT l.*, f.name AS food_name, f.brand AS food_brand
     FROM food_logs l JOIN foods f ON f.id = l.food_id
     WHERE l.user_id = $1 AND l.logged_at::date = $2
     ORDER BY l.logged_at ASC`,
    [req.userId, date]
  );
  res.json(result.rows);
}));

logsRouter.post('/', asyncHandler(async (req, res) => {
  const { foodId, mealType, quantityG, loggedAt } = req.body;
  if (!foodId || !mealType || !quantityG) {
    return res.status(400).json({ error: 'foodId, mealType, quantityG required' });
  }
  const foodResult = await pool.query('SELECT * FROM foods WHERE id = $1', [foodId]);
  const food = foodResult.rows[0];
  if (!food) return res.status(404).json({ error: 'food not found' });

  const factor = quantityG / 100;
  const result = await pool.query(
    `INSERT INTO food_logs (user_id, food_id, logged_at, meal_type, quantity_g, calories, protein_g, carbs_g, fat_g)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      req.userId,
      foodId,
      loggedAt || new Date().toISOString(),
      mealType,
      quantityG,
      food.calories_per_100g * factor,
      food.protein_g * factor,
      food.carbs_g * factor,
      food.fat_g * factor,
    ]
  );
  res.status(201).json(result.rows[0]);
}));

logsRouter.patch('/:id', asyncHandler(async (req, res) => {
  const { mealType, quantityG } = req.body;
  if (!mealType || !quantityG) {
    return res.status(400).json({ error: 'mealType y quantityG requeridos' });
  }
  const logResult = await pool.query(
    `SELECT l.id, f.calories_per_100g, f.protein_g, f.carbs_g, f.fat_g
     FROM food_logs l JOIN foods f ON f.id = l.food_id
     WHERE l.id = $1 AND l.user_id = $2`,
    [req.params.id, req.userId]
  );
  const row = logResult.rows[0];
  if (!row) return res.status(404).json({ error: 'registro no encontrado' });

  const factor = quantityG / 100;
  const result = await pool.query(
    `UPDATE food_logs SET meal_type = $1, quantity_g = $2, calories = $3, protein_g = $4, carbs_g = $5, fat_g = $6
     WHERE id = $7 AND user_id = $8 RETURNING *`,
    [
      mealType,
      quantityG,
      row.calories_per_100g * factor,
      row.protein_g * factor,
      row.carbs_g * factor,
      row.fat_g * factor,
      req.params.id,
      req.userId,
    ]
  );
  res.json(result.rows[0]);
}));

logsRouter.delete('/:id', asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM food_logs WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  res.status(204).end();
}));
