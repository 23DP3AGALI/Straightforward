import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import NotificationBell from "../components/NotificationBell";
import { getCurrentUser } from "../services/auth";
import { hasProfile } from "../services/profiles";
import { getGame } from "../services/store";
import { getFeed, react, resetReactions } from "../services/swipe";
import "./Swipe.css";

const EXIT_MS = 380;

export default function Swipe() {
  const { gameId } = useParams();
  const game = getGame(gameId);
  const [feed, setFeed] = useState(() => getFeed(gameId));
  const [index, setIndex] = useState(0);
  const [exit, setExit] = useState(null);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (!getCurrentUser()) return <Navigate to="/login" replace />;
  if (!game) return <Navigate to="/app" replace />;
  if (!hasProfile(gameId)) return <Navigate to={`/app/${gameId}/create`} replace />;

  const current = feed[index];

  const act = (type) => {
    if (exit || !current) return;
    if (type === "report" && !window.confirm("Report this profile for breaking the rules?")) return;
    react(gameId, current, type);
    setExit(type);
    timer.current = setTimeout(() => {
      setIndex((i) => i + 1);
      setExit(null);
    }, EXIT_MS);
  };

  const startOver = () => {
    resetReactions(gameId);
    setFeed(getFeed(gameId));
    setIndex(0);
  };

  const rows = current
    ? game.fields
        .map((f) => ({ id: f.id, name: f.name || "Unnamed field", value: current.values[f.id] }))
        .filter((r) => String(r.value ?? "").trim())
    : [];

  return (
    <div className="sw">
      <header className="sw__top">
        <Link to="/app" className="sw__back">Back to games</Link>
        <h1 className="sw__game">{game.name}</h1>
        <NotificationBell />
      </header>

      <main className="sw__stage">
        {current ? (
          <>
            <article
              key={current.userId}
              className={`scard ${exit ? `scard--${exit}` : "scard--in"}`}
            >
              <div className="scard__avatar" aria-hidden="true">
                {current.nick.charAt(0).toUpperCase()}
              </div>
              <h2 className="scard__nick">{current.nick}</h2>
              {current.demo && <p className="scard__demo">Demo player</p>}
              <p className="scard__about">{current.about}</p>
              {rows.length > 0 && (
                <dl className="scard__fields">
                  {rows.map((r) => (
                    <div key={r.id}>
                      <dt>{r.name}</dt>
                      <dd>{r.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </article>

            <div className="sw__actions">
              <button type="button" className="act act--dislike" aria-label="Dislike" onClick={() => act("dislike")}>
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
              <button type="button" className="act act--report" aria-label="Report" onClick={() => act("report")}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 21V4m0 0h11l-2 4 2 4H5" />
                </svg>
              </button>
              <button type="button" className="act act--like" aria-label="Like" onClick={() => act("like")}>
                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div className="sw__empty">
            <h2>That's everyone for now</h2>
            <p>No more profiles for this game. Check back later.</p>
            <Link to="/app" className="sw__btn sw__btn--main">Back to games</Link>
            <button type="button" className="sw__btn" onClick={startOver}>
              Start over (test mode)
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
