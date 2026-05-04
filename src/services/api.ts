import axios, {
    AxiosHeaders,
    type AxiosError,
    type InternalAxiosRequestConfig,
} from 'axios';
import { notifyInvalidation, type QueryTag } from './queryInvalidation';

const rawApiUrl = import.meta.env.VITE_API_URL?.trim();

if (!rawApiUrl) {
    throw new Error('Missing VITE_API_URL. Add it to your environment before starting the app.');
}

const withApiBasePath = (value: string) => {
    const trimmed = value.replace(/\/+$/, '');
    return trimmed === '/api' || trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const API_URL = withApiBasePath(rawApiUrl);

const ACCESS_TOKEN_KEY = 'runflow_access_token';

let inMemoryAccessToken: string | null = null;
let inMemoryRefreshToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

interface TokenResponse {
    access_token?: string;
    refresh_token?: string;
}

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

const isBrowser = typeof window !== 'undefined';

const readSessionStorage = (key: string) => {
    if (!isBrowser) {
        return null;
    }

    try {
        return window.sessionStorage.getItem(key);
    } catch {
        return null;
    }
};

const writeSessionStorage = (key: string, value: string | null) => {
    if (!isBrowser) {
        return;
    }

    try {
        if (value === null) {
            window.sessionStorage.removeItem(key);
            return;
        }

        window.sessionStorage.setItem(key, value);
    } catch {
        // Ignore storage write failures and keep the in-memory token only.
    }
};

const setAuthorizationHeader = (config: InternalAxiosRequestConfig, token: string) => {
    const headers = config.headers instanceof AxiosHeaders
        ? config.headers
        : new AxiosHeaders(config.headers);
    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;
};

const setAccessToken = (token: string | null) => {
    inMemoryAccessToken = token;
    writeSessionStorage(ACCESS_TOKEN_KEY, token);
};

const setRefreshToken = (token: string | null) => {
    inMemoryRefreshToken = token;
};

const normalizeToken = (token?: string | null) => {
    if (typeof token !== 'string') {
        return null;
    }

    const trimmedToken = token.trim();
    return trimmedToken.length > 0 ? trimmedToken : null;
};

export const getAccessToken = () => {
    if (inMemoryAccessToken) {
        return inMemoryAccessToken;
    }

    const storedToken = readSessionStorage(ACCESS_TOKEN_KEY);
    if (storedToken) {
        inMemoryAccessToken = storedToken;
    }

    return storedToken;
};

const decodeJwtPayload = (token: string) => {
    const [, payload] = token.split('.');
    if (!payload) {
        return null;
    }

    try {
        const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
        const paddedPayload = normalizedPayload.padEnd(
            normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
            '='
        );
        return JSON.parse(window.atob(paddedPayload)) as { exp?: unknown };
    } catch {
        return null;
    }
};

export const shouldRefreshAccessToken = (token: string | null = getAccessToken(), leewaySeconds = 30) => {
    if (!token) {
        return true;
    }

    const payload = decodeJwtPayload(token);
    if (typeof payload?.exp !== 'number') {
        return true;
    }

    return payload.exp <= Math.floor(Date.now() / 1000) + leewaySeconds;
};

export const api = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
        if (token) {
            setAuthorizationHeader(config, token);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ── snake_case → camelCase normalizer ───────────────────────────────────────

function toCamelCase(str: string): string {
    return str.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function normalizeKeys(obj: unknown): unknown {
    if (Array.isArray(obj)) return obj.map(normalizeKeys);
    if (obj !== null && typeof obj === 'object') {
        return Object.fromEntries(
            Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
                toCamelCase(k),
                normalizeKeys(v),
            ])
        );
    }
    return obj;
}

function normalizeResponseData(data: unknown): unknown {
    if (data == null || typeof data !== 'object') return data;
    return normalizeKeys(data);
}

function normalizeRequestPath(rawUrl?: string): string {
    if (!rawUrl) return '/';
    try {
        const path = new URL(rawUrl, 'http://runflow.local').pathname;
        return (path.replace(/^\/api(?=\/|$)/, '').replace(/\/+$/, '') || '/');
    } catch {
        return rawUrl.replace(/^\/api(?=\/|$)/, '').replace(/\/+$/, '') || '/';
    }
}

function mutationInvalidationTags(method?: string, rawUrl?: string): QueryTag[] {
    const verb = method?.toUpperCase();
    if (!verb || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(verb)) return [];

    const path = normalizeRequestPath(rawUrl);
    const tags = new Set<QueryTag>();
    const add = (...next: QueryTag[]) => next.forEach(tag => tags.add(tag));

    if (path === '/clans' && verb === 'POST') add('clans', 'my-clan', 'wars');
    if (path === '/clans/join' && verb === 'POST') add('clans', 'my-clan', 'wars');
    if (/^\/clans\/join\/[^/]+$/.test(path) && verb === 'POST') add('clans', 'my-clan', 'wars');

    let match = path.match(/^\/clans\/([^/]+)\/join$/);
    if (match && verb === 'POST') add('clans', 'my-clan', 'wars', `clan:${match[1]}`);

    match = path.match(/^\/clans\/([^/]+)\/leave$/);
    if (match && verb === 'POST') add('clans', 'my-clan', 'wars', `clan:${match[1]}`, `clan-members:${match[1]}`);

    match = path.match(/^\/clans\/([^/]+)\/members\/[^/]+$/);
    if (match && ['PUT', 'PATCH', 'DELETE'].includes(verb)) {
        add('my-clan', 'wars', `clan:${match[1]}`, `clan-members:${match[1]}`);
    }

    match = path.match(/^\/clans\/([^/]+)\/messages$/);
    if (match && verb === 'POST') add(`clan-messages:${match[1]}`);

    match = path.match(/^\/clans\/([^/]+)\/invites$/);
    if (match && verb === 'POST') add(`clan:${match[1]}`);

    match = path.match(/^\/game\/wars\/([^/]+)/);
    if (match) {
        add('wars', `war:${match[1]}`);
        if (path.includes('/scoreboard') || path.includes('/credit') || path.includes('/vote')) {
            add(`war-scoreboard:${match[1]}`);
        }
        if (path.includes('/highlights')) add(`war-highlights:${match[1]}`);
        if (path.includes('/timeline')) add(`war-timeline:${match[1]}`);
    }

    match = path.match(/^\/game\/battles\/([^/]+)/);
    if (match) add('wars', `battle:${match[1]}`);

    if (path.includes('/vote')) add('wars');
    if (path.includes('/credit')) add('wars', 'activities', 'challenges');

    match = path.match(/^\/challenges\/([^/]+)/);
    if (match) add('challenges', `challenge:${match[1]}`);

    if (path.startsWith('/activities')) add('activities', 'challenges', 'wars');
    if (path.startsWith('/notifications')) add('notifications');
    if (path.startsWith('/training')) add('training');
    if (path.startsWith('/equipment')) add('equipment');
    if (path.startsWith('/profiles')) add('profile');

    return [...tags];
}

api.interceptors.response.use(
    (response) => {
        response.data = normalizeResponseData(response.data);
        notifyInvalidation(
            mutationInvalidationTags(response.config.method, response.config.url),
            { method: response.config.method?.toUpperCase(), url: normalizeRequestPath(response.config.url) }
        );
        return response;
    },
    async (error: AxiosError) => {
        if (error.response) {
            error.response.data = normalizeResponseData(error.response.data);
        }

        const originalRequest = error.config as RetriableRequestConfig | undefined;
        const requestUrl = originalRequest?.url ?? '';
        const isRefreshRequest = requestUrl.includes('/auth/refresh');

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isRefreshRequest) {
            originalRequest._retry = true;

            const accessToken = await refreshAccessToken();
            if (accessToken) {
                setAuthorizationHeader(originalRequest, accessToken);
                return api(originalRequest);
            }

            return Promise.reject(error);
        }

        return Promise.reject(error);
    }
);

