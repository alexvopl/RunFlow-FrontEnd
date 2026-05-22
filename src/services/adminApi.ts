import { api } from './api';

// ─── Admin key ─────────────────────────────────────────────────────────────────
// Stored in sessionStorage so it clears when the browser tab is closed.

const STORAGE_KEY = 'runflow_admin_key';

export const adminKey = {
    get(): string | null {
        try { return sessionStorage.getItem(STORAGE_KEY); } catch { return null; }
    },
    set(key: string): void {
        try {
            sessionStorage.setItem(STORAGE_KEY, key.trim());
        } catch (err) {
            console.warn('Failed to save admin key in storage:', err);
        }
    },
    clear(): void {
        try {
            sessionStorage.removeItem(STORAGE_KEY);
        } catch (err) {
            console.warn('Failed to remove admin key from storage:', err);
        }
    },
};

// ─── adminCall ─────────────────────────────────────────────────────────────────
// Reuses the existing api instance (auth token, camelCase normalization, etc.)
// and injects X-Admin-Key on every request.

export async function adminCall<T = unknown>(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    path: string,
    data?: unknown,
    params?: Record<string, string>,
): Promise<T> {
    const key = adminKey.get();
    const headers: Record<string, string> = {};
    if (key) headers['X-Admin-Key'] = key;
    const res = await api.request<T>({ method, url: path, data, params, headers });
    return res.data;
}
