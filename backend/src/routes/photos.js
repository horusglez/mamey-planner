import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { decrypt } from '../lib/crypto.js';
import { analyzeFoodPhoto } from '../lib/visionProviders.js';

export const photosRouter = Router();
photosRouter.use(requireAuth);

photosRouter.post('/analyze', asyncHandler(async (req, res) => {
  const { imageBase64, mimeType } = req.body;
  if (!imageBase64 || !mimeType) return res.status(400).json({ error: 'imageBase64 y mimeType requeridos' });

  const userResult = await pool.query('SELECT ai_provider, ai_api_key_encrypted FROM users WHERE id = $1', [req.userId]);
  const user = userResult.rows[0];
  if (!user.ai_provider || !user.ai_api_key_encrypted) {
    return res.status(400).json({ error: 'configura tu proveedor de IA y tu API key primero' });
  }

  const apiKey = decrypt(user.ai_api_key_encrypted);
  let items;
  try {
    items = await analyzeFoodPhoto(user.ai_provider, apiKey, imageBase64, mimeType);
  } catch (err) {
    return res.status(502).json({ error: `la IA no pudo analizar la foto: ${err.message}` });
  }

  if (items.length === 0) {
    return res.status(422).json({ error: 'no se reconoció ningún alimento en la foto' });
  }

  const foods = [];
  for (const item of items) {
    const result = await pool.query(
      `INSERT INTO foods (source, name, calories_per_100g, protein_g, carbs_g, fat_g, created_by)
       VALUES ('ai_estimate', $1, $2, $3, $4, $5, $6) RETURNING *`,
      [item.name, item.caloriesPer100g, item.proteinG, item.carbsG, item.fatG, req.userId]
    );
    foods.push({ ...result.rows[0], estimated_grams: item.estimatedGrams });
  }
  res.status(201).json(foods);
}));
