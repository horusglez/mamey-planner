import { useEffect, useState } from 'react';
import { api, downloadFile } from '../api/client.js';
import AiProviderSettings from '../components/AiProviderSettings.jsx';
import { isPushSupported, enablePush, disablePush } from '../lib/push.js';
import { isPasskeySupported, registerPasskey } from '../lib/passkey.js';
import { useLang } from '../i18n/LangContext.jsx';

export default function Settings({ onLogout }) {
  const { t, lang, setLang } = useLang();
  const [profile, setProfile] = useState(null);
  const [aiConfig, setAiConfig] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [exportError, setExportError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [pushStatus, setPushStatus] = useState(null);
  const [pushError, setPushError] = useState('');
  const [pushBusy, setPushBusy] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [newRecoveryCode, setNewRecoveryCode] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [passkeys, setPasskeys] = useState([]);
  const [passkeyError, setPasskeyError] = useState('');
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [coffeeDismissed, setCoffeeDismissed] = useState(() => localStorage.getItem('mamey_coffee_dismissed') === 'true');
  const passkeySupported = isPasskeySupported();
  const pushSupported = isPushSupported();

  useEffect(() => { api('/auth/me').then(setProfile).catch(() => {}); }, []);
  useEffect(() => { api('/settings/ai').then(setAiConfig).catch(() => {}); }, []);
  useEffect(() => { if (pushSupported) api('/push/status').then(setPushStatus).catch(() => {}); }, []);
  useEffect(() => { if (passkeySupported) loadPasskeys(); }, []);

  function loadPasskeys() {
    api('/webauthn/list').then(setPasskeys).catch(() => {});
  }

  function dismissCoffee() {
    localStorage.setItem('mamey_coffee_dismissed', 'true');
    setCoffeeDismissed(true);
  }

  async function addPasskey() {
    setPasskeyError('');
    setPasskeyBusy(true);
    try {
      const deviceName = window.prompt(t('settings.passkeys.namePrompt'), '') || null;
      await registerPasskey(deviceName);
      loadPasskeys();
    } catch (err) {
      setPasskeyError(err.message);
    } finally {
      setPasskeyBusy(false);
    }
  }

  async function removePasskey(id) {
    await api(`/webauthn/${id}`, { method: 'DELETE' });
    loadPasskeys();
  }

  async function togglePush() {
    setPushError('');
    setPushBusy(true);
    try {
      if (pushStatus?.subscribed) {
        await disablePush();
        setPushStatus({ subscribed: false });
      } else {
        await enablePush();
        setPushStatus({ subscribed: true });
      }
    } catch (err) {
      setPushError(err.message);
    } finally {
      setPushBusy(false);
    }
  }

  async function sendTestNotification() {
    setPushError('');
    setTestMessage('');
    try {
      await api('/push/test', { method: 'POST' });
      setTestMessage(t('settings.reminders.testSent'));
    } catch (err) {
      setPushError(err.message);
    }
  }

  async function regenerateRecoveryCode() {
    setRecoveryError('');
    setRecoveryBusy(true);
    try {
      const { newRecoveryCode } = await api('/auth/regenerate-recovery-code', { method: 'POST' });
      setNewRecoveryCode(newRecoveryCode);
    } catch (err) {
      setRecoveryError(err.message);
    } finally {
      setRecoveryBusy(false);
    }
  }

  async function disconnectAi() {
    await api('/settings/ai', { method: 'DELETE' });
    setAiConfig({ provider: null, configured: false });
  }

  async function changePassword(e) {
    e.preventDefault();
    setPasswordError('');
    setPasswordMessage('');
    try {
      await api('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } });
      setPasswordMessage(t('settings.password.updated'));
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPasswordError(err.message);
    }
  }

  async function handleExport() {
    setExportError('');
    setExporting(true);
    try {
      await downloadFile('/export', 'mamey-planner-datos.json');
    } catch (err) {
      setExportError(err.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <h1>{t('settings.title')}</h1>

      {profile && (
        <div className="card">
          <h3>{t('settings.profile.title')}</h3>
          <div className="list-item"><span>{t('settings.profile.name')}</span><strong>{profile.name}</strong></div>
          <div className="list-item"><span>{t('settings.profile.username')}</span><strong>{profile.email}</strong></div>
          <div className="list-item"><span>{t('settings.profile.memberSince')}</span><strong>{new Date(profile.created_at).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US')}</strong></div>
        </div>
      )}

      <div className="card">
        <h3>{t('settings.language')}</h3>
        <div className="lang-toggle">
          <button className={lang === 'es' ? '' : 'secondary'} onClick={() => setLang('es')}>Español</button>
          <button className={lang === 'en' ? '' : 'secondary'} onClick={() => setLang('en')}>English</button>
        </div>
      </div>

      <div className="card">
        <h3>{t('settings.ai.title')}</h3>
        {aiConfig?.configured ? (
          <>
            <p className="muted">{t('settings.ai.activeProvider')} <strong>{aiConfig.provider}</strong></p>
            <button className="danger" onClick={disconnectAi}>{t('settings.ai.disconnect')}</button>
          </>
        ) : (
          <p className="muted">{t('settings.ai.notConfigured')}</p>
        )}
      </div>

      {!aiConfig?.configured && <AiProviderSettings current={aiConfig} onSaved={setAiConfig} />}

      <div className="card">
        <h3>{t('settings.passkeys.title')}</h3>
        {passkeySupported ? (
          <>
            <p className="muted">{t('settings.passkeys.lede')}</p>
            {passkeys.map((pk) => (
              <div key={pk.id} className="list-item">
                <span>🔑 {pk.device_name || t('settings.passkeys.unnamed')}</span>
                <a href="#" onClick={(e) => { e.preventDefault(); removePasskey(pk.id); }}>✕</a>
              </div>
            ))}
            {passkeyError && <p className="error">{passkeyError}</p>}
            <button disabled={passkeyBusy} onClick={addPasskey}>
              {passkeyBusy ? t('settings.passkeys.registering') : t('settings.passkeys.add')}
            </button>
          </>
        ) : (
          <p className="muted">{t('settings.passkeys.notSupported')}</p>
        )}
      </div>

      <div className="card">
        <h3>{t('settings.password.title')}</h3>
        {profile && !profile.hasPassword ? (
          <p className="muted">{t('settings.password.noPassword')}</p>
        ) : (
          <form onSubmit={changePassword}>
            <input type="password" placeholder={t('settings.password.current')} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            <input type="password" placeholder={t('settings.password.new')} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            {passwordError && <p className="error">{passwordError}</p>}
            {passwordMessage && <p className="muted">{passwordMessage}</p>}
            <button type="submit">{t('settings.password.submit')}</button>
          </form>
        )}
      </div>

      <div className="card">
        <h3>{t('settings.recovery.title')}</h3>
        <p className="muted">{t('settings.recovery.lede')}</p>
        {newRecoveryCode ? (
          <div className="howto-box">
            <p style={{ fontSize: 20, fontWeight: 800, textAlign: 'center', letterSpacing: 1, margin: '4px 0' }}>
              {newRecoveryCode}
            </p>
            <p className="muted">{t('settings.recovery.saveNow')}</p>
          </div>
        ) : (
          <>
            {recoveryError && <p className="error">{recoveryError}</p>}
            <button className="secondary" disabled={recoveryBusy} onClick={regenerateRecoveryCode}>
              {recoveryBusy ? t('settings.recovery.generating') : t('settings.recovery.generate')}
            </button>
          </>
        )}
      </div>

      <div className="card">
        <h3>{t('settings.reminders.title')}</h3>
        {pushSupported ? (
          <>
            <p className="muted">{t('settings.reminders.lede')}</p>
            {pushError && <p className="error">{pushError}</p>}
            {testMessage && <p className="muted">{testMessage}</p>}
            <button className={pushStatus?.subscribed ? 'danger' : ''} disabled={pushBusy || !pushStatus} onClick={togglePush}>
              {pushBusy ? t('settings.reminders.processing') : pushStatus?.subscribed ? t('settings.reminders.disable') : t('settings.reminders.enable')}
            </button>
            {pushStatus?.subscribed && (
              <button className="secondary" onClick={sendTestNotification}>{t('settings.reminders.sendTest')}</button>
            )}
          </>
        ) : (
          <p className="muted">{t('settings.reminders.notSupported')}</p>
        )}
      </div>

      <div className="card">
        <h3>{t('settings.data.title')}</h3>
        <p className="muted">{t('settings.data.lede')}</p>
        {exportError && <p className="error">{exportError}</p>}
        <button className="secondary" disabled={exporting} onClick={handleExport}>
          {exporting ? t('settings.data.preparing') : t('settings.data.download')}
        </button>
      </div>

      {!coffeeDismissed && (
        <div className="card">
          <h3>{t('settings.coffee.title')}</h3>
          <p className="muted">{t('settings.coffee.lede')}</p>
          <a href="https://buymeacoffee.com/surohsusej" target="_blank" rel="noopener noreferrer">
            <button className="secondary">{t('settings.coffee.button')}</button>
          </a>
          <a href="#" onClick={(e) => { e.preventDefault(); dismissCoffee(); }} className="muted" style={{ fontSize: 13 }}>
            {t('settings.coffee.alreadyDonated')}
          </a>
        </div>
      )}

      <button className="secondary" onClick={onLogout} style={{ marginTop: 24 }}>
        {t('settings.logout')}
      </button>
    </div>
  );
}
