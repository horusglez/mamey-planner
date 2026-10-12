import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { encrypt } from '../lib/crypto.js';

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

settingsRouter.get('/ai', asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT ai_provider, ai_api_key_encrypted FROM users WHERE id = $1', [req.userId]);
  const user = result.rows[0];
  res.json({ provider: user.ai_provider, configured: !!user.ai_api_key_encrypted });
}));

settingsRouter.post('/ai', asyncHandler(async (req, res) => {
  const { provider, apiKey } = req.body;
  if (!['anthropic', 'openai', 'gemini'].includes(provider)) {
    return res.status(400).json({ error: 'provider debe ser anthropic, openai o gemini' });
  }
  if (!apiKey) return res.status(400).json({ error: 'apiKey required' });

  await pool.query(
    'UPDATE users SET ai_provider = $1, ai_api_key_encrypted = $2 WHERE id = $3',
    [provider, encrypt(apiKey), req.userId]
  );
  res.json({ provider, configured: true });
}));

settingsRouter.delete('/ai', asyncHandler(async (req, res) => {
  await pool.query('UPDATE users SET ai_provider = NULL, ai_api_key_encrypted = NULL WHERE id = $1', [req.userId]);
  res.status(204).end();
}));
