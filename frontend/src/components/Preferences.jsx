import { LANGS } from "../i18n/dictionaries";
import { useI18n } from "../i18n/context";
import { useTheme } from "../theme/context";
import "./Preferences.css";

// Переключатель языка и темы (используется в шапке и в мобильном меню)
export default function Preferences() {
  const { lang, setLang, t } = useI18n();
  const { theme, toggle } = useTheme();

  return (
    <div className="prefs">
      <div className="prefs__langs" role="group" aria-label={t("nav.language")}>
        {LANGS.map((l) => (
          <button
            key={l.code}
            type="button"
            className={`prefs__lang ${lang === l.code ? "prefs__lang--on" : ""}`}
            aria-pressed={lang === l.code}
            onClick={() => setLang(l.code)}
          >
            {l.label}
          </button>
        ))}
      </div>
      <button type="button" className="prefs__theme" onClick={toggle} aria-label={t("nav.theme")} title={t("nav.theme")}>
        {theme === "dark" ? "☀" : "☾"}
      </button>
    </div>
  );
}
