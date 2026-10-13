import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { decrypt } from '../lib/crypto.js';
import { chatCompletion, extractJsonArray } from '../lib/textProviders.js';

export const aiRouter = Router();
aiRouter.use(requireAuth);

async function getAiCredentials(userId) {
  const result = await pool.query('SELECT ai_provider, ai_api_key_encrypted FROM users WHERE id = $1', [userId]);
  const user = result.rows[0];
  if (!user.ai_provider || !user.ai_api_key_encrypted) return null;
  return { provider: user.ai_provider, apiKey: decrypt(user.ai_api_key_encrypted) };
}

aiRouter.post('/meal-plan', asyncHandler(async (req, res) => {
  const creds = await getAiCredentials(req.userId);
  if (!creds) return res.status(400).json({ error: 'configura tu proveedor de IA en Ajustes primero' });

  const goalResult = await pool.query(
    'SELECT * FROM goals WHERE user_id = $1 AND active = true ORDER BY created_at DESC LIMIT 1',
    [req.userId]
  );
  const goal = goalResult.rows[0];
  if (!goal) return res.status(400).json({ error: 'configura una meta primero (pestaña Meta)' });

  const { mealsPerDay, restrictions, dislikes } = req.body;
  const meals = Number(mealsPerDay) || 4;

  const systemPrompt = `Eres un asistente de nutrición. Generas planes de comida de un día que suman aproximadamente las calorías y macros objetivo del usuario, usando alimentos reales y comunes en Latinoamérica. Respondes ÚNICAMENTE con JSON válido, sin texto antes ni después.`;
  const userPrompt = `Genera un plan de comidas para UN DÍA que sume aproximadamente:
- Calorías: ${goal.target_calories} kcal
- Proteína: ${goal.target_protein_g} g
- Carbohidratos: ${goal.target_carbs_g} g
- Grasa: ${goal.target_fat_g} g

Distribuye en ${meals} comidas, usando estos tipos exactos: breakfast, lunch, dinner, snack (elige los que correspondan según el número de comidas).
${restrictions ? `Restricciones alimentarias: ${restrictions}.` : ''}
${dislikes ? `Evita estos alimentos: ${dislikes}.` : ''}

Responde ÚNICAMENTE con un array JSON de alimentos (cada alimento es un objeto separado, agrupados por el campo meal_type), con este formato exacto:
[{"meal_type": "breakfast", "name": "nombre del alimento en español", "estimated_grams": number, "calories_per_100g": number, "protein_g": number, "carbs_g": number, "fat_g": number}]`;

  let text;
  try {
    text = await chatCompletion(creds.provider, creds.apiKey, systemPrompt, [{ role: 'user', content: userPrompt }]);
  } catch (err) {
    return res.status(502).json({ error: `la IA no pudo generar el plan: ${err.message}` });
  }

  const items = extractJsonArray(text)
    .filter((i) => i.name && i.meal_type && i.calories_per_100g != null)
    .map((i) => ({
      name: String(i.name),
      mealType: ['breakfast', 'lunch', 'dinner', 'snack'].includes(i.meal_type) ? i.meal_type : 'snack',
      estimatedGrams: Number(i.estimated_grams) || 100,
      caloriesPer100g: Number(i.calories_per_100g) || 0,
      proteinG: Number(i.protein_g) || 0,
      carbsG: Number(i.carbs_g) || 0,
      fatG: Number(i.fat_g) || 0,
    }));

  if (items.length === 0) return res.status(422).json({ error: 'la IA no devolvió un plan válido, intenta de nuevo' });

  const foods = [];
  for (const item of items) {
    const result = await pool.query(
      `INSERT INTO foods (source, name, calories_per_100g, protein_g, carbs_g, fat_g, created_by)
       VALUES ('ai_plan', $1, $2, $3, $4, $5, $6) RETURNING *`,
      [item.name, item.caloriesPer100g, item.proteinG, item.carbsG, item.fatG, req.userId]
    );
    foods.push({ ...result.rows[0], estimated_grams: item.estimatedGrams, meal_type: item.mealType });
  }
  res.status(201).json(foods);
}));

aiRouter.post('/chat', asyncHandler(async (req, res) => {
  const creds = await getAiCredentials(req.userId);
  if (!creds) return res.status(400).json({ error: 'configura tu proveedor de IA en Ajustes primero' });

  const { message, history } = req.body;
  if (!message) return res.status(400).json({ error: 'message requerido' });

  const goalResult = await pool.query(
    'SELECT * FROM goals WHERE user_id = $1 AND active = true ORDER BY created_at DESC LIMIT 1',
    [req.userId]
  );
  const goal = goalResult.rows[0];

  const totalsResult = await pool.query(
    `SELECT COALESCE(SUM(calories),0) AS calories, COALESCE(SUM(protein_g),0) AS protein_g,
            COALESCE(SUM(carbs_g),0) AS carbs_g, COALESCE(SUM(fat_g),0) AS fat_g
     FROM food_logs WHERE user_id = $1 AND logged_at::date = CURRENT_DATE`,
    [req.userId]
  );
  const totals = totalsResult.rows[0];

  const systemPrompt = `Eres un asistente de nutrición amigable dentro de la app Mamey Planner. Respondes en español, de forma breve y práctica (máximo 4-5 líneas salvo que pidan más detalle).
${goal ? `El objetivo del usuario es: ${goal.goal_type}, con meta diaria de ${goal.target_calories} kcal / ${goal.target_protein_g}g proteína / ${goal.target_carbs_g}g carbohidratos / ${goal.target_fat_g}g grasa.` : 'El usuario todavía no tiene una meta configurada.'}
Hoy lleva consumido: ${Math.round(totals.calories)} kcal, ${Math.round(totals.protein_g)}g proteína, ${Math.round(totals.carbs_g)}g carbohidratos, ${Math.round(totals.fat_g)}g grasa.
No eres médico ni nutriólogo certificado -- si preguntan algo médico serio (condiciones de salud, medicamentos, trastornos alimenticios), sugiere consultar a un profesional real en vez de responder como si lo fueras.`;

  const messages = [...(Array.isArray(history) ? history.slice(-10) : []), { role: 'user', content: message }];

  let reply;
  try {
    reply = await chatCompletion(creds.provider, creds.apiKey, systemPrompt, messages);
  } catch (err) {
    return res.status(502).json({ error: `la IA no pudo responder: ${err.message}` });
  }

  res.json({ reply });
}));
