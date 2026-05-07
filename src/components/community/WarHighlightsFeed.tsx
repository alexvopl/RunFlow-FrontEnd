import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, TrendingUp, Zap, Trophy, Swords, Star, Flag,
    Lock, Unlock, Loader2, ChevronDown, Crown, Activity,
    Timer, Mountain, Package,
} from 'lucide-react';
import { api } from '../../services/api';
import type { WarHighlight } from '../../hooks/useWarData';

// ─── Types ─────────────────────────────────────────────────────────────────────

type SeverityFilter = 'all' | 'critical' | 'important' | 'info';

// ─── Config ────────────────────────────────────────────────────────────────────

export interface HighlightTypeCfg {
    label: string;
    color: string;
    bg: string;
    border: string;
    icon: React.ReactNode;
}

export const HIGHLIGHT_TYPE_CONFIG: Record<string, HighlightTypeCfg> = {
    LEAD_CHANGE:   { label: 'Renversement',     color: '#ef4444', bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.22)',   icon: <TrendingUp size={12} /> },
    COMEBACK:      { label: 'Comeback',         color: '#f97316', bg: 'rgba(249,115,22,0.10)',  border: 'rgba(249,115,22,0.22)',  icon: <Zap size={12} /> },
    BATTLE_WON:    { label: 'Battle gagnée',    color: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.22)',  icon: <Trophy size={12} /> },
    CLOSE_MATCH:   { label: 'Match serré',      color: '#a855f7', bg: 'rgba(168,85,247,0.10)',  border: 'rgba(168,85,247,0.22)',  icon: <Swords size={12} /> },
    MVP_DAY:       { label: 'MVP du jour',      color: '#22d3ee', bg: 'rgba(34,211,238,0.10)',  border: 'rgba(34,211,238,0.22)',  icon: <Star size={12} /> },
    WAR_STARTED:   { label: 'Guerre lancée',    color: '#5ab2ff', bg: 'rgba(90,178,255,0.10)',  border: 'rgba(90,178,255,0.22)',  icon: <Flag size={12} /> },
    WAR_ENDED:     { label: 'Guerre terminée',  color: '#10b981', bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.22)',  icon: <Trophy size={12} /> },
    BATTLE_OPENED: { label: 'Épreuve ouverte',  color: '#f87171', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.18)',   icon: <Unlock size={12} /> },
    BATTLE_CLOSED: { label: 'Épreuve clôturée', color: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.10)', icon: <Lock size={12} /> },
};

const SEVERITY_ORDER: Record<string, number> = { critical: 0, important: 1, info: 2 };

const SEVERITY_LABELS: Record<SeverityFilter, string> = {
    all: 'Tout',
    critical: 'Critique',
    important: 'Important',
    info: 'Info',
};

const BATTLE_TYPE_LABELS: Record<string, string> = {
    consistency: 'Régularité',
    time_trial: 'Chrono',
    elevation: 'Dénivelé',
    volume_capped: 'Volume',
    longest_single: 'Plus longue sortie',
    distance: 'Distance',
    pace: 'Allure',
    streak: 'Régularité',
    time: 'Temps',
};

