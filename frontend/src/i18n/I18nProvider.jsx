import { useCallback, useEffect, useMemo, useState } from "react";
import { I18nContext } from "./context";
import { dictionaries, LANGS } from "./dictionaries";

const KEY = "sf_lang";

function initialLang() {
  const saved = localStorage.getItem(KEY);
  if (LANGS.some((l) => l.code === saved)) return saved;
  const browser = navigator.language?.slice(0, 2);
  return LANGS.some((l) => l.code === browser) ? browser : "en";
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((code) => {
    localStorage.setItem(KEY, code);
    setLangState(code);
  }, []);

  const t = useCallback(
    (key, vars = {}) => {
      const text = dictionaries[lang]?.[key] ?? dictionaries.en[key] ?? key;
      return text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "");
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
