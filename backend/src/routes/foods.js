import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const foodsRouter = Router();
foodsRouter.use(requireAuth);

// Micronutrients Open Food Facts reports per 100g, beyond the macro columns we
// already store individually. Kept generic (field -> label) instead of one
// column each, since OFF's nutrient list varies a lot between products.
const MICRO_FIELDS = {
  'saturated-fat_100g': 'grasa_saturada_g',
  calcium_100g: 'calcio_mg',
  iron_100g: 'hierro_mg',
  potassium_100g: 'potasio_mg',
  'vitamin-c_100g': 'vitamina_c_mg',
  'vitamin-a_100g': 'vitamina_a_mcg',
  cholesterol_100g: 'colesterol_mg',
  magnesium_100g: 'magnesio_mg',
  zinc_100g: 'zinc_mg',
};

function extractMicros(n) {
  const micros = {};
  for (const [offKey, label] of Object.entries(MICRO_FIELDS)) {
    if (n[offKey] != null) micros[label] = n[offKey];
  }
  return micros;
}

async function cacheOffProduct(p) {
  const n = p.nutriments || {};
  const result = await pool.query(
    `INSERT INTO foods (source, external_id, name, brand, calories_per_100g, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, micros)
     VALUES ('openfoodfacts', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (source, external_id) DO UPDATE SET name = EXCLUDED.name, micros = EXCLUDED.micros
     RETURNING *`,
    [
      p.code,
      p.product_name,
      p.brands || null,
      n['energy-kcal_100g'] || 0,
      n.proteins_100g || 0,
      n.carbohydrates_100g || 0,
      n.fat_100g || 0,
      n.fiber_100g || 0,
      n.sugars_100g || 0,
      (n.sodium_100g || 0) * 1000,
      JSON.stringify(extractMicros(n)),
    ]
  );
  return result.rows[0];
}

// Searches the local cache first; if results are thin, pulls from Open Food Facts
// (open/free DB, no API key) and caches matches for next time.
foodsRouter.get('/search', asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json([]);

  const local = await pool.query(
    `SELECT * FROM foods WHERE to_tsvector('simple', name) @@ to_tsquery('simple', $1) LIMIT 20`,
    [q.split(/\s+/).join(' & ') + ':*']
  );

  if (local.rows.length >= 8) return res.json(local.rows);

  try {
    const offRes = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&json=1&page_size=15`
    );
    const offData = await offRes.json();
    const products = (offData.products || []).filter((p) => p.product_name && p.nutriments?.['energy-kcal_100g'] != null);

    const cached = [];
    for (const p of products) {
      cached.push(await cacheOffProduct(p));
    }

    const merged = [...local.rows, ...cached].filter(
      (food, idx, arr) => arr.findIndex((f) => f.id === food.id) === idx
    );
    res.json(merged);
  } catch (err) {
    // Open Food Facts unreachable (offline/local dev) -- still return whatever we have locally.
    res.json(local.rows);
  }
}));

// Looks up one product by exact barcode (EAN/UPC) -- what a camera scan reads.
foodsRouter.get('/barcode/:code', asyncHandler(async (req, res) => {
  const code = req.params.code.trim();

  const local = await pool.query(`SELECT * FROM foods WHERE source = 'openfoodfacts' AND external_id = $1`, [code]);
  if (local.rows.length > 0) return res.json(local.rows[0]);

  let data;
  try {
    const offRes = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`);
    data = await offRes.json();
  } catch {
    return res.status(502).json({ error: 'no se pudo consultar Open Food Facts' });
  }

  if (data.status !== 1 || !data.product?.product_name || data.product.nutriments?.['energy-kcal_100g'] == null) {
    return res.status(404).json({ error: 'código no encontrado, agrégalo manual' });
  }

  const food = await cacheOffProduct({ ...data.product, code });
  res.status(201).json(food);
}));

foodsRouter.post('/', asyncHandler(async (req, res) => {
  const { name, brand, caloriesPer100g, proteinG, carbsG, fatG, fiberG, sugarG, sodiumMg } = req.body;
  if (!name || caloriesPer100g == null) {
    return res.status(400).json({ error: 'name and caloriesPer100g required' });
  }
  const result = await pool.query(
    `INSERT INTO foods (source, name, brand, calories_per_100g, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, created_by)
     VALUES ('custom', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [name, brand || null, caloriesPer100g, proteinG || 0, carbsG || 0, fatG || 0, fiberG || 0, sugarG || 0, sodiumMg || 0, req.userId]
  );
  res.status(201).json(result.rows[0]);
}));

// Only the food's creator can edit it, and only if it's a custom entry --
// editing a shared Open Food Facts/recipe-cached row would affect other users.
foodsRouter.patch('/:id', asyncHandler(async (req, res) => {
  const { name, brand, caloriesPer100g, proteinG, carbsG, fatG, fiberG, sugarG, sodiumMg } = req.body;
  if (!name || caloriesPer100g == null) {
    return res.status(400).json({ error: 'name and caloriesPer100g required' });
  }
  const result = await pool.query(
    `UPDATE foods SET name = $1, brand = $2, calories_per_100g = $3, protein_g = $4, carbs_g = $5,
       fat_g = $6, fiber_g = $7, sugar_g = $8, sodium_mg = $9
     WHERE id = $10 AND source = 'custom' AND created_by = $11
     RETURNING *`,
    [name, brand || null, caloriesPer100g, proteinG || 0, carbsG || 0, fatG || 0, fiberG || 0, sugarG || 0, sodiumMg || 0, req.params.id, req.userId]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'alimento no encontrado o no editable' });
  res.json(result.rows[0]);
}));
