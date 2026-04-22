import { describe, expect, it } from 'vitest';
import { resolveAuthSession } from './auth-session';

describe('resolveAuthSession', () => {
    it('uses top-level login tokens when present', () => {
        const result = resolveAuthSession({
            access_token: 'access-token',
            refresh_token: 'refresh-token',
            user: { id: 'user-1', email: 'login@example.com' },
        });

        expect(result).toEqual({
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            user: { id: 'user-1', email: 'login@example.com' },
            requiresEmailConfirmation: false,
        });
    });

    it('uses nested signup session tokens when Supabase returns a session object', () => {
        const result = resolveAuthSession({
            user: { id: 'user-2', email: 'signup@example.com' },
            session: {
                access_token: 'nested-access-token',
                refresh_token: 'nested-refresh-token',
            },
        });

        expect(result).toEqual({
            accessToken: 'nested-access-token',
            refreshToken: 'nested-refresh-token',
            user: { id: 'user-2', email: 'signup@example.com' },
            requiresEmailConfirmation: false,
        });
    });

    it('marks signup as pending confirmation when no session exists', () => {
        const result = resolveAuthSession({
            user: { id: 'user-3', email: 'pending@example.com' },
            session: null,
        });

        expect(result).toEqual({
            accessToken: null,
            refreshToken: null,
            user: { id: 'user-3', email: 'pending@example.com' },
            requiresEmailConfirmation: true,
        });
    });

    it('ignores malformed empty tokens', () => {
        const result = resolveAuthSession({
            access_token: '   ',
            refresh_token: '',
            user: { id: 'user-4' },
        });

        expect(result).toEqual({
            accessToken: null,
            refreshToken: null,
            user: { id: 'user-4' },
            requiresEmailConfirmation: true,
        });
    });
});
