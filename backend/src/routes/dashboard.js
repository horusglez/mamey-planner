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

// Supported summary windows and how many days of raw data each needs, plus
// how many days get folded into one bar on the chart (so a year isn't 365
// bars). week/biweek show one bar per day; longer ranges bucket by week or
// month so the chart stays readable.
const RANGES = {
  week: { days: 7, bucketSize: 1 },
  biweek: { days: 14, bucketSize: 1 },
  month: { days: 30, bucketSize: 7 },
  bimonth: { days: 60, bucketSize: 7 },
  quarter: { days: 90, bucketSize: 7 },
  semester: { days: 182, bucketSize: 30 },
  year: { days: 365, bucketSize: 30 },
};

// Totals per day (today inclusive) over the requested window, bucketed and
// averaged, so trend is visible instead of just one day's noise.
dashboardRouter.get('/period', asyncHandler(async (req, res) => {
  const range = RANGES[req.query.range] ? req.query.range : 'week';
  const { days: totalDays, bucketSize } = RANGES[range];

  const result = await pool.query(
    `SELECT
       logged_at::date AS date,
       COALESCE(SUM(calories), 0) AS calories,
       COALESCE(SUM(protein_g), 0) AS protein_g,
       COALESCE(SUM(carbs_g), 0) AS carbs_g,
       COALESCE(SUM(fat_g), 0) AS fat_g
     FROM food_logs
     WHERE user_id = $1 AND logged_at::date >= CURRENT_DATE - ($2::int - 1)
     GROUP BY logged_at::date`,
    [req.userId, totalDays]
  );
  const byDate = new Map(result.rows.map((r) => [r.date.toISOString().slice(0, 10), r]));

  const days = [];
  for (let i = totalDays - 1; i >= 0; i--) {
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

  const buckets = [];
  for (let i = 0; i < days.length; i += bucketSize) {
    const slice = days.slice(i, i + bucketSize);
    const loggedInBucket = slice.filter((d) => d.calories > 0);
    const avg = (key) =>
      loggedInBucket.length ? loggedInBucket.reduce((a, d) => a + d[key], 0) / loggedInBucket.length : 0;
    buckets.push({
      startDate: slice[0].date,
      endDate: slice[slice.length - 1].date,
      avgCalories: Math.round(avg('calories')),
      loggedDays: loggedInBucket.length,
      totalDays: slice.length,
    });
  }

  const loggedDays = days.filter((d) => d.calories > 0);
  const avgAll = (key) => (loggedDays.length ? loggedDays.reduce((a, d) => a + d[key], 0) / loggedDays.length : 0);

  res.json({
    range,
    buckets,
    average: {
      calories: Math.round(avgAll('calories')),
      protein_g: Math.round(avgAll('protein_g')),
      carbs_g: Math.round(avgAll('carbs_g')),
      fat_g: Math.round(avgAll('fat_g')),
    },
    loggedDaysCount: loggedDays.length,
    totalDays,
  });
}));
