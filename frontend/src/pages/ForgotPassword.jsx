import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

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
        <h1>Contraseña actualizada</h1>
        <div className="card">
          <p className="muted">Tu código de recuperación anterior ya no sirve. Aquí tienes uno nuevo — guárdalo, no se vuelve a mostrar:</p>
          <p style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', letterSpacing: 1, margin: '12px 0' }}>
            {result.newRecoveryCode}
          </p>
        </div>
        <Link to="/"><button>Ir a iniciar sesión →</button></Link>
      </div>
    );
  }

  return (
    <div>
      <h1>Recuperar contraseña</h1>
      <p className="muted">Usa el código de recuperación que guardaste cuando creaste tu cuenta.</p>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="correo" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input placeholder="código de recuperación (XXXX-XXXX-XXXX)" value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value)} required />
        <input type="password" placeholder="nueva contraseña" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
        {error && <p className="error">{error}</p>}
        <button type="submit">Restablecer contraseña</button>
      </form>
      <p className="muted">
        ¿No tienes tu código? No hay forma de recuperarlo sin él — tendrías que crear una cuenta nueva. <Link to="/">Volver</Link>
      </p>
    </div>
  );
}
