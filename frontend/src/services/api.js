const API_URL = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEY = "sf_api_token";

export async function apiRequest(path, { method = "GET", body, auth = false } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (!token) throw new Error("Sign in to use this feature.");
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    const url = `${API_URL.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Could not connect to the API. Make sure the backend is running.");
  }

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || payload.message || `API request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
