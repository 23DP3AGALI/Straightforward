import { apiRequest } from "./api";

export async function getGames() {
  const { games } = await apiRequest("/games");
  return games;
}

export async function getGame(id) {
  const { game } = await apiRequest(`/games/${encodeURIComponent(id)}`);
  return game;
}

export async function createGame(game) {
  const { game: created } = await apiRequest("/games", {
    method: "POST",
    auth: true,
    body: game,
  });
  return created;
}

export async function saveGame(id, game) {
  const { game: saved } = await apiRequest(`/games/${encodeURIComponent(id)}`, {
    method: "PATCH",
    auth: true,
    body: game,
  });
  return saved;
}

export async function deleteGame(id) {
  await apiRequest(`/games/${encodeURIComponent(id)}`, { method: "DELETE", auth: true });
}
