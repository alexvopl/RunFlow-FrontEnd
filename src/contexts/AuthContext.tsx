import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
    api,
    setTokens,
    clearTokens,
    getAccessToken,
    refreshAccessToken,
    shouldRefreshAccessToken,
} from '../services/api';
import {
    resolveAuthSession,
    type AuthResponsePayload,
    type AuthUserPayload,
} from '../services/auth-session';
import { AUTH_REDIRECT_URL } from '../services/app-config';

interface User {
    id: string;
    email: string;
    name?: string;
    trophies?: number;
    followersCount?: number;
    followingCount?: number;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, acceptTerms: boolean) => Promise<SignupResult>;
    completeSession: (accessToken: string, refreshToken?: string) => Promise<void>;
    logout: () => void;
}

type SignupResult =
    | { status: 'authenticated' }
    | { status: 'pending_confirmation'; email: string };

interface ProfilePayload {
    id?: string;
    email?: string;
    displayName?: string;
    display_name?: string;
    username?: string;
    trophies?: number;
    followersCount?: number;
    followers_count?: number;
    followingCount?: number;
    following_count?: number;
}

interface ProfileResponse {
    profile?: ProfilePayload | null;
}

const isProfileResponse = (payload: ProfileResponse | ProfilePayload): payload is ProfileResponse =>
    Object.prototype.hasOwnProperty.call(payload, 'profile');

const extractProfile = (payload: ProfileResponse | ProfilePayload | null): ProfilePayload | null => {
    if (!payload) {
        return null;
    }

    return isProfileResponse(payload) ? payload.profile ?? null : payload;
};

const mapUser = (authData: AuthUserPayload | null | undefined, profileData?: ProfilePayload | null): User => ({
    id: authData?.userId ?? authData?.user_id ?? authData?.id ?? profileData?.id ?? '',
    email: authData?.email ?? profileData?.email ?? '',
    name: profileData?.displayName ?? profileData?.display_name ?? profileData?.username ?? authData?.name,
    trophies: profileData?.trophies ?? authData?.trophies,
    followersCount: profileData?.followersCount ?? profileData?.followers_count ?? authData?.followersCount ?? authData?.followers_count,
    followingCount: profileData?.followingCount ?? profileData?.following_count ?? authData?.followingCount ?? authData?.following_count,
});

const fetchCurrentUser = async () => {
    const [whoamiRes, profileRes] = await Promise.all([
        api.get<AuthUserPayload>('/auth/whoami'),
        api.get<ProfileResponse | ProfilePayload>('/profiles/me').catch(() => ({ data: null })),
    ]);
    const profile = extractProfile(profileRes.data);
    return mapUser(whoamiRes.data, profile);
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = getAccessToken();
            const usableToken = shouldRefreshAccessToken(token)
                ? await refreshAccessToken()
                : token;

            if (!usableToken) {
                setIsLoading(false);
                return;
            }

            try {
                setUser(await fetchCurrentUser());
            } catch (error) {
                console.error('Failed to fetch user profile:', error);
                // Token might be invalid, clear it
                clearTokens();
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    const completeSession = async (accessToken: string, refreshToken?: string) => {
        setTokens(accessToken, refreshToken);
        if (refreshToken) {
            await refreshAccessToken(refreshToken);
        }
        setUser(await fetchCurrentUser());
    };

    const login = async (email: string, password: string) => {
        const response = await api.post<AuthResponsePayload>('/auth/login', { email, password });
        const { accessToken, refreshToken, user } = resolveAuthSession(response.data);

        if (!accessToken || !user) {
            throw new Error('Login response did not include a valid authenticated session.');
        }

        await completeSession(accessToken, refreshToken ?? undefined);
    };

    const signup = async (email: string, password: string, acceptTerms: boolean): Promise<SignupResult> => {
        const response = await api.post<AuthResponsePayload>('/auth/signup', {
            email,
            password,
            acceptTerms,
            redirectTo: AUTH_REDIRECT_URL ?? undefined,
        });
        const { accessToken, refreshToken, user, requiresEmailConfirmation } = resolveAuthSession(response.data);

        if (!accessToken || !user || requiresEmailConfirmation) {
            clearTokens();
            setUser(null);
            return { status: 'pending_confirmation', email };
        }

        await completeSession(accessToken, refreshToken ?? undefined);
        return { status: 'authenticated' };
    };

    const logout = () => {
        const accessToken = getAccessToken();
        const logoutRequest = accessToken
            ? api.post('/auth/logout', undefined, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })
            : Promise.resolve();

        void logoutRequest.catch(err => console.error('Logout API error', err));
        clearTokens();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!user,
            isLoading,
            login,
            signup,
            completeSession,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