export const refreshAccessToken = async (refreshToken?: string | null) => {
    const tokenForBody = normalizeToken(refreshToken) ?? inMemoryRefreshToken;

    if (!refreshPromise) {
        refreshPromise = (async () => {
            try {
                const refreshPayload = tokenForBody ? { refresh_token: tokenForBody } : {};
                const response = await axios.post<TokenResponse>(
                    `${API_URL}/auth/refresh`,
                    refreshPayload,
                    {
                        withCredentials: true,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                );

                const { access_token, refresh_token } = response.data;

                if (!access_token) {
                    throw new Error('Refresh response did not include an access token.');
                }

                setTokens(access_token, refresh_token);
                return access_token;
            } catch {
                clearTokens();
                return null;
            } finally {
                refreshPromise = null;
            }
        })();
    }

    return refreshPromise;
};

export const setTokens = (accessToken: string, refreshToken?: string) => {
    const normalizedAccessToken = normalizeToken(accessToken);
    const normalizedRefreshToken = normalizeToken(refreshToken);

    if (!normalizedAccessToken) {
        clearTokens();
        return;
    }

    setAccessToken(normalizedAccessToken);
    setRefreshToken(normalizedRefreshToken);
};

export const clearTokens = () => {
    setAccessToken(null);
    setRefreshToken(null);
};