function battleTypeIcon(bt: string, size = 12) {
    switch (bt) {
        case 'consistency': case 'streak': return <Activity size={size} />;
        case 'time_trial': case 'time': case 'pace': return <Timer size={size} />;
        case 'elevation': return <Mountain size={size} />;
        case 'volume_capped': return <Package size={size} />;
        default: return <Swords size={size} />;
    }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function timeAgoHighlight(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.floor(ms / 60000);
    if (min < 1) return 'à l\'instant';
    if (min < 60) return `${min}min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}j`;
}

interface HighlightBody {
    title: string;
    subtitle?: string;
    extra?: React.ReactNode;
}

// Privacy-safe body builder — only renders data explicitly present in payloadJson.
export function buildHighlightBody(type: string, payload: Record<string, any>): HighlightBody {
    switch (type) {
        case 'LEAD_CHANGE': {
            const leader = payload.newLeader ?? payload.clanName;
            const ptsNew = payload.pointsNew ?? payload.points;
            const ptsPrev = payload.pointsPrev;
            return {
                title: leader ? `${leader} prend la tête !` : 'Nouveau leader !',
                subtitle: ptsNew != null && ptsPrev != null
                    ? `${ptsNew.toLocaleString()} pts vs ${ptsPrev.toLocaleString()} pts`
                    : ptsNew != null ? `${ptsNew.toLocaleString()} pts` : undefined,
            };
        }
        case 'COMEBACK': {
            const clan = payload.clanName ?? payload.clan;
            const gap = payload.newGap ?? payload.gap;
            return {
                title: clan ? `${clan} revient dans la course` : 'Comeback en cours !',
                subtitle: gap != null ? `Écart réduit à ${gap.toLocaleString()} pts` : undefined,
            };
        }
        case 'BATTLE_WON': {
            const clan = payload.clanName ?? payload.clan;
            const pts = payload.points ?? payload.totalPoints;
            const bt = payload.battleType;
            const label = bt ? (BATTLE_TYPE_LABELS[bt] ?? bt) : null;
            return {
                title: clan
                    ? `${clan} remporte ${label ? `l'épreuve ${label}` : 'l\'épreuve'}`
                    : label ? `Épreuve ${label} remportée` : 'Épreuve remportée',
                subtitle: pts != null ? `+${pts.toLocaleString()} pts au classement` : undefined,
                extra: bt ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest mt-1"
                        style={{ color: '#fbbf24', opacity: 0.7 }}>
                        {battleTypeIcon(bt, 9)} {label ?? bt}
                    </span>
                ) : undefined,
            };
        }
        case 'CLOSE_MATCH': {
            const gap = payload.gap ?? payload.pointsGap;
            return {
                title: 'Match extrêmement serré',
                subtitle: gap != null ? `${gap.toLocaleString()} pts d'écart seulement` : undefined,
            };
        }
        case 'MVP_DAY': {
            const player = payload.playerName ?? payload.userName;
            const clan = payload.clanName ?? payload.clan;
            if (!player && !clan) return { title: 'MVP du jour désigné' };
            return {
                title: player ?? 'MVP du jour',
                subtitle: clan ?? undefined,
                extra: (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest mt-1"
                        style={{ color: '#22d3ee', opacity: 0.7 }}>
                        <Crown size={9} /> Meilleur contributeur du jour
                    </span>
                ),
            };
        }
        case 'WAR_STARTED': {
            const week = payload.weekNumber ?? payload.week;
            return {
                title: week != null ? `Guerre de la semaine ${week}` : 'La guerre est lancée !',
                subtitle: 'Que le meilleur gagne !',
            };
        }
        case 'WAR_ENDED': {
            const winner = payload.winnerName ?? payload.winner ?? payload.clanName;
            const score = payload.finalScore ?? payload.points;
            return {
                title: winner ? `${winner} remporte la guerre !` : 'La guerre est terminée',
                subtitle: score != null ? `Score final : ${score.toLocaleString()} pts` : undefined,
            };
        }
        case 'BATTLE_OPENED': {
            const bt = payload.battleType;
            const label = bt ? (BATTLE_TYPE_LABELS[bt] ?? bt) : null;
            return {
                title: label ? `Épreuve ${label} ouverte` : 'Nouvelle épreuve ouverte',
                subtitle: 'Fenêtre de participation active',
                extra: bt ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest mt-1"
                        style={{ color: '#f87171', opacity: 0.7 }}>
                        {battleTypeIcon(bt, 9)} {label ?? bt}
                    </span>
                ) : undefined,
            };
        }
        case 'BATTLE_CLOSED': {
            const bt = payload.battleType;
            const label = bt ? (BATTLE_TYPE_LABELS[bt] ?? bt) : null;
            return {
                title: label ? `Épreuve ${label} clôturée` : 'Épreuve clôturée',
                subtitle: 'Calcul des scores en cours',
            };
        }
        default: {
            const msg = payload.message ?? payload.description ?? payload.text;
            return { title: msg ?? type };
        }
    }
}

