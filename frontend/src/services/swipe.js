// Временная заглушка без БД: реакции (like/dislike/report) в localStorage.
// Позже заменим на запросы к backend (таблицы reakcija и reports).
import { getCurrentUser, getUserById } from "./auth";
import { getProfilesOfGame } from "./profiles";

const REACTIONS_KEY = "sf_reactions_v1";
const REPORTS_KEY = "sf_reports_v1";

// Тестовые игроки, чтобы было что листать, пока в браузере мало аккаунтов.
const DEMO = [
  { userId: "demo1", nick: "NightOwl", about: "Play in the evenings, relaxed vibe, mic always on." },
  { userId: "demo2", nick: "ClutchQueen", about: "Ranked grinder, looking for a stable duo. No toxicity please." },
  { userId: "demo3", nick: "PixelNomad", about: "Casual player, weekends only. Here for fun and good company." },
  { userId: "demo4", nick: "RedLine", about: "Competitive, can lead the team, serious about improving." },
  { userId: "demo5", nick: "SoloNoMore", about: "Tired of solo queue. Looking for a permanent squad." },
];

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function write(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

const same = (a, b) => String(a) === String(b);

// Анкеты других игроков, на которые я ещё не реагировал
export function getFeed(gameId) {
  const me = getCurrentUser();
  if (!me) return [];

  const seen = new Set(
    read(REACTIONS_KEY)
      .filter((r) => same(r.fromUserId, me.id) && r.gameId === gameId)
      .map((r) => String(r.toUserId)),
  );

  const real = getProfilesOfGame(gameId)
    .filter((p) => !same(p.userId, me.id))
    .map((p) => ({ p, user: getUserById(p.userId) }))
    .filter(({ user }) => user && !user.ir_banots)
    .map(({ p, user }) => ({
      userId: String(p.userId),
      nick: user.nick,
      about: p.about,
      values: p.values || {},
      demo: false,
    }));

  const demo = DEMO.map((d) => ({ ...d, values: {}, demo: true }));

  return [...real, ...demo].filter((c) => !seen.has(String(c.userId)));
}

// type: "like" | "dislike" | "report"
export function react(gameId, target, type) {
  const me = getCurrentUser();
  if (!me) return;
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fromUserId: me.id,
    toUserId: target.userId,
    gameId,
    type,
    createdAt: Date.now(),
    read: false,
  };
  write(REACTIONS_KEY, [...read(REACTIONS_KEY), entry]);
  if (type === "report") {
    write(REPORTS_KEY, [...read(REPORTS_KEY), { ...entry, status: "open" }]);
  }
}

// Только для тестов: сбросить мои реакции в этой игре
export function resetReactions(gameId) {
  const me = getCurrentUser();
  if (!me) return;
  write(
    REACTIONS_KEY,
    read(REACTIONS_KEY).filter((r) => !(same(r.fromUserId, me.id) && r.gameId === gameId)),
  );
}

// Лайки, которые поставили мне
export function getNotifications() {
  const me = getCurrentUser();
  if (!me) return [];
  const all = read(REACTIONS_KEY);
  return all
    .filter((r) => r.type === "like" && same(r.toUserId, me.id))
    .map((r) => ({
      id: r.id,
      gameId: r.gameId,
      nick: getUserById(r.fromUserId)?.nick ?? "Someone",
      createdAt: r.createdAt,
      read: r.read,
      // взаимный лайк: я тоже лайкнул этого игрока в этой игре
      match: all.some(
        (x) =>
          x.type === "like" &&
          x.gameId === r.gameId &&
          same(x.fromUserId, me.id) &&
          same(x.toUserId, r.fromUserId),
      ),
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getUnreadCount() {
  return getNotifications().filter((n) => !n.read).length;
}

export function markAllRead() {
  const me = getCurrentUser();
  if (!me) return;
  write(
    REACTIONS_KEY,
    read(REACTIONS_KEY).map((r) => (r.type === "like" && same(r.toUserId, me.id) ? { ...r, read: true } : r)),
  );
}
