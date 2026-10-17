import { apiRequest } from "./api";
import { getGames } from "./store";

export async function hasProfile(gameId) {
  return Boolean(await getProfile(gameId));
}

export async function getProfile(gameId) {
  const { profile } = await apiRequest(`/games/${encodeURIComponent(gameId)}/profiles/me`, {
    auth: true,
  });
  return profile;
}

export async function getMyProfiles() {
  const games = await getGames();
  const profiles = await Promise.all(
    games.map(async (game) => {
      const profile = await getProfile(game.id);
      return profile ? { ...profile, gameId: game.id } : null;
    }),
  );
  return profiles.filter(Boolean).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export async function saveProfile(gameId, data) {
  const { profile } = await apiRequest(`/games/${encodeURIComponent(gameId)}/profiles/me`, {
    method: "PUT",
    auth: true,
    body: { about: data.about, values: data.values },
  });
  return profile;
}

export async function deleteProfile(gameId) {
  await apiRequest(`/games/${encodeURIComponent(gameId)}/profiles/me`, {
    method: "DELETE",
    auth: true,
  });
}

export async function getProfilesOfGame(gameId) {
  const { profiles } = await apiRequest(`/games/${encodeURIComponent(gameId)}/profiles`, {
    auth: true,
  });
  return profiles;
}
