import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api, setTokens, clearTokens, getAccessToken } from '../services/api';

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
    signup: (email: string, password: string, acceptTerms: boolean) => Promise<void>;
    logout: () => void;
}

interface AuthUserPayload {
    userId?: string;
    id?: string;
    email?: string;
    name?: string;
    trophies?: number;
    followersCount?: number;
    followingCount?: number;
}

interface ProfilePayload {
    id?: string;
    email?: string;
    display_name?: string;
    username?: string;
    trophies?: number;
    followers_count?: number;
    following_count?: number;
}

interface ProfileResponse {
    profile?: ProfilePayload | null;
}

interface AuthResponse {
    access_token: string;
    refresh_token?: string;
    user: AuthUserPayload;
}

const isProfileResponse = (payload: ProfileResponse | ProfilePayload): payload is ProfileResponse =>
    Object.prototype.hasOwnProperty.call(payload, 'profile');

const extractProfile = (payload: ProfileResponse | ProfilePayload | null): ProfilePayload | null => {
    if (!payload) {
        return null;
    }

    return isProfileResponse(payload) ? payload.profile ?? null : payload;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const mapUser = (authData: AuthUserPayload | null | undefined, profileData?: ProfilePayload | null): User => ({
        id: authData?.userId ?? authData?.id ?? profileData?.id ?? '',
        email: authData?.email ?? profileData?.email ?? '',
        name: profileData?.display_name ?? profileData?.username ?? authData?.name,
        trophies: profileData?.trophies ?? authData?.trophies,
        followersCount: profileData?.followers_count ?? authData?.followersCount,
        followingCount: profileData?.following_count ?? authData?.followingCount,
    });

    useEffect(() => {
        const checkAuth = async () => {
            const token = getAccessToken();
            if (!token) {
                setIsLoading(false);
                return;
            }

            try {
                const [whoamiRes, profileRes] = await Promise.all([
                    api.get<AuthUserPayload>('/auth/whoami'),
                    api.get<ProfileResponse | ProfilePayload>('/profiles/me').catch(() => ({ data: null }))
                ]);
                const profile = extractProfile(profileRes.data);
                setUser(mapUser(whoamiRes.data, profile));
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

    const login = async (email: string, password: string) => {
        const response = await api.post<AuthResponse>('/auth/login', { email, password });
        const { access_token, refresh_token, user } = response.data;

        setTokens(access_token, refresh_token);
        setUser(mapUser(user));
    };

    const signup = async (email: string, password: string, acceptTerms: boolean) => {
        const response = await api.post<AuthResponse>('/auth/signup', { email, password, acceptTerms });
        const { access_token, refresh_token, user } = response.data;

        setTokens(access_token, refresh_token);
        setUser(mapUser(user));
    };

    const logout = () => {
        void api.post('/auth/logout').catch(err => console.error('Logout API error', err));
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
