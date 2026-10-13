import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

export default function Register({ onAuth }) {
  const [form, setForm] = useState({
    name: '', email: '', password: '', sex: 'male', birthDate: '', heightCm: '', activityLevel: 'moderate',
  });
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null); // { token, recoveryCode } while showing the one-time code

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
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

  if (pending) {
    return (
      <div>
        <h1>Guarda tu código de recuperación</h1>
        <div className="card">
          <p className="muted">
            No tenemos correo configurado para "olvidé mi contraseña". Este código es la ÚNICA forma de recuperar tu cuenta si olvidas tu contraseña — no se vuelve a mostrar.
          </p>
          <p style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', letterSpacing: 1, margin: '12px 0' }}>
            {pending.recoveryCode}
          </p>
          <p className="muted">Tómale captura de pantalla o escríbelo en un lugar seguro antes de continuar.</p>
        </div>
        <button onClick={() => onAuth(pending.token)}>Ya lo guardé, continuar →</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Crear cuenta</h1>
      <form onSubmit={handleSubmit}>
        <input placeholder="nombre" value={form.name} onChange={(e) => update('name', e.target.value)} required />
        <input type="text" placeholder="usuario" value={form.email} onChange={(e) => update('email', e.target.value)} required />
        <input type="password" placeholder="contraseña" value={form.password} onChange={(e) => update('password', e.target.value)} required />
        <div className="row">
          <select value={form.sex} onChange={(e) => update('sex', e.target.value)}>
            <option value="male">Hombre</option>
            <option value="female">Mujer</option>
          </select>
          <input type="date" value={form.birthDate} onChange={(e) => update('birthDate', e.target.value)} required />
        </div>
        <div className="row">
          <input type="number" placeholder="altura (cm)" value={form.heightCm} onChange={(e) => update('heightCm', e.target.value)} required />
          <select value={form.activityLevel} onChange={(e) => update('activityLevel', e.target.value)}>
            <option value="sedentary">Sedentario</option>
            <option value="light">Ligero</option>
            <option value="moderate">Moderado</option>
            <option value="active">Activo</option>
            <option value="very_active">Muy activo</option>
          </select>
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit">Crear cuenta</button>
      </form>
      <p className="muted"><Link to="/">Ya tengo cuenta</Link></p>
    </div>
  );
}
