import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { getCurrentUser } from "../services/auth";
import { getGames } from "../services/store";
import { getNotifications, likeBack, markAllRead, pass } from "../services/swipe";
import "./Notifications.css";

export default function Notifications() {
  const user = getCurrentUser();
  const [items, setItems] = useState(getNotifications);
  // какие уведомления были новыми на момент открытия страницы
  const [newIds] = useState(() => new Set(getNotifications().filter((n) => !n.read).map((n) => n.id)));
  const games = getGames();

  useEffect(() => {
    markAllRead();
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  const answer = (n) => {
    likeBack(n.gameId, n.userId);
    setItems(getNotifications());
  };

  const decline = (n) => {
    pass(n.gameId, n.userId);
    setItems(getNotifications());
  };

  return (
    <div className="nt">
      <Link to="/app" className="nt__link">Back to games</Link>
      <h1 className="nt__title">Notifications</h1>

      {items.length === 0 ? (
        <p className="nt__empty">No likes yet. When someone likes your profile, it will show up here.</p>
      ) : (
        <ul className="nt__list">
          {items.map((n) => {
            const game = games.find((g) => g.id === n.gameId);
            const rows = (game?.fields ?? [])
              .map((f) => ({ id: f.id, name: f.name || "Unnamed field", value: n.values[f.id] }))
              .filter((r) => String(r.value ?? "").trim());

            return (
              <li key={n.id} className={`nt__item ${newIds.has(n.id) ? "nt__item--new" : ""}`}>
                <p className="nt__text">
                  <strong>{n.nick}</strong> liked your profile for {game?.name ?? "a game"}
                </p>
                <p className="nt__meta">
                  {new Date(n.createdAt).toLocaleString()}
                  {n.match && <span className="nt__match">Mutual like</span>}
                </p>

                <div className="nt__profile">
                  {n.photo ? (
                    <img className="nt__avatar nt__avatar--photo" src={n.photo} alt="" />
                  ) : (
                    <div className="nt__avatar" aria-hidden="true">{n.nick.charAt(0).toUpperCase()}</div>
                  )}
                  <div className="nt__body">
                    <p className="nt__about">{n.about || "No description."}</p>
                    {rows.length > 0 && (
                      <dl className="nt__fields">
                        {rows.map((r) => (
                          <div key={r.id}>
                            <dt>{r.name}</dt>
                            <dd>{r.value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                </div>

                <div className="nt__actions">
                  {n.match ? (
                    <Link to={`/app/chat/${n.gameId}/${n.userId}`} className="nt__btn nt__btn--chat">
                      Open chat
                    </Link>
                  ) : (
                    <>
                      <button type="button" className="nt__btn nt__btn--like" onClick={() => answer(n)}>
                        Like back
                      </button>
                      <button type="button" className="nt__btn nt__btn--pass" onClick={() => decline(n)}>
                        Not interested
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
