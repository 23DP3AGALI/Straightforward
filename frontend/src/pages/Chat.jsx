import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { getCurrentUser } from "../services/auth";
import { getChatList, getMessages, sendMessage } from "../services/chat";
import "./Chat.css";

export default function Chat() {
  const { gameId, userId } = useParams();
  const [match, setMatch] = useState(null);
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
        const [chats, latestMessages] = await Promise.all([
          getChatList(),
          getMessages(gameId, userId),
        ]);
        if (!active) return;
        setMatch(chats.find((chat) => String(chat.gameId) === String(gameId)
          && String(chat.userId) === String(userId)) || null);
        setMessages(latestMessages);
        setError("");
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    refresh();
    const timer = window.setInterval(refresh, 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [gameId, userId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const me = getCurrentUser();
  if (!me) return <Navigate to="/login" replace />;
  if (!loading && !match && !error) return <Navigate to="/app/chats" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const message = await sendMessage(gameId, userId, text);
      setMessages((current) => [...current, message]);
      setText("");
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="cv"><p className="ch__empty">Loading chat...</p></div>;

  return (
    <div className="cv">
      <header className="cv__top">
        <Link to="/app/chats" className="ch__link">Chats</Link>
        <div className="cv__who">
          <strong>{match?.nick || "Chat"}</strong>
          <span>{match?.gameName}</span>
        </div>
        <span className="cv__contact">
          {match?.contact ? `Contact: ${match.contact}` : "No contact info shared"}
        </span>
      </header>

      <div className="cv__messages">
        {error && <p className="cv__error" role="alert">{error}</p>}
        {messages.length === 0 && <p className="ch__empty">You liked each other. Say hello!</p>}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`cv__msg ${String(m.fromUserId) === String(me.id) ? "cv__msg--me" : ""}`}
          >
            {m.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form className="cv__form" onSubmit={submit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="Write a message..."
          aria-label="Message"
        />
        <button type="submit" disabled={sending}>Send</button>
      </form>
    </div>
  );
}
