import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { resolveError } from '../services/errors';
import { usePolling } from './usePolling';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Season {
    id: string;
    number?: number | null;
    scope: 'global' | 'city';
    city: string | null;
    startsAt: string;
    endsAt: string;
    status: string;
    rulesetVersion: string;
}

export interface Division {
    id: string;
    seasonId: string;
    name: string;
    minRating: number;
    maxRating: number;
    tierOrder: number;
}

export interface ClanDivisionMembership {
    seasonId: string;
    clanId: string;
    divisionId: string;
    ratingAtStart: number;
    finalRank: number | null;
    finalRating: number | null;
    promoted: boolean;
    relegated: boolean;
}

export interface ClanRating {
    clanId: string;
    scope: 'global' | 'city';
    city: string | null;
    rating: number;
    sigma: number | null;
    wins: number;
    losses: number;
    draws: number;
}

export interface SeasonData {
    season: Season | null;
    divisions: Division[];
    myClanDivision: ClanDivisionMembership | null;
    daysRemaining: number;
    rating: ClanRating | null;
}

const EMPTY: SeasonData = {
    season: null,
    divisions: [],
    myClanDivision: null,
    daysRemaining: 0,
    rating: null,
};

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useSeasonData(clanId?: string | null, { enabled = true } = {}) {
    const [data, setData] = useState<SeasonData>(EMPTY);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        if (!enabled) { setLoading(false); return; }
        setLoading(true);
        try {
            const seasonRes = await api.get('/game/seasons/current');
            const sd = seasonRes.data;

            let rating: ClanRating | null = null;
            if (clanId && sd.season) {
                const rRes = await api.get(`/game/ratings/clans/${clanId}`).catch(() => null);
                rating = rRes?.data?.rating ?? null;
            }

            setData({
                season: sd.season ?? null,
                divisions: sd.divisions ?? [],
                myClanDivision: sd.myClanDivision ?? null,
                daysRemaining: sd.daysRemaining ?? 0,
                rating,
            });
            setError(null);
        } catch (e) {
            const status = (e as any)?.response?.status;
            if (status === 404) {
                setData(EMPTY);
                setError(null);
            } else {
                setError(resolveError(e, 'Impossible de charger la saison.'));
            }
        } finally {
            setLoading(false);
        }
    }, [enabled, clanId]);

    usePolling(fetch, { enabled, intervalMs: 5 * 60 * 1000 });

    return { data, loading, error, refresh: fetch };
}
