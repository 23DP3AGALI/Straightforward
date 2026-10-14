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
// Эти тестовые игроки сразу лайкают в ответ, чтобы можно было проверить чат в одиночку.
const DEMO_LIKES_BACK = new Set(["demo1", "demo3", "demo5"]);

const same = (a, b) => String(a) === String(b);

export const isDemo = (id) => String(id).startsWith("demo");

export function nickOf(id) {
  return DEMO.find((d) => same(d.userId, id))?.nick ?? getUserById(id)?.nick ?? "Someone";
}

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

function hasLike(all, from, to, gameId) {
  return all.some(
    (x) => x.type === "like" && x.gameId === gameId && same(x.fromUserId, from) && same(x.toUserId, to),
  );
}

function makeEntry(from, to, gameId, type, createdAt) {
  return {
    id: `${createdAt}-${Math.random().toString(36).slice(2, 7)}`,
    fromUserId: from,
    toUserId: to,
    gameId,
    type,
    createdAt,
    read: false,
  };
}

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
      photo: p.photo || "",
      values: p.values || {},
      demo: false,
    }));

  const demo = DEMO.map((d) => ({ ...d, values: {}, demo: true }));

  return [...real, ...demo].filter((c) => !seen.has(String(c.userId)));
}

// type: "like" | "dislike" | "report". Возвращает { match }: стал ли лайк взаимным.
export function react(gameId, target, type) {
  const me = getCurrentUser();
  if (!me) return { match: false };

  const now = Date.now();
  const list = [...read(REACTIONS_KEY), makeEntry(me.id, target.userId, gameId, type, now)];

  if (
    type === "like" &&
    DEMO_LIKES_BACK.has(String(target.userId)) &&
    !hasLike(list, target.userId, me.id, gameId)
  ) {
    list.push({ ...makeEntry(target.userId, me.id, gameId, "like", now + 1), read: true });
  }

  write(REACTIONS_KEY, list);

  if (type === "report") {
    write(REPORTS_KEY, [
      ...read(REPORTS_KEY),
      { ...makeEntry(me.id, target.userId, gameId, "report", now), status: "open" },
    ]);
  }

  return { match: type === "like" && hasLike(list, target.userId, me.id, gameId) };
}

// Лайкнуть в ответ из уведомления
export function likeBack(gameId, userId) {
  return react(gameId, { userId }, "like");
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

// Анкета игрока в конкретной игре: { about, values }
function profileOf(gameId, userId) {
  const demo = DEMO.find((d) => same(d.userId, userId));
  if (demo) return { about: demo.about, photo: "", values: {} };
  const p = getProfilesOfGame(gameId).find((x) => same(x.userId, userId));
  return { about: p?.about ?? "", photo: p?.photo ?? "", values: p?.values ?? {} };
}

// Отклонить игрока, который лайкнул меня (уведомление пропадёт)
export function pass(gameId, userId) {
  return react(gameId, { userId }, "dislike");
}

// Лайки, которые поставили мне
export function getNotifications() {
  const me = getCurrentUser();
  if (!me) return [];
  const all = read(REACTIONS_KEY);
  return all
    .filter(
      (r) =>
        r.type === "like" &&
        same(r.toUserId, me.id) &&
        // не показываем тех, кого я уже отклонил
        !all.some(
          (x) =>
            x.type === "dislike" &&
            x.gameId === r.gameId &&
            same(x.fromUserId, me.id) &&
            same(x.toUserId, r.fromUserId),
        ),
    )
    .map((r) => ({
      id: r.id,
      ...profileOf(r.gameId, r.fromUserId),
      gameId: r.gameId,
      userId: String(r.fromUserId),
      nick: nickOf(r.fromUserId),
      createdAt: r.createdAt,
      read: r.read,
      // взаимный лайк: я тоже лайкнул этого игрока в этой игре
      match: hasLike(all, me.id, r.fromUserId, r.gameId),
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

// Взаимные лайки в рамках одной игры: [{ gameId, userId, nick, contact, matchedAt }]
export function getMatches() {
  const me = getCurrentUser();
  if (!me) return [];
  const all = read(REACTIONS_KEY);
  const out = new Map();

  for (const r of all) {
    if (r.type !== "like" || !same(r.fromUserId, me.id)) continue;
    const back = all.find(
      (x) =>
        x.type === "like" &&
        x.gameId === r.gameId &&
        same(x.fromUserId, r.toUserId) &&
        same(x.toUserId, me.id),
    );
    if (!back) continue;
    const other = getUserById(r.toUserId);
    if (other?.ir_banots) continue;
    out.set(`${r.gameId}:${r.toUserId}`, {
      gameId: r.gameId,
      userId: String(r.toUserId),
      nick: nickOf(r.toUserId),
      contact: other?.kontakt_informacija || "",
      matchedAt: Math.max(r.createdAt, back.createdAt),
    });
  }

  return [...out.values()].sort((a, b) => b.matchedAt - a.matchedAt);
}

export function findMatch(gameId, userId) {
  return getMatches().find((m) => m.gameId === gameId && same(m.userId, userId)) || null;
}
