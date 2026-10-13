import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

const MEAL_LABELS = { breakfast: 'Desayuno', lunch: 'Comida', dinner: 'Cena', snack: 'Snack' };
const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function Assistant() {
  const [aiConfig, setAiConfig] = useState(null);
  const [tab, setTab] = useState('plan');

  // meal plan
  const [mealsPerDay, setMealsPerDay] = useState(4);
  const [restrictions, setRestrictions] = useState('');
  const [dislikes, setDislikes] = useState('');
  const [planItems, setPlanItems] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [planError, setPlanError] = useState('');
  const [planMessage, setPlanMessage] = useState('');

  // chat -- persisted so switching tabs or reloading doesn't wipe the conversation
  const [chatHistory, setChatHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mamey_ai_chat_history') || '[]');
    } catch {
      return [];
    }
  });
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => { api('/settings/ai').then(setAiConfig).catch(() => {}); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);
  useEffect(() => {
    localStorage.setItem('mamey_ai_chat_history', JSON.stringify(chatHistory));
  }, [chatHistory]);

  function clearChat() {
    setChatHistory([]);
    setChatError('');
  }

  async function generatePlan() {
    setPlanError('');
    setPlanMessage('');
    setGenerating(true);
    try {
      const foods = await api('/ai/meal-plan', {
        method: 'POST',
        body: { mealsPerDay, restrictions: restrictions || undefined, dislikes: dislikes || undefined },
      });
      setPlanItems(foods.map((f) => ({ ...f, grams: Math.round(f.estimated_grams), checked: true })));
    } catch (err) {
      setPlanError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  function updatePlanItem(id, patch) {
    setPlanItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function addPlanToToday() {
    setPlanError('');
    const toAdd = planItems.filter((i) => i.checked);
    try {
      for (const item of toAdd) {
        await api('/logs', { method: 'POST', body: { foodId: item.id, mealType: item.meal_type, quantityG: Number(item.grams) } });
      }
      setPlanMessage(`${toAdd.length} alimento(s) agregado(s) a tu día.`);
      setPlanItems([]);
    } catch (err) {
      setPlanError(err.message);
    }
  }

  async function sendChat(e) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatError('');
    const userMsg = { role: 'user', content: chatInput.trim() };
    const nextHistory = [...chatHistory, userMsg];
    setChatHistory(nextHistory);
    setChatInput('');
    setChatBusy(true);
    try {
      const { reply } = await api('/ai/chat', { method: 'POST', body: { message: userMsg.content, history: chatHistory } });
      setChatHistory([...nextHistory, { role: 'assistant', content: reply }]);
    } catch (err) {
      setChatError(err.message);
      setChatHistory(nextHistory); // keep the user message even if the reply failed
    } finally {
      setChatBusy(false);
    }
  }

  if (!aiConfig?.configured) {
    return (
      <div>
        <h1>Asistente IA</h1>
        <div className="card">
          <p className="muted">
            Esto usa la IA que configures en Ajustes — te genera planes de comida según tu meta y responde dudas de nutrición. Aún no has configurado un proveedor.
          </p>
          <Link to="/settings"><button>Configurar en Ajustes →</button></Link>
        </div>
      </div>
    );
  }

  const groupedPlan = MEAL_ORDER.map((mt) => ({ mealType: mt, items: planItems.filter((i) => i.meal_type === mt) })).filter(
    (g) => g.items.length > 0
  );

  return (
    <div>
      <h1>Asistente IA</h1>

      <div className="row" style={{ marginBottom: 14 }}>
        <button className={tab === 'plan' ? '' : 'secondary'} onClick={() => setTab('plan')}>Plan de comidas</button>
        <button className={tab === 'chat' ? '' : 'secondary'} onClick={() => setTab('chat')}>Chat nutricional</button>
      </div>

      {tab === 'plan' && (
        <div>
          <div className="card">
            <h3>Genera tu plan de hoy</h3>
            <p className="muted">Basado en tu meta activa. Ajusta si quieres.</p>
            <select value={mealsPerDay} onChange={(e) => setMealsPerDay(Number(e.target.value))}>
              <option value={3}>3 comidas al día</option>
              <option value={4}>4 comidas al día</option>
              <option value={5}>5 comidas al día</option>
            </select>
            <input placeholder="restricciones (opcional, ej. vegetariano, sin lactosa)" value={restrictions} onChange={(e) => setRestrictions(e.target.value)} />
            <input placeholder="no te gusta (opcional, ej. brócoli, pescado)" value={dislikes} onChange={(e) => setDislikes(e.target.value)} />
            {planError && <p className="error">{planError}</p>}
            {planMessage && <p className="muted">{planMessage}</p>}
            <button disabled={generating} onClick={generatePlan}>{generating ? 'Generando...' : 'Generar plan →'}</button>
          </div>

          {groupedPlan.map((group) => (
            <div key={group.mealType} className="card">
              <h3>{MEAL_LABELS[group.mealType]}</h3>
              {group.items.map((item) => (
                <div key={item.id} className="list-item">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <input
                      type="checkbox"
                      style={{ width: 'auto', margin: 0 }}
                      checked={item.checked}
                      onChange={(e) => updatePlanItem(item.id, { checked: e.target.checked })}
                    />
                    {item.name}
                  </label>
                  <input
                    type="number"
                    style={{ width: 70, margin: 0 }}
                    value={item.grams}
                    onChange={(e) => updatePlanItem(item.id, { grams: e.target.value })}
                  />
                  <span className="muted">g</span>
                </div>
              ))}
            </div>
          ))}

          {planItems.length > 0 && (
            <div className="row">
              <button onClick={addPlanToToday}>Agregar seleccionados a "Hoy"</button>
              <button className="secondary" disabled={generating} onClick={generatePlan}>
                {generating ? 'Generando...' : 'Regenerar'}
              </button>
              <button className="secondary" onClick={() => setPlanItems([])}>Descartar</button>
            </div>
          )}
        </div>
      )}

      {tab === 'chat' && (
        <div>
          <div className="row" style={{ alignItems: 'center' }}>
            <p className="muted" style={{ marginBottom: 10, flex: 1 }}>
              💬 No reemplaza a un nutriólogo certificado — para temas médicos, consulta a un profesional real.
            </p>
            {chatHistory.length > 0 && (
              <button className="secondary" style={{ maxWidth: 110, marginBottom: 10 }} onClick={clearChat}>
                Limpiar chat
              </button>
            )}
          </div>
          <div className="chat-window">
            {chatHistory.length === 0 && (
              <p className="muted">Pregúntale algo, por ejemplo: "¿qué como si se me antoja algo dulce?" o "dame una receta con pollo y arroz".</p>
            )}
            {chatHistory.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.role}`}>{m.content}</div>
            ))}
            {chatBusy && <div className="chat-bubble assistant muted">Escribiendo...</div>}
            <div ref={chatEndRef} />
          </div>
          {chatError && <p className="error">{chatError}</p>}
          <form onSubmit={sendChat} className="row">
            <input placeholder="escribe tu pregunta..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} />
            <button type="submit" style={{ maxWidth: 90 }} disabled={chatBusy || !chatInput.trim()}>Enviar</button>
          </form>
        </div>
      )}
    </div>
  );
}
