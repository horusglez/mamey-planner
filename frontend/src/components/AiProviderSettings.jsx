import { useState } from 'react';
import { api } from '../api/client.js';

const PROVIDERS = {
  gemini: {
    label: 'Google (Gemini) — recomendado para empezar',
    url: 'https://aistudio.google.com/apikey',
    card: 'No pide tarjeta de crédito. Tiene un nivel gratis real.',
    steps: [
      'Entra al link de arriba con tu cuenta de Gmail/Google (la misma de siempre).',
      'Haz clic en el botón azul "Create API key" (Crear clave de API).',
      'Elige "Create key in new project" si te pregunta.',
      'Te va a aparecer un texto largo que empieza con "AIza...". Ese es tu "API key" — es como una contraseña especial, cópialo completo.',
      'Pégalo aquí abajo y presiona Guardar.',
    ],
  },
  anthropic: {
    label: 'Anthropic (Claude)',
    url: 'https://console.anthropic.com/settings/keys',
    card: '⚠️ Pide agregar tarjeta de crédito/débito para que la key funcione (el uso real cuesta centavos al mes, pero sí piden tarjeta registrada).',
    steps: [
      'Entra al link de arriba y crea una cuenta (con correo o Google).',
      'Ve a la sección "Billing" (Facturación) y agrega una tarjeta — te dan unos créditos gratis de regalo al inicio.',
      'Regresa a "API Keys", haz clic en "Create Key".',
      'Copia el texto largo que empieza con "sk-ant-...". Esa es tu API key.',
      'Pégalo aquí abajo y presiona Guardar.',
    ],
  },
  openai: {
    label: 'OpenAI (GPT)',
    url: 'https://platform.openai.com/api-keys',
    card: '⚠️ También pide tarjeta de crédito/débito registrada antes de poder usar la key.',
    steps: [
      'Entra al link de arriba y crea una cuenta.',
      'Ve a "Billing" (Facturación) en el menú y agrega una tarjeta.',
      'Regresa a "API Keys" y haz clic en "Create new secret key".',
      'Copia el texto largo que empieza con "sk-...". Esa es tu API key — solo se muestra una vez, cópiala de inmediato.',
      'Pégalo aquí abajo y presiona Guardar.',
    ],
  },
};

export default function AiProviderSettings({ current, onSaved }) {
  const [provider, setProvider] = useState(current?.provider || 'gemini');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const info = PROVIDERS[provider];

  async function save() {
    setError('');
    setBusy(true);
    try {
      const result = await api('/settings/ai', { method: 'POST', body: { provider, apiKey } });
      setApiKey('');
      onSaved(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h3>Configura tu IA para fotos</h3>
      <p className="muted">
        Esto es opcional. Sirve solo para que la app pueda "ver" tus fotos de comida e identificarlas. Tú eliges con quién, y el costo de cada foto (centavos) corre por tu cuenta.
      </p>

      <select value={provider} onChange={(e) => setProvider(e.target.value)}>
        {Object.entries(PROVIDERS).map(([key, p]) => (
          <option key={key} value={key}>{p.label}</option>
        ))}
      </select>

      <div className="howto-box">
        <p className="muted"><strong>¿Qué es una "API key"?</strong> Es como una contraseña especial que te da la empresa de IA, solo para ti, pa' que la app pueda usar su servicio en tu nombre. Nunca la compartas públicamente.</p>
        <p className="muted">{info.card}</p>
        <ol>
          {info.steps.map((step, i) => <li key={i}>{step}</li>)}
        </ol>
        <a href={info.url} target="_blank" rel="noopener noreferrer">
          <button type="button" className="secondary">Abrir {info.label.split(' —')[0]} para sacar mi key →</button>
        </a>
      </div>

      <input
        type="password"
        placeholder="pega tu API key aquí"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
      />
      {error && <p className="error">{error}</p>}
      <button disabled={!apiKey || busy} onClick={save}>{busy ? 'Guardando...' : 'Guardar'}</button>
    </div>
  );
}
