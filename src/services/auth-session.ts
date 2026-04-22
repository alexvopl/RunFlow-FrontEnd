export interface AuthUserPayload {
    userId?: string;
    id?: string;
    email?: string;
    name?: string;
    trophies?: number;
    followersCount?: number;
    followingCount?: number;
}

interface SessionPayload {
    access_token?: string | null;
    refresh_token?: string | null;
    user?: AuthUserPayload | null;
}

export interface AuthResponsePayload {
    access_token?: string | null;
    refresh_token?: string | null;
    user?: AuthUserPayload | null;
    session?: SessionPayload | null;
}

export interface ResolvedAuthSession {
    accessToken: string | null;
    refreshToken: string | null;
    user: AuthUserPayload | null;
    requiresEmailConfirmation: boolean;
}

const normalizeToken = (value?: string | null) => {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
};

export const resolveAuthSession = (payload: AuthResponsePayload | null | undefined): ResolvedAuthSession => {
    const session = payload?.session ?? null;
    const accessToken = normalizeToken(payload?.access_token) ?? normalizeToken(session?.access_token);
    const refreshToken = normalizeToken(payload?.refresh_token) ?? normalizeToken(session?.refresh_token);
    const user = payload?.user ?? session?.user ?? null;

    return {
        accessToken,
        refreshToken,
        user,
        requiresEmailConfirmation: !accessToken,
    };
};
