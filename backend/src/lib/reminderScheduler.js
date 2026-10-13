import { pool } from '../db/pool.js';
import { sendToUser } from './push.js';

const REMINDER_HOUR = Number(process.env.REMINDER_HOUR ?? 20);
let lastSentDate = null;

// Runs every 30 min; once per day, at REMINDER_HOUR local server time, pings
// every user who has push enabled but hasn't logged any food yet today.
async function tick() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  if (now.getHours() !== REMINDER_HOUR || lastSentDate === todayStr) return;
  lastSentDate = todayStr;

  const result = await pool.query(
    `SELECT DISTINCT ps.user_id
     FROM push_subscriptions ps
     WHERE NOT EXISTS (
       SELECT 1 FROM food_logs l WHERE l.user_id = ps.user_id AND l.logged_at::date = CURRENT_DATE
     )`
  );

  for (const row of result.rows) {
    await sendToUser(row.user_id, {
      title: '🥭 Mamey Planner',
      body: 'Aún no registras nada hoy — no pierdas tu racha.',
    });
  }
}

export function startReminderScheduler() {
  setInterval(() => {
    tick().catch((err) => console.error('reminder scheduler error', err));
  }, 30 * 60 * 1000);
}
