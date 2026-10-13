import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { isPasskeySupported, registerAccountWithPasskey } from '../lib/passkey.js';
import { useLang } from '../i18n/LangContext.jsx';

export default function Register({ onAuth }) {
  const [form, setForm] = useState({
    name: '', email: '', password: '', sex: 'male', birthDate: '', heightCm: '', activityLevel: 'moderate',
  });
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null); // { token, recoveryCode } while showing the one-time code
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const passkeySupported = isPasskeySupported();
  const { t } = useLang();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function profileComplete() {
    return form.name && form.email && form.birthDate && form.heightCm;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const data = await api('/auth/register', {
        method: 'POST',
        body: { ...form, heightCm: Number(form.heightCm) || null },
      });
      setPending(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handlePasskeyRegister() {
    setError('');
    if (!profileComplete()) {
      setError(t('register.error.completeProfile'));
      return;
    }
    setPasskeyBusy(true);
    try {
      const data = await registerAccountWithPasskey({
        username: form.email,
        name: form.name,
        sex: form.sex,
        birthDate: form.birthDate,
        heightCm: Number(form.heightCm) || null,
        activityLevel: form.activityLevel,
      });
      setPending(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setPasskeyBusy(false);
    }
  }

  if (pending) {
    return (
      <div>
        <h1>{t('register.saveCodeTitle')}</h1>
        <div className="card">
          <p className="muted">{t('register.saveCodeBody')}</p>
          <p style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', letterSpacing: 1, margin: '12px 0' }}>
            {pending.recoveryCode}
          </p>
          <p className="muted">{t('register.saveCodeHint')}</p>
        </div>
        <button onClick={() => onAuth(pending.token)}>{t('register.saveCodeContinue')}</button>
      </div>
    );
  }

  return (
    <div>
      <h1>{t('register.title')}</h1>
      <form onSubmit={handleSubmit}>
        <input placeholder={t('register.name')} value={form.name} onChange={(e) => update('name', e.target.value)} required />
        <input type="text" placeholder={t('register.username')} value={form.email} onChange={(e) => update('email', e.target.value)} required />
        <input type="password" placeholder={t('register.password')} value={form.password} onChange={(e) => update('password', e.target.value)} required={!passkeySupported} />
        <div className="row">
          <select value={form.sex} onChange={(e) => update('sex', e.target.value)}>
            <option value="male">{t('register.sexMale')}</option>
            <option value="female">{t('register.sexFemale')}</option>
          </select>
          <input type="date" value={form.birthDate} onChange={(e) => update('birthDate', e.target.value)} required />
        </div>
        <div className="row">
          <input type="number" placeholder={t('register.height')} value={form.heightCm} onChange={(e) => update('heightCm', e.target.value)} required />
          <select value={form.activityLevel} onChange={(e) => update('activityLevel', e.target.value)}>
            <option value="sedentary">{t('register.activitySedentary')}</option>
            <option value="light">{t('register.activityLight')}</option>
            <option value="moderate">{t('register.activityModerate')}</option>
            <option value="active">{t('register.activityActive')}</option>
            <option value="very_active">{t('register.activityVeryActive')}</option>
          </select>
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit">{t('register.submit')}</button>
        {passkeySupported && (
          <button type="button" className="secondary" disabled={passkeyBusy} onClick={handlePasskeyRegister}>
            {passkeyBusy ? t('register.passkeyBusy') : t('register.passkeySubmit')}
          </button>
        )}
      </form>
      <Link to="/" className="btn-link secondary">{t('register.haveAccount')}</Link>
    </div>
  );
}
