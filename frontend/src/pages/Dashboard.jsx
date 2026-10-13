import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { mascotForStreak } from '../lib/mascot.js';
import { computeWeightProgress } from '../lib/weightProgress.js';
import { useLang } from '../i18n/LangContext.jsx';

const STREAK_MILESTONES = [7, 14, 30, 60, 100];

const PERIOD_KEYS = {
  week: 'dashboard.period.week',
  biweek: 'dashboard.period.biweek',
  month: 'dashboard.period.month',
  bimonth: 'dashboard.period.bimonth',
  quarter: 'dashboard.period.quarter',
  semester: 'dashboard.period.semester',
  year: 'dashboard.period.year',
};

function Bar({ value, target, color }) {
  const pct = target ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div className="macro-bar">
      <div style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function streakMessage(t, streak, loggedToday) {
  if (streak === 0) return t('dashboard.streak.start');
  if (!loggedToday) return t('dashboard.streak.keepGoing', { streak, plural: streak === 1 ? '' : 's' });
  if (streak < 3) return t('dashboard.streak.early');
  if (streak < 7) return t('dashboard.streak.habit');
  return t('dashboard.streak.unstoppable');
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatLabel(t, dateStr) {
  if (dateStr === todayStr()) return t('dashboard.today');
  if (dateStr === shiftDate(todayStr(), -1)) return t('dashboard.yesterday');
  return dateStr;
}

// Suggests a common food to close the gap on whichever macro is furthest
// behind, instead of just showing a cold number.
function contextualTip(t, totals, goal) {
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
  const label = t(`dashboard.food.${macro}`);
  const hintKeys = [`dashboard.food.${macro}1`, `dashboard.food.${macro}2`, `dashboard.food.${macro}3`];
  const hint = t(hintKeys[Math.floor(Math.random() * hintKeys.length)]);
  return t('dashboard.tip', { gap: Math.round(gap), label, hint });
}

export default function Dashboard() {
  const { t } = useLang();
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
        setCelebration(t('dashboard.celebration.streak', { streak: streak.streak }));
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
        setCelebration(t('dashboard.celebration.weightGoal', { weight: summary.goal.target_weight_kg }));
      }
    }
  }, [summary, weightHistory]);

  if (error) return <p className="error">{error}</p>;
  if (!summary) return <p>{t('dashboard.loading')}</p>;

  const { totals, goal } = summary;
  const isToday = date === todayStr();
  const isAtMinDate = minDate != null && date <= minDate;
  const tip = isToday ? contextualTip(t, totals, goal) : null;
  const weightProgress = goal?.target_weight_kg ? computeWeightProgress(weightHistory, goal.target_weight_kg) : null;
  const mascot = streak ? mascotForStreak(streak.streak, t) : null;

  return (
    <div>
      {celebration && (
        <div className="card celebration-card" onClick={() => setCelebration(null)}>
          <p>{celebration}</p>
          <span className="muted">{t('dashboard.celebration.close')}</span>
        </div>
      )}

      <div className="date-nav">
        <button className="icon-btn" disabled={isAtMinDate} onClick={() => setDate(shiftDate(date, -1))} aria-label={t('dashboard.prevDay')}>‹</button>
        <h1>{formatLabel(t, date)}</h1>
        <button className="icon-btn" disabled={isToday} onClick={() => setDate(shiftDate(date, 1))} aria-label={t('dashboard.nextDay')}>›</button>
      </div>

      {isToday && streak && (
        <div className="card streak-card">
          <img src={mascot.img} alt="" className="streak-mascot" />
          <div>
            <h3>{mascot.title}</h3>
            <p className="muted">{t('dashboard.streakDays', { streak: streak.streak, plural: streak.streak === 1 ? '' : 's', message: streakMessage(t, streak.streak, streak.loggedToday) })}</p>
          </div>
        </div>
      )}

      {!goal && (
        <div className="card">
          <p>{t('dashboard.noGoal')}</p>
          <Link to="/goals" className="btn-link">{t('dashboard.configureGoal')}</Link>
        </div>
      )}

      {weightProgress?.targetWeightKg && !weightProgress.reached && (
        <div className="card">
          <h3>{t('dashboard.weightProgress.title')}</h3>
          <p className="muted">
            {t('dashboard.weightProgress.summary', {
              current: weightProgress.currentWeight,
              target: weightProgress.targetWeightKg,
              diff: Math.abs(weightProgress.targetWeightKg - weightProgress.currentWeight).toFixed(1),
            })}
          </p>
          {weightProgress.weeklyRate != null ? (
            weightProgress.movingRightDirection ? (
              <p className="muted">
                {t('dashboard.weightProgress.onTrack', {
                  rate: Math.abs(weightProgress.weeklyRate).toFixed(2),
                  weeks: Math.ceil(weightProgress.weeksRemaining),
                  plural: Math.ceil(weightProgress.weeksRemaining) === 1 ? '' : 's',
                })}
              </p>
            ) : (
              <p className="muted">{t('dashboard.weightProgress.wrongDirection')}</p>
            )
          ) : (
            <p className="muted">{t('dashboard.weightProgress.needMore')}</p>
          )}
        </div>
      )}

      <div className="card">
        <h3>{t('dashboard.calories')}</h3>
        <p>{Math.round(totals.calories)} {goal ? `/ ${goal.target_calories} kcal` : 'kcal'}</p>
        {goal && <Bar value={totals.calories} target={goal.target_calories} color="#2f7d44" />}
      </div>
      <div className="card">
        <h3>{t('dashboard.protein')}</h3>
        <p>{Math.round(totals.protein_g)} {goal ? `/ ${goal.target_protein_g} g` : 'g'}</p>
        {goal && <Bar value={totals.protein_g} target={goal.target_protein_g} color="#c1440e" />}
      </div>
      <div className="card">
        <h3>{t('dashboard.carbs')}</h3>
        <p>{Math.round(totals.carbs_g)} {goal ? `/ ${goal.target_carbs_g} g` : 'g'}</p>
        {goal && <Bar value={totals.carbs_g} target={goal.target_carbs_g} color="#d4a017" />}
      </div>
      <div className="card">
        <h3>{t('dashboard.fat')}</h3>
        <p>{Math.round(totals.fat_g)} {goal ? `/ ${goal.target_fat_g} g` : 'g'}</p>
        {goal && <Bar value={totals.fat_g} target={goal.target_fat_g} color="#3a6ea5" />}
      </div>

      {tip && <p className="tip-card">💡 {tip}</p>}

      <div className="card">
        <div className="row" style={{ alignItems: 'center', marginBottom: 4 }}>
          <h3 style={{ margin: 0 }}>{t('dashboard.summary')}</h3>
          <select
            value={periodRange}
            onChange={(e) => setPeriodRange(e.target.value)}
            style={{ margin: 0, width: 'auto', flex: 'none', padding: '6px 10px', fontSize: 13 }}
          >
            {Object.entries(PERIOD_KEYS).map(([value, key]) => <option key={value} value={value}>{t(key)}</option>)}
          </select>
        </div>
        {period && period.loggedDaysCount > 0 ? (
          <>
            <p className="muted">
              {t('dashboard.avgPerLoggedDay', {
                cal: period.average.calories,
                prot: period.average.protein_g,
                carbs: period.average.carbs_g,
                fat: period.average.fat_g,
              })}
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
          <p className="muted">{t('dashboard.noRecordsYet')}</p>
        )}
      </div>
    </div>
  );
}
