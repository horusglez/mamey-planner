import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { isPasskeySupported, loginWithPasskey } from '../lib/passkey.js';
import { useLang } from '../i18n/LangContext.jsx';

export default function Login({ onAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const passkeySupported = isPasskeySupported();
  const { t } = useLang();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const data = await api('/auth/login', { method: 'POST', body: { email, password } });
      onAuth(data.token);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handlePasskeyLogin() {
    setError('');
    if (!email) {
      setError(t('login.error.noUsername'));
      return;
    }
    setPasskeyBusy(true);
    try {
      const data = await loginWithPasskey(email);
      onAuth(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setPasskeyBusy(false);
    }
  }

  return (
    <div>
      <h1>{t('app.title')}</h1>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder={t('login.username')} value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder={t('login.password')} value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="error">{error}</p>}
        <button type="submit">{t('login.submit')}</button>
      </form>
      {passkeySupported && (
        <button className="secondary" disabled={passkeyBusy} onClick={handlePasskeyLogin}>
          {passkeyBusy ? t('login.passkeyBusy') : t('login.passkey')}
        </button>
      )}
      <p className="muted" style={{ marginBottom: 6 }}>{t('login.noAccount')}</p>
      <Link to="/register" className="btn-link secondary">{t('login.register')}</Link>
      <Link to="/forgot-password" className="btn-link secondary">{t('login.forgot')}</Link>
    </div>
  );
}
