import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function Goals() {
  const [goalType, setGoalType] = useState('recomp');
  const [suggestion, setSuggestion] = useState(null);
  const [active, setActive] = useState(null);
  const [error, setError] = useState('');

  function loadActive() {
    api('/goals/active').then(setActive).catch((e) => setError(e.message));
  }

  useEffect(loadActive, []);

  async function handleSuggest() {
    setError('');
    setSuggestion(null);
    try {
      const data = await api('/goals/suggest', { method: 'POST', body: { goalType } });
      setSuggestion(data);
    } catch (err) {
      setError(err.message);
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
        },
      });
      setActive(saved);
      setSuggestion(null);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>Meta</h1>
      {active && (
        <div className="card">
          <h3>Meta activa: {active.goal_type}</h3>
          <p>{active.target_calories} kcal · {active.target_protein_g}g prot · {active.target_carbs_g}g carbs · {active.target_fat_g}g grasa</p>
          <button className="danger" onClick={handleDelete}>Eliminar meta</button>
        </div>
      )}

      <div className="card">
        <h3>Calcular nueva meta</h3>
        <select value={goalType} onChange={(e) => setGoalType(e.target.value)}>
          <option value="cut">Bajar grasa (cut)</option>
          <option value="bulk">Ganar músculo (bulk)</option>
          <option value="recomp">Recomposición</option>
          <option value="maintain">Mantener</option>
        </select>
        <button onClick={handleSuggest}>Calcular sugerencia</button>
        {error && <p className="error">{error}</p>}

        {suggestion && (
          <div>
            <p>TDEE estimado: {suggestion.tdee} kcal</p>
            <p>Meta: {suggestion.calories} kcal · {suggestion.proteinG}g prot · {suggestion.carbsG}g carbs · {suggestion.fatG}g grasa</p>
            <button onClick={handleSave}>Usar esta meta</button>
          </div>
        )}
      </div>
      <p className="muted">
        Necesitas sexo, fecha de nacimiento y altura en tu perfil, además de al menos un registro de peso en "Medidas", para calcular la sugerencia.
      </p>
    </div>
  );
}
