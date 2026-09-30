// Временная заглушка без БД: анкеты пользователя по играм в localStorage.
// Позже заменим на запросы к backend (таблицы anketa и anketa_field_value).
const KEY = "sf_profiles_v2";

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function hasProfile(gameId) {
  return Boolean(read()[gameId]);
}

export function getProfile(gameId) {
  return read()[gameId] || null;
}

export function saveProfile(gameId, data) {
  const all = read();
  all[gameId] = data;
  localStorage.setItem(KEY, JSON.stringify(all));
}
