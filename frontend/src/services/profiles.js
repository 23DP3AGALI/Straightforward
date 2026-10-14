// Временная заглушка без БД: анкеты пользователей в localStorage.
// У каждого пользователя свои анкеты: { [userId]: { [gameId]: анкета } }.
// Позже заменим на запросы к backend (таблицы anketa и anketa_field_value).
import { getCurrentUser } from "./auth";

const KEY = "sf_profiles_v3";

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function userProfiles() {
  const user = getCurrentUser();
  return user ? read()[user.id] || {} : {};
}

function write(profiles) {
  const user = getCurrentUser();
  if (!user) return;
  const all = read();
  all[user.id] = profiles;
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function hasProfile(gameId) {
  return Boolean(userProfiles()[gameId]);
}

export function getProfile(gameId) {
  return userProfiles()[gameId] || null;
}

// Все анкеты текущего пользователя: [{ gameId, about, values, updatedAt }]
export function getMyProfiles() {
  return Object.entries(userProfiles())
    .map(([gameId, data]) => ({ gameId, ...data }))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function saveProfile(gameId, data) {
  write({ ...userProfiles(), [gameId]: { ...data, updatedAt: Date.now() } });
}

export function deleteProfile(gameId) {
  const next = { ...userProfiles() };
  delete next[gameId];
  write(next);
}

// Анкеты всех пользователей для одной игры: [{ userId, about, values, updatedAt }]
export function getProfilesOfGame(gameId) {
  return Object.entries(read())
    .filter(([, byGame]) => byGame?.[gameId])
    .map(([userId, byGame]) => ({ userId, ...byGame[gameId] }));
}
