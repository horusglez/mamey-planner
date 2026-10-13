import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { pool } from '../db/pool.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { RP_ID, RP_NAME, ORIGIN } from '../lib/webauthn.js';
import { generateRecoveryCode } from '../lib/recoveryCode.js';

export const webauthnRouter = Router();

// Holds signup profile data + challenge between /register-new-options and
// /register-new-verify, for an account that doesn't exist yet. Kept in
// memory (not the users table) so an abandoned signup never permanently
// squats a username. Single backend instance, so this is safe.
const pendingSignups = new Map();
const PENDING_SIGNUP_TTL_MS = 5 * 60 * 1000;

function cleanupPendingSignups() {
  const now = Date.now();
  for (const [key, value] of pendingSignups) {
    if (value.expires < now) pendingSignups.delete(key);
  }
}

// --- Registering a new passkey for the logged-in user -----------------

webauthnRouter.get('/register-options', requireAuth, asyncHandler(async (req, res) => {
  const userResult = await pool.query('SELECT id, email FROM users WHERE id = $1', [req.userId]);
  const user = userResult.rows[0];

  const existing = await pool.query('SELECT credential_id, transports FROM webauthn_credentials WHERE user_id = $1', [req.userId]);

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: Buffer.from(user.id, 'utf8'),
    userName: user.email,
    attestationType: 'none',
    excludeCredentials: existing.rows.map((c) => ({
      id: c.credential_id,
      transports: c.transports ? c.transports.split(',') : undefined,
    })),
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
  });

  await pool.query('UPDATE users SET webauthn_challenge = $1 WHERE id = $2', [options.challenge, req.userId]);
  res.json(options);
}));

