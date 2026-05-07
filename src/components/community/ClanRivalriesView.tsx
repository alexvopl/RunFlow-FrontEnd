import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Trophy, Shield, Flame, Swords, ChevronRight,
    Loader2, Clock, ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { resolveError } from '../../services/errors';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface RivalryListItem {
    rivalryId: string;
    rivalClanId: string;
    rivalClanName: string;
    rivalClanBadgeUrl?: string | null;
    // API may return either normalized or raw low/high format
    myWins?: number;
    rivalWins?: number;
    winsLow?: number;
    winsHigh?: number;
    clanLow?: string;
    clanHigh?: string;
    ties: number;
    totalEncounters: number;
    status: string;
    lastWarAt: string | null;
}

interface RivalryEncounter {
    warId: string;
    weekIndex: number;
    winnerClanId: string | null;
    pointsLow: number;
    pointsHigh: number;
    warEndedAt: string;
}

interface RivalryDetail extends RivalryListItem {
    encounters: RivalryEncounter[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function clanInitials(name: string): string {
    return name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

/** Normalize win/loss stats to my-clan perspective */
function rivalStats(r: RivalryListItem, myClanId: string) {
    if (r.myWins != null && r.rivalWins != null) {
        return { myWins: r.myWins, rivalWins: r.rivalWins };
    }
    const amLow = r.clanLow === myClanId;
    return {
        myWins: amLow ? (r.winsLow ?? 0) : (r.winsHigh ?? 0),
        rivalWins: amLow ? (r.winsHigh ?? 0) : (r.winsLow ?? 0),
    };
}

function relativeDate(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const days = Math.floor(ms / 86400000);
    if (days === 0) return 'Aujourd\'hui';
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days}j`;
    if (days < 30) return `Il y a ${Math.floor(days / 7)} sem.`;
    return `Il y a ${Math.floor(days / 30)} mois`;
}

function rivalryStatusCfg(status: string): { label: string; color: string; bg: string; border: string } {
    switch (status) {
        case 'active':
            return { label: 'Actif', color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.25)' };
        case 'new':
            return { label: 'Nouveau', color: '#5ab2ff', bg: 'rgba(90,178,255,0.12)', border: 'rgba(90,178,255,0.25)' };
        case 'dormant':
        default:
            return { label: 'Dormant', color: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.10)' };
    }
}

// ─── RivalryRow ─────────────────────────────────────────────────────────────────

function RivalryRow({
    rivalry,
    myClanId,
    onClick,
}: {
    rivalry: RivalryListItem;
    myClanId: string;
    onClick: () => void;
}) {
    const stats = rivalStats(rivalry, myClanId);
    const statusCfg = rivalryStatusCfg(rivalry.status);
    const total = stats.myWins + stats.rivalWins + rivalry.ties;
    const winPct = total > 0 ? (stats.myWins / total) * 100 : 50;
    const lossPct = total > 0 ? (stats.rivalWins / total) * 100 : 50;

    return (
        <button
            onClick={onClick}
            className="w-full glass-card rounded-[22px] p-4 text-left active:scale-[0.98] transition-transform"
        >
            <div className="flex items-center gap-3">
                {/* Rival badge */}
                <div
                    className="w-12 h-12 rounded-[14px] flex items-center justify-center flex-shrink-0"
                    style={{
                        background: 'rgba(168,85,247,0.14)',
                        border: '1px solid rgba(168,85,247,0.25)',
                    }}
                >
                    <span className="font-black text-sm font-mono" style={{ color: '#a855f7' }}>
                        {clanInitials(rivalry.rivalClanName)}
                    </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <p className="font-black text-white text-sm truncate">{rivalry.rivalClanName}</p>
                        <span
                            className="flex-shrink-0 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                            style={{ background: statusCfg.bg, border: `1px solid ${statusCfg.border}`, color: statusCfg.color }}
                        >
                            {statusCfg.label}
                        </span>
                    </div>

                    {/* W/D/L row */}
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-black" style={{ color: '#10b981' }}>
                            {stats.myWins}V
                        </span>
                        <span className="text-[10px] font-black" style={{ color: '#ef4444' }}>
                            {stats.rivalWins}D
                        </span>
                        {rivalry.ties > 0 && (
                            <span className="text-[10px] font-black text-white/30">
                                {rivalry.ties}N
                            </span>
                        )}
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/20">
                            #{rivalry.totalEncounters} rencontres
                        </span>
                    </div>

                    {/* Ratio bar */}
                    {total > 0 && (
                        <div className="h-1 rounded-full overflow-hidden flex" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full" style={{ width: `${winPct}%`, background: '#10b981' }} />
                            <div className="h-full rounded-full" style={{ width: `${lossPct}%`, background: 'rgba(239,68,68,0.55)' }} />
                        </div>
                    )}
                </div>

                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                    <ChevronRight size={14} className="text-white/20" />
                    {rivalry.lastWarAt && (
                        <span className="text-[9px] text-white/25 font-black">
                            {relativeDate(rivalry.lastWarAt)}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}

// ─── ClanRivalriesView ────────────────────────────────────────────────────────

export function ClanRivalriesView({ myClanId }: { myClanId: string }) {
    const [rivalries, setRivalries] = useState<RivalryListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        api.get('/game/rivalries/mine')
            .then(res => setRivalries(res.data?.rivalries ?? []))
            .catch(e => setError(resolveError(e, 'Impossible de charger les rivalités.')))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-[22px]" />)}
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-card rounded-[22px] p-6 text-center">
                <p className="text-red-400 text-sm font-bold">{error}</p>
            </div>
        );
    }

    if (rivalries.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-[24px] p-8 text-center"
            >
                <div className="w-14 h-14 glass-hero rounded-[18px] flex items-center justify-center mx-auto mb-4">
                    <Flame size={22} className="text-purple-400" />
                </div>
                <p className="font-black text-white mb-1">Pas encore de rivalités</p>
                <p className="text-text-muted text-sm leading-relaxed">
                    Les rivalités se construisent en affrontant les mêmes clans plusieurs fois.
                </p>
            </motion.div>
        );
    }

    const selectedRivalry = rivalries.find(r => r.rivalryId === selectedId) ?? null;

    return (
        <>
            <div className="space-y-3">
                {rivalries.map((r, i) => (
                    <motion.div
                        key={r.rivalryId}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                    >
                        <RivalryRow
                            rivalry={r}
                            myClanId={myClanId}
                            onClick={() => setSelectedId(r.rivalryId)}
                        />
                    </motion.div>
                ))}
            </div>

            <RivalryDetailSheet
                rivalryId={selectedId}
                rivalrySummary={selectedRivalry}
                myClanId={myClanId}
                isOpen={selectedId !== null}
                onClose={() => setSelectedId(null)}
            />
        </>
    );
}

// ─── RivalryDetailSheet ───────────────────────────────────────────────────────

interface RivalryDetailSheetProps {
    rivalryId: string | null;
    /** Pre-loaded summary (from list) used while detail is loading */
    rivalrySummary?: RivalryListItem | null;
    myClanId: string;
    myClanName?: string;
    isOpen: boolean;
    onClose: () => void;
}

export function RivalryDetailSheet({
    rivalryId,
    rivalrySummary,
    myClanId,
    myClanName,
    isOpen,
    onClose,
}: RivalryDetailSheetProps) {
    const navigate = useNavigate();
    const [detail, setDetail] = useState<RivalryDetail | null>(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        if (!rivalryId) return;
        setLoading(true);
        try {
            const res = await api.get(`/game/rivalries/${rivalryId}`);
            const d = res.data;
            // Handle both `{ rivalry, encounters }` and flat shapes
            const rivalry: RivalryDetail = {
                ...(d.rivalry ?? d),
                encounters: d.encounters ?? d.history ?? [],
            };
            setDetail(rivalry);
        } catch {
            setDetail(null);
        } finally {
            setLoading(false);
        }
    }, [rivalryId]);

    useEffect(() => {
        if (isOpen && rivalryId) load();
    }, [isOpen, rivalryId, load]);

    useEffect(() => {
        if (!isOpen) setDetail(null);
    }, [isOpen]);

    // Use summary as fallback while loading
    const summary = detail ?? rivalrySummary ?? null;
    const stats = summary ? rivalStats(summary, myClanId) : { myWins: 0, rivalWins: 0 };
    const total = stats.myWins + stats.rivalWins + (summary?.ties ?? 0);
    const winPct = total > 0 ? (stats.myWins / total) * 100 : 50;
    const tiePct = total > 0 ? ((summary?.ties ?? 0) / total) * 100 : 0;
    const lossPct = total > 0 ? (stats.rivalWins / total) * 100 : 50;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />
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
                            <div className="flex items-center gap-2">
                                <Flame size={14} style={{ color: '#a855f7' }} />
                                <div>
                                    <p className="font-black text-white text-sm">
                                        {summary?.rivalClanName ?? 'Rivalité'}
                                    </p>
                                    {summary && (
                                        <p className="text-[10px] text-white/40 mt-0.5">
                                            #{summary.totalEncounters} rencontres · {rivalryStatusCfg(summary.status).label}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 glass-card rounded-[10px] flex items-center justify-center text-white/40 hover:text-white transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="overflow-y-auto flex-1 pb-10">
                            <div className="px-5 pt-4 space-y-4">

                                {/* Hero card */}
                                {summary && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="rounded-[24px] p-5"
                                        style={{
                                            background: 'linear-gradient(160deg, rgba(168,85,247,0.10), rgba(7,17,31,0.90))',
                                            border: '1px solid rgba(168,85,247,0.20)',
                                        }}
                                    >
                                        {/* VS row */}
                                        <div className="flex items-center justify-center gap-4 mb-5">
                                            <div className="text-center flex-1">
                                                <div
                                                    className="w-14 h-14 mx-auto rounded-[16px] flex items-center justify-center mb-2"
                                                    style={{ background: 'rgba(90,178,255,0.15)', border: '1px solid rgba(90,178,255,0.30)' }}
                                                >
                                                    <span className="font-black font-mono text-[#5ab2ff] text-lg">
                                                        {myClanName ? clanInitials(myClanName) : 'MOI'}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] font-black text-white/60 truncate px-1">{myClanName ?? 'Mon clan'}</p>
                                            </div>
                                            <div className="font-black text-2xl text-white/15 italic">VS</div>
                                            <div className="text-center flex-1">
                                                <div
                                                    className="w-14 h-14 mx-auto rounded-[16px] flex items-center justify-center mb-2"
                                                    style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.30)' }}
                                                >
                                                    <span className="font-black font-mono text-purple-400 text-lg">
                                                        {clanInitials(summary.rivalClanName)}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] font-black text-white/60 truncate px-1">{summary.rivalClanName}</p>
                                            </div>
                                        </div>

                                        {/* Stats grid */}
                                        <div className="grid grid-cols-3 gap-2 mb-4">
                                            {[
                                                { label: 'Victoires', val: stats.myWins, color: '#10b981' },
                                                { label: 'Défaites', val: stats.rivalWins, color: '#ef4444' },
                                                { label: 'Égalités', val: summary.ties, color: 'rgba(255,255,255,0.35)' },
                                            ].map(({ label, val, color }) => (
                                                <div
                                                    key={label}
                                                    className="rounded-[14px] p-3 text-center"
                                                    style={{ background: `${color}0e`, border: `1px solid ${color}20` }}
                                                >
                                                    <p className="text-2xl font-black font-mono" style={{ color }}>{val}</p>
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-white/25 mt-0.5">{label}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Ratio bar */}
                                        {total > 0 && (
                                            <div className="h-1.5 rounded-full overflow-hidden flex" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                                <motion.div
                                                    className="h-full"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${winPct}%` }}
                                                    transition={{ duration: 0.9 }}
                                                    style={{ background: 'linear-gradient(90deg, #10b981, #34d399)' }}
                                                />
                                                <motion.div
                                                    className="h-full"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${tiePct}%` }}
                                                    transition={{ duration: 0.9, delay: 0.2 }}
                                                    style={{ background: 'rgba(255,255,255,0.18)' }}
                                                />
                                                <motion.div
                                                    className="h-full"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${lossPct}%` }}
                                                    transition={{ duration: 0.9, delay: 0.4 }}
                                                    style={{ background: 'rgba(239,68,68,0.55)' }}
                                                />
                                            </div>
                                        )}

                                        {/* Meta */}
                                        {summary.lastWarAt && (
                                            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/[0.06]">
                                                <Clock size={10} className="text-white/30 flex-shrink-0" />
                                                <span className="text-[10px] text-white/30 font-black">
                                                    Dernière rencontre : {relativeDate(summary.lastWarAt)}
                                                </span>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {/* Encounters history */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <h3 className="text-[9px] font-black uppercase tracking-widest text-white/40">Historique</h3>
                                    </div>

                                    {loading && (
                                        <div className="space-y-2">
                                            {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded-[16px]" />)}
                                        </div>
                                    )}

                                    {!loading && (!detail?.encounters || detail.encounters.length === 0) && (
                                        <div className="glass-card rounded-[16px] p-4 text-center">
                                            <p className="text-[12px] text-white/30 font-bold">Historique non disponible</p>
                                        </div>
                                    )}

                                    {!loading && detail?.encounters && detail.encounters.length > 0 && (
                                        <div className="space-y-2">
                                            {detail.encounters.map((enc, i) => (
                                                <EncounterRow
                                                    key={enc.warId}
                                                    encounter={enc}
                                                    myClanId={myClanId}
                                                    rivalry={detail}
                                                    index={i}
                                                    onNavigate={warId => {
                                                        onClose();
                                                        navigate(`/wars/${warId}`);
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ─── EncounterRow ──────────────────────────────────────────────────────────────

function EncounterRow({
    encounter,
    myClanId,
    rivalry,
    index,
    onNavigate,
}: {
    encounter: RivalryEncounter;
    myClanId: string;
    rivalry: RivalryDetail;
    index: number;
    onNavigate: (warId: string) => void;
}) {
    const isWin = encounter.winnerClanId !== null && encounter.winnerClanId !== rivalry.rivalClanId;
    const isLoss = encounter.winnerClanId === rivalry.rivalClanId;
    const isTie = encounter.winnerClanId === null;

    // Determine my score vs rival score.
    // If my clan is "low" side in the rivalry, my points = pointsLow.
    const amLow = rivalry.clanLow === myClanId;
    const myPoints = amLow ? encounter.pointsLow : encounter.pointsHigh;
    const rivalPoints = amLow ? encounter.pointsHigh : encounter.pointsLow;

    const resultCfg = isTie
        ? { label: 'Égalité', color: 'rgba(255,255,255,0.40)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.10)' }
        : isWin
            ? { label: 'Victoire', color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.20)' }
            : { label: 'Défaite', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.20)' };

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="rounded-[16px] px-4 py-3 flex items-center gap-3"
            style={{ background: resultCfg.bg, border: `1px solid ${resultCfg.border}` }}
        >
            {/* Icon */}
            <div
                className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
                style={{ background: `${resultCfg.color}18`, border: `1px solid ${resultCfg.color}28` }}
            >
                {isTie ? <Swords size={12} style={{ color: resultCfg.color }} /> :
                 isWin ? <Trophy size={12} className="text-emerald-400" /> :
                         <Shield size={12} className="text-red-400" />}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/30">
                        Semaine {encounter.weekIndex}
                    </span>
                    <span
                        className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                        style={{ background: `${resultCfg.color}18`, color: resultCfg.color, border: `1px solid ${resultCfg.color}28` }}
                    >
                        {resultCfg.label}
                    </span>
                </div>
                <p className="font-mono font-black text-sm text-white">
                    {myPoints.toLocaleString()}
                    <span className="text-white/25 mx-1.5">–</span>
                    <span className="text-white/40">{rivalPoints.toLocaleString()}</span>
                    <span className="text-[9px] font-bold text-white/25 ml-1">pts</span>
                </p>
                <p className="text-[9px] text-white/25 mt-0.5">
                    {relativeDate(encounter.warEndedAt)}
                </p>
            </div>

            {/* CTA */}
            <button
                onClick={() => onNavigate(encounter.warId)}
                className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[9px] font-black transition-all active:scale-95"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.40)' }}
            >
                <ExternalLink size={9} />
                Voir
            </button>
        </motion.div>
    );
}
