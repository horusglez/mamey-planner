import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

export default function Login({ onAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

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

  return (
    <div>
      <h1>🥭 Mamey Planner</h1>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="correo" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="error">{error}</p>}
        <button type="submit">Entrar</button>
      </form>
      <p className="muted">¿No tienes cuenta? <Link to="/register">Regístrate</Link></p>
      <p className="muted"><Link to="/forgot-password">¿Olvidaste tu contraseña?</Link></p>
    </div>
  );
}
