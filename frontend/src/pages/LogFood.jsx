import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { isSpeechSupported, startListening, parseSpokenFood } from '../lib/speech.js';
import { fileToBase64 } from '../lib/image.js';
import BarcodeScanner from '../components/BarcodeScanner.jsx';

export default function LogFood() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState(100);
  const [mealType, setMealType] = useState('breakfast');
  const [todayLogs, setTodayLogs] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recipeUrl, setRecipeUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [listening, setListening] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [aiConfig, setAiConfig] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResults, setAiResults] = useState([]);
  const [showCustom, setShowCustom] = useState(false);
  const [customForm, setCustomForm] = useState({ name: '', brand: '', caloriesPer100g: '', proteinG: '', carbsG: '', fatG: '', fiberG: '', sugarG: '', sodiumMg: '' });
  const [editingFoodId, setEditingFoodId] = useState(null);
  const [creatingCustom, setCreatingCustom] = useState(false);
  const [myUserId, setMyUserId] = useState(null);
  const [editingLogId, setEditingLogId] = useState(null);
  const [editQuantity, setEditQuantity] = useState(100);
  const [editMealType, setEditMealType] = useState('breakfast');
  const speechSupported = isSpeechSupported();

  const isRecipe = selected?.source === 'recipe';
  const quantityG = isRecipe ? Number(quantity) * 100 : Number(quantity);

  function loadToday() {
    api('/logs').then(setTodayLogs).catch((e) => setError(e.message));
  }

  useEffect(loadToday, []);
  useEffect(() => { api('/settings/ai').then(setAiConfig).catch(() => {}); }, []);
  useEffect(() => { api('/auth/me').then((u) => setMyUserId(u.id)).catch(() => {}); }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      api(`/foods/search?q=${encodeURIComponent(query)}`).then(setResults).catch((e) => setError(e.message));
    }, 350);
    return () => clearTimeout(handle);
  }, [query]);

  async function addLog() {
    setError('');
    setMessage('');
    try {
      await api('/logs', {
        method: 'POST',
        body: { foodId: selected.id, mealType, quantityG },
      });
      setMessage(`${selected.name} agregado.`);
      setSelected(null);
      setQuery('');
      setResults([]);
      setQuantity(100);
      loadToday();
    } catch (err) {
      setError(err.message);
    }
  }

  async function importRecipe() {
    setError('');
    setImporting(true);
    try {
      const food = await api('/recipes/import', { method: 'POST', body: { url: recipeUrl } });
      setSelected(food);
      setQuantity(1);
      setRecipeUrl('');
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  }

  function handleVoice() {
    setError('');
    setListening(true);
    startListening({
      onResult: (transcript) => {
        const { quantityG: spokenQuantity, query: spokenQuery } = parseSpokenFood(transcript);
        setQuery(spokenQuery);
        if (spokenQuantity) setQuantity(spokenQuantity);
      },
      onError: (err) => setError(`No entendí bien (${err}), intenta de nuevo o escribe.`),
      onEnd: () => setListening(false),
    });
  }

  async function handleBarcode(code) {
    setScanning(false);
    setError('');
    try {
      const food = await api(`/foods/barcode/${encodeURIComponent(code)}`);
      setSelected(food);
      setQuantity(100);
    } catch (err) {
      setError(err.message);
    }
  }

  function updateCustomForm(field, value) {
    setCustomForm((f) => ({ ...f, [field]: value }));
  }

  async function createCustomFood() {
    setError('');
    setCreatingCustom(true);
    const body = {
      name: customForm.name,
      brand: customForm.brand || null,
      caloriesPer100g: Number(customForm.caloriesPer100g),
      proteinG: Number(customForm.proteinG) || 0,
      carbsG: Number(customForm.carbsG) || 0,
      fatG: Number(customForm.fatG) || 0,
      fiberG: Number(customForm.fiberG) || 0,
      sugarG: Number(customForm.sugarG) || 0,
      sodiumMg: Number(customForm.sodiumMg) || 0,
    };
    try {
      const food = editingFoodId
        ? await api(`/foods/${editingFoodId}`, { method: 'PATCH', body })
        : await api('/foods', { method: 'POST', body });
      setSelected(food);
      setQuantity(editingFoodId ? quantity : 100);
      setShowCustom(false);
      setEditingFoodId(null);
      setCustomForm({ name: '', brand: '', caloriesPer100g: '', proteinG: '', carbsG: '', fatG: '', fiberG: '', sugarG: '', sodiumMg: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingCustom(false);
    }
  }

  function startEditFood() {
    setCustomForm({
      name: selected.name,
      brand: selected.brand || '',
      caloriesPer100g: selected.calories_per_100g,
      proteinG: selected.protein_g,
      carbsG: selected.carbs_g,
      fatG: selected.fat_g,
      fiberG: selected.fiber_g || '',
      sugarG: selected.sugar_g || '',
      sodiumMg: selected.sodium_mg || '',
    });
    setEditingFoodId(selected.id);
    setSelected(null);
    setShowCustom(true);
  }

  async function startEditLog(log) {
    setEditingLogId(log.id);
    setEditQuantity(log.quantity_g);
    setEditMealType(log.meal_type);
  }

  async function saveEditLog(id) {
    setError('');
    try {
      await api(`/logs/${id}`, { method: 'PATCH', body: { quantityG: Number(editQuantity), mealType: editMealType } });
      setEditingLogId(null);
      loadToday();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeLog(id) {
    await api(`/logs/${id}`, { method: 'DELETE' });
    loadToday();
  }

  async function handlePhoto(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setAnalyzing(true);
    setAiResults([]);
    try {
      const { base64, mimeType } = await fileToBase64(file);
      const items = await api('/photos/analyze', { method: 'POST', body: { imageBase64: base64, mimeType } });
      setAiResults(items.map((item) => ({ ...item, grams: Math.round(item.estimated_grams), checked: true })));
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  function updateAiResult(id, patch) {
    setAiResults((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function addAiResults() {
    setError('');
    const toAdd = aiResults.filter((i) => i.checked);
    try {
      for (const item of toAdd) {
        await api('/logs', { method: 'POST', body: { foodId: item.id, mealType, quantityG: Number(item.grams) } });
      }
      setMessage(`${toAdd.length} alimento(s) agregado(s) de la foto.`);
      setAiResults([]);
      loadToday();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>Registrar alimento</h1>
      {!selected && (
        <>
          <div className="row">
            <input placeholder="buscar alimento..." value={query} onChange={(e) => setQuery(e.target.value)} />
            {speechSupported && (
              <button
                type="button"
                style={{ maxWidth: 56 }}
                className={listening ? '' : 'secondary'}
                onClick={handleVoice}
                disabled={listening}
              >
                {listening ? '●' : '🎤'}
              </button>
            )}
            <button type="button" style={{ maxWidth: 56 }} className="secondary" onClick={() => setScanning(true)}>
              📷
            </button>
            {aiConfig?.configured && (
              <label className="icon-btn" style={{ maxWidth: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                📸
                <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} />
              </label>
            )}
          </div>
          {!speechSupported && (
            <p className="muted">💡 En iPhone: toca el micrófono del teclado para dictar aquí.</p>
          )}

          {!aiConfig?.configured && (
            <p className="muted">📸 Foto con IA: <Link to="/settings">configúrala en Ajustes</Link>.</p>
          )}

          {analyzing && <p className="muted">Analizando foto...</p>}

          {aiResults.length > 0 && (
            <div className="card">
              <h3>Detectado en la foto</h3>
              {aiResults.map((item) => (
                <div key={item.id} className="list-item">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <input
                      type="checkbox"
                      style={{ width: 'auto', margin: 0 }}
                      checked={item.checked}
                      onChange={(e) => updateAiResult(item.id, { checked: e.target.checked })}
                    />
                    {item.name}
                  </label>
                  <input
                    type="number"
                    style={{ width: 70, margin: 0 }}
                    value={item.grams}
                    onChange={(e) => updateAiResult(item.id, { grams: e.target.value })}
                  />
                  <span className="muted">g</span>
                </div>
              ))}
              <select value={mealType} onChange={(e) => setMealType(e.target.value)} style={{ marginTop: 10 }}>
                <option value="breakfast">Desayuno</option>
                <option value="lunch">Comida</option>
                <option value="dinner">Cena</option>
                <option value="snack">Snack</option>
              </select>
              <p className="muted">Estimado por IA — revisa las cantidades antes de agregar.</p>
              <button onClick={addAiResults}>Agregar seleccionados</button>
              <button className="secondary" onClick={() => setAiResults([])}>Descartar</button>
            </div>
          )}

          {scanning && (
            <BarcodeScanner
              onDetected={handleBarcode}
              onClose={(err) => {
                setScanning(false);
                if (err) setError(err);
              }}
            />
          )}

          <div className="card">
            <h3>Importar receta por URL</h3>
            <div className="row">
              <input
                placeholder="https://..."
                value={recipeUrl}
                onChange={(e) => setRecipeUrl(e.target.value)}
              />
              <button style={{ maxWidth: 120 }} disabled={!recipeUrl || importing} onClick={importRecipe}>
                {importing ? 'Leyendo...' : 'Importar'}
              </button>
            </div>
            <p className="muted">Solo funciona con sitios que publican info nutricional estructurada (schema.org).</p>
          </div>

          {results.map((food) => (
            <div key={food.id} className="list-item" onClick={() => setSelected(food)} style={{ cursor: 'pointer' }}>
              <span>{food.name} {food.brand ? `(${food.brand})` : ''}</span>
              <span className="muted">{Math.round(food.calories_per_100g)} kcal/100g</span>
            </div>
          ))}

          {!showCustom && (
            <p className="muted">¿No lo encuentras? <a href="#" onClick={(e) => { e.preventDefault(); setShowCustom(true); }}>Crea tu propio alimento.</a></p>
          )}
          {showCustom && (
            <div className="card">
              <h3>{editingFoodId ? 'Editar alimento' : 'Alimento personalizado'}</h3>
              <p className="muted">Valores por cada 100 gramos.</p>
              <input placeholder="nombre" value={customForm.name} onChange={(e) => updateCustomForm('name', e.target.value)} />
              <input placeholder="marca (opcional)" value={customForm.brand} onChange={(e) => updateCustomForm('brand', e.target.value)} />
              <div className="row">
                <input type="number" placeholder="kcal/100g" value={customForm.caloriesPer100g} onChange={(e) => updateCustomForm('caloriesPer100g', e.target.value)} />
                <input type="number" placeholder="proteína g" value={customForm.proteinG} onChange={(e) => updateCustomForm('proteinG', e.target.value)} />
              </div>
              <div className="row">
                <input type="number" placeholder="carbs g" value={customForm.carbsG} onChange={(e) => updateCustomForm('carbsG', e.target.value)} />
                <input type="number" placeholder="grasa g" value={customForm.fatG} onChange={(e) => updateCustomForm('fatG', e.target.value)} />
              </div>
              <div className="row">
                <input type="number" placeholder="fibra g (opcional)" value={customForm.fiberG} onChange={(e) => updateCustomForm('fiberG', e.target.value)} />
                <input type="number" placeholder="azúcar g (opcional)" value={customForm.sugarG} onChange={(e) => updateCustomForm('sugarG', e.target.value)} />
              </div>
              <input type="number" placeholder="sodio mg (opcional)" value={customForm.sodiumMg} onChange={(e) => updateCustomForm('sodiumMg', e.target.value)} />
              <button disabled={!customForm.name || !customForm.caloriesPer100g || creatingCustom} onClick={createCustomFood}>
                {creatingCustom ? 'Guardando...' : editingFoodId ? 'Guardar cambios' : 'Crear y registrar'}
              </button>
              <button className="secondary" onClick={() => { setShowCustom(false); setEditingFoodId(null); }}>Cancelar</button>
            </div>
          )}
        </>
      )}
      {selected && (
        <div className="card">
          <h3>{selected.name} {isRecipe && <span className="muted">(receta)</span>}</h3>
          <div className="row">
            <input
              type="number"
              step={isRecipe ? 0.25 : 1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <select value={mealType} onChange={(e) => setMealType(e.target.value)}>
              <option value="breakfast">Desayuno</option>
              <option value="lunch">Comida</option>
              <option value="dinner">Cena</option>
              <option value="snack">Snack</option>
            </select>
          </div>
          <p className="muted">{isRecipe ? 'porciones' : 'gramos'}</p>
          <p className="muted">
            {Math.round((selected.calories_per_100g * quantityG) / 100)} kcal ·{' '}
            {Math.round((selected.protein_g * quantityG) / 100)}g prot ·{' '}
            {Math.round((selected.carbs_g * quantityG) / 100)}g carbs ·{' '}
            {Math.round((selected.fat_g * quantityG) / 100)}g grasa
          </p>
          {(selected.fiber_g > 0 || selected.sugar_g > 0 || selected.sodium_mg > 0) && (
            <p className="muted">
              {selected.fiber_g > 0 && <>fibra {Math.round((selected.fiber_g * quantityG) / 100)}g · </>}
              {selected.sugar_g > 0 && <>azúcar {Math.round((selected.sugar_g * quantityG) / 100)}g · </>}
              {selected.sodium_mg > 0 && <>sodio {Math.round((selected.sodium_mg * quantityG) / 100)}mg</>}
            </p>
          )}
          {selected.micros && Object.keys(selected.micros).length > 0 && (
            <p className="muted">
              {Object.entries(selected.micros).map(([key, val]) => (
                <span key={key}>{key.replace(/_/g, ' ')}: {Math.round((val * quantityG) / 100 * 100) / 100} · </span>
              ))}
            </p>
          )}
          <button onClick={addLog}>Agregar</button>
          {selected.source === 'custom' && selected.created_by === myUserId && (
            <button className="secondary" onClick={startEditFood}>Editar este alimento</button>
          )}
          <button className="secondary" onClick={() => setSelected(null)}>Cancelar</button>
        </div>
      )}
      {error && <p className="error">{error}</p>}
      {message && <p className="muted">{message}</p>}

      <h3 style={{ marginTop: 24 }}>Hoy</h3>
      {todayLogs.map((log) => (
        editingLogId === log.id ? (
          <div key={log.id} className="card">
            <h3>{log.food_name}</h3>
            <div className="row">
              <input type="number" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} />
              <select value={editMealType} onChange={(e) => setEditMealType(e.target.value)}>
                <option value="breakfast">Desayuno</option>
                <option value="lunch">Comida</option>
                <option value="dinner">Cena</option>
                <option value="snack">Snack</option>
              </select>
            </div>
            <button onClick={() => saveEditLog(log.id)}>Guardar</button>
            <button className="secondary" onClick={() => setEditingLogId(null)}>Cancelar</button>
          </div>
        ) : (
          <div key={log.id} className="list-item" style={{ cursor: 'pointer' }} onClick={() => startEditLog(log)}>
            <span>{log.food_name} ({Math.round(log.quantity_g)}g) · {log.meal_type}</span>
            <span>
              {Math.round(log.calories)} kcal{' '}
              <a href="#" onClick={(e) => { e.stopPropagation(); e.preventDefault(); removeLog(log.id); }}>✕</a>
            </span>
          </div>
        )
      ))}
    </div>
  );
}
