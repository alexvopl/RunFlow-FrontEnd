const trimUrl = (value?: string) => value?.trim().replace(/\/+$/, '');

const resolveUrl = (value?: string, fallback?: string) => {
    const candidate = trimUrl(value) ?? trimUrl(fallback);
    if (!candidate) {
        return null;
    }

    try {
        return new URL(candidate).toString().replace(/\/+$/, '');
    } catch {
        return null;
    }
};

const appUrlFromWindow = typeof window !== 'undefined' ? window.location.origin : undefined;

export const APP_URL = resolveUrl(import.meta.env.VITE_APP_URL, appUrlFromWindow);

export const AUTH_REDIRECT_URL = resolveUrl(
    import.meta.env.VITE_AUTH_REDIRECT_URL,
    APP_URL ? `${APP_URL}/auth/callback` : undefined,
);

export const PASSWORD_RESET_URL = resolveUrl(
    import.meta.env.VITE_PASSWORD_RESET_URL,
    APP_URL ? `${APP_URL}/reset-password` : undefined,
);
