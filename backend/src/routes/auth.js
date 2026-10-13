import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool } from '../db/pool.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const authRouter = Router();

// No email server configured on this self-hosted app -- a saved-once recovery
// code stands in for the usual "reset link sent to your email" flow.
function generateRecoveryCode() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.randomBytes(12);
  let raw = '';
  for (let i = 0; i < 12; i++) raw += alphabet[bytes[i] % alphabet.length];
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

authRouter.post('/register', asyncHandler(async (req, res) => {
  const { email, password, name, sex, birthDate, heightCm, activityLevel } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, name required' });
  }
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'email already registered' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const recoveryCode = generateRecoveryCode();
  const recoveryCodeHash = await bcrypt.hash(recoveryCode, 10);
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name, sex, birth_date, height_cm, activity_level, recovery_code_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, email, name`,
    [email, passwordHash, name, sex || null, birthDate || null, heightCm || null, activityLevel || 'moderate', recoveryCodeHash]
  );
  const user = result.rows[0];
  const token = signToken(user.id);
  res.status(201).json({ token, user, recoveryCode });
}));

authRouter.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT id, email, name, created_at FROM users WHERE id = $1', [req.userId]);
  res.json(result.rows[0]);
}));

authRouter.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: 'invalid credentials' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });
  const token = signToken(user.id);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
}));

// Resets the password using the one-time recovery code shown at registration,
// and issues a new one since the old one is now spent.
authRouter.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email, recoveryCode, newPassword } = req.body;
  if (!email || !recoveryCode || !newPassword) {
    return res.status(400).json({ error: 'email, recoveryCode y newPassword requeridos' });
  }
  const result = await pool.query('SELECT id, recovery_code_hash FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user?.recovery_code_hash) return res.status(401).json({ error: 'código o correo inválido' });

  const ok = await bcrypt.compare(recoveryCode.trim().toUpperCase(), user.recovery_code_hash);
  if (!ok) return res.status(401).json({ error: 'código o correo inválido' });

  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  const newRecoveryCode = generateRecoveryCode();
  const newRecoveryCodeHash = await bcrypt.hash(newRecoveryCode, 10);
  await pool.query(
    'UPDATE users SET password_hash = $1, recovery_code_hash = $2 WHERE id = $3',
    [newPasswordHash, newRecoveryCodeHash, user.id]
  );
  res.json({ newRecoveryCode });
}));

// Lets a signed-in user get a fresh recovery code any time, without needing
// the old one -- the session itself is the proof of identity here.
authRouter.post('/regenerate-recovery-code', requireAuth, asyncHandler(async (req, res) => {
  const newRecoveryCode = generateRecoveryCode();
  const newRecoveryCodeHash = await bcrypt.hash(newRecoveryCode, 10);
  await pool.query('UPDATE users SET recovery_code_hash = $1 WHERE id = $2', [newRecoveryCodeHash, req.userId]);
  res.json({ newRecoveryCode });
}));

authRouter.post('/change-password', requireAuth, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword y newPassword requeridos' });
  }
  const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.userId]);
  const ok = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!ok) return res.status(401).json({ error: 'contraseña actual incorrecta' });

  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, req.userId]);
  res.status(204).end();
}));
