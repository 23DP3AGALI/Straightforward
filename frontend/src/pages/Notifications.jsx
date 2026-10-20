import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/auth";
import { useI18n } from "../i18n/context";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notifications";
import "./Notifications.css";

export default function Notifications() {
  const { t } = useI18n();
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const items = await getNotifications();
        if (!active) return;
        setNotifications(items);
        await markAllNotificationsRead();
        if (active) setNotifications(items.map((item) => ({ ...item, isRead: true })));
        setError("");
      } catch (requestError) {
        if (active) setError(requestError.message);
      }
    };
    load();
    const timer = window.setInterval(load, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const openChat = async (notification) => {
    try {
      await markNotificationRead(notification.id);
      navigate(`/app/chat/${notification.gameId}/${notification.actorId}`);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const viewLikedProfile = async (notification) => {
    try {
      await markNotificationRead(notification.id);
      setNotifications((items) => items.map((item) => (
        item.id === notification.id ? { ...item, isRead: true } : item
      )));
      navigate(`/app/${notification.gameId}/swipe?likes=1&likedProfileId=${encodeURIComponent(notification.actorProfileId)}`);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  if (!getCurrentUser()) return <Navigate to="/login" replace />;

  return (
    <div className="nt">
      <Link to="/app" className="nt__link">Back to games</Link>
      <h1 className="nt__title">Notifications</h1>
      {error && <p className="nt__empty" role="alert">{error}</p>}
      {notifications.length === 0 ? (
        <p className="nt__empty">No notifications yet. You will see new likes and chat messages here.</p>
      ) : (
        <ul className="nt__list">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`nt__item ${notification.isRead ? "" : "nt__item--new"}`}
            >
              <p className="nt__text">
                {notification.type === "like" && <><strong>{notification.actorNick}</strong> liked your profile.</>}
                {notification.type === "match" && <>You and <strong>{notification.actorNick}</strong> like each other. You can chat now.</>}
                {notification.type === "message" && <><strong>{notification.actorNick}</strong> sent you a message: {notification.messageText}</>}
              </p>
              <p className="nt__meta">{notification.gameName}</p>
              <div className="nt__actions">
                {notification.type === "like" && (
                  <button
                    className="nt__btn nt__btn--like"
                    disabled={!notification.actorProfileId}
                    onClick={() => viewLikedProfile(notification)}
                  >
                    {t("notifications.viewProfile")}
                  </button>
                )}
                {(notification.type === "match" || notification.type === "message") && (
                  <button className="nt__btn nt__btn--chat" onClick={() => openChat(notification)}>
                    Open chat
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
