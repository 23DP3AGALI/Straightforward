import { getCurrentUser } from "./auth";
import { apiRequest } from "./api";
import { getProfilesOfGame } from "./profiles";

const SEEN_KEY = "sf_seen_profiles_v1";

function read(key, fallback = []) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function seenKey(gameId) {
  return `${getCurrentUser()?.id}:${gameId}`;
}

export async function getFeed(gameId) {
  if (!getCurrentUser()) return [];
  const profiles = await getProfilesOfGame(gameId);
  const seen = new Set(read(SEEN_KEY, {})[seenKey(gameId)] || []);
  return profiles
    .filter((profile) => !seen.has(String(profile.id)))
    .map((profile) => ({ ...profile, profileId: profile.id, photo: profile.avatar || "" }));
}

export async function react(gameId, target, type, reason) {
  if (!getCurrentUser()) throw new Error("Sign in to react to profiles.");
  let match = false;
  if (type === "report") {
    await apiRequest(
      `/games/${encodeURIComponent(gameId)}/profiles/${encodeURIComponent(target.profileId)}/reports`,
      { method: "POST", auth: true, body: { reason } },
    );
  } else {
    const result = await apiRequest(
      `/games/${encodeURIComponent(gameId)}/profiles/${encodeURIComponent(target.profileId)}/reactions`,
      { method: "POST", auth: true, body: { type } },
    );
    match = Boolean(result?.match);
  }

  const key = seenKey(gameId);
  const seen = read(SEEN_KEY, {});
  seen[key] = [...new Set([...(seen[key] || []), String(target.profileId)])];
  localStorage.setItem(SEEN_KEY, JSON.stringify(seen));

  return { match };
}

export function resetReactions(gameId) {
  const seen = read(SEEN_KEY, {});
  delete seen[seenKey(gameId)];
  localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
}
