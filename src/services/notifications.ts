import type { ComponentType } from 'react';
import {
    Bell, Trophy, Swords, Users, Dumbbell, Zap, Flame, Flag, Medal,
} from 'lucide-react';

// ─── Type ────────────────────────────────────────────────────────────────────

export interface Notification {
    id: string;
    type: string;
    title: string;
    body: string;
    isRead: boolean;
    createdAt: string;
    data?: Record<string, unknown>;
}

// ─── Type config (icône + couleurs par type de notif) ────────────────────────

export type TypeCfg = { icon: ComponentType<{ size?: number }>; accent: string; dot: string };

export const TYPE_CONFIG: Record<string, TypeCfg> = {
    // Achievements
    achievement:        { icon: Trophy,   accent: 'bg-amber-500/15 text-amber-400 border-amber-500/20',    dot: 'bg-amber-500' },
    // Leaderboards
    leaderboard:        { icon: Medal,    accent: 'bg-amber-500/15 text-amber-400 border-amber-500/20',    dot: 'bg-amber-500' },
    leaderboard_update: { icon: Medal,    accent: 'bg-amber-500/15 text-amber-400 border-amber-500/20',    dot: 'bg-amber-500' },
    new_rank:           { icon: Medal,    accent: 'bg-amber-500/15 text-amber-400 border-amber-500/20',    dot: 'bg-amber-500' },
    // Challenges
    challenge:          { icon: Swords,   accent: 'bg-primary/15 text-primary border-primary/20',          dot: 'bg-primary' },
    challenge_start:    { icon: Swords,   accent: 'bg-primary/15 text-primary border-primary/20',          dot: 'bg-primary' },
    challenge_ending:   { icon: Swords,   accent: 'bg-primary/15 text-primary border-primary/20',          dot: 'bg-primary' },
    challenge_complete: { icon: Swords,   accent: 'bg-primary/15 text-primary border-primary/20',          dot: 'bg-primary' },
    // Clan/social
    social:             { icon: Users,    accent: 'bg-blue-500/15 text-blue-400 border-blue-500/20',       dot: 'bg-blue-500' },
    clan_invite:        { icon: Users,    accent: 'bg-blue-500/15 text-blue-400 border-blue-500/20',       dot: 'bg-blue-500' },
    clan_joined:        { icon: Users,    accent: 'bg-blue-500/15 text-blue-400 border-blue-500/20',       dot: 'bg-blue-500' },
    clan_message:       { icon: Users,    accent: 'bg-blue-500/15 text-blue-400 border-blue-500/20',       dot: 'bg-blue-500' },
    clan_kick:          { icon: Users,    accent: 'bg-red-500/15 text-red-400 border-red-500/20',          dot: 'bg-red-400' },
    clan_role_changed:  { icon: Users,    accent: 'bg-blue-500/15 text-blue-400 border-blue-500/20',       dot: 'bg-blue-500' },
    // Wars
    war_started:        { icon: Flame,    accent: 'bg-red-500/15 text-red-400 border-red-500/20',          dot: 'bg-red-500' },
    war_ended:          { icon: Flame,    accent: 'bg-red-500/15 text-red-400 border-red-500/20',          dot: 'bg-red-500' },
    war_result:         { icon: Trophy,   accent: 'bg-red-500/15 text-red-400 border-red-500/20',          dot: 'bg-red-500' },
    war_reminder:       { icon: Flame,    accent: 'bg-orange-500/15 text-orange-400 border-orange-500/20', dot: 'bg-orange-400' },
    war_highlight:      { icon: Zap,      accent: 'bg-red-500/15 text-red-400 border-red-500/20',          dot: 'bg-red-500' },
    war_plan_locked:    { icon: Flag,     accent: 'bg-amber-500/15 text-amber-400 border-amber-500/20',    dot: 'bg-amber-400' },
    war_vote_deadline:  { icon: Flag,     accent: 'bg-orange-500/15 text-orange-400 border-orange-500/20', dot: 'bg-orange-400' },
    // Battles
    battle_opened:      { icon: Swords,   accent: 'bg-red-500/15 text-red-400 border-red-500/20',          dot: 'bg-red-500' },
    battle_closed:      { icon: Swords,   accent: 'bg-white/5 text-text-muted border-white/8',             dot: 'bg-text-muted' },
    battle_result:      { icon: Trophy,   accent: 'bg-amber-500/15 text-amber-400 border-amber-500/20',    dot: 'bg-amber-500' },
    // Training
    training:           { icon: Dumbbell, accent: 'bg-purple-500/15 text-purple-400 border-purple-500/20', dot: 'bg-purple-500' },
    training_reminder:  { icon: Dumbbell, accent: 'bg-purple-500/15 text-purple-400 border-purple-500/20', dot: 'bg-purple-500' },
    // Strava
    strava:             { icon: Zap,      accent: 'bg-orange-500/15 text-orange-400 border-orange-500/20', dot: 'bg-orange-500' },
};

export const DEFAULT_CFG: TypeCfg = { icon: Bell, accent: 'bg-white/5 text-text-muted border-white/8', dot: 'bg-text-muted' };
export const getTypeCfg = (type: string): TypeCfg => TYPE_CONFIG[type] ?? DEFAULT_CFG;

// ─── Deep links (route vers laquelle envoyer au tap) ─────────────────────────

export function resolveDeepLink(type: string, data?: Record<string, unknown>): string | null {
    // Data-driven routes take priority over type fallbacks
    if (typeof data?.deepLink === 'string' && data.deepLink.startsWith('/')) return data.deepLink;
    if (data?.warId && data?.battleId) return `/wars/${data.warId as string}`;
    if (data?.warId) return `/wars/${data.warId as string}`;
    if (data?.challengeId) return `/challenges/${data.challengeId as string}`;
    if (data?.activityId) return `/activities/${data.activityId as string}`;
    if (data?.clanId) return '/community';

    switch (type) {
        case 'war_started':
        case 'war_ended':
        case 'war_result':
        case 'war_reminder':
        case 'war_highlight':
        case 'war_plan_locked':
        case 'war_vote_deadline':
        case 'battle_opened':
        case 'battle_closed':
        case 'battle_result':
            return '/wars';
        case 'clan_message':
            return '/community?chat=1';
        case 'clan_invite':
        case 'clan_joined':
        case 'clan_kick':
        case 'clan_role_changed':
            return '/community';
        case 'challenge_start':
        case 'challenge_ending':
        case 'challenge_complete':
            return '/community';
        default:
            return null;
    }
}

// ─── Normalisation (le backend peut renvoyer snake_case / champs alternatifs) ─

export function normalizeNotification(n: Record<string, unknown>): Notification {
    return {
        id: n.id as string,
        type: n.type as string,
        title: n.title as string,
        body: n.body as string,
        isRead: (n.read ?? n.isRead ?? false) as boolean,
        createdAt: (n.createdAt ?? n.created_at) as string,
        data: (n.data ?? n.payload ?? undefined) as Record<string, unknown> | undefined,
    };
}
