import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { getCurrentUser } from "../services/auth";
import { getGame } from "../services/store";
import { findMatch, isDemo } from "../services/swipe";
import { getMessages, markChatRead, sendMessage } from "../services/chat";
import "./Chat.css";

export default function Chat() {
  const { gameId, userId } = useParams();
  const [messages, setMessages] = useState(() => getMessages(gameId, userId));
  const [text, setText] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    markChatRead(gameId, userId);
  }, [gameId, userId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const me = getCurrentUser();
  if (!me) return <Navigate to="/login" replace />;

  // чат доступен только при взаимном лайке
  const match = findMatch(gameId, userId);
  if (!match) return <Navigate to="/app/chats" replace />;

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage(gameId, userId, text);
    setMessages(getMessages(gameId, userId));
    setText("");
  };

  return (
    <div className="cv">
      <header className="cv__top">
        <Link to="/app/chats" className="ch__link">Chats</Link>
        <div className="cv__who">
          <strong>{match.nick}</strong>
          <span>{getGame(gameId)?.name}</span>
        </div>
        <span className="cv__contact">
          {isDemo(userId)
            ? "Demo player"
            : match.contact
              ? `Contact: ${match.contact}`
              : "No contact info shared"}
        </span>
      </header>

      <div className="cv__messages">
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
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
