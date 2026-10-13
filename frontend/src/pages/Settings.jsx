import { useEffect, useState } from 'react';
import { api, downloadFile } from '../api/client.js';
import AiProviderSettings from '../components/AiProviderSettings.jsx';
import { isPushSupported, enablePush, disablePush } from '../lib/push.js';

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
  const pushSupported = isPushSupported();

  useEffect(() => { api('/settings/ai').then(setAiConfig).catch(() => {}); }, []);
  useEffect(() => { if (pushSupported) api('/push/status').then(setPushStatus).catch(() => {}); }, []);

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
