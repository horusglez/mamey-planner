import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useLang } from '../i18n/LangContext.jsx';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function WeightChart({ history, t }) {
  const points = history
    .filter((m) => m.weight_kg != null)
    .map((m) => ({ date: m.recorded_at.slice(0, 10), weight: Number(m.weight_kg) }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  if (points.length < 2) return <p className="muted">{t('metrics.chartHint')}</p>;

  const weights = points.map((p) => p.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;
  const W = 300;
  const H = 90;
  const pad = 8;

  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (W - pad * 2);
    const y = H - pad - ((p.weight - min) / range) * (H - pad * 2);
    return [x, y];
  });

  const path = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 90 }}>
        <polyline points={coords.map((c) => c.join(',')).join(' ')} fill="none" stroke="#ffd7b0" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
        <path d={path} fill="none" stroke="#e8502f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="#e8502f" />)}
      </svg>
      <div className="row muted" style={{ fontSize: 12, justifyContent: 'space-between' }}>
        <span>{points[0].date}</span>
        <span>{min.toFixed(1)}–{max.toFixed(1)} kg</span>
        <span>{points[points.length - 1].date}</span>
      </div>
    </div>
  );
}

export default function Metrics() {
  const { t } = useLang();
  const [recordedAt, setRecordedAt] = useState(todayStr());
  const [weightKg, setWeightKg] = useState('');
  const [bodyFatPct, setBodyFatPct] = useState('');
  const [waistCm, setWaistCm] = useState('');
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const isEditing = recordedAt !== todayStr() || history.some((m) => m.recorded_at.slice(0, 10) === recordedAt && (m.weight_kg || m.body_fat_pct || m.waist_cm));

  function load() {
    api('/metrics').then(setHistory).catch((e) => setError(e.message));
  }

  useEffect(load, []);

  function resetForm() {
    setRecordedAt(todayStr());
    setWeightKg('');
    setBodyFatPct('');
    setWaistCm('');
  }

  function editRow(m) {
    setRecordedAt(m.recorded_at.slice(0, 10));
    setWeightKg(m.weight_kg ?? '');
    setBodyFatPct(m.body_fat_pct ?? '');
    setWaistCm(m.waist_cm ?? '');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api('/metrics', {
        method: 'POST',
        body: {
          recordedAt,
          weightKg: weightKg ? Number(weightKg) : null,
          bodyFatPct: bodyFatPct ? Number(bodyFatPct) : null,
          waistCm: waistCm ? Number(waistCm) : null,
        },
      });
      resetForm();
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeRow(id) {
    await api(`/metrics/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <h1>{t('metrics.title')}</h1>

      <div className="card">
        <WeightChart history={history} t={t} />
      </div>

      <form onSubmit={handleSubmit}>
        <input type="date" max={todayStr()} value={recordedAt} onChange={(e) => setRecordedAt(e.target.value)} />
        <input type="number" step="0.1" placeholder={t('metrics.weight')} value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
        <input type="number" step="0.1" placeholder={t('metrics.bodyFatOptional')} value={bodyFatPct} onChange={(e) => setBodyFatPct(e.target.value)} />
        <input type="number" step="0.1" placeholder={t('metrics.waistOptional')} value={waistCm} onChange={(e) => setWaistCm(e.target.value)} />
        {error && <p className="error">{error}</p>}
        <div className="row">
          {isEditing && <button type="button" className="secondary" onClick={resetForm}>{t('metrics.cancelEdit')}</button>}
          <button type="submit">{isEditing ? t('metrics.update') : t('metrics.saveToday')}</button>
        </div>
      </form>

      <h3>{t('metrics.history')}</h3>
      {history.map((m) => (
        <div key={m.id} className="list-item">
          <span style={{ cursor: 'pointer' }} onClick={() => editRow(m)}>
            {m.recorded_at.slice(0, 10)} — {m.weight_kg ? `${m.weight_kg} kg` : '—'} {m.body_fat_pct ? `· ${m.body_fat_pct}%` : ''}
          </span>
          <a href="#" onClick={(e) => { e.preventDefault(); removeRow(m.id); }}>✕</a>
        </div>
      ))}
    </div>
  );
}
