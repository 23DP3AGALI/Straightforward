import { getCurrentUser } from "./auth";
import { apiRequest } from "./api";
import { getProfilesOfGame } from "./profiles";

const SEEN_KEY = "sf_seen_profiles_v1";
const MATCHES_KEY = "sf_matches_v1";
const same = (a, b) => String(a) === String(b);

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
    .map((profile) => ({ ...profile, profileId: profile.id, demo: false, photo: "" }));
}

export async function react(gameId, target, type, reason) {
  if (!getCurrentUser()) throw new Error("Sign in to react to profiles.");
  let result;
  if (type === "report") {
    result = await apiRequest(
      `/games/${encodeURIComponent(gameId)}/profiles/${encodeURIComponent(target.profileId)}/reports`,
      { method: "POST", auth: true, body: { reason } },
    );
  } else {
    result = await apiRequest(
      `/games/${encodeURIComponent(gameId)}/profiles/${encodeURIComponent(target.profileId)}/reactions`,
      { method: "POST", auth: true, body: { type } },
    );
  }

  const key = seenKey(gameId);
  const seen = read(SEEN_KEY, {});
  seen[key] = [...new Set([...(seen[key] || []), String(target.profileId)])];
  localStorage.setItem(SEEN_KEY, JSON.stringify(seen));

  if (result?.match) {
    const matches = read(MATCHES_KEY);
    matches.push({
      ownerId: String(getCurrentUser().id),
      gameId: String(gameId),
      userId: String(target.userId),
      nick: target.nick,
      matchedAt: Date.now(),
    });
    localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
  }
  return { match: Boolean(result?.match) };
}

export function resetReactions(gameId) {
  const seen = read(SEEN_KEY, {});
  delete seen[seenKey(gameId)];
  localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
}

export const isDemo = () => false;

export function getMatches() {
  const user = getCurrentUser();
  return user
    ? read(MATCHES_KEY).filter((match) => same(match.ownerId, user.id))
    : [];
}

export function findMatch(gameId, userId) {
  return getMatches().find((match) => same(match.gameId, gameId) && same(match.userId, userId)) || null;
}
