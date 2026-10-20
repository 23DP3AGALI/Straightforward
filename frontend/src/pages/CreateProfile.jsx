import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { getCurrentUser } from "../services/auth";
import { getGame } from "../services/store";
import { getProfile, saveProfile } from "../services/profiles";
import { useI18n } from "../i18n/context";
import "./CreateProfile.css";

export default function CreateProfile({ edit = false }) {
  const { t } = useI18n();
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [existing, setExisting] = useState(null);
  const [about, setAbout] = useState("");
  const [values, setValues] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      getGame(gameId),
      getCurrentUser() ? getProfile(gameId) : Promise.resolve(null),
    ])
      .then(([loadedGame, loadedProfile]) => {
        if (!active) return;
        setGame(loadedGame);
        setExisting(loadedProfile);
        setAbout(loadedProfile?.about ?? "");
        setValues(loadedProfile?.values ?? {});
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [gameId]);

  if (!getCurrentUser()) return <Navigate to="/login" replace />;
  if (!loading && edit && !existing) return <Navigate to="/app/profiles" replace />;

  if (loading) return <div className="cp"><p>Loading...</p></div>;
  if (error && !game) {
    return (
      <div className="cp">
        <p className="cp__error" role="alert">{error}</p>
        <Link to="/app" className="cp__link">Back to games</Link>
      </div>
    );
  }
  if (!game) {
    return (
      <div className="cp">
        <h1>Game not found</h1>
        <Link to="/app" className="cp__link">Back to games</Link>
      </div>
    );
  }

  const setValue = (fid, value) => {
    if (String(value).length > 200) return;
    setValues((previous) => ({ ...previous, [fid]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!about.trim()) return setError("Write a short description about yourself.");
    const missing = game.fields.find((f) => f.required && !String(values[f.id] ?? "").trim());
    if (missing) return setError(`Fill in the required field: ${missing.name || "unnamed field"}.`);

    try {
      await saveProfile(game.id, { about: about.trim(), values });
      navigate(edit ? "/app/profiles" : `/app/${game.id}/swipe`);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="cp">
      <Link to={edit ? "/app/profiles" : "/app"} className="cp__link">
        {edit ? "Back to my profiles" : "Back to games"}
      </Link>
      <h1 className="cp__title">{game.name}</h1>
      <p className="cp__sub">{edit ? t("profile.editIntro") : t("profile.createIntro")}</p>

      <form className="cp__form" onSubmit={submit}>
        <label>
          {t("profile.about")}
          <textarea
            rows={4}
            maxLength={600}
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder={t("profile.aboutPlaceholder")}
          />
          <span className="cp__counter">{about.length}/600</span>
        </label>

        {game.fields.map((f) => (
          <label key={f.id}>
            {f.name || t("profile.unnamedField")}
            {f.required ? " *" : ""}
            {f.type === "select" ? (
              <select value={values[f.id] ?? ""} onChange={(e) => setValue(f.id, e.target.value)}>
                <option value="">{t("profile.choose")}</option>
                {f.options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                type={f.type === "number" ? "number" : "text"}
                maxLength={f.type === "number" ? undefined : 200}
                value={values[f.id] ?? ""}
                onChange={(e) => setValue(f.id, e.target.value)}
              />
            )}
            {f.type !== "select" && (
              <span className="cp__counter">{String(values[f.id] ?? "").length}/200</span>
            )}
          </label>
        ))}

        {error && <p className="cp__error" role="alert">{error}</p>}
        <button type="submit" className="cp__submit">{t("profile.save")}</button>
      </form>
    </div>
  );
}
