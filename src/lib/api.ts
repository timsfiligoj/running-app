/**
 * Client for the Cloudflare Worker backend (worker/). Every call resolves to
 * `{ data, error }` so callers can treat a network failure and an API error
 * the same way.
 */
export const API_URL: string =
  import.meta.env.VITE_API_URL ?? 'https://running-app-api.emba-promocije.workers.dev';

export interface ApiResult<T> {
  data: T | null;
  error: string | null;
}

export async function api<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || (json && typeof json === 'object' && 'error' in json)) {
      return { data: null, error: json?.error ?? `HTTP ${res.status}` };
    }
    return { data: json as T, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Network error' };
  }
}
