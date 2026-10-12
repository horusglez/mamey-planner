import { useState } from 'react';
import { Routes, Route, Navigate, NavLink, Link } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import LogFood from './pages/LogFood.jsx';
import Metrics from './pages/Metrics.jsx';
import Goals from './pages/Goals.jsx';
import Settings from './pages/Settings.jsx';
import Onboarding from './pages/Onboarding.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import { setToken } from './api/client.js';

export default function App() {
  const [token, setTokenState] = useState(localStorage.getItem('mamey_token'));
  const [onboarded, setOnboarded] = useState(localStorage.getItem('mamey_onboarded') === 'true');

  function handleAuth(t) {
    setToken(t);
    setTokenState(t);
  }

  function logout() {
    setToken(null);
    setTokenState(null);
  }

  function finishOnboarding() {
    localStorage.setItem('mamey_onboarded', 'true');
    setOnboarded(true);
  }

  if (!token) {
    return (
      <div className="app-shell">
        <header className="hero">
          <span className="hero-title">🥭 Mamey Planner</span>
        </header>
        <main>
          <Routes>
            <Route path="/register" element={<Register onAuth={handleAuth} />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="*" element={<Login onAuth={handleAuth} />} />
          </Routes>
        </main>
      </div>
    );
  }

  if (!onboarded) {
    return (
      <div className="app-shell">
        <header className="hero">
          <span className="hero-title">🥭 Mamey Planner</span>
        </header>
        <main>
          <Onboarding onFinish={finishOnboarding} />
          <button className="secondary" onClick={finishOnboarding} style={{ marginTop: 8 }}>
            Saltar, yo lo configuro después
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <span className="hero-title">🥭 Mamey Planner</span>
        <Link to="/settings" className="settings-link">⚙️</Link>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/log" element={<LogFood />} />
          <Route path="/metrics" element={<Metrics />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/settings" element={<Settings onLogout={logout} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <nav className="tabbar">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>Hoy</NavLink>
        <NavLink to="/log" className={({ isActive }) => (isActive ? 'active' : '')}>Registrar</NavLink>
        <NavLink to="/metrics" className={({ isActive }) => (isActive ? 'active' : '')}>Medidas</NavLink>
        <NavLink to="/goals" className={({ isActive }) => (isActive ? 'active' : '')}>Meta</NavLink>
      </nav>
    </div>
  );
}
