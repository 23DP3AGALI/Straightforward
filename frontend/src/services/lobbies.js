import { apiRequest } from "./api";

export async function getMyLobbies() {
  const { lobbies } = await apiRequest("/lobbies/mine", { auth: true });
  return lobbies;
}

export async function getLobbies(gameId) {
  const { lobbies } = await apiRequest(`/games/${encodeURIComponent(gameId)}/lobbies`, { auth: true });
  return lobbies;
}

export async function createLobby(gameId, data) {
  return apiRequest(`/games/${encodeURIComponent(gameId)}/lobbies`, {
    method: "POST",
    auth: true,
    body: data,
  });
}

export async function joinLobby(gameId, lobbyId) {
  return apiRequest(`/games/${encodeURIComponent(gameId)}/lobbies/${encodeURIComponent(lobbyId)}/join`, {
    method: "POST",
    auth: true,
  });
}

export async function leaveLobby(gameId, lobbyId) {
  return apiRequest(`/games/${encodeURIComponent(gameId)}/lobbies/${encodeURIComponent(lobbyId)}/members/me`, {
    method: "DELETE",
    auth: true,
  });
}

export async function closeLobby(gameId, lobbyId) {
  return apiRequest(`/games/${encodeURIComponent(gameId)}/lobbies/${encodeURIComponent(lobbyId)}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function getLobbyMessages(lobbyId) {
  return apiRequest(`/lobbies/${encodeURIComponent(lobbyId)}/messages`, { auth: true });
}

export async function sendLobbyMessage(lobbyId, text) {
  const { message } = await apiRequest(`/lobbies/${encodeURIComponent(lobbyId)}/messages`, {
    method: "POST",
    auth: true,
    body: { text },
  });
  return message;
}
