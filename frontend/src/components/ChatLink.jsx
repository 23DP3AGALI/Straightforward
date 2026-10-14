import { Link } from "react-router-dom";
import { getUnreadMessages } from "../services/chat";
import "./NotificationBell.css";

export default function ChatLink() {
  const count = getUnreadMessages();
  return (
    <Link
      to="/app/chats"
      className="bell"
      aria-label={count ? `Chats, ${count} unread` : "Chats"}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
        <path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z" />
      </svg>
      {count > 0 && <span className="bell__badge">{count > 9 ? "9+" : count}</span>}
    </Link>
  );
}
