import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useI18n } from "../i18n/context";
import { getCurrentUser } from "../services/auth";
import { getFavoriteProfiles, getProfileHistory, setProfileFavorite } from "../services/profiles";
import "./SavedPlayers.css";

export default function SavedPlayers() {
  const { t } = useI18n();
  const [tab, setTab] = useState("favorites");
  const [favorites, setFavorites] = useState([]);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getCurrentUser()) return;
    Promise.all([getFavoriteProfiles(), getProfileHistory()])
      .then(([saved, viewed]) => {
        setFavorites(saved);
        setHistory(viewed);
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  if (!getCurrentUser()) return <Navigate to="/login" replace />;

  const removeFavorite = async (profileId) => {
    try {
      await setProfileFavorite(profileId, false);
      setFavorites((current) => current.filter((profile) => String(profile.id) !== String(profileId)));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const profiles = tab === "favorites" ? favorites : history;

  return (
    <>
      <Navbar app />
      <main className="saved">
        <Link to="/app" className="saved__back">{t("saved.back")}</Link>
        <h1>{t("saved.title")}</h1>
        <p className="saved__intro">{t("saved.intro")}</p>
        <div className="saved__tabs" role="tablist" aria-label={t("saved.title")}>
          <button type="button" role="tab" aria-selected={tab === "favorites"} onClick={() => setTab("favorites")}>
            {t("saved.favorites")} ({favorites.length})
          </button>
          <button type="button" role="tab" aria-selected={tab === "history"} onClick={() => setTab("history")}>
            {t("saved.history")} ({history.length})
          </button>
        </div>
        {error && <p className="saved__error" role="alert">{error}</p>}
        {loading ? <p>{t("saved.loading")}</p> : profiles.length === 0 ? (
          <div className="saved__empty">
            <p>{tab === "favorites" ? t("saved.noFavorites") : t("saved.noHistory")}</p>
            <Link to="/app" className="saved__button">{t("saved.discover")}</Link>
          </div>
        ) : (
          <ul className="saved__list">
            {profiles.map((profile) => (
              <li key={`${profile.gameId}-${profile.id}`} className="saved__card">
                <div className="saved__card-head">
                  <span
                    className="saved__avatar"
                    aria-hidden="true"
                    style={profile.avatar ? { backgroundImage: `url("${profile.avatar}")` } : undefined}
                  >
                    {!profile.avatar && profile.nick.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="saved__game">{profile.gameName}</p>
                    <h2>{profile.nick}</h2>
                  </div>
                  {tab === "favorites" ? (
                    <button type="button" className="saved__remove" onClick={() => removeFavorite(profile.id)}>
                      {t("saved.remove")}
                    </button>
                  ) : (
                    <span className="saved__action">{t(`saved.action.${profile.historyAction}`)}</span>
                  )}
                </div>
                <p className="saved__about">{profile.about}</p>
                <Link to={`/app/${profile.gameId}/swipe`} className="saved__button">
                  {t("saved.openGame")}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
