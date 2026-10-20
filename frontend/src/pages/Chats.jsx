import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useI18n } from "../i18n/context";
import { getCurrentUser } from "../services/auth";
import { getChatList } from "../services/chat";
import { closeLobby, leaveLobby } from "../services/lobbies";
import "./Chat.css";

export default function Chats() {
  const { t } = useI18n();
  const [chats, setChats] = useState([]);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState(null);
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

  const disconnect = async (chat) => {
    setError("");
    setActionId(chat.id);
    try {
      if (chat.isOwner) await closeLobby(chat.gameId, chat.id);
      else await leaveLobby(chat.gameId, chat.id);
      setChats((current) => current.filter((item) => !(item.type === "lobby" && String(item.id) === String(chat.id))));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setActionId(null);
    }
  };

  return (
    <>
      <Navbar app />
      <main className="ch">
      <Link to="/app" className="ch__link">{t("chat.back")}</Link>
      <h1 className="ch__title">{t("chat.title")}</h1>
      <p className="ch__sub">{t("chat.intro")}</p>

      {error && <p role="alert">{error}</p>}
      {chats.length === 0 ? (
        <p className="ch__empty">{t("chat.empty")}</p>
      ) : (
        <ul className="ch__list">
          {chats.map((c) => (
            <li className="ch__row" key={c.type === "lobby" ? `lobby:${c.id}` : `direct:${c.gameId}:${c.userId}`}>
              <Link
                to={c.type === "lobby" ? `/app/${c.gameId}/lobbies/${c.id}/chat` : `/app/chat/${c.gameId}/${c.userId}`}
                className="ch__item"
              >
                <span className={`ch__avatar ${c.type === "lobby" ? "ch__avatar--group" : ""}`} aria-hidden="true">
                  {c.type === "lobby" ? "G" : c.nick.charAt(0).toUpperCase()}
                </span>
                <span className="ch__info">
                  <strong>{c.type === "lobby" ? c.title : c.nick}</strong>
                  <span className="ch__game">{c.gameName}{c.type === "lobby" ? ` · ${t("chat.group")}` : ""}</span>
                  <span className="ch__preview">{c.last ? c.last.text : c.type === "lobby" ? t("chat.groupEmpty") : t("chat.directEmpty")}</span>
                </span>
                {c.unread > 0 && <span className="ch__badge">{c.unread}</span>}
              </Link>
              {c.type === "lobby" && (
                <button
                  type="button"
                  className="ch__disconnect"
                  disabled={actionId === c.id}
                  onClick={() => disconnect(c)}
                >
                  {actionId === c.id ? t("chat.disconnecting") : c.isOwner ? t("lobby.close") : t("lobby.leave")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      </main>
    </>
  );
}
