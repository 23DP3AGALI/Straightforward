import { apiRequest, clearToken, getToken, saveToken } from "./api";

const SESSION_KEY = "sf_session_v1";

function saveSession(payload) {
  saveToken(payload.token);
  localStorage.setItem(SESSION_KEY, JSON.stringify(payload.user));
  return payload.user;
}

export async function register(details) {
  const payload = await apiRequest("/auth/register", { method: "POST", body: details });
  return saveSession(payload);
}

export async function login(email, password) {
  const payload = await apiRequest("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  return saveSession(payload);
}

export function getCurrentUser() {
  if (!getToken()) return null;
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
  } catch {
    return null;
  }
}

export function logout() {
  clearToken();
  localStorage.removeItem(SESSION_KEY);
}
