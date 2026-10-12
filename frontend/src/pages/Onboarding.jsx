import { useState } from 'react';
import { api } from '../api/client.js';

const GOAL_OPTIONS = [
  {
    value: 'cut',
    emoji: '🔥',
    title: 'Bajar grasa',
    desc: 'Comerás un poco menos de lo que quemas al día, pa\' que tu cuerpo use su propia grasa como energía.',
  },
  {
    value: 'bulk',
    emoji: '💪',
    title: 'Ganar músculo',
    desc: 'Comerás un poco más de lo que quemas, con suficiente proteína pa\' que ese extra se use pa\' construir músculo.',
  },
  {
    value: 'recomp',
    emoji: '⚖️',
    title: 'Recomposición',
    desc: 'Comerás casi lo que quemas, pero con proteína alta: bajas grasa y ganas músculo al mismo tiempo, más lento pero sin subir ni bajar mucho de peso.',
  },
  {
    value: 'maintain',
    emoji: '🌿',
    title: 'Mantener',
    desc: 'Comerás justo lo que quemas. Ideal si ya estás en tu punto y solo quieres mantener hábitos consistentes.',
  },
];

export default function Onboarding({ onFinish }) {
  const [step, setStep] = useState(0);
  const [goalType, setGoalType] = useState(null);
  const [weightKg, setWeightKg] = useState('');
  const [suggestion, setSuggestion] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleCalculate() {
    setError('');
    setBusy(true);
    try {
      await api('/metrics', { method: 'POST', body: { weightKg: Number(weightKg) } });
      const data = await api('/goals/suggest', { method: 'POST', body: { goalType } });
      setSuggestion(data);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveGoal() {
    setError('');
    setBusy(true);
    try {
      await api('/goals', {
        method: 'POST',
        body: {
          goalType,
          targetCalories: suggestion.calories,
          targetProteinG: suggestion.proteinG,
          targetCarbsG: suggestion.carbsG,
          targetFatG: suggestion.fatG,
        },
      });
      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="onboard-progress">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={i <= step ? 'dot active' : 'dot'} />
        ))}
      </div>

      {step === 0 && (
        <div>
          <h1>🥭 ¡Bienvenido!</h1>
          <p>Mamey Planner te ayuda a comer mejor y avanzar hacia tu meta física — bajar grasa, ganar músculo, o ambas.</p>
          <p className="muted">Son solo 3 preguntas rápidas y ya tienes tu plan de calorías y macros listo. Vamos.</p>
          <button onClick={() => setStep(1)}>Empezar →</button>
        </div>
      )}

      {step === 1 && (
        <div>
          <h1>¿Cuál es tu objetivo?</h1>
          <p className="muted">Esto decide cuántas calorías y cuánta proteína te vamos a sugerir.</p>
          {GOAL_OPTIONS.map((g) => (
            <div
              key={g.value}
              className={`card goal-option ${goalType === g.value ? 'selected' : ''}`}
              onClick={() => setGoalType(g.value)}
            >
              <h3>{g.emoji} {g.title}</h3>
              <p className="muted">{g.desc}</p>
            </div>
          ))}
          <button disabled={!goalType} onClick={() => setStep(2)}>Continuar →</button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h1>¿Cuál es tu peso actual?</h1>
          <p className="muted">Lo usamos pa' calcular cuánta energía gasta tu cuerpo al día (tu TDEE) y de ahí sacar tu meta de calorías.</p>
          <input
            type="number"
            step="0.1"
            placeholder="peso en kg"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
          />
          {error && <p className="error">{error}</p>}
          <div className="row">
            <button className="secondary" onClick={() => setStep(1)}>← Atrás</button>
            <button disabled={!weightKg || busy} onClick={handleCalculate}>
              {busy ? 'Calculando...' : 'Calcular mi meta →'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && suggestion && (
        <div>
          <h1>Tu meta sugerida</h1>
          <p className="muted">
            Tu cuerpo gasta aprox. <strong>{suggestion.tdee} kcal/día</strong> (TDEE). Con base en tu objetivo, te sugerimos:
          </p>
          <div className="card">
            <div className="list-item"><span>Calorías</span><strong>{suggestion.calories} kcal</strong></div>
            <div className="list-item"><span>Proteína</span><strong>{suggestion.proteinG} g</strong></div>
            <div className="list-item"><span>Carbohidratos</span><strong>{suggestion.carbsG} g</strong></div>
            <div className="list-item"><span>Grasa</span><strong>{suggestion.fatG} g</strong></div>
          </div>
          <p className="muted">
            Proteína alta a propósito: te ayuda a conservar músculo sin importar el objetivo. Podrás ajustar estos números después en la pestaña "Meta".
          </p>
          {error && <p className="error">{error}</p>}
          <div className="row">
            <button className="secondary" onClick={() => setStep(2)}>← Atrás</button>
            <button disabled={busy} onClick={handleSaveGoal}>{busy ? 'Guardando...' : 'Usar esta meta →'}</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <h1>Listo, así se usa</h1>
          <div className="card"><h3>🏠 Hoy</h3><p className="muted">Ve cuántas calorías y macros llevas hoy contra tu meta.</p></div>
          <div className="card"><h3>➕ Registrar</h3><p className="muted">Busca un alimento, pega la URL de una receta, o anota tu comida. Se suma a "Hoy" al momento.</p></div>
          <div className="card"><h3>📏 Medidas</h3><p className="muted">Anota tu peso (y % de grasa o cintura si los mides) cada pocos días pa' ver tu progreso real.</p></div>
          <div className="card"><h3>🎯 Meta</h3><p className="muted">Aquí puedes recalcular o cambiar tu objetivo cuando quieras.</p></div>
          <button onClick={onFinish}>Entendido, vamos →</button>
        </div>
      )}
    </div>
  );
}
