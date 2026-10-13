import webpush from 'web-push';
import { pool } from '../db/pool.js';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@mamey-planner.local',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export { VAPID_PUBLIC_KEY };

export async function sendToUser(userId, payload) {
  const result = await pool.query('SELECT * FROM push_subscriptions WHERE user_id = $1', [userId]);
  for (const sub of result.rows) {
    const subscription = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
    } catch (err) {
      // 404/410 means the browser revoked this subscription (uninstalled, cleared data, etc).
      if (err.statusCode === 404 || err.statusCode === 410) {
        await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
      }
    }
  }
}
