import { useState } from 'react';
import { api } from '../api/client.js';
import { useLang } from '../i18n/LangContext.jsx';

function getProviders(t) {
  return {
    gemini: {
      label: t('aiProvider.gemini.label'),
      url: 'https://aistudio.google.com/apikey',
      card: t('aiProvider.gemini.card'),
      steps: [t('aiProvider.gemini.step1'), t('aiProvider.gemini.step2'), t('aiProvider.gemini.step3'), t('aiProvider.gemini.step4'), t('aiProvider.gemini.step5')],
    },
    anthropic: {
      label: t('aiProvider.anthropic.label'),
      url: 'https://console.anthropic.com/settings/keys',
      card: t('aiProvider.anthropic.card'),
      steps: [t('aiProvider.anthropic.step1'), t('aiProvider.anthropic.step2'), t('aiProvider.anthropic.step3'), t('aiProvider.anthropic.step4'), t('aiProvider.anthropic.step5')],
    },
    openai: {
      label: t('aiProvider.openai.label'),
      url: 'https://platform.openai.com/api-keys',
      card: t('aiProvider.openai.card'),
      steps: [t('aiProvider.openai.step1'), t('aiProvider.openai.step2'), t('aiProvider.openai.step3'), t('aiProvider.openai.step4'), t('aiProvider.openai.step5')],
    },
  };
}

export default function AiProviderSettings({ current, onSaved }) {
  const { t } = useLang();
  const PROVIDERS = getProviders(t);
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
      <h3>{t('aiProvider.title')}</h3>
      <p className="muted">{t('aiProvider.lede')}</p>

      <select value={provider} onChange={(e) => setProvider(e.target.value)}>
        {Object.entries(PROVIDERS).map(([key, p]) => (
          <option key={key} value={key}>{p.label}</option>
        ))}
      </select>

      <div className="howto-box">
        <p className="muted"><strong>{t('aiProvider.whatIsApiKey')}</strong> {t('aiProvider.whatIsApiKeyAnswer')}</p>
        <p className="muted">{info.card}</p>
        <ol>
          {info.steps.map((step, i) => <li key={i}>{step}</li>)}
        </ol>
        <a href={info.url} target="_blank" rel="noopener noreferrer">
          <button type="button" className="secondary">{t('aiProvider.openProvider', { provider: info.label.split(' —')[0].split(' - ')[0] })}</button>
        </a>
      </div>

      <input
        type="password"
        placeholder={t('aiProvider.apiKeyPlaceholder')}
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
      />
      {error && <p className="error">{error}</p>}
      <button disabled={!apiKey || busy} onClick={save}>{busy ? t('aiProvider.saving') : t('aiProvider.save')}</button>
    </div>
  );
}
