import { Link } from "react-router-dom";
import { getUnreadCount } from "../services/swipe";
import "./NotificationBell.css";

export default function NotificationBell() {
  const count = getUnreadCount();
  return (
    <Link
      to="/app/notifications"
      className="bell"
      aria-label={count ? `Notifications, ${count} new` : "Notifications"}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
        <path d="M12 22a2 2 0 002-2h-4a2 2 0 002 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4a1.5 1.5 0 00-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
      </svg>
      {count > 0 && <span className="bell__badge">{count > 9 ? "9+" : count}</span>}
    </Link>
  );
}
