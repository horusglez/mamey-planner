import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, NavLink, Link } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import LogFood from './pages/LogFood.jsx';
import Metrics from './pages/Metrics.jsx';
import Goals from './pages/Goals.jsx';
import Assistant from './pages/Assistant.jsx';
import Settings from './pages/Settings.jsx';
import Onboarding from './pages/Onboarding.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import { api, setToken } from './api/client.js';
import { useLang } from './i18n/LangContext.jsx';

export default function App() {
  const [token, setTokenState] = useState(localStorage.getItem('mamey_token'));
  // Whether onboarding is needed lives on the account (has an active goal?),
  // never in localStorage -- that flag used to leak across accounts/devices
  // sharing a browser, skipping onboarding (and weight logging) for brand
  // new accounts that had never set a goal.
  const [onboardStatus, setOnboardStatus] = useState('checking'); // 'checking' | 'needed' | 'done'
  const { t } = useLang();

  useEffect(() => {
    if (!token) return;
    api('/goals/active')
      .then((goal) => setOnboardStatus(goal ? 'done' : 'needed'))
      .catch(() => setOnboardStatus('needed'));
  }, [token]);

  function handleAuth(authToken) {
    setToken(authToken);
    setTokenState(authToken);
    setOnboardStatus('checking');
  }

  function logout() {
    setToken(null);
    setTokenState(null);
  }

  function finishOnboarding() {
    setOnboardStatus('done');
  }

  if (!token) {
    return (
      <div className="app-shell">
        <header className="hero">
          <span className="hero-title">{t('app.title')}</span>
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

  if (onboardStatus === 'checking') {
    return (
      <div className="app-shell">
        <header className="hero">
          <span className="hero-title">{t('app.title')}</span>
        </header>
      </div>
    );
  }

  if (onboardStatus === 'needed') {
    return (
      <div className="app-shell">
        <header className="hero">
          <span className="hero-title">{t('app.title')}</span>
        </header>
        <main>
          <Onboarding onFinish={finishOnboarding} />
          <button className="secondary" onClick={finishOnboarding} style={{ marginTop: 8 }}>
            {t('app.onboarding.skip')}
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <span className="hero-title">{t('app.title')}</span>
        <Link to="/settings" className="settings-link">⚙️</Link>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/log" element={<LogFood />} />
          <Route path="/metrics" element={<Metrics />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/ai" element={<Assistant />} />
          <Route path="/settings" element={<Settings onLogout={logout} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <nav className="tabbar">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>{t('app.nav.today')}</NavLink>
        <NavLink to="/log" className={({ isActive }) => (isActive ? 'active' : '')}>{t('app.nav.log')}</NavLink>
        <NavLink to="/metrics" className={({ isActive }) => (isActive ? 'active' : '')}>{t('app.nav.metrics')}</NavLink>
        <NavLink to="/goals" className={({ isActive }) => (isActive ? 'active' : '')}>{t('app.nav.goals')}</NavLink>
        <NavLink to="/ai" className={({ isActive }) => (isActive ? 'active' : '')}>{t('app.nav.ai')}</NavLink>
      </nav>
    </div>
  );
}
