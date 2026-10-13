import { useState } from 'react';
import { api } from '../api/client.js';
import { getMascotLevels } from '../lib/mascot.js';
import { getGoalOptions } from '../lib/goalOptions.js';
import { useLang } from '../i18n/LangContext.jsx';

export default function Onboarding({ onFinish }) {
  const [step, setStep] = useState(0);
  const [goalType, setGoalType] = useState(null);
  const [weightKg, setWeightKg] = useState('');
  const [targetWeightKg, setTargetWeightKg] = useState('');
  const [suggestion, setSuggestion] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { t } = useLang();
  const GOAL_OPTIONS = getGoalOptions(t);
  const MASCOT_LEVELS = getMascotLevels(t);

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
          targetWeightKg: targetWeightKg ? Number(targetWeightKg) : null,
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
          <img src={MASCOT_LEVELS[0].img} alt="Mamey" style={{ width: 120, height: 120, borderRadius: 20, display: 'block', margin: '0 auto 16px' }} />
          <h1 style={{ justifyContent: 'center' }}>{t('onboarding.welcome.title')}</h1>
          <p>{t('onboarding.welcome.p1')}</p>
          <p className="muted">{t('onboarding.welcome.p2')}</p>
          <button onClick={() => setStep(1)}>{t('onboarding.welcome.start')}</button>
        </div>
      )}

      {step === 1 && (
        <div>
          <h1>{t('onboarding.goal.title')}</h1>
          <p className="muted">{t('onboarding.goal.lede')}</p>
          {GOAL_OPTIONS.map((g) => (
            <div
              key={g.value}
              className={`card goal-option ${goalType === g.value ? 'selected' : ''}`}
              onClick={() => setGoalType(g.value)}
            >
              <h3>{g.emoji} {g.title}</h3>
              <p className="muted">{g.desc}</p>
              {goalType === g.value && (
                <div className="goal-detail">
                  <p><strong>{t('onboarding.goal.forYou')}</strong> {g.forWho}</p>
                  <p><strong>{t('onboarding.goal.expect')}</strong> {g.expect}</p>
                  <p className="goal-motivation">💬 {g.motivation}</p>
                </div>
              )}
            </div>
          ))}
          <button disabled={!goalType} onClick={() => setStep(2)}>{t('onboarding.goal.continue')}</button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h1>{t('onboarding.weight.title')}</h1>
          <p className="muted">{t('onboarding.weight.lede')}</p>
          <input
            type="number"
            step="0.1"
            placeholder={t('onboarding.weight.placeholder')}
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
          />
          {error && <p className="error">{error}</p>}
          <div className="row">
            <button className="secondary" onClick={() => setStep(1)}>{t('onboarding.back')}</button>
            <button disabled={!weightKg || busy} onClick={handleCalculate}>
              {busy ? t('onboarding.calculating') : t('onboarding.calculate')}
            </button>
          </div>
        </div>
      )}

      {step === 3 && suggestion && (
        <div>
          <h1>{t('onboarding.suggestion.title')}</h1>
          <p className="muted">
            {t('onboarding.suggestion.lede', { tdee: suggestion.tdee })}
          </p>
          <div className="card">
            <div className="list-item"><span>{t('onboarding.calories')}</span><strong>{suggestion.calories} kcal</strong></div>
            <div className="list-item"><span>{t('onboarding.protein')}</span><strong>{suggestion.proteinG} g</strong></div>
            <div className="list-item"><span>{t('onboarding.carbs')}</span><strong>{suggestion.carbsG} g</strong></div>
            <div className="list-item"><span>{t('onboarding.fat')}</span><strong>{suggestion.fatG} g</strong></div>
          </div>
          <p className="muted">{t('onboarding.suggestion.proteinNote')}</p>
          {goalType !== 'maintain' && (
            <>
              <p className="muted">{t('onboarding.targetWeight.lede')}</p>
              <input type="number" step="0.1" placeholder={t('onboarding.targetWeight.placeholder')} value={targetWeightKg} onChange={(e) => setTargetWeightKg(e.target.value)} />
            </>
          )}
          <p className="goal-motivation">💬 {GOAL_OPTIONS.find((g) => g.value === goalType)?.motivation}</p>
          {error && <p className="error">{error}</p>}
          <div className="row">
            <button className="secondary" onClick={() => setStep(2)}>{t('onboarding.back')}</button>
            <button disabled={busy} onClick={handleSaveGoal}>{busy ? t('onboarding.saving') : t('onboarding.useGoal')}</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <h1>{t('onboarding.tour.title')}</h1>
          <div className="card"><h3>{t('onboarding.tour.today.title')}</h3><p className="muted">{t('onboarding.tour.today.body')}</p></div>
          <div className="card"><h3>{t('onboarding.tour.log.title')}</h3><p className="muted">{t('onboarding.tour.log.body')}</p></div>
          <div className="card"><h3>{t('onboarding.tour.metrics.title')}</h3><p className="muted">{t('onboarding.tour.metrics.body')}</p></div>
          <div className="card"><h3>{t('onboarding.tour.goals.title')}</h3><p className="muted">{t('onboarding.tour.goals.body')}</p></div>

          <div className="card">
            <h3>{t('onboarding.tour.mascot.title')}</h3>
            <p className="muted">{t('onboarding.tour.mascot.body')}</p>
            <div className="row" style={{ marginTop: 10 }}>
              {MASCOT_LEVELS.map((l) => (
                <img key={l.level} src={l.img} alt={l.title} style={{ width: '100%', height: 52, objectFit: 'cover', borderRadius: 8 }} />
              ))}
            </div>
          </div>

          <button onClick={onFinish}>{t('onboarding.tour.finish')}</button>
        </div>
      )}
    </div>
  );
}