// ─── HighlightCard ─────────────────────────────────────────────────────────────

export function HighlightCard({ highlight }: { highlight: WarHighlight }) {
    const cfg = HIGHLIGHT_TYPE_CONFIG[highlight.type] ?? {
        label: highlight.type,
        color: '#5ab2ff',
        bg: 'rgba(90,178,255,0.08)',
        border: 'rgba(90,178,255,0.18)',
        icon: <Star size={12} />,
    };
    const body = buildHighlightBody(highlight.type, highlight.payloadJson);
    const isCritical = highlight.severity === 'critical';

    return (
        <div
            className="rounded-[18px] px-4 py-3.5"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
        >
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                    className="w-7 h-7 rounded-[10px] flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}30`, color: cfg.color }}
                >
                    {cfg.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: cfg.color }}>
                            {cfg.label}
                        </span>
                        {isCritical && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                        )}
                    </div>
                    <p className="text-[12px] font-black text-white leading-snug">{body.title}</p>
                    {body.subtitle && (
                        <p className="text-[11px] text-white/50 mt-0.5 leading-snug">{body.subtitle}</p>
                    )}
                    {body.extra && <div>{body.extra}</div>}
                </div>

                {/* Time */}
                <span className="text-[9px] font-black text-white/25 flex-shrink-0 mt-0.5">
                    {timeAgoHighlight(highlight.createdAt)}
                </span>
            </div>
        </div>
    );
}

// ─── WarHighlightsFeed ─────────────────────────────────────────────────────────

interface WarHighlightsFeedProps {
    warId: string;
    isOpen: boolean;
    onClose: () => void;
    /** Pre-loaded highlights from the war hub (used as fallback while fetching) */
    initialHighlights?: WarHighlight[];
}

