/**
 * API client for FoulPlay backend.
 * Uses EXPO_PUBLIC_API_URL and attaches Bearer token from Clerk.
 * On 401, calls onUnauthorized (e.g. sign out and redirect).
 */

const getApiUrl = (): string => {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) throw new Error("EXPO_PUBLIC_API_URL is not set");
  return url.replace(/\/$/, "");
};

export type OnUnauthorized = () => void | Promise<void>;

export type ApiFetchOptions = {
  getToken: () => Promise<string | null>;
  onUnauthorized?: OnUnauthorized;
};

export async function apiFetch<T = unknown>(
  path: string,
  requestInit: RequestInit = {},
  options: ApiFetchOptions
): Promise<{ data: T; ok: true } | { error: string; ok: false; status: number }> {
  const { getToken, onUnauthorized } = options;
  const base = getApiUrl();
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((requestInit.headers ?? {}) as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, { ...requestInit, headers });
  if (res.status === 401 && onUnauthorized) await onUnauthorized();
  if (!res.ok) {
    let error = res.statusText;
    try {
      const body = await res.json();
      if (body?.error) error = body.error;
    } catch {
      // ignore
    }
    return { ok: false, error, status: res.status };
  }
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: true, data };
}

export { getApiUrl };
