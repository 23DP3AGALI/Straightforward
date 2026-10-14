import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { getCurrentUser } from "../services/auth";
import { getGames } from "../services/store";
import { getNotifications, markAllRead } from "../services/swipe";
import "./Notifications.css";

export default function Notifications() {
  const user = getCurrentUser();
  // список запоминаем до того, как отметим всё прочитанным, чтобы показать «новые»
  const [items] = useState(getNotifications);
  const games = getGames();

  useEffect(() => {
    markAllRead();
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="nt">
      <Link to="/app" className="nt__link">Back to games</Link>
      <h1 className="nt__title">Notifications</h1>

      {items.length === 0 ? (
        <p className="nt__empty">No likes yet. When someone likes your profile, it will show up here.</p>
      ) : (
        <ul className="nt__list">
          {items.map((n) => {
            const game = games.find((g) => g.id === n.gameId)?.name ?? "a game";
            return (
              <li key={n.id} className={`nt__item ${n.read ? "" : "nt__item--new"}`}>
                <p className="nt__text">
                  <strong>{n.nick}</strong> liked your profile for {game}
                </p>
                <p className="nt__meta">
                  {new Date(n.createdAt).toLocaleString()}
                  {n.match && <span className="nt__match">Mutual like</span>}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
