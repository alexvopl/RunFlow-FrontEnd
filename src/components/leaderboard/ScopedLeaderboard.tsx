import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Zap, TrendingUp, Activity, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Scope  = 'war' | 'season' | 'division' | 'city';
type Entity = 'clan' | 'user';

interface ScopedRanking {
    rank: number;
    id: string;
    name: string;
    avatarUrl?: string | null;
    score: number;
    wins?: number;
    losses?: number;
}

interface Narrative {
    leadChangesLast24h: number;
    closeMatch: boolean;
    closeMatchGapPercent: number | null;
    progressToday: number;
}

interface ScopedData {
    scope: Scope;
    entity: Entity;
    refId?: string;
    rankings: ScopedRanking[];
    narrative: Narrative;
}

interface Props {
    scope: Scope;
    entity?: Entity;
    refId?: string;
    city?: string;
    myId?: string;
    title?: string;
    scoreLabel?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtKm(m: number): string {
    const km = m / 1000;
    if (km >= 1000) return `${(km / 1000).toFixed(1)}k`;
    if (km >= 100) return `${Math.round(km)}`;
    return km.toFixed(1);
}

function entryInitial(name: string): string {
    return name.charAt(0).toUpperCase();
}

const RANK_COLORS: Record<number, { bg: string; color: string; border: string }> = {
    1: { bg: 'rgba(251,191,36,0.18)',  color: '#fbbf24', border: 'rgba(251,191,36,0.35)' },
    2: { bg: 'rgba(148,163,184,0.18)', color: '#94a3b8', border: 'rgba(148,163,184,0.35)' },
    3: { bg: 'rgba(180,120,68,0.18)',  color: '#b47844', border: 'rgba(180,120,68,0.35)' },
};

// ─── Narrative banner ──────────────────────────────────────────────────────────

function NarrativeBanner({ narrative, scope }: { narrative: Narrative; scope: Scope }) {
    const pills: { label: string; color: string; bg: string }[] = [];

    if (narrative.closeMatch) {
        const gap = narrative.closeMatchGapPercent != null
            ? ` — ${narrative.closeMatchGapPercent.toFixed(1)}% d'écart`
            : '';
        pills.push({
            label: `Match serré${gap}`,
            color: '#f97316',
            bg: 'rgba(249,115,22,0.12)',
        });
    }

    if (narrative.leadChangesLast24h > 0) {
        pills.push({
            label: `${narrative.leadChangesLast24h} changement${narrative.leadChangesLast24h > 1 ? 's' : ''} de tête (24h)`,
            color: '#5ab2ff',
            bg: 'rgba(90,178,255,0.10)',
        });
    }

    if (narrative.progressToday > 0 && scope === 'war') {
        pills.push({
            label: `+${fmtKm(narrative.progressToday)} km aujourd'hui`,
            color: '#10b981',
            bg: 'rgba(16,185,129,0.10)',
        });
    }

    if (pills.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-1.5 mb-3">
            {pills.map((p, i) => (
                <span
                    key={i}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
                    style={{ background: p.bg, border: `1px solid ${p.color}28`, color: p.color }}
                >
                    <Zap size={8} />{p.label}
                </span>
            ))}
        </div>
    );
}

// ─── ScopedLeaderboard ─────────────────────────────────────────────────────────

export function ScopedLeaderboard({
    scope, entity = 'clan', refId, city, myId, title, scoreLabel,
}: Props) {
    const [data, setData] = useState<ScopedData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!refId && scope !== 'city') return;
        if (scope === 'city' && !city) return;

        setLoading(true);
        setError('');

        const params: Record<string, string> = { scope, entity, limit: '50' };
        if (refId) params.refId = refId;
        if (city) params.city = city;

