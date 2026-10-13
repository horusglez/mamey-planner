import { pool } from '../db/pool.js';
import { sendToUser } from './push.js';

// Window during which a random reminder slot gets picked per user per day --
// nobody wants a ping at 3am. 30-min slots match the tick interval below.
// The chosen slot and whether it's been sent are persisted in reminder_schedule
// so a backend restart mid-day doesn't forget or double-send.
const WINDOW_START_HOUR = Number(process.env.REMINDER_WINDOW_START ?? 9);
const WINDOW_END_HOUR = Number(process.env.REMINDER_WINDOW_END ?? 21);

const MESSAGES = [
  '🥭 Tu mascota te está esperando... ¿ya comiste algo hoy?',
  'No seas así, ni una foto de tu comida hoy 😢',
  'Tu racha está en peligro. Solo toma 10 segundos registrar algo.',
  '¿Hoy no comiste nada o se te olvidó anotarlo? 👀',
  'Psst... todavía no sabemos qué comiste hoy.',
  'Tu mascota no crece sola. Ayúdale registrando algo hoy.',
  'Un día sin registrar es un día que no cuenta pa\' tu racha.',
  'Han pasado horas y tu dashboard sigue en ceros. ¿Todo bien?',
];

function pickSlot() {
  const span = (WINDOW_END_HOUR - WINDOW_START_HOUR) * 2; // half-hour slots
  const slot = Math.floor(Math.random() * span);
  return { hour: WINDOW_START_HOUR + Math.floor(slot / 2), minute: (slot % 2) * 30 };
}

function pickMessage() {
  return MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
}

async function tick() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const nowHour = now.getHours();
  const nowHalfSlot = now.getMinutes() < 30 ? 0 : 30;

  const subsResult = await pool.query('SELECT DISTINCT user_id FROM push_subscriptions');

  for (const { user_id: userId } of subsResult.rows) {
    const { hour, minute } = pickSlot();
    const upsert = await pool.query(
      `INSERT INTO reminder_schedule (user_id, date, hour, minute, sent)
       VALUES ($1, $2, $3, $4, false)
       ON CONFLICT (user_id, date) DO NOTHING
       RETURNING *`,
      [userId, todayStr, hour, minute]
    );
    const scheduleResult = upsert.rows[0]
      ? upsert
      : await pool.query('SELECT * FROM reminder_schedule WHERE user_id = $1 AND date = $2', [userId, todayStr]);
    const entry = scheduleResult.rows[0];

    if (entry.sent || entry.hour !== nowHour || entry.minute !== nowHalfSlot) continue;

    await pool.query('UPDATE reminder_schedule SET sent = true WHERE user_id = $1 AND date = $2', [userId, todayStr]);

    const loggedResult = await pool.query(
      `SELECT 1 FROM food_logs WHERE user_id = $1 AND logged_at::date = CURRENT_DATE LIMIT 1`,
      [userId]
    );
    if (loggedResult.rows.length > 0) continue; // already logged today, no nag needed

    await sendToUser(userId, { title: '🥭 Mamey Planner', body: pickMessage() });
  }
}

export function startReminderScheduler() {
  setInterval(() => {
    tick().catch((err) => console.error('reminder scheduler error', err));
  }, 30 * 60 * 1000);
}
