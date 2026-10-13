// Text-only completions (no image), reused by meal planning and the
// nutrition chat. Same model choices as visionProviders.js for cost
// consistency across every AI feature the app offers.

async function completeWithAnthropic(apiKey, systemPrompt, messages) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1500,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) throw new Error(`Anthropic error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

async function completeWithOpenAI(apiKey, systemPrompt, messages) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 1500,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function completeWithGemini(apiKey, systemPrompt, messages) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
}

const PROVIDERS = {
  anthropic: completeWithAnthropic,
  openai: completeWithOpenAI,
  gemini: completeWithGemini,
};

// messages: [{ role: 'user'|'assistant', content: string }]
export async function chatCompletion(provider, apiKey, systemPrompt, messages) {
  const fn = PROVIDERS[provider];
  if (!fn) throw new Error(`proveedor desconocido: ${provider}`);
  return fn(apiKey, systemPrompt, messages);
}

export function extractJsonArray(text) {
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
