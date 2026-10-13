import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get('/summary', asyncHandler(async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);

  const totalsResult = await pool.query(
    `SELECT
       COALESCE(SUM(calories), 0) AS calories,
       COALESCE(SUM(protein_g), 0) AS protein_g,
       COALESCE(SUM(carbs_g), 0) AS carbs_g,
       COALESCE(SUM(fat_g), 0) AS fat_g
     FROM food_logs WHERE user_id = $1 AND logged_at::date = $2`,
    [req.userId, date]
  );

  const goalResult = await pool.query(
    'SELECT * FROM goals WHERE user_id = $1 AND active = true ORDER BY created_at DESC LIMIT 1',
    [req.userId]
  );

  res.json({ date, totals: totalsResult.rows[0], goal: goalResult.rows[0] || null });
}));

// Consecutive days (ending today or yesterday, so an unlogged "today in progress"
// doesn't zero out a streak before the day is even over) with at least one food log.
dashboardRouter.get('/streak', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT DISTINCT logged_at::date AS d FROM food_logs WHERE user_id = $1 ORDER BY d DESC LIMIT 400`,
    [req.userId]
  );
  const dateSet = new Set(result.rows.map((r) => r.d.toISOString().slice(0, 10)));

  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  const todayStr = cursor.toISOString().slice(0, 10);
  const loggedToday = dateSet.has(todayStr);
  if (!loggedToday) cursor.setUTCDate(cursor.getUTCDate() - 1);

  let streak = 0;
  while (dateSet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  res.json({ streak, loggedToday });
}));

// Last 7 days of totals (today inclusive) plus the average per day, so trend
// is visible instead of just one day's noise.
dashboardRouter.get('/week', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT
       logged_at::date AS date,
       COALESCE(SUM(calories), 0) AS calories,
       COALESCE(SUM(protein_g), 0) AS protein_g,
       COALESCE(SUM(carbs_g), 0) AS carbs_g,
       COALESCE(SUM(fat_g), 0) AS fat_g
     FROM food_logs
     WHERE user_id = $1 AND logged_at::date >= CURRENT_DATE - INTERVAL '6 days'
     GROUP BY logged_at::date`,
    [req.userId]
  );
  const byDate = new Map(result.rows.map((r) => [r.date.toISOString().slice(0, 10), r]));

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const row = byDate.get(dateStr);
    days.push({
      date: dateStr,
      calories: Number(row?.calories || 0),
      protein_g: Number(row?.protein_g || 0),
      carbs_g: Number(row?.carbs_g || 0),
      fat_g: Number(row?.fat_g || 0),
    });
  }

  const loggedDays = days.filter((d) => d.calories > 0);
  const avg = (key) => (loggedDays.length ? loggedDays.reduce((a, d) => a + d[key], 0) / loggedDays.length : 0);

  res.json({
    days,
    average: {
      calories: Math.round(avg('calories')),
      protein_g: Math.round(avg('protein_g')),
      carbs_g: Math.round(avg('carbs_g')),
      fat_g: Math.round(avg('fat_g')),
    },
    loggedDaysCount: loggedDays.length,
  });
}));
