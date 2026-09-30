// Временное хранилище игр и их полей анкеты (localStorage).
// Позже заменим на запросы к backend (таблицы spele и game_fields).
import { games as seed } from "../data/games";

const KEY = "sf_games";

export function getGames() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(saved)) return saved;
  } catch {
    /* используем стартовый список */
  }
  return seed.map((g) => ({ ...g, fields: g.fields ?? [] }));
}

export function saveGames(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function getGame(id) {
  return getGames().find((g) => g.id === id);
}

export function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 30);
}
