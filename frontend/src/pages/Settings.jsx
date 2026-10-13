import { useEffect, useState } from 'react';
import { api, downloadFile } from '../api/client.js';
import AiProviderSettings from '../components/AiProviderSettings.jsx';
import { isPushSupported, enablePush, disablePush } from '../lib/push.js';
import { isPasskeySupported, registerPasskey } from '../lib/passkey.js';

export default function Settings({ onLogout }) {
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
  const passkeySupported = isPasskeySupported();
  const pushSupported = isPushSupported();

  useEffect(() => { api('/settings/ai').then(setAiConfig).catch(() => {}); }, []);
  useEffect(() => { if (pushSupported) api('/push/status').then(setPushStatus).catch(() => {}); }, []);
  useEffect(() => { if (passkeySupported) loadPasskeys(); }, []);

  function loadPasskeys() {
    api('/webauthn/list').then(setPasskeys).catch(() => {});
  }

  async function addPasskey() {
    setPasskeyError('');
    setPasskeyBusy(true);
    try {
      const deviceName = window.prompt('¿Cómo le llamamos a este dispositivo? (ej. "mi iPhone", "laptop trabajo")', '') || null;
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
      setTestMessage('Enviada — debería llegarte en unos segundos.');
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
      setPasswordMessage('Contraseña actualizada.');
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
      <h1>Ajustes</h1>

      <div className="card">
        <h3>IA para fotos de comida</h3>
        {aiConfig?.configured ? (
          <>
            <p className="muted">Proveedor activo: <strong>{aiConfig.provider}</strong></p>
            <button className="danger" onClick={disconnectAi}>Desconectar / cambiar proveedor</button>
          </>
        ) : (
          <p className="muted">No configurado. El escaneo de foto con IA en "Registrar" no estará disponible hasta que configures un proveedor aquí.</p>
        )}
      </div>

      {!aiConfig?.configured && <AiProviderSettings current={aiConfig} onSaved={setAiConfig} />}

      <div className="card">
        <h3>Passkeys</h3>
        {passkeySupported ? (
          <>
            <p className="muted">
              Inicia sesión con Face ID, Touch ID, Windows Hello o una llave de seguridad — sin escribir contraseña. Puedes registrar uno por cada dispositivo que uses.
            </p>
            {passkeys.map((pk) => (
              <div key={pk.id} className="list-item">
                <span>🔑 {pk.device_name || 'Passkey sin nombre'}</span>
                <a href="#" onClick={(e) => { e.preventDefault(); removePasskey(pk.id); }}>✕</a>
              </div>
            ))}
            {passkeyError && <p className="error">{passkeyError}</p>}
            <button disabled={passkeyBusy} onClick={addPasskey}>
              {passkeyBusy ? 'Registrando...' : '+ Agregar passkey de este dispositivo'}
            </button>
          </>
        ) : (
          <p className="muted">Tu navegador no soporta passkeys.</p>
        )}
      </div>

      <div className="card">
        <h3>Cambiar contraseña</h3>
        <form onSubmit={changePassword}>
          <input type="password" placeholder="contraseña actual" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          <input type="password" placeholder="nueva contraseña" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          {passwordError && <p className="error">{passwordError}</p>}
          {passwordMessage && <p className="muted">{passwordMessage}</p>}
          <button type="submit">Actualizar contraseña</button>
        </form>
      </div>

      <div className="card">
        <h3>Código de recuperación</h3>
        <p className="muted">
          Es tu única forma de recuperar la cuenta si olvidas tu contraseña (no hay correo configurado). Si no guardaste el que te dimos al registrarte, genera uno nuevo aquí — el viejo queda invalidado.
        </p>
        {newRecoveryCode ? (
          <div className="howto-box">
            <p style={{ fontSize: 20, fontWeight: 800, textAlign: 'center', letterSpacing: 1, margin: '4px 0' }}>
              {newRecoveryCode}
            </p>
            <p className="muted">Guárdalo ya — no se vuelve a mostrar.</p>
          </div>
        ) : (
          <>
            {recoveryError && <p className="error">{recoveryError}</p>}
            <button className="secondary" disabled={recoveryBusy} onClick={regenerateRecoveryCode}>
              {recoveryBusy ? 'Generando...' : 'Generar código nuevo'}
            </button>
          </>
        )}
      </div>

      <div className="card">
        <h3>Recordatorios</h3>
        {pushSupported ? (
          <>
            <p className="muted">
              Si no has registrado nada, te mandamos una notificación en algún momento del día (como Duolingo — hora random, no siempre la misma) pa' que no pierdas tu racha. Funciona aunque la app esté cerrada.
            </p>
            {pushError && <p className="error">{pushError}</p>}
            {testMessage && <p className="muted">{testMessage}</p>}
            <button className={pushStatus?.subscribed ? 'danger' : ''} disabled={pushBusy || !pushStatus} onClick={togglePush}>
              {pushBusy ? 'Procesando...' : pushStatus?.subscribed ? 'Desactivar recordatorios' : 'Activar recordatorios'}
            </button>
            {pushStatus?.subscribed && (
              <button className="secondary" onClick={sendTestNotification}>Enviar notificación de prueba</button>
            )}
          </>
        ) : (
          <p className="muted">Tu navegador no soporta notificaciones push (común en Safari de iPhone fuera de la app instalada — intenta después de "Agregar a inicio").</p>
        )}
      </div>

      <div className="card">
        <h3>Tus datos</h3>
        <p className="muted">Descarga todo lo que has registrado (perfil, metas, comidas, medidas) en un archivo que puedes guardar o abrir en otra parte.</p>
        {exportError && <p className="error">{exportError}</p>}
        <button className="secondary" disabled={exporting} onClick={handleExport}>
          {exporting ? 'Preparando...' : 'Descargar mis datos'}
        </button>
      </div>

      <button className="secondary" onClick={onLogout} style={{ marginTop: 24 }}>
        Cerrar sesión
      </button>
    </div>
  );
}
