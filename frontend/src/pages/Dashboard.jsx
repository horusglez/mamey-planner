import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { mascotForStreak } from '../lib/mascot.js';

function Bar({ value, target, color }) {
  const pct = target ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div className="macro-bar">
      <div style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function streakMessage(streak, loggedToday) {
  if (streak === 0) return 'Registra hoy y empieza tu racha.';
  if (!loggedToday) return `Llevas ${streak} día${streak === 1 ? '' : 's'}... ¡registra hoy pa\' no perderla!`;
  if (streak < 3) return '¡Vas arrancando, sigue así!';
  if (streak < 7) return 'Ya es hábito, no lo sueltes.';
  return '¡Imparable!';
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatLabel(dateStr) {
  if (dateStr === todayStr()) return 'Hoy';
  if (dateStr === shiftDate(todayStr(), -1)) return 'Ayer';
  return dateStr;
}

export default function Dashboard() {
  const [date, setDate] = useState(todayStr());
  const [summary, setSummary] = useState(null);
  const [streak, setStreak] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setSummary(null);
    api(`/dashboard/summary?date=${date}`).then(setSummary).catch((e) => setError(e.message));
  }, [date]);

  useEffect(() => {
    api('/dashboard/streak').then(setStreak).catch(() => {});
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!summary) return <p>Cargando...</p>;

  const { totals, goal } = summary;
  const isToday = date === todayStr();

  return (
    <div>
      <div className="row" style={{ alignItems: 'center' }}>
        <button className="icon-btn" style={{ maxWidth: 44 }} onClick={() => setDate(shiftDate(date, -1))}>←</button>
        <h1 style={{ flex: 2, justifyContent: 'center', margin: 0 }}>{formatLabel(date)}</h1>
        <button className="icon-btn" style={{ maxWidth: 44 }} disabled={isToday} onClick={() => setDate(shiftDate(date, 1))}>→</button>
      </div>

      {isToday && streak && (
        <div className="card streak-card">
          <img src={mascotForStreak(streak.streak).img} alt="" className="streak-mascot" />
          <div>
            <h3>{mascotForStreak(streak.streak).title}</h3>
            <p className="muted">{streak.streak} día{streak.streak === 1 ? '' : 's'} de racha — {streakMessage(streak.streak, streak.loggedToday)}</p>
          </div>
        </div>
      )}
      {!goal && (
        <div className="card">
          <p>Aún no tienes una meta activa.</p>
          <Link to="/goals">Configura tu meta →</Link>
        </div>
      )}
      <div className="card">
        <h3>Calorías</h3>
        <p>{Math.round(totals.calories)} {goal ? `/ ${goal.target_calories} kcal` : 'kcal'}</p>
        {goal && <Bar value={totals.calories} target={goal.target_calories} color="#2f7d44" />}
      </div>
      <div className="card">
        <h3>Proteína</h3>
        <p>{Math.round(totals.protein_g)} {goal ? `/ ${goal.target_protein_g} g` : 'g'}</p>
        {goal && <Bar value={totals.protein_g} target={goal.target_protein_g} color="#c1440e" />}
      </div>
      <div className="card">
        <h3>Carbohidratos</h3>
        <p>{Math.round(totals.carbs_g)} {goal ? `/ ${goal.target_carbs_g} g` : 'g'}</p>
        {goal && <Bar value={totals.carbs_g} target={goal.target_carbs_g} color="#d4a017" />}
      </div>
      <div className="card">
        <h3>Grasa</h3>
        <p>{Math.round(totals.fat_g)} {goal ? `/ ${goal.target_fat_g} g` : 'g'}</p>
        {goal && <Bar value={totals.fat_g} target={goal.target_fat_g} color="#3a6ea5" />}
      </div>
    </div>
  );
}
