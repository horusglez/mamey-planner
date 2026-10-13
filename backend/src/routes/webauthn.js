import { Router } from 'express';
import crypto from 'crypto';
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

export const webauthnRouter = Router();

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

  const { credential } = verification.registrationInfo;
  await pool.query(
    `INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter, device_name, transports)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      req.userId,
      credential.id,
      Buffer.from(credential.publicKey).toString('base64'),
      credential.counter,
      deviceName || null,
      (credential.transports || []).join(','),
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
      credential: {
        id: cred.credential_id,
        publicKey: new Uint8Array(Buffer.from(cred.public_key, 'base64')),
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
