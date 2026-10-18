import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { getCurrentUser } from "../services/auth";
import { getChatList } from "../services/chat";
import "./Chat.css";

export default function Chats() {
  const [chats, setChats] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const refresh = () => getChatList()
      .then((items) => {
        if (active) {
          setChats(items);
          setError("");
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  if (!getCurrentUser()) return <Navigate to="/login" replace />;

  return (
    <div className="ch">
      <Link to="/app" className="ch__link">Back to games</Link>
      <h1 className="ch__title">Chats</h1>
      <p className="ch__sub">Chats open after two players like each other.</p>

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
                  <span className="ch__game">{c.gameName}</span>
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
