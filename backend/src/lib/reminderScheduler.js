import { pool } from '../db/pool.js';
import { sendToUser } from './push.js';

// Window during which a random reminder slot gets picked per user per day --
// nobody wants a ping at 3am. 30-min slots match the tick interval below.
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

// Per-user random slot for "today", picked once and remembered until the
// server restarts or the day changes. Not persisted -- fine for this scale.
const scheduled = new Map(); // userId -> { date, hour, minute, sent }

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
    let entry = scheduled.get(userId);
    if (!entry || entry.date !== todayStr) {
      entry = { date: todayStr, ...pickSlot(), sent: false };
      scheduled.set(userId, entry);
    }
    if (entry.sent || entry.hour !== nowHour || entry.minute !== nowHalfSlot) continue;

    const loggedResult = await pool.query(
      `SELECT 1 FROM food_logs WHERE user_id = $1 AND logged_at::date = CURRENT_DATE LIMIT 1`,
      [userId]
    );
    entry.sent = true;
    if (loggedResult.rows.length > 0) continue; // already logged today, no nag needed

    await sendToUser(userId, { title: '🥭 Mamey Planner', body: pickMessage() });
  }
}

export function startReminderScheduler() {
  setInterval(() => {
    tick().catch((err) => console.error('reminder scheduler error', err));
  }, 30 * 60 * 1000);
}
