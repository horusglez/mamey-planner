import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const recipesRouter = Router();
recipesRouter.use(requireAuth);

function firstNumber(value) {
  if (value == null) return 0;
  const match = String(value).match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

// Most recipe sites embed schema.org Recipe data as JSON-LD for SEO/rich snippets.
// We read that instead of scraping visible markup, which breaks per-site redesign.
function findRecipeNode(node) {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof node !== 'object') return null;
  const type = node['@type'];
  const isRecipe = type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'));
  if (isRecipe) return node;
  if (node['@graph']) return findRecipeNode(node['@graph']);
  return null;
}

recipesRouter.post('/import', asyncHandler(async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  let html;
  try {
    const pageRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (mamey-planner recipe import)' } });
    html = await pageRes.text();
  } catch {
    return res.status(422).json({ error: 'no se pudo abrir esa URL' });
  }

  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  let recipe = null;
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(match[1].trim());
      recipe = findRecipeNode(parsed);
      if (recipe) break;
    } catch {
      // malformed JSON-LD block, skip it
    }
  }

  if (!recipe) {
    return res.status(422).json({ error: 'no encontramos datos de receta (schema.org) en esa página, agrégala manual' });
  }

  const nutrition = recipe.nutrition || {};
  const calories = firstNumber(nutrition.calories);
  if (!calories) {
    return res.status(422).json({ error: 'esa receta no publica información nutricional, agrégala manual' });
  }

  const name = recipe.name || 'Receta importada';
  const proteinG = firstNumber(nutrition.proteinContent);
  const carbsG = firstNumber(nutrition.carbohydrateContent);
  const fatG = firstNumber(nutrition.fatContent);
  const fiberG = firstNumber(nutrition.fiberContent);
  const sugarG = firstNumber(nutrition.sugarContent);
  const sodiumMg = firstNumber(nutrition.sodiumContent); // schema.org spec: milligrams

  // Stored as "per serving" values in the calories_per_100g-shaped columns.
  // food_logs.quantity_g of 100 == 1 serving, 50 == half a serving, etc.
  const result = await pool.query(
    `INSERT INTO foods (source, external_id, name, calories_per_100g, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, created_by)
     VALUES ('recipe', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (source, external_id) DO UPDATE SET name = EXCLUDED.name
     RETURNING *`,
    [url, name, calories, proteinG, carbsG, fatG, fiberG, sugarG, sodiumMg, req.userId]
  );
  res.status(201).json(result.rows[0]);
}));
