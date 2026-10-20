import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import ChatLink from "../components/ChatLink";
import NotificationBell from "../components/NotificationBell";
import { getCurrentUser } from "../services/auth";
import { setProfileFavorite, getProfile, getIncomingLikes } from "../services/profiles";
import { getGame } from "../services/store";
import { getFeed, react, resetReactions } from "../services/swipe";
import { useI18n } from "../i18n/context";
import "./Swipe.css";

const EXIT_MS = 380;

// Фон для анкет без фото: красный градиент, оттенок зависит от id игрока
function fallbackBg(seed) {
  const sum = [...String(seed)].reduce((n, c) => n + c.charCodeAt(0), 0);
  return `linear-gradient(160deg, hsl(${(sum % 40) - 10} 75% 30%), #050000)`;
}

export default function Swipe() {
  const { t } = useI18n();
  const { gameId } = useParams();
  const [searchParams] = useSearchParams();
  const prioritizeLikes = searchParams.get("likes") === "1";
  const preferredLikedProfileId = searchParams.get("likedProfileId");
  const [game, setGame] = useState(null);
  const [feed, setFeed] = useState([]);
  const [ownProfile, setOwnProfile] = useState(null);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [exit, setExit] = useState(null);
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const timer = useRef(null);

  useEffect(() => {
    let active = true;
    if (!getCurrentUser()) return undefined;
    const feedRequest = prioritizeLikes
      ? Promise.all([getFeed(gameId), getIncomingLikes(gameId)]).then(([loadedFeed, likedProfiles]) => {
        if (preferredLikedProfileId) {
          const preferredIndex = likedProfiles.findIndex((profile) => (
            String(profile.profileId) === preferredLikedProfileId
          ));
          if (preferredIndex > 0) likedProfiles.unshift(likedProfiles.splice(preferredIndex, 1)[0]);
        }
        const likedIds = new Set(likedProfiles.map((profile) => String(profile.id)));
        return [
          ...likedProfiles,
          ...loadedFeed.filter((profile) => !likedIds.has(String(profile.profileId))),
        ];
      })
      : getFeed(gameId);
    Promise.all([getGame(gameId), getProfile(gameId), feedRequest])
      .then(([loadedGame, profile, loadedFeed]) => {
        if (!active) return;
        setGame(loadedGame);
        setOwnProfile(profile);
        setFeed(loadedFeed);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timer.current);
    };
  }, [gameId, prioritizeLikes, preferredLikedProfileId]);

  if (!getCurrentUser()) return <Navigate to="/login" replace />;
  if (loading) return <p>Loading profiles...</p>;
  if (error && !game) return <p role="alert">{error}</p>;
  if (!game) return <Navigate to="/app" replace />;
  if (!ownProfile) return <Navigate to={`/app/${gameId}/create`} replace />;

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredFeed = feed.filter((profile) => (
    !normalizedQuery
    || [profile.nick, profile.about, ...Object.values(profile.values || {})]
      .some((value) => String(value).toLocaleLowerCase().includes(normalizedQuery))
  ));
  const current = filteredFeed[index];
  const updateQuery = (value) => {
    setQuery(value);
    setIndex(0);
  };

  const act = async (type) => {
    if (exit || !current) return;
    let reason;
    if (type === "report") {
      reason = window.prompt("Why are you reporting this profile?");
      if (!reason?.trim()) return;
    }
    try {
      const result = await react(gameId, current, type, reason);
      setError("");
      setMatch(result.match ? { nick: current.nick, userId: current.userId } : null);
      setExit(type);
      timer.current = setTimeout(() => {
        setIndex((i) => i + 1);
        setExit(null);
      }, EXIT_MS);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const startOver = async () => {
    resetReactions(gameId);
    try {
      const loadedFeed = await getFeed(gameId);
      if (prioritizeLikes) {
        const likedProfiles = await getIncomingLikes(gameId);
        if (preferredLikedProfileId) {
          const preferredIndex = likedProfiles.findIndex((profile) => (
            String(profile.profileId) === preferredLikedProfileId
          ));
          if (preferredIndex > 0) likedProfiles.unshift(likedProfiles.splice(preferredIndex, 1)[0]);
        }
        const likedIds = new Set(likedProfiles.map((profile) => String(profile.id)));
        setFeed([
          ...likedProfiles,
          ...loadedFeed.filter((profile) => !likedIds.has(String(profile.profileId))),
        ]);
      } else {
        setFeed(loadedFeed);
      }
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
    setIndex(0);
  };

  const toggleFavorite = async () => {
    if (!current) return;
    const next = !current.isFavorite;
    try {
      await setProfileFavorite(current.profileId, next);
      setFeed((items) => items.map((profile) => (
        String(profile.profileId) === String(current.profileId) ? { ...profile, isFavorite: next } : profile
      )));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const rows = current
    ? game.fields
        .map((f) => ({ id: f.id, name: f.name || t("profile.unnamedField"), value: current.values[f.id] }))
        .filter((r) => String(r.value ?? "").trim())
    : [];

  return (
    <div className="sw">
      <header className="sw__top">
        <Link to="/app" className="sw__back">{t("swipe.back")}</Link>
        <h1 className="sw__game">{game.name}</h1>
        <div className="sw__right">
          <Link to={`/app/${gameId}/lobbies`} className="sw__lobbies">{t("games.lobbies")}</Link>
          <ChatLink />
          <NotificationBell />
        </div>
      </header>

      <main className="sw__stage">
        {error && <p role="alert">{error}</p>}
        <div className="sw__filters">
          <label className="sw__search-label">
            {t("swipe.filters")}
            <span>{t("swipe.filterCount", { n: Math.max(0, filteredFeed.length - index) })}</span>
            <input
              type="search"
              aria-label={t("swipe.search")}
              placeholder={t("swipe.search")}
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
            />
          </label>
          {query && <button type="button" className="sw__clear-filter" onClick={() => updateQuery("")}>{t("swipe.clearFilters")}</button>}
        </div>
        {match && (
          <div className="sw__match" role="status">
            {t("swipe.match", { name: match.nick })}{" "}
            <Link to={`/app/chat/${gameId}/${match.userId}`}>{t("swipe.openChat")}</Link>
          </div>
        )}
        {current ? (
          <>
            <article
              key={current.userId}
              className={`scard ${exit ? `scard--${exit}` : "scard--in"}`}
            >
              <div
                className="scard__photo"
                style={{ backgroundImage: current.photo ? `url("${current.photo}")` : fallbackBg(current.userId) }}
              >
                {!current.photo && (
                  <span className="scard__letter" aria-hidden="true">
                    {current.nick.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="scard__game">{game.name}</span>
                <div className="scard__head">
                  <h2 className="scard__nick">{current.nick}</h2>
                  {current.age != null && <span className="scard__age">{t("profile.age", { age: current.age })}</span>}
                </div>
              </div>

              <div className="scard__info">
                <p className="scard__about">{current.about}</p>
                {rows.length > 0 && (
                  <ul className="scard__chips">
                    {rows.map((r) => (
                      <li key={r.id}>
                        <span>{r.name}</span>
                        <strong>{r.value}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>

            <button
              type="button"
              className={`sw__favorite ${current.isFavorite ? "sw__favorite--saved" : ""}`}
              aria-pressed={Boolean(current.isFavorite)}
              onClick={toggleFavorite}
            >
              {current.isFavorite ? t("swipe.removeFavorite") : t("swipe.addFavorite")}
            </button>
            <div className="sw__actions">
              <button type="button" className="act act--dislike" aria-label={t("swipe.dislike")} disabled={Boolean(exit)} onClick={() => act("dislike")}>
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
              <button type="button" className="act act--report" aria-label={t("swipe.report")} disabled={Boolean(exit)} onClick={() => act("report")}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 21V4m0 0h11l-2 4 2 4H5" />
                </svg>
              </button>
              <button type="button" className="act act--like" aria-label={t("swipe.like")} disabled={Boolean(exit)} onClick={() => act("like")}>
                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div className="sw__empty">
            <h2>{normalizedQuery && filteredFeed.length === 0 ? t("swipe.noFilterResults") : t("swipe.everyone")}</h2>
            <p>{normalizedQuery && filteredFeed.length === 0 ? t("swipe.adjustFilters") : t("swipe.noMore")}</p>
            {normalizedQuery && filteredFeed.length === 0 ? (
              <button type="button" className="sw__btn sw__btn--main" onClick={() => { updateQuery(""); }}>
                {t("swipe.clearFilters")}
              </button>
            ) : (
              <>
                <Link to="/app" className="sw__btn sw__btn--main">{t("swipe.back")}</Link>
                <button type="button" className="sw__btn" onClick={startOver}>{t("swipe.startOver")}</button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
