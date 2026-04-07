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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = getAccessToken();
            if (!token) {
                setIsLoading(false);
                return;
            }

            try {
                const [whoamiRes, profileRes] = await Promise.all([
                    api.get('/auth/whoami'),
                    api.get('/profiles/me').catch(() => ({ data: null }))
                ]);
                setUser({ ...whoamiRes.data, ...profileRes.data });
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
        const response = await api.post('/auth/login', { email, password });
        const { access_token, refresh_token, user } = response.data;

        setTokens(access_token, refresh_token);
        setUser(user);
    };

    const signup = async (email: string, password: string, acceptTerms: boolean) => {
        const response = await api.post('/auth/signup', { email, password, acceptTerms });
        const { access_token, refresh_token, user } = response.data;

        setTokens(access_token, refresh_token);
        setUser(user);
    };

    const logout = () => {
        // Optional: Call logout endpoint
        api.post('/auth/logout').catch(err => console.error('Logout API error', err));

        clearTokens();
        setUser(null);
        window.location.href = '/login';
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
