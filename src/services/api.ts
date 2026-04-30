import axios, {
    AxiosHeaders,
    type AxiosError,
    type InternalAxiosRequestConfig,
} from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL?.trim();

if (!rawApiUrl) {
    throw new Error('Missing VITE_API_URL. Add it to your environment before starting the app.');
}

const API_URL = rawApiUrl.replace(/\/+$/, '');

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

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
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
