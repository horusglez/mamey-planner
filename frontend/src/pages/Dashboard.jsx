import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { mascotForStreak } from '../lib/mascot.js';
import { computeWeightProgress } from '../lib/weightProgress.js';

const STREAK_MILESTONES = [7, 14, 30, 60, 100];

const PERIOD_OPTIONS = [
  { value: 'week', label: 'Semanal' },
  { value: 'biweek', label: 'Bisemanal' },
  { value: 'month', label: 'Mensual' },
  { value: 'bimonth', label: 'Bimestral' },
  { value: 'quarter', label: 'Trimestral' },
  { value: 'semester', label: 'Semestral' },
  { value: 'year', label: 'Anual' },
];

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

// Suggests a common food to close the gap on whichever macro is furthest
// behind, instead of just showing a cold number.
const FOOD_HINTS = {
  protein: ['un yogurt griego', '100g de pollo', '3 huevos'],
  carbs: ['una taza de arroz', 'un plátano', 'una papa mediana'],
  fat: ['un puñado de nueces', 'medio aguacate', 'una cucharada de aceite de oliva'],
};

function contextualTip(totals, goal) {
  if (!goal) return null;
  const gaps = {
    protein: goal.target_protein_g - totals.protein_g,
    carbs: goal.target_carbs_g - totals.carbs_g,
    fat: goal.target_fat_g - totals.fat_g,
  };
  const biggest = Object.entries(gaps).sort((a, b) => b[1] - a[1])[0];
  const [macro, gap] = biggest;
  const thresholds = { protein: 20, carbs: 30, fat: 12 };
  if (gap < thresholds[macro]) return null;
  const label = { protein: 'proteína', carbs: 'carbohidratos', fat: 'grasa' }[macro];
  const hint = FOOD_HINTS[macro][Math.floor(Math.random() * FOOD_HINTS[macro].length)];
  return `Te faltan ${Math.round(gap)}g de ${label} — ${hint} te acerca bastante.`;
}

export default function Dashboard() {
  const [date, setDate] = useState(todayStr());
  const [summary, setSummary] = useState(null);
  const [streak, setStreak] = useState(null);
  const [periodRange, setPeriodRange] = useState(() => localStorage.getItem('mamey_period_range') || 'week');
  const [period, setPeriod] = useState(null);
  const [weightHistory, setWeightHistory] = useState([]);
  const [minDate, setMinDate] = useState(null);
  const [celebration, setCelebration] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setSummary(null);
    api(`/dashboard/summary?date=${date}`).then(setSummary).catch((e) => setError(e.message));
  }, [date]);

  useEffect(() => {
    api('/dashboard/streak').then(setStreak).catch(() => {});
    api('/metrics').then(setWeightHistory).catch(() => {});
    api('/auth/me').then((u) => setMinDate(u.created_at.slice(0, 10))).catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem('mamey_period_range', periodRange);
    api(`/dashboard/period?range=${periodRange}`).then(setPeriod).catch(() => {});
  }, [periodRange]);

  // Fires once per milestone, ever -- tracked in localStorage so it doesn't nag.
  useEffect(() => {
    if (!streak) return;
    if (STREAK_MILESTONES.includes(streak.streak)) {
      const key = `mamey_celebrated_streak_${streak.streak}`;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, 'true');
        setCelebration(`🎉 ¡${streak.streak} días de racha! Eso ya no es suerte, es hábito.`);
      }
    }
  }, [streak]);

  useEffect(() => {
    if (!summary?.goal?.target_weight_kg || weightHistory.length === 0) return;
    const progress = computeWeightProgress(weightHistory, summary.goal.target_weight_kg);
    if (progress?.reached) {
      const key = `mamey_celebrated_weightgoal_${summary.goal.id}`;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, 'true');
        setCelebration(`🏆 ¡Llegaste a tu peso objetivo (${summary.goal.target_weight_kg}kg)! Ahora toca sostenerlo.`);
      }
    }
  }, [summary, weightHistory]);

  if (error) return <p className="error">{error}</p>;
  if (!summary) return <p>Cargando...</p>;

  const { totals, goal } = summary;
  const isToday = date === todayStr();
  const isAtMinDate = minDate != null && date <= minDate;
  const tip = isToday ? contextualTip(totals, goal) : null;
  const weightProgress = goal?.target_weight_kg ? computeWeightProgress(weightHistory, goal.target_weight_kg) : null;

  return (
    <div>
      {celebration && (
        <div className="card celebration-card" onClick={() => setCelebration(null)}>
          <p>{celebration}</p>
          <span className="muted">Toca pa' cerrar</span>
        </div>
      )}

      <div className="date-nav">
        <button className="icon-btn" disabled={isAtMinDate} onClick={() => setDate(shiftDate(date, -1))} aria-label="Día anterior">‹</button>
        <h1>{formatLabel(date)}</h1>
        <button className="icon-btn" disabled={isToday} onClick={() => setDate(shiftDate(date, 1))} aria-label="Día siguiente">›</button>
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

      {weightProgress?.targetWeightKg && !weightProgress.reached && (
        <div className="card">
          <h3>Progreso de peso</h3>
          <p className="muted">
            {weightProgress.currentWeight}kg actual → {weightProgress.targetWeightKg}kg objetivo
            {' '}({Math.abs(weightProgress.targetWeightKg - weightProgress.currentWeight).toFixed(1)}kg por recorrer)
          </p>
          {weightProgress.weeklyRate != null ? (
            weightProgress.movingRightDirection ? (
              <p className="muted">
                A tu ritmo actual (~{Math.abs(weightProgress.weeklyRate).toFixed(2)}kg/semana), llegas en
                {' '}~{Math.ceil(weightProgress.weeksRemaining)} semana{Math.ceil(weightProgress.weeksRemaining) === 1 ? '' : 's'}.
              </p>
            ) : (
              <p className="muted">Tu tendencia reciente va en sentido contrario a tu meta — revisa tu consistencia.</p>
            )
          ) : (
            <p className="muted">Registra más pesos pa' ver tu ritmo real.</p>
          )}
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

      {tip && <p className="tip-card">💡 {tip}</p>}

      <div className="card">
        <div className="row" style={{ alignItems: 'center', marginBottom: 4 }}>
          <h3 style={{ margin: 0 }}>Resumen</h3>
          <select
            value={periodRange}
            onChange={(e) => setPeriodRange(e.target.value)}
            style={{ margin: 0, width: 'auto', flex: 'none', padding: '6px 10px', fontSize: 13 }}
          >
            {PERIOD_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        {period && period.loggedDaysCount > 0 ? (
          <>
            <p className="muted">
              Promedio por día registrado: {period.average.calories} kcal · {period.average.protein_g}g prot ·{' '}
              {period.average.carbs_g}g carbs · {period.average.fat_g}g grasa
            </p>
            <div className={`week-bars ${period.buckets.length > 9 ? 'many' : ''}`}>
              {period.buckets.map((b) => {
                const maxCal = Math.max(...period.buckets.map((x) => x.avgCalories), goal?.target_calories || 1);
                const h = maxCal ? Math.max(4, Math.round((b.avgCalories / maxCal) * 60)) : 4;
                return (
                  <div key={b.endDate} className="week-bar-col">
                    <div className="week-bar" style={{ height: h, background: b.avgCalories > 0 ? '#2f7d44' : '#f0ddcc' }} />
                    <span className="muted">{b.endDate.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="muted">Sin registros en este periodo todavía.</p>
        )}
      </div>
    </div>
  );
}