export function WarHighlightsFeed({
    warId,
    isOpen,
    onClose,
    initialHighlights = [],
}: WarHighlightsFeedProps) {
    const [highlights, setHighlights] = useState<WarHighlight[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
    const hasFetched = useRef(false);

    const fetchPage = useCallback(async (cursor?: string) => {
        const isFirst = !cursor;
        if (isFirst) setLoading(true);
        else setLoadingMore(true);

        try {
            const params = new URLSearchParams({ limit: '30' });
            if (cursor) params.set('cursor', cursor);
            const res = await api.get(`/game/wars/${warId}/highlights?${params}`);
            const next: WarHighlight[] = res.data?.highlights ?? [];
            const nc: string | null = res.data?.nextCursor ?? null;
            setHighlights(prev => isFirst ? next : [...prev, ...next]);
            setNextCursor(nc);
        } catch {
            if (isFirst && initialHighlights.length > 0) {
                setHighlights(initialHighlights);
            }
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [warId, initialHighlights]);

    useEffect(() => {
        if (isOpen && !hasFetched.current) {
            hasFetched.current = true;
            void fetchPage();
        }
    }, [isOpen, fetchPage]);

    useEffect(() => {
        if (!isOpen) {
            hasFetched.current = false;
            setHighlights([]);
            setNextCursor(null);
            setSeverityFilter('all');
        }
    }, [isOpen]);

    const filtered = severityFilter === 'all'
        ? [...highlights].sort((a, b) =>
            (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9) ||
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        : highlights.filter(h => h.severity === severityFilter);

    const severityCounts: Record<string, number> = {};
    for (const h of highlights) {
        severityCounts[h.severity] = (severityCounts[h.severity] ?? 0) + 1;
    }

    const SEVERITY_FILTERS: SeverityFilter[] = ['all', 'critical', 'important', 'info'];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="fixed inset-x-0 bottom-0 z-50 max-w-md mx-auto rounded-t-[28px] overflow-hidden flex flex-col"
                        style={{
                            background: 'linear-gradient(180deg, #0d1e33 0%, #07111f 100%)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderBottom: 'none',
                            maxHeight: '90dvh',
                        }}
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                            <div className="w-10 h-1 rounded-full bg-white/15" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] flex-shrink-0">
                            <div>
                                <h2 className="font-black text-white text-sm">Événements de guerre</h2>
                                {!loading && (
                                    <p className="text-[10px] text-white/40 mt-0.5">
                                        {severityFilter === 'all'
                                            ? `${highlights.length} événement${highlights.length !== 1 ? 's' : ''}`
                                            : `${filtered.length} / ${highlights.length} affiché${filtered.length !== 1 ? 's' : ''}`}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 glass-card rounded-[10px] flex items-center justify-center text-white/40 hover:text-white transition-colors flex-shrink-0"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Severity filter */}
                        <div className="flex gap-1.5 px-5 py-2.5 border-b border-white/[0.06] overflow-x-auto no-scrollbar flex-shrink-0">
                            {SEVERITY_FILTERS.map(s => {
                                const count = s === 'all' ? highlights.length : (severityCounts[s] ?? 0);
                                const active = severityFilter === s;
                                return (
                                    <button
                                        key={s}
                                        onClick={() => setSeverityFilter(s)}
                                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
                                        style={{
                                            background: active ? 'rgba(90,178,255,0.18)' : 'rgba(255,255,255,0.05)',
                                            border: active ? '1px solid rgba(90,178,255,0.30)' : '1px solid rgba(255,255,255,0.10)',
                                            color: active ? '#5ab2ff' : 'rgba(255,255,255,0.40)',
                                        }}
                                    >
                                        {SEVERITY_LABELS[s]}
                                        {count > 0 && (
                                            <span
                                                className="font-mono text-[9px] px-1 rounded"
                                                style={{
                                                    background: active ? 'rgba(90,178,255,0.25)' : 'rgba(255,255,255,0.10)',
                                                    color: active ? '#5ab2ff' : 'rgba(255,255,255,0.35)',
                                                }}
                                            >
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Feed */}
                        <div className="overflow-y-auto flex-1 pb-10">
                            <div className="px-4 pt-3 space-y-2">

                                {/* Loading skeletons */}
                                {loading && (
                                    <>
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <div key={i} className="skeleton h-[62px] rounded-[18px]" />
                                        ))}
                                    </>
                                )}

                                {/* Empty state */}
                                {!loading && filtered.length === 0 && (
                                    <div className="py-12 text-center">
                                        <p className="text-white/30 text-sm font-bold">Aucun événement</p>
                                        {severityFilter !== 'all' && (
                                            <button
                                                onClick={() => setSeverityFilter('all')}
                                                className="mt-2 text-[11px] font-black"
                                                style={{ color: '#5ab2ff' }}
                                            >
                                                Voir tout
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Cards */}
                                {!loading && filtered.map((h, i) => (
                                    <motion.div
                                        key={h.id}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: Math.min(i * 0.03, 0.3) }}
                                    >
                                        <HighlightCard highlight={h} />
                                    </motion.div>
                                ))}

                                {/* Load more */}
                                {!loading && nextCursor && (
                                    <button
                                        onClick={() => void fetchPage(nextCursor)}
                                        disabled={loadingMore}
                                        className="w-full py-3.5 rounded-[16px] text-[11px] font-black text-white/50 flex items-center justify-center gap-2 transition-all active:scale-[0.98] mt-1"
                                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                                    >
                                        {loadingMore
                                            ? <Loader2 size={12} className="animate-spin" />
                                            : <ChevronDown size={12} />}
                                        Charger plus
                                    </button>
                                )}

                                {/* Loading more indicator */}
                                {loadingMore && (
                                    <div className="flex justify-center py-3">
                                        <Loader2 size={14} className="animate-spin text-white/30" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
