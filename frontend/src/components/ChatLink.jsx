import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUnreadMessages } from "../services/chat";
import "./NotificationBell.css";

export default function ChatLink() {
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const refresh = () => getUnreadMessages()
      .then((unread) => {
        if (active) {
          setCount(unread);
          setError("");
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });
    refresh();
    const timer = window.setInterval(refresh, 10000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <Link
      to="/app/chats"
      className="bell"
      aria-label={count ? `Chats, ${count} unread` : "Chats"}
      title={error || "Chats"}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
        <path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z" />
      </svg>
      {count > 0 && <span className="bell__badge">{count > 9 ? "9+" : count}</span>}
    </Link>
  );
}
