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
    isClose?: boolean;
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
    params?: Record<string, any>;
}

export interface WarHighlight {
    id: string;
    warId?: string;
    battleId?: string | null;
    type: string;
    severity: string;
    payloadJson: Record<string, any>;
    createdAt: string;
}

export interface RivalryContext {
    rivalryId: string;
    encounterNumber: number;
    winsLow: number;
    winsHigh: number;
    ties: number;
    clanLow: string;
    clanHigh: string;
    isRivalryMatch: boolean;
}

export interface WarAggregate {
    clanId: string;
    pointsTotal: number;
    participantsCount: number;
    contributionsCount: number;
    pointsLast24h: number;
    battlesParticipated: number;
}

export interface TimelineState {
    leaderClanId: string | null;
    leaderClanName: string | null;
    leaderPoints: number;
    runnerUpClanId: string | null;
    runnerUpClanName: string | null;
    runnerUpPoints: number;
    pointsGap: number;
    isClose: boolean;
}

export interface TimelineEndsIn {
    hours: number;
    minutes: number;
    formatted: string;
}

export interface TimelineUpcomingBattle {
    battleId: string;
    battleType: string;
    status: string;
    windowStart: string;
    windowEnd: string;
    opensIn: { hours: number; minutes: number };
    closesIn: null;
}

export interface TimelineActiveBattle {
    battleId: string;
    battleType: string;
    status: string;
    closesIn: { hours: number; minutes: number };
}

export interface TimelineData {
    state: TimelineState | null;
    endsIn: TimelineEndsIn | null;
    topHighlights: WarHighlight[];
    upcomingBattles: TimelineUpcomingBattle[];
    activeBattles: TimelineActiveBattle[];
}

export interface WarData {
    war: WarSummary | null;
    opponents: WarOpponent[];
    battles: WarBattle[];
    myParticipations: Array<{
        id?: string;
        battleId: string;
        score: number;
        status: string;
        counted?: boolean;
        submittedAt?: string | null;
    }>;
    hoursRemaining: number;
    scoreboard: Array<{ clanId: string; clanName: string; totalPoints: number; rank: number; contributors?: number; contributions?: number }>;
    highlights: WarHighlight[];
    timeline: TimelineData | null;
    aggregates: WarAggregate[];
    rivalryContext: RivalryContext | null;
}

const EMPTY_TIMELINE: TimelineData = {
    state: null,
    endsIn: null,
    topHighlights: [],
    upcomingBattles: [],
    activeBattles: [],
};

const EMPTY: WarData = {
    war: null,
    opponents: [],
    battles: [],
    myParticipations: [],
    hoursRemaining: 0,
    scoreboard: [],
    highlights: [],
    timeline: null,
    aggregates: [],
    rivalryContext: null,
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

            const [sbRes, aggRes] = resolvedId
                ? await Promise.all([
                    api.get(`/game/wars/${resolvedId}/scoreboard`).catch(() => null),
                    api.get(`/game/wars/${resolvedId}/aggregates`).catch(() => null),
                ])
                : [null, null];

            setData(prev => ({
                war: wd.war ?? null,
                opponents: wd.opponents ?? [],
                battles: wd.battles ?? [],
                myParticipations: wd.myParticipations ?? [],
                hoursRemaining: wd.hoursRemaining ?? 0,
                scoreboard: sbRes?.data?.scoreboard ?? [],
                aggregates: aggRes?.data?.aggregates ?? [],
                highlights: prev.war?.id === resolvedId ? prev.highlights : [],
                timeline: prev.war?.id === resolvedId ? prev.timeline : null,
                rivalryContext: wd.rivalryContext ?? null,
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
            const t = res.data;
            setData(prev => ({
                ...prev,
                timeline: t ? {
                    state: t.state ?? null,
                    endsIn: t.endsIn ?? null,
                    topHighlights: t.topHighlights ?? [],
                    upcomingBattles: t.upcomingBattles ?? [],
                    activeBattles: t.activeBattles ?? [],
                } : EMPTY_TIMELINE,
            }));
        } catch {
            // Timeline is optional for GAME_WARS_V1.
        }
    }, [currentWarId, enabled]);

    const invalidationTags = useMemo<QueryTag[]>(() => {
        const tags: QueryTag[] = ['wars'];
        if (currentWarId) {
            tags.push(
                `war:${currentWarId}`,
                `war-battles:${currentWarId}`,
                `war-bonus-stats:${currentWarId}`,
                `war-scoreboard:${currentWarId}`,
                `war-highlights:${currentWarId}`,
                `war-plan:${currentWarId}`,
                `war-tickets:${currentWarId}`,
                `war-timeline:${currentWarId}`,
                `war-aggregates:${currentWarId}`,
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
