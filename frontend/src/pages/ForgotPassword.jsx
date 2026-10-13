import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useLang } from '../i18n/LangContext.jsx';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const { t } = useLang();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const data = await api('/auth/forgot-password', {
        method: 'POST',
        body: { email, recoveryCode, newPassword },
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    }
  }

  if (result) {
    return (
      <div>
        <h1>{t('forgot.resultTitle')}</h1>
        <div className="card">
          <p className="muted">{t('forgot.resultBody')}</p>
          <p style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', letterSpacing: 1, margin: '12px 0' }}>
            {result.newRecoveryCode}
          </p>
        </div>
        <Link to="/"><button>{t('forgot.goLogin')}</button></Link>
      </div>
    );
  }

  return (
    <div>
      <h1>{t('forgot.title')}</h1>
      <p className="muted">{t('forgot.lede')}</p>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder={t('forgot.username')} value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input placeholder={t('forgot.code')} value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value)} required />
        <input type="password" placeholder={t('forgot.newPassword')} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
        {error && <p className="error">{error}</p>}
        <button type="submit">{t('forgot.submit')}</button>
      </form>
      <p className="muted">
        {t('forgot.noCode')} <Link to="/">{t('forgot.back')}</Link>
      </p>
    </div>
  );
}
