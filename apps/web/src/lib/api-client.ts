const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const REFRESH_ID_KEY = "nomadly:refresh-request";
const RETRY_WINDOW_MS = 30_000;
let refreshInFlight: Promise<boolean> | null = null;

function getRequestId(): string {
  const now = Date.now();
  const raw = window.localStorage.getItem(REFRESH_ID_KEY);
  if (raw) {
    try {
      const saved = JSON.parse(raw) as { id: string; createdAt: number };
      if (saved.id && now - saved.createdAt < RETRY_WINDOW_MS) return saved.id;
    } catch { /* replace malformed local state */ }
  }
  const value = { id: crypto.randomUUID(), createdAt: now };
  window.localStorage.setItem(REFRESH_ID_KEY, JSON.stringify(value));
  return value.id;
}

export async function refreshSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const requestId = getRequestId();
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "X-Refresh-Request-Id": requestId },
      });
      if (!response.ok) {
        window.localStorage.removeItem(REFRESH_ID_KEY);
        return false;
      }
      const result = await response.json() as { authenticated?: boolean };
      if (!result.authenticated) window.localStorage.removeItem(REFRESH_ID_KEY);
      return Boolean(result.authenticated);
    } catch (error) {
      // Retain the same request ID: the server may have committed rotation before
      // the response was lost. A retry within the server's window gets the same tokens.
      throw error;
    }
  })();

  try { return await refreshInFlight; }
  finally { refreshInFlight = null; }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  const first = await fetch(url, { ...init, credentials: init.credentials ?? "include" });
  const method = (init.method ?? "GET").toUpperCase();
  const safeRetry = ["GET", "HEAD", "OPTIONS"].includes(method);
  const authEndpoint = /\/auth\/(login|register|refresh|logout)(\?|$)/.test(path);
  if (first.status !== 401 || !safeRetry || authEndpoint) return first;
  if (!(await refreshSession())) return first;
  return fetch(url, { ...init, credentials: init.credentials ?? "include" });
}

export function login(email: string, password: string) {
  return apiFetch("/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export function register(input: { email: string; username: string; displayName: string; password: string }) {
  return apiFetch("/auth/register", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function logout() {
  const response = await apiFetch("/auth/logout", { method: "POST" });
  if (typeof window !== "undefined") window.localStorage.removeItem(REFRESH_ID_KEY);
  return response;
}
