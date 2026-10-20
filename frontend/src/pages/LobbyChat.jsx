import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useI18n } from "../i18n/context";
import { getCurrentUser } from "../services/auth";
import { getLobbyMessages, sendLobbyMessage } from "../services/lobbies";
import "./Chat.css";

export default function LobbyChat() {
  const { t } = useI18n();
  const { gameId, lobbyId } = useParams();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [lobby, setLobby] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const result = await getLobbyMessages(lobbyId);
        if (!active) return;
        setLobby(result.lobby);
        setMessages(result.messages);
        setError("");
      } catch (requestError) {
        if (!active) return;
        if (requestError.status === 403 || requestError.status === 404) {
          navigate(`/app/${gameId}/lobbies`, { replace: true });
          return;
        }
        setError(requestError.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    refresh();
    const timer = window.setInterval(refresh, 2500);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [gameId, lobbyId, navigate]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  if (!user) return <Navigate to="/login" replace />;

  const submit = async (event) => {
    event.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const message = await sendLobbyMessage(lobbyId, text);
      setMessages((current) => (
        current.some((item) => String(item.id) === String(message.id))
          ? current
          : [...current, message]
      ));
      setText("");
      setError("");
    } catch (requestError) {
      if (requestError.status === 403 || requestError.status === 404) {
        navigate(`/app/${gameId}/lobbies`, { replace: true });
      } else {
        setError(requestError.message);
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="cv"><p className="ch__empty">{t("lobbyChat.loading")}</p></div>;
  }

  return (
    <div className="cv">
      <header className="cv__top">
        <Link to={`/app/${gameId}/lobbies`} className="ch__link">{t("lobbyChat.back")}</Link>
        <div className="cv__who">
          <strong>{lobby?.title || t("lobbyChat.title")}</strong>
          <span>{lobby?.gameName}</span>
        </div>
        <span className="cv__contact">{t("lobbyChat.group")}</span>
      </header>

      <div className="cv__messages">
        {error && <p className="cv__error" role="alert">{error}</p>}
        {messages.length === 0 && <p className="ch__empty">{t("lobbyChat.empty")}</p>}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`cv__group-message ${String(message.fromUserId) === String(user.id) ? "cv__group-message--me" : ""}`}
          >
            <div className="cv__group-meta">
              <strong>{String(message.fromUserId) === String(user.id) ? t("lobbyChat.you") : message.senderNick}</strong>
              <time>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
            </div>
            <p>{message.text}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form className="cv__form" onSubmit={submit}>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={500}
          placeholder={t("lobbyChat.placeholder")}
          aria-label={t("lobbyChat.message")}
        />
        <button type="submit" disabled={sending}>{sending ? t("lobbyChat.sending") : t("lobbyChat.send")}</button>
      </form>
    </div>
  );
}
