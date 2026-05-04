import { useState, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { resolveError } from '../services/errors';
import { HIGHLIGHTS_POLL_INTERVAL_MS, TIMELINE_POLL_INTERVAL_MS, WAR_POLL_INTERVAL_MS } from '../services/polling';
import { useInvalidation, type QueryTag } from '../services/queryInvalidation';
import { usePolling } from './usePolling';

export interface WarSummary {
    id: string;
    status: string;
    startsAt: string;
    endsAt: string;
    weekNumber: number;
    format?: string;
}

export interface WarOpponent {
    clanId: string;
    clanName: string;
    clanBadgeUrl?: string | null;
    points: number;
    rank: number;
}

export interface WarBattle {
    id: string;
    battleType: string;
    windowStart: string;
    windowEnd: string;
    status: string;
    battleOrder: number;
}

export interface WarHighlight {
    id: string;
    type: string;
    occurredAt: string;
    data: Record<string, unknown>;
}

export interface WarData {
    war: WarSummary | null;
    opponents: WarOpponent[];
    battles: WarBattle[];
    myParticipations: Array<{ battleId: string; score: number; status: string }>;
    hoursRemaining: number;
    scoreboard: Array<{ clanId: string; clanName: string; totalPoints: number; rank: number }>;
    highlights: WarHighlight[];
    timeline: WarHighlight[];
}

const EMPTY: WarData = {
    war: null,
    opponents: [],
    battles: [],
    myParticipations: [],
    hoursRemaining: 0,
    scoreboard: [],
    highlights: [],
    timeline: [],
};

interface UseWarDataOptions {
    enabled?: boolean;
    warIntervalMs?: number;
    highlightsIntervalMs?: number;
    timelineIntervalMs?: number;
}

export function useWarData(warId?: string, {
    enabled = true,
    warIntervalMs = WAR_POLL_INTERVAL_MS,
    highlightsIntervalMs = HIGHLIGHTS_POLL_INTERVAL_MS,
    timelineIntervalMs = TIMELINE_POLL_INTERVAL_MS,
}: UseWarDataOptions = {}) {
    const [data, setData] = useState<WarData>(EMPTY);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState<string | null>(null);
    const currentWarId = data.war?.id ?? warId;

    const fetchWar = useCallback(async () => {
        if (!enabled) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const endpoint = warId ? `/game/wars/${warId}` : '/game/wars/current';
            const warRes = await api.get(endpoint).catch((e: any) => {
                if (e?.response?.status === 404) return null;
                throw e;
            });

            if (!warRes) {
                setData(EMPTY);
                setError(null);
                setLoading(false);
                return;
            }

            const wd = warRes.data;
            const resolvedId = wd.war?.id ?? warId;

            const sbRes = resolvedId
                ? await api.get(`/game/wars/${resolvedId}/scoreboard`).catch(() => null)
                : null;

            setData(prev => ({
                war: wd.war ?? null,
                opponents: wd.opponents ?? [],
                battles: wd.battles ?? [],
                myParticipations: wd.myParticipations ?? [],
                hoursRemaining: wd.hoursRemaining ?? 0,
                scoreboard: sbRes?.data?.scoreboard ?? [],
                highlights: prev.war?.id === resolvedId ? prev.highlights : [],
                timeline: prev.war?.id === resolvedId ? prev.timeline : [],
            }));
            setError(null);
        } catch (e) {
            setError(resolveError(e, 'Erreur de chargement.'));
        } finally {
            setLoading(false);
        }
    }, [enabled, warId]);

    const fetchHighlights = useCallback(async () => {
        if (!enabled || !currentWarId) return;
        try {
            const res = await api.get(`/game/wars/${currentWarId}/highlights`);
            setData(prev => ({ ...prev, highlights: res.data?.highlights ?? [] }));
        } catch {
            // Highlights are non-critical and may be absent while the feature rolls out.
        }
    }, [currentWarId, enabled]);

    const fetchTimeline = useCallback(async () => {
        if (!enabled || !currentWarId) return;
        try {
            const res = await api.get(`/game/wars/${currentWarId}/timeline`);
            setData(prev => ({ ...prev, timeline: res.data?.timeline ?? [] }));
        } catch {
            // Timeline is optional for GAME_WARS_V1.
        }
    }, [currentWarId, enabled]);

    const invalidationTags = useMemo<QueryTag[]>(() => {
        const tags: QueryTag[] = ['wars'];
        if (currentWarId) {
            tags.push(
                `war:${currentWarId}`,
                `war-scoreboard:${currentWarId}`,
                `war-highlights:${currentWarId}`,
                `war-timeline:${currentWarId}`,
            );
        }
        return tags;
    }, [currentWarId]);

    usePolling(fetchWar, { enabled, intervalMs: warIntervalMs });
    usePolling(fetchHighlights, { enabled: enabled && Boolean(currentWarId), intervalMs: highlightsIntervalMs });
    usePolling(fetchTimeline, { enabled: enabled && Boolean(currentWarId), intervalMs: timelineIntervalMs });
    useInvalidation(invalidationTags, fetchWar);

    return { data, loading, error, refresh: fetchWar, refreshHighlights: fetchHighlights, refreshTimeline: fetchTimeline };
}
