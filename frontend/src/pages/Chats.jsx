import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { getCurrentUser } from "../services/auth";
import { getGames } from "../services/store";
import { getChatList } from "../services/chat";
import "./Chat.css";

export default function Chats() {
  const [games, setGames] = useState([]);
  const [error, setError] = useState("");
  const chats = getChatList();
  useEffect(() => {
    getGames().then(setGames).catch((requestError) => setError(requestError.message));
  }, []);

  if (!getCurrentUser()) return <Navigate to="/login" replace />;

  return (
    <div className="ch">
      <Link to="/app" className="ch__link">Back to games</Link>
      <h1 className="ch__title">Chats</h1>
      <p className="ch__sub">Chats open after two players like each other.</p>
      <p>Messages are stored only in this browser; the API does not provide chat endpoints yet.</p>

      {error && <p role="alert">{error}</p>}
      {chats.length === 0 ? (
        <p className="ch__empty">No chats yet. Like players in the swipe view, or like back from your notifications.</p>
      ) : (
        <ul className="ch__list">
          {chats.map((c) => (
            <li key={`${c.gameId}:${c.userId}`}>
              <Link to={`/app/chat/${c.gameId}/${c.userId}`} className="ch__item">
                <span className="ch__avatar" aria-hidden="true">{c.nick.charAt(0).toUpperCase()}</span>
                <span className="ch__info">
                  <strong>{c.nick}</strong>
                  <span className="ch__game">{games.find((g) => g.id === c.gameId)?.name ?? "Game"}</span>
                  <span className="ch__preview">{c.last ? c.last.text : "Say hello!"}</span>
                </span>
                {c.unread > 0 && <span className="ch__badge">{c.unread}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
