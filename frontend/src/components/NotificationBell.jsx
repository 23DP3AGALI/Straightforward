import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUnreadNotificationCount } from "../services/notifications";
import "./NotificationBell.css";

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const refresh = () => getUnreadNotificationCount()
      .then((count) => {
        if (active) {
          setUnreadCount(count);
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
      to="/app/notifications"
      className="bell"
      aria-label="Notifications"
      title={error || (unreadCount ? `${unreadCount} unread notifications` : "Notifications")}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
        <path d="M12 22a2 2 0 002-2h-4a2 2 0 002 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4a1.5 1.5 0 00-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
      </svg>
      {unreadCount > 0 && <span className="bell__badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
    </Link>
  );
}
