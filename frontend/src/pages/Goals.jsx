import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { GOAL_OPTIONS } from '../lib/goalOptions.js';

const GOAL_LABELS = Object.fromEntries(GOAL_OPTIONS.map((g) => [g.value, `${g.emoji} ${g.title}`]));

export default function Goals() {
  const [goalType, setGoalType] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [targetWeightKg, setTargetWeightKg] = useState('');
  const [active, setActive] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
      <h1>Meta</h1>
      {active && (
        <div className="card">
          <h3>Meta activa: {GOAL_LABELS[active.goal_type] || active.goal_type}</h3>
          <p>{active.target_calories} kcal · {active.target_protein_g}g prot · {active.target_carbs_g}g carbs · {active.target_fat_g}g grasa</p>
          {active.target_weight_kg && <p className="muted">Peso objetivo: {active.target_weight_kg} kg</p>}
          <button className="danger" onClick={handleDelete}>Eliminar meta</button>
        </div>
      )}

      <h3>{active ? 'Cambiar de objetivo' : '¿Cuál es tu objetivo?'}</h3>
      <p className="muted">Elige con cuidado — cada uno implica un ritmo y una estrategia distinta.</p>
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
              <p><strong>¿Es para ti?</strong> {g.forWho}</p>
              <p><strong>Qué esperar:</strong> {g.expect}</p>
              <p className="goal-motivation">💬 {g.motivation}</p>
            </div>
          )}
        </div>
      ))}

      {goalType && !suggestion && (
        <button disabled={busy} onClick={handleSuggest}>{busy ? 'Calculando...' : 'Calcular mi meta →'}</button>
      )}
      {error && <p className="error">{error}</p>}

      {suggestion && (
        <div className="card">
          <h3>Tu meta con {selectedOption?.title.toLowerCase()}</h3>
          <p className="muted">TDEE estimado: {suggestion.tdee} kcal/día</p>
          <div className="list-item"><span>Calorías</span><strong>{suggestion.calories} kcal</strong></div>
          <div className="list-item"><span>Proteína</span><strong>{suggestion.proteinG} g</strong></div>
          <div className="list-item"><span>Carbohidratos</span><strong>{suggestion.carbsG} g</strong></div>
          <div className="list-item"><span>Grasa</span><strong>{suggestion.fatG} g</strong></div>
          {goalType !== 'maintain' && (
            <>
              <p className="muted" style={{ marginTop: 10 }}>Peso objetivo (opcional) — pa' ver tu progreso real en "Hoy":</p>
              <input type="number" step="0.1" placeholder="peso objetivo kg" value={targetWeightKg} onChange={(e) => setTargetWeightKg(e.target.value)} />
            </>
          )}
          <p className="goal-motivation" style={{ marginTop: 10 }}>💬 {selectedOption?.motivation}</p>
          <button onClick={handleSave}>Usar esta meta</button>
        </div>
      )}

      <p className="muted" style={{ marginTop: 16 }}>
        Necesitas sexo, fecha de nacimiento y altura en tu perfil, además de al menos un registro de peso en "Medidas", para calcular la sugerencia.
      </p>
    </div>
  );
}
