const PROMPT = `Analiza esta foto de comida. Identifica cada alimento visible y estima su cantidad en gramos y su información nutricional POR CADA 100 GRAMOS (no por la porción total).
Responde ÚNICAMENTE con un array JSON válido, sin texto antes ni después, con este formato exacto:
[{"name": "nombre en español", "estimated_grams": number, "calories_per_100g": number, "protein_g": number, "carbs_g": number, "fat_g": number}]
Si no reconoces ningún alimento, responde [].`;

function extractJsonArray(text) {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1) return [];
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeItems(items) {
  return items
    .filter((i) => i.name && i.calories_per_100g != null)
    .map((i) => ({
      name: String(i.name),
      estimatedGrams: Number(i.estimated_grams) || 100,
      caloriesPer100g: Number(i.calories_per_100g) || 0,
      proteinG: Number(i.protein_g) || 0,
      carbsG: Number(i.carbs_g) || 0,
      fatG: Number(i.fat_g) || 0,
    }));
}

async function analyzeWithAnthropic(apiKey, imageBase64, mimeType) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return normalizeItems(extractJsonArray(data.content?.[0]?.text || ''));
}

async function analyzeWithOpenAI(apiKey, imageBase64, mimeType) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return normalizeItems(extractJsonArray(data.choices?.[0]?.message?.content || ''));
}

async function analyzeWithGemini(apiKey, imageBase64, mimeType) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data: imageBase64 } }],
          },
        ],
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  return normalizeItems(extractJsonArray(text));
}

const PROVIDERS = {
  anthropic: analyzeWithAnthropic,
  openai: analyzeWithOpenAI,
  gemini: analyzeWithGemini,
};

export async function analyzeFoodPhoto(provider, apiKey, imageBase64, mimeType) {
  const fn = PROVIDERS[provider];
  if (!fn) throw new Error(`proveedor desconocido: ${provider}`);
  return fn(apiKey, imageBase64, mimeType);
}
