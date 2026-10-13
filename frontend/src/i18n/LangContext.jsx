import { createContext, useContext, useState, useCallback } from 'react';
import { translations } from './translations.js';

const LangContext = createContext(null);

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, key) => (vars[key] != null ? vars[key] : `{${key}}`));
}

export function LangProvider({ children }) {
  // This instance defaults to Spanish regardless of browser language --
  // only an explicit choice (saved here) switches it.
  const [lang, setLangState] = useState(() => localStorage.getItem('mamey_lang') || 'es');

  const setLang = useCallback((next) => {
    localStorage.setItem('mamey_lang', next);
    setLangState(next);
  }, []);

  const t = useCallback(
    (key, vars) => {
      const dict = translations[lang] || translations.es;
      const value = dict[key] ?? translations.es[key] ?? key;
      return interpolate(value, vars);
    },
    [lang]
  );

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}
