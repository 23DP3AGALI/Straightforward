// Временная заглушка без БД: сообщения чата в localStorage.
// Чат доступен только после взаимного лайка. Позже заменим на backend (WebSocket/REST).
import { getCurrentUser } from "./auth";
import { getMatches, isDemo } from "./swipe";

const KEY = "sf_messages_v1";
const DEMO_REPLY = "Hey! Nice to meet you. What time do you usually play?";

const same = (a, b) => String(a) === String(b);
const keyOf = (gameId, a, b) => `${gameId}:${[String(a), String(b)].sort().join("-")}`;

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

function write(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

function makeMessage(key, from, text, createdAt) {
  return {
    id: `${createdAt}-${Math.random().toString(36).slice(2, 7)}`,
    key,
    fromUserId: from,
    text,
    createdAt,
    read: false,
  };
}

export function getMessages(gameId, otherId) {
  const me = getCurrentUser();
  if (!me) return [];
  const key = keyOf(gameId, me.id, otherId);
  return read()
    .filter((m) => m.key === key)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function sendMessage(gameId, otherId, text) {
  const me = getCurrentUser();
  const clean = text.trim().slice(0, 500);
  if (!me || !clean) return;

  const key = keyOf(gameId, me.id, otherId);
  const now = Date.now();
  const list = [...read(), { ...makeMessage(key, me.id, clean, now), read: true }];

  // тестовый игрок отвечает один раз, чтобы чат не был пустым
  if (isDemo(otherId) && !list.some((m) => m.key === key && same(m.fromUserId, otherId))) {
    list.push({ ...makeMessage(key, otherId, DEMO_REPLY, now + 1000), read: true });
  }

  write(list);
}

export function markChatRead(gameId, otherId) {
  const me = getCurrentUser();
  if (!me) return;
  const key = keyOf(gameId, me.id, otherId);
  write(read().map((m) => (m.key === key && same(m.fromUserId, otherId) ? { ...m, read: true } : m)));
}

// Список чатов: взаимные лайки + последнее сообщение + число непрочитанных
export function getChatList() {
  const me = getCurrentUser();
  if (!me) return [];
  const all = read();
  return getMatches()
    .map((m) => {
      const key = keyOf(m.gameId, me.id, m.userId);
      const msgs = all.filter((x) => x.key === key).sort((a, b) => a.createdAt - b.createdAt);
      return {
        ...m,
        last: msgs[msgs.length - 1] || null,
        unread: msgs.filter((x) => !x.read && !same(x.fromUserId, me.id)).length,
      };
    })
    .sort((a, b) => (b.last?.createdAt ?? b.matchedAt) - (a.last?.createdAt ?? a.matchedAt));
}

export function getUnreadMessages() {
  return getChatList().reduce((sum, c) => sum + c.unread, 0);
}