webauthnRouter.post('/register-verify', requireAuth, asyncHandler(async (req, res) => {
  const { response, deviceName } = req.body;
  const userResult = await pool.query('SELECT webauthn_challenge FROM users WHERE id = $1', [req.userId]);
  const expectedChallenge = userResult.rows[0]?.webauthn_challenge;
  if (!expectedChallenge) return res.status(400).json({ error: 'no hay un registro de passkey en progreso' });

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });
  } catch (err) {
    return res.status(400).json({ error: `no se pudo verificar el passkey: ${err.message}` });
  }

  await pool.query('UPDATE users SET webauthn_challenge = NULL WHERE id = $1', [req.userId]);
  if (!verification.verified || !verification.registrationInfo) {
    return res.status(400).json({ error: 'verificación de passkey fallida' });
  }

  const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
  await pool.query(
    `INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter, device_name, transports)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      req.userId,
      credentialID,
      Buffer.from(credentialPublicKey).toString('base64'),
      counter,
      deviceName || null,
      (response.response?.transports || []).join(','),
    ]
  );
  res.status(201).json({ ok: true });
}));

webauthnRouter.get('/list', requireAuth, asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT id, device_name, created_at FROM webauthn_credentials WHERE user_id = $1 ORDER BY created_at DESC',
    [req.userId]
  );
  res.json(result.rows);
}));

webauthnRouter.patch('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { deviceName } = req.body;
  const result = await pool.query(
    'UPDATE webauthn_credentials SET device_name = $1 WHERE id = $2 AND user_id = $3 RETURNING id, device_name, created_at',
    [deviceName || null, req.params.id, req.userId]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'passkey no encontrado' });
  res.json(result.rows[0]);
}));

webauthnRouter.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM webauthn_credentials WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  res.status(204).end();
}));

// --- Logging in with a passkey (no password) ---------------------------

webauthnRouter.post('/login-options', asyncHandler(async (req, res) => {
  const { email } = req.body;
  const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  const user = userResult.rows[0];
  // Same response whether or not the email exists, so this can't be used to enumerate accounts.
  const dummyChallenge = crypto.randomBytes(32).toString('base64url');
  if (!user) return res.json({ challenge: dummyChallenge, allowCredentials: [], timeout: 60000, rpId: RP_ID });

  const creds = await pool.query('SELECT credential_id, transports FROM webauthn_credentials WHERE user_id = $1', [user.id]);
  if (creds.rows.length === 0) return res.json({ challenge: dummyChallenge, allowCredentials: [], timeout: 60000, rpId: RP_ID });

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'preferred',
    allowCredentials: creds.rows.map((c) => ({
      id: c.credential_id,
      transports: c.transports ? c.transports.split(',') : undefined,
    })),
  });

  await pool.query('UPDATE users SET webauthn_challenge = $1 WHERE id = $2', [options.challenge, user.id]);
  res.json(options);
}));

webauthnRouter.post('/login-verify', asyncHandler(async (req, res) => {
  const { email, response } = req.body;
  const userResult = await pool.query('SELECT id, name, webauthn_challenge FROM users WHERE email = $1', [email]);
  const user = userResult.rows[0];
  if (!user?.webauthn_challenge) return res.status(401).json({ error: 'no se pudo iniciar sesión con passkey' });

  const credResult = await pool.query(
    'SELECT * FROM webauthn_credentials WHERE credential_id = $1 AND user_id = $2',
    [response.id, user.id]
  );
  const cred = credResult.rows[0];
  if (!cred) return res.status(401).json({ error: 'passkey no reconocido' });

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: user.webauthn_challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID: cred.credential_id,
        credentialPublicKey: new Uint8Array(Buffer.from(cred.public_key, 'base64')),
        counter: Number(cred.counter),
        transports: cred.transports ? cred.transports.split(',') : undefined,
      },
    });
  } catch (err) {
    return res.status(401).json({ error: `passkey inválido: ${err.message}` });
  }

  await pool.query('UPDATE users SET webauthn_challenge = NULL WHERE id = $1', [user.id]);
  if (!verification.verified) return res.status(401).json({ error: 'passkey inválido' });

  await pool.query('UPDATE webauthn_credentials SET counter = $1 WHERE id = $2', [
    verification.authenticationInfo.newCounter,
    cred.id,
  ]);

  const token = signToken(user.id);
  res.json({ token, user: { id: user.id, email, name: user.name } });
}));

// --- Creating a brand-new account with a passkey, no password at all ---

webauthnRouter.post('/register-new-options', asyncHandler(async (req, res) => {
  const { username, name, sex, birthDate, heightCm, activityLevel } = req.body;
  if (!username || !name) return res.status(400).json({ error: 'usuario y nombre requeridos' });

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [username]);
  if (existing.rows.length > 0) return res.status(409).json({ error: 'ese usuario ya existe' });

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: username,
    attestationType: 'none',
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
  });

  cleanupPendingSignups();
  pendingSignups.set(username, {
    challenge: options.challenge,
    profile: { name, sex: sex || null, birthDate: birthDate || null, heightCm: heightCm || null, activityLevel: activityLevel || 'moderate' },
    expires: Date.now() + PENDING_SIGNUP_TTL_MS,
  });

  res.json(options);
}));

webauthnRouter.post('/register-new-verify', asyncHandler(async (req, res) => {
  const { username, response } = req.body;
  const pending = pendingSignups.get(username);
  if (!pending || pending.expires < Date.now()) {
    pendingSignups.delete(username);
    return res.status(400).json({ error: 'no hay un registro en progreso, intenta de nuevo' });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: pending.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });
  } catch (err) {
    return res.status(400).json({ error: `no se pudo verificar el passkey: ${err.message}` });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return res.status(400).json({ error: 'verificación de passkey fallida' });
  }
  pendingSignups.delete(username);

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [username]);
  if (existing.rows.length > 0) return res.status(409).json({ error: 'ese usuario ya existe' });

  const recoveryCode = generateRecoveryCode();
  const recoveryCodeHash = await bcrypt.hash(recoveryCode, 10);
  const { name, sex, birthDate, heightCm, activityLevel } = pending.profile;
  const userResult = await pool.query(
    `INSERT INTO users (email, password_hash, name, sex, birth_date, height_cm, activity_level, recovery_code_hash)
     VALUES ($1, NULL, $2, $3, $4, $5, $6, $7) RETURNING id, email, name`,
    [username, name, sex, birthDate, heightCm, activityLevel, recoveryCodeHash]
  );
  const user = userResult.rows[0];

  const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
  await pool.query(
    `INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter, device_name, transports)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      user.id,
      credentialID,
      Buffer.from(credentialPublicKey).toString('base64'),
      counter,
      null,
      (response.response?.transports || []).join(','),
    ]
  );

  const token = signToken(user.id);
  res.status(201).json({ token, user, recoveryCode });
}));
