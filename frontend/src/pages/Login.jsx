import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { isPasskeySupported, loginWithPasskey } from '../lib/passkey.js';

export default function Login({ onAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const passkeySupported = isPasskeySupported();

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
      setError('Escribe tu usuario arriba primero.');
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
      <h1>🥭 Mamey Planner</h1>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="usuario" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="error">{error}</p>}
        <button type="submit">Entrar</button>
      </form>
      {passkeySupported && (
        <button className="secondary" disabled={passkeyBusy} onClick={handlePasskeyLogin}>
          {passkeyBusy ? 'Verificando...' : '🔑 Entrar con passkey'}
        </button>
      )}
      <p className="muted">¿No tienes cuenta? <Link to="/register">Regístrate</Link></p>
      <p className="muted"><Link to="/forgot-password">¿Olvidaste tu contraseña?</Link></p>
    </div>
  );
}