        api.get('/leaderboards/scoped', { params })
            .then(res => setData(res.data as ScopedData))
            .catch(e => {
                const status = (e as any)?.response?.status;
                if (status === 501) {
                    setError('Classement non disponible pour cette combinaison.');
                } else {
                    setError('Impossible de charger le classement.');
                }
            })
            .finally(() => setLoading(false));
    }, [scope, entity, refId, city]);

    const defaultScoreLabel = scope === 'war' ? 'pts' :
                              scope === 'city' ? 'km' : 'rating';
    const label = scoreLabel ?? defaultScoreLabel;

    if (loading) {
        return (
            <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-[18px] px-3.5 py-3"
                        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="skeleton w-7 h-7 rounded-[10px] flex-shrink-0" />
                        <div className="skeleton w-9 h-9 rounded-[12px] flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                            <div className="skeleton h-3 rounded-lg w-1/2" />
                            <div className="skeleton h-2 rounded-lg w-20" />
                        </div>
                        <div className="skeleton h-4 w-12 rounded-lg flex-shrink-0" />
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center gap-3 rounded-[16px] px-4 py-3.5"
                style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.14)' }}>
                <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                <p className="text-[11px] text-red-300 font-bold">{error}</p>
            </div>
        );
    }

    if (!data || data.rankings.length === 0) {
        return (
            <div className="rounded-[18px] py-10 text-center"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px dashed rgba(255,255,255,0.07)' }}>
                <TrendingUp size={22} className="text-white/20 mx-auto mb-2" />
                <p className="text-sm font-bold text-white/30">Aucune donnée disponible</p>
            </div>
        );
    }

    return (
        <div>
            {title && (
                <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-3 flex items-center gap-1.5">
                    <Activity size={9} /> {title}
                </p>
            )}

            {/* Narrative */}
            <NarrativeBanner narrative={data.narrative} scope={scope} />

            {/* Rankings */}
            <div className="space-y-1.5">
                {data.rankings.map((item, i) => {
                    const isMe = item.id === myId;
                    const rankStyle = RANK_COLORS[item.rank];
                    const displayScore = scope === 'city'
                        ? `${fmtKm(item.score)} km`
                        : item.score.toLocaleString('fr-FR');

                    return (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="flex items-center gap-3 rounded-[18px] px-3.5 py-3"
                            style={{
                                background: isMe
                                    ? 'linear-gradient(135deg, rgba(90,178,255,0.10), rgba(90,178,255,0.04))'
                                    : item.rank <= 3
                                        ? 'rgba(255,255,255,0.04)'
                                        : 'rgba(255,255,255,0.025)',
                                border: isMe
                                    ? '1px solid rgba(90,178,255,0.22)'
                                    : item.rank <= 3
                                        ? `1px solid ${rankStyle?.border ?? 'rgba(255,255,255,0.07)'}`
                                        : '1px solid rgba(255,255,255,0.05)',
                            }}
                        >
                            {/* Rank */}
                            <div
                                className="w-7 h-7 rounded-[10px] flex items-center justify-center font-mono font-black text-[11px] flex-shrink-0"
                                style={rankStyle
                                    ? { background: rankStyle.bg, color: rankStyle.color, border: `1px solid ${rankStyle.border}` }
                                    : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.30)', border: '1px solid rgba(255,255,255,0.08)' }
                                }
                            >
                                {item.rank}
                            </div>

                            {/* Avatar */}
                            <div
                                className="w-9 h-9 rounded-[12px] flex items-center justify-center font-black text-sm flex-shrink-0"
                                style={entity === 'clan'
                                    ? { background: 'linear-gradient(135deg, rgba(90,178,255,0.18), rgba(34,211,238,0.08))', color: '#5ab2ff', border: '1px solid rgba(90,178,255,0.22)', fontFamily: 'monospace' }
                                    : isMe
                                        ? { background: 'rgba(90,178,255,0.18)', color: '#5ab2ff', border: '1px solid rgba(90,178,255,0.28)' }
                                        : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.10)' }
                                }
                            >
                                {entryInitial(item.name)}
                            </div>

                            {/* Name */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[13px] font-black text-white truncate leading-tight">
                                        {item.name}
                                    </span>
                                    {isMe && (
                                        <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/22 flex-shrink-0">
                                            Moi
                                        </span>
                                    )}
                                </div>
                                {/* Wins/losses for season/division scopes */}
                                {(item.wins !== undefined || item.losses !== undefined) && (
                                    <div className="text-[9px] text-white/30 font-mono mt-0.5">
                                        {item.wins ?? 0}V {item.losses ?? 0}D
                                    </div>
                                )}
                            </div>

                            {/* Score */}
                            <div className="text-right flex-shrink-0">
                                <div className="font-mono font-black text-white text-sm leading-tight">
                                    {displayScore}
                                </div>
                                {scope !== 'city' && (
                                    <div className="text-[8px] text-white/30 font-black uppercase tracking-widest">
                                        {label}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
