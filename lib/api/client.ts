export const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const TOKEN_KEY = "az_joinery_token";

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured for this deployment.");
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  const response = await fetch(API_URL + path, {
    ...init,
    headers: { ...headers, ...((init && init.headers) as Record<string, string> | undefined) },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Request to " + path + " failed (" + response.status + ")");
  }

  return (await response.json()) as T;
}
