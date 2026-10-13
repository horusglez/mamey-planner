import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { getGoalOptions } from '../lib/goalOptions.js';
import { useLang } from '../i18n/LangContext.jsx';

export default function Goals() {
  const { t } = useLang();
  const GOAL_OPTIONS = getGoalOptions(t);
  const GOAL_LABELS = Object.fromEntries(GOAL_OPTIONS.map((g) => [g.value, `${g.emoji} ${g.title}`]));

  const [goalType, setGoalType] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [targetWeightKg, setTargetWeightKg] = useState('');
  const [active, setActive] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingWeightGoal, setEditingWeightGoal] = useState(false);
  const [weightGoalInput, setWeightGoalInput] = useState('');

  function loadActive() {
    api('/goals/active').then(setActive).catch((e) => setError(e.message));
  }

  useEffect(loadActive, []);

  async function handleSuggest() {
    setError('');
    setSuggestion(null);
    setBusy(true);
    try {
      const data = await api('/goals/suggest', { method: 'POST', body: { goalType } });
      setSuggestion(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!active) return;
    await api(`/goals/${active.id}`, { method: 'DELETE' });
    setActive(null);
  }

  function startEditWeightGoal() {
    setWeightGoalInput(active.target_weight_kg || '');
    setEditingWeightGoal(true);
  }

  async function saveWeightGoal() {
    try {
      const updated = await api(`/goals/${active.id}`, {
        method: 'PATCH',
        body: { targetWeightKg: weightGoalInput ? Number(weightGoalInput) : null },
      });
      setActive(updated);
      setEditingWeightGoal(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSave() {
    if (!suggestion) return;
    try {
      const saved = await api('/goals', {
        method: 'POST',
        body: {
          goalType,
          targetCalories: suggestion.calories,
          targetProteinG: suggestion.proteinG,
          targetCarbsG: suggestion.carbsG,
          targetFatG: suggestion.fatG,
          targetWeightKg: targetWeightKg ? Number(targetWeightKg) : null,
        },
      });
      setActive(saved);
      setSuggestion(null);
      setGoalType(null);
      setTargetWeightKg('');
    } catch (err) {
      setError(err.message);
    }
  }

  const selectedOption = GOAL_OPTIONS.find((g) => g.value === goalType);

  return (
    <div>
      <h1>{t('goals.title')}</h1>
      {active && (
        <div className="card">
          <h3>{t('goals.active', { goal: GOAL_LABELS[active.goal_type] || active.goal_type })}</h3>
          <p>{active.target_calories} kcal · {active.target_protein_g}g {t('goals.proteinAbbr')} · {active.target_carbs_g}g {t('goals.carbsAbbr')} · {active.target_fat_g}g {t('logfood.fatLabel')}</p>
          {!editingWeightGoal ? (
            <p className="muted">
              {t('goals.targetWeight', { weight: active.target_weight_kg ? `${active.target_weight_kg} kg` : t('goals.targetWeightUnset') })}{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); startEditWeightGoal(); }}>{t('goals.edit')}</a>
            </p>
          ) : (
            <div className="row">
              <input type="number" step="0.1" placeholder={t('goals.weightPlaceholder')} value={weightGoalInput} onChange={(e) => setWeightGoalInput(e.target.value)} />
              <button style={{ maxWidth: 100 }} onClick={saveWeightGoal}>{t('goals.save')}</button>
              <button style={{ maxWidth: 100 }} className="secondary" onClick={() => setEditingWeightGoal(false)}>{t('goals.cancel')}</button>
            </div>
          )}
          <button className="danger" onClick={handleDelete}>{t('goals.delete')}</button>
        </div>
      )}

      <h3>{active ? t('goals.changeGoal') : t('goals.whichGoal')}</h3>
      <p className="muted">{t('goals.chooseCarefully')}</p>
      {GOAL_OPTIONS.map((g) => (
        <div
          key={g.value}
          className={`card goal-option ${goalType === g.value ? 'selected' : ''}`}
          onClick={() => { setGoalType(g.value); setSuggestion(null); }}
        >
          <h3>{g.emoji} {g.title}</h3>
          <p className="muted">{g.desc}</p>
          {goalType === g.value && (
            <div className="goal-detail">
              <p><strong>{t('goals.forYou')}</strong> {g.forWho}</p>
              <p><strong>{t('goals.expect')}</strong> {g.expect}</p>
              <p className="goal-motivation">💬 {g.motivation}</p>
            </div>
          )}
        </div>
      ))}

      {goalType && !suggestion && (
        <button disabled={busy} onClick={handleSuggest}>{busy ? t('goals.calculating') : t('goals.calculate')}</button>
      )}
      {error && <p className="error">{error}</p>}

      {suggestion && (
        <div className="card">
          <h3>{t('goals.yourGoalWith', { goal: selectedOption?.title.toLowerCase() })}</h3>
          <p className="muted">{t('goals.tdeeEstimate', { tdee: suggestion.tdee })}</p>
          <div className="list-item"><span>{t('goals.calories')}</span><strong>{suggestion.calories} kcal</strong></div>
          <div className="list-item"><span>{t('goals.protein')}</span><strong>{suggestion.proteinG} g</strong></div>
          <div className="list-item"><span>{t('goals.carbs')}</span><strong>{suggestion.carbsG} g</strong></div>
          <div className="list-item"><span>{t('goals.fat')}</span><strong>{suggestion.fatG} g</strong></div>
          {goalType !== 'maintain' && (
            <>
              <p className="muted" style={{ marginTop: 10 }}>{t('goals.targetWeightOptional')}</p>
              <input type="number" step="0.1" placeholder={t('goals.weightPlaceholder')} value={targetWeightKg} onChange={(e) => setTargetWeightKg(e.target.value)} />
            </>
          )}
          <p className="goal-motivation" style={{ marginTop: 10 }}>💬 {selectedOption?.motivation}</p>
          <button onClick={handleSave}>{t('goals.useGoal')}</button>
        </div>
      )}

      <p className="muted" style={{ marginTop: 16 }}>{t('goals.profileHint')}</p>
    </div>
  );
}
