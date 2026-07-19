import { useState, useEffect, useCallback, useRef } from 'react';
import {
    X, Loader2, Users, Search, AlertCircle, ChevronRight,
    Hash, ArrowRight, ChevronLeft, Globe, Lock, Zap, Shield, MapPin,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import { resolveError } from '../../services/errors';
import { useAuth } from '../../contexts/AuthContext';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ClanPreview {
    id: string;
    name: string;
    description: string | null;
    badgeUrl: string | null;
    city: string | null;
    isPublic: boolean;
    minWeeklyKm: number;
    maxMembers: number;
    memberCount: number;
    totalDistanceM: number;
    totalActivities: number;
}

interface JoinClanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onJoined: () => void;
}

const PAGE_SIZE = 10;

// ─── Sub-components ────────────────────────────────────────────────────────────

function ClanBadge({ name, size = 44 }: { name: string; size?: number }) {
    const initials = name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?';
    return (
        <div
            className="flex items-center justify-center flex-shrink-0 font-black font-mono"
            style={{
                width: size, height: size,
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(90,178,255,0.2), rgba(34,211,238,0.1))',
                border: '1px solid rgba(90,178,255,0.25)',
                color: '#5ab2ff',
                fontSize: size > 60 ? '1.4rem' : size > 40 ? '0.85rem' : '0.7rem',
            }}
        >
            {initials}
        </div>
    );
}

function PublicBadge({ isPublic }: { isPublic: boolean }) {
    return (
        <span
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest flex-shrink-0"
            style={isPublic
                ? { background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981' }
                : { background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }
            }
        >
            {isPublic ? <Globe size={8} /> : <Lock size={8} />}
            {isPublic ? 'Public' : 'Privé'}
        </span>
    );
}

function SkeletonRow() {
    return (
        <div className="glass-card rounded-[22px] p-4 flex items-center gap-3">
            <div className="skeleton w-11 h-11 rounded-[14px] flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-1/2 rounded-lg" />
                <div className="skeleton h-2.5 w-3/4 rounded-lg" />
            </div>
            <div className="skeleton w-14 h-8 rounded-full flex-shrink-0" />
        </div>
    );
}

// ─── Clan Detail Panel ─────────────────────────────────────────────────────────

function ClanDetailPanel({
    clanId,
    onBack,
    onJoined,
    onSwitchToCode,
}: {
    clanId: string;
    onBack: () => void;
    onJoined: () => void;
    onSwitchToCode: () => void;
}) {
    const [clan, setClan] = useState<ClanPreview | null>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        setError('');
        api.get(`/clans/${clanId}`)
            .then(res => setClan(res.data?.clan ?? null))
            .catch(() => setError('Impossible de charger ce clan.'))
            .finally(() => setLoading(false));
    }, [clanId]);

    const handleJoin = async () => {
        if (!clan) return;
        setJoining(true);
        setError('');
        try {
            await api.post(`/clans/${clan.id}/join`);
            onJoined();
        } catch (e: unknown) {
            const msg = resolveError(e, 'Impossible de rejoindre ce clan.');
            setError(msg);
        } finally {
            setJoining(false);
        }
    };

    const spotsLeft = clan ? clan.maxMembers - clan.memberCount : 0;
    const distanceKm = clan ? (clan.totalDistanceM / 1000).toFixed(0) : '—';

    return (
        <motion.div
            key="detail"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="absolute inset-0 flex flex-col"
            style={{ background: 'linear-gradient(180deg, #0d1e33 0%, #07111f 100%)' }}
        >
            {/* Back header */}
            <div className="flex items-center gap-3 px-5 pt-4 pb-3 flex-shrink-0">
                <button
                    onClick={onBack}
                    className="w-9 h-9 glass-card rounded-2xl flex items-center justify-center text-text-muted hover:text-white transition-colors active:scale-95"
                >
                    <ChevronLeft size={18} />
                </button>
                <span className="text-xs font-black uppercase tracking-widest text-text-muted">Détail du clan</span>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>

                {loading ? (
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center gap-4">
                            <div className="skeleton w-20 h-20 rounded-[18px]" />
                            <div className="space-y-2 flex-1">
                                <div className="skeleton h-5 w-2/3 rounded-lg" />
                                <div className="skeleton h-3 w-1/3 rounded-lg" />
                            </div>
                        </div>
                        <div className="skeleton h-16 rounded-[18px]" />
                        <div className="skeleton h-24 rounded-[18px]" />
                    </div>
                ) : !clan ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                        <Shield size={28} className="text-text-muted/30" />
                        <p className="text-sm font-bold text-text-muted">{error || 'Clan introuvable.'}</p>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4 pt-1"
                    >
                        {/* Hero */}
                        <div className="flex items-start gap-4">
                            <ClanBadge name={clan.name} size={80} />
                            <div className="flex-1 min-w-0 pt-1">
                                <h2 className="text-xl font-black tracking-tight text-white leading-tight">{clan.name}</h2>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <PublicBadge isPublic={clan.isPublic} />
                                    {clan.city && <span className="flex items-center gap-1 text-[10px] font-bold text-primary"><MapPin size={10} />{clan.city}</span>}
                                    {spotsLeft <= 5 && spotsLeft > 0 && (
                                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest"
                                            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
                                            <Zap size={8} /> {spotsLeft} places
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        {clan.description && (
                            <div className="rounded-[18px] px-4 py-3.5"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <p className="text-sm text-white/70 leading-relaxed">{clan.description}</p>
                            </div>
                        )}

                        {/* Stats grid */}
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { value: `${clan.memberCount}/${clan.maxMembers}`, label: 'Membres' },
                                { value: distanceKm, label: 'km totaux' },
                                { value: String(clan.totalActivities), label: 'Activités' },
                            ].map(stat => (
                                <div key={stat.label} className="rounded-[16px] py-3 text-center"
                                    style={{ background: 'rgba(90,178,255,0.06)', border: '1px solid rgba(90,178,255,0.12)' }}>
                                    <div className="font-mono font-black text-white text-base leading-tight">{stat.value}</div>
                                    <div className="text-[9px] text-white/35 font-black uppercase tracking-widest mt-1">{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Requirements */}
                        {clan.minWeeklyKm > 0 && (
                            <div className="flex items-center gap-2.5 rounded-[14px] px-3.5 py-3"
                                style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)' }}>
                                <Zap size={12} className="text-amber-400 flex-shrink-0" />
                                <p className="text-[11px] text-amber-300/80 font-bold">
                                    Minimum <span className="text-amber-300 font-black">{clan.minWeeklyKm} km/semaine</span> requis
                                </p>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 px-3 py-2.5 rounded-[12px]"
                                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                                <AlertCircle size={11} className="text-red-400 flex-shrink-0" />
                                <span className="text-[10px] text-red-300">{error}</span>
                            </motion.div>
                        )}

                        {/* CTA */}
                        {!clan.isPublic ? (
                            <div className="space-y-3 pt-1">
                                <div className="rounded-[18px] px-4 py-4 text-center"
                                    style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                                    <Lock size={16} className="text-amber-400 mx-auto mb-2" />
                                    <p className="text-xs text-amber-300/80 font-bold leading-relaxed">
                                        Ce clan est privé.<br />Rejoins via un code d'invitation.
                                    </p>
                                </div>
                                <button
                                    onClick={onSwitchToCode}
                                    className="w-full py-3.5 rounded-[16px] font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
                                    style={{
                                        background: 'rgba(245,158,11,0.12)',
                                        border: '1px solid rgba(245,158,11,0.28)',
                                        color: '#f59e0b',
                                    }}
                                >
                                    <Hash size={15} /> Entrer un code d'invitation
                                </button>
                            </div>
                        ) : spotsLeft <= 0 ? (
                            <div className="rounded-[18px] px-4 py-4 text-center"
                                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                                <p className="text-xs text-red-300 font-bold">Ce clan est complet.</p>
                            </div>
                        ) : (
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={handleJoin}
                                disabled={joining}
                                className="btn-primary w-full py-3.5 text-sm font-black flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {joining ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                                Rejoindre le clan
                            </motion.button>
                        )}
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function JoinClanModal({ isOpen, onClose, onJoined }: JoinClanModalProps) {
    const { user } = useAuth();
    const [tab, setTab] = useState<'browse' | 'code'>('browse');
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [selectedClanId, setSelectedClanId] = useState<string | null>(null);

    // ── Browse state ────────────────────────────────────────────────────────
    const [search, setSearch] = useState('');
    const [clans, setClans] = useState<ClanPreview[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [browseLoading, setBrowseLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [browseError, setBrowseError] = useState('');
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Code state ──────────────────────────────────────────────────────────
    const [code, setCode] = useState('');
    const [codeLoading, setCodeLoading] = useState(false);
    const [codeError, setCodeError] = useState('');

    // ── Fetch ───────────────────────────────────────────────────────────────

    const fetchClans = useCallback(async (q: string, p: number, append = false) => {
        if (append) setLoadingMore(true);
        else setBrowseLoading(true);
        setBrowseError('');
        try {
            const requestParams = { page: p, limit: PAGE_SIZE, search: q || undefined, city: user?.city || undefined };
            let res = await api.get('/clans', { params: requestParams });
            let list: ClanPreview[] = Array.isArray(res.data?.clans) ? res.data.clans : [];
            if (p === 1 && list.length === 0 && user?.city) {
                res = await api.get('/clans', { params: { page: p, limit: PAGE_SIZE, search: q || undefined } });
                list = Array.isArray(res.data?.clans) ? res.data.clans : [];
            }
            setClans(prev => append ? [...prev, ...list] : list);
            setHasMore(res.data?.hasMore ?? false);
            setPage(p);
        } catch {
            setBrowseError('Impossible de charger les clans.');
        } finally {
            setBrowseLoading(false);
            setLoadingMore(false);
        }
    }, [user?.city]);

    useEffect(() => {
        if (!isOpen) return;
        setTab('browse');
        setView('list');
        setSelectedClanId(null);
        setSearch('');
        setCode('');
        setCodeError('');
        setPage(1);
        fetchClans('', 1);
    }, [isOpen, fetchClans]);

    const handleSearchChange = (val: string) => {
        setSearch(val);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => fetchClans(val, 1), 300);
    };

    const handleLoadMore = () => fetchClans(search, page + 1, true);

    // ── Join by code ────────────────────────────────────────────────────────

    const handleJoinByCode = async () => {
        const raw = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        if (raw.length !== 8) { setCodeError('Le code doit comporter 8 caractères.'); return; }
        setCodeLoading(true);
        setCodeError('');
        try {
            await api.post(`/clans/join/${raw}`);
            onJoined();
            onClose();
        } catch (e: unknown) {
            setCodeError(resolveError(e, "Erreur lors de l'utilisation du code."));
        } finally {
            setCodeLoading(false);
        }
    };

    const handleCodeInput = (v: string) => {
        setCodeError('');
        setCode(v.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8));
    };

    const handleJoined = () => { onJoined(); onClose(); };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-end justify-center"
                >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

                    <motion.div
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 40, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                        className="relative w-full max-w-lg rounded-t-[36px] flex flex-col overflow-hidden"
                        style={{
                            height: '88vh',
                            background: 'linear-gradient(180deg, #0d1e33 0%, #07111f 100%)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            borderBottom: 'none',
                        }}
                    >
                        {/* Handle */}
                        <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mt-3.5 mb-2 flex-shrink-0" />

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pb-3 pt-1 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                                    style={{ background: 'rgba(90,178,255,0.14)', border: '1px solid rgba(90,178,255,0.22)' }}>
                                    <Shield size={15} className="text-primary" />
                                </div>
                                <h2 className="text-base font-black tracking-tight text-white">Rejoindre un clan</h2>
                            </div>
                            <button onClick={onClose}
                                className="w-9 h-9 glass-card rounded-2xl flex items-center justify-center text-text-muted hover:text-white transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="px-5 pb-3 flex-shrink-0">
                            <div className="flex gap-1 p-1 rounded-[14px]"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                {(['browse', 'code'] as const).map(t => (
                                    <button key={t} onClick={() => { setTab(t); setView('list'); }}
                                        className="flex-1 py-2 rounded-[10px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                                        style={{
                                            background: tab === t ? 'rgba(90,178,255,0.18)' : 'transparent',
                                            color: tab === t ? '#5ab2ff' : 'rgba(255,255,255,0.35)',
                                            border: tab === t ? '1px solid rgba(90,178,255,0.28)' : '1px solid transparent',
                                        }}>
                                        {t === 'browse' ? <><Users size={10} />Parcourir</> : <><Hash size={10} />Via un code</>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Content area (relative, for absolute detail panel) */}
                        <div className="flex-1 relative overflow-hidden">
                            <AnimatePresence mode="wait">

                                {/* ── Browse tab ── */}
                                {tab === 'browse' && (
                                    <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="absolute inset-0 flex flex-col">

                                        {/* Search */}
                                        <div className="px-5 pb-3 flex-shrink-0">
                                            <div className="flex items-center gap-2.5 rounded-[14px] px-3.5 py-2.5"
                                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
                                                <Search size={13} className="text-text-muted flex-shrink-0" />
                                                <input
                                                    type="text"
                                                    placeholder="Rechercher un clan…"
                                                    value={search}
                                                    onChange={e => handleSearchChange(e.target.value)}
                                                    className="flex-1 bg-transparent text-sm text-white placeholder:text-text-muted/50 focus:outline-none"
                                                />
                                                {search && (
                                                    <button onClick={() => { setSearch(''); fetchClans('', 1); }}
                                                        className="text-text-muted/50 hover:text-text-muted transition-colors">
                                                        <X size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* List */}
                                        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-2.5"
                                            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>

                                            {browseError && (
                                                <div className="flex items-center gap-2 px-3 py-2.5 rounded-[12px]"
                                                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                                                    <AlertCircle size={11} className="text-red-400" />
                                                    <span className="text-[10px] text-red-300">{browseError}</span>
                                                </div>
                                            )}

                                            {browseLoading ? (
                                                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
                                            ) : clans.length === 0 ? (
                                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                                    className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                                                    <div className="w-16 h-16 rounded-[20px] flex items-center justify-center"
                                                        style={{ background: 'rgba(90,178,255,0.06)', border: '1px solid rgba(90,178,255,0.12)' }}>
                                                        <Users size={26} className="text-primary/40" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-sm text-white">Aucun clan trouvé</p>
                                                        <p className="text-xs text-text-muted mt-1">
                                                            {search ? 'Essaie un autre mot-clé.' : 'Sois le premier à en créer un !'}
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            ) : (
                                                <>
                                                    {clans.map((clan, i) => (
                                                        <motion.div
                                                            key={clan.id}
                                                            initial={{ opacity: 0, y: 8 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: i * 0.03 }}
                                                            className="rounded-[22px] p-4 flex items-center gap-3.5"
                                                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                                                        >
                                                            <ClanBadge name={clan.name} size={44} />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-0.5">
                                                                    <p className="font-black text-sm text-white truncate leading-tight">{clan.name}</p>
                                                                    <PublicBadge isPublic={clan.isPublic} />
                                                                </div>
                                                                {clan.description && (
                                                                    <p className="text-[10px] text-text-muted truncate leading-snug mb-1">{clan.description}</p>
                                                                )}
                                                                <div className="flex items-center gap-2.5 text-[9px] text-text-muted/60 font-mono font-bold">
                                                                    <span><span className="text-white/50">{clan.memberCount}</span>/{clan.maxMembers} membres</span>
                                                                    {clan.city && <span className="flex items-center gap-1"><MapPin size={8} />{clan.city}</span>}
                                                                    {clan.minWeeklyKm > 0 && <span>· min {clan.minWeeklyKm} km/sem</span>}
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => { setSelectedClanId(clan.id); setView('detail'); }}
                                                                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex-shrink-0"
                                                                style={{
                                                                    background: 'rgba(90,178,255,0.14)',
                                                                    border: '1px solid rgba(90,178,255,0.28)',
                                                                    color: '#5ab2ff',
                                                                }}
                                                            >
                                                                Voir <ChevronRight size={10} />
                                                            </button>
                                                        </motion.div>
                                                    ))}

                                                    {hasMore && (
                                                        <button
                                                            onClick={handleLoadMore}
                                                            disabled={loadingMore}
                                                            className="w-full py-3 rounded-[16px] text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                                            style={{ border: '1px dashed rgba(255,255,255,0.1)' }}
                                                        >
                                                            {loadingMore ? <Loader2 size={12} className="animate-spin" /> : 'Charger plus'}
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {/* Detail panel overlay */}
                                        <AnimatePresence>
                                            {view === 'detail' && selectedClanId && (
                                                <ClanDetailPanel
                                                    key={selectedClanId}
                                                    clanId={selectedClanId}
                                                    onBack={() => setView('list')}
                                                    onJoined={handleJoined}
                                                    onSwitchToCode={() => { setView('list'); setTab('code'); }}
                                                />
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                )}

                                {/* ── Code tab ── */}
                                {tab === 'code' && (
                                    <motion.div key="code"
                                        initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                                        className="absolute inset-0 flex flex-col px-5 pb-6"
                                        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
                                    >
                                        <p className="text-xs text-text-muted mb-5 leading-relaxed">
                                            Entre le code partagé par un membre du clan. Les codes comportent 8 caractères.
                                        </p>

                                        <div className="rounded-[20px] p-5 mb-4 text-center"
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(90,178,255,0.08), rgba(34,211,238,0.04))',
                                                border: `1px solid ${codeError ? 'rgba(239,68,68,0.35)' : code.length === 8 ? 'rgba(90,178,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                                            }}>
                                            <div className="text-[9px] font-black uppercase tracking-widest text-white/35 mb-3 flex items-center justify-center gap-1.5">
                                                <Hash size={9} /> Code d'invitation
                                            </div>
                                            <input
                                                type="text"
                                                value={code}
                                                onChange={e => handleCodeInput(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleJoinByCode()}
                                                placeholder="ABCDEFGH"
                                                maxLength={8}
                                                autoCapitalize="characters"
                                                autoCorrect="off"
                                                spellCheck={false}
                                                className="w-full bg-transparent text-center font-mono font-black text-3xl tracking-[0.25em] text-white placeholder:text-white/15 focus:outline-none"
                                                style={{ textShadow: code.length === 8 ? '0 0 20px rgba(90,178,255,0.4)' : 'none' }}
                                            />
                                            <div className="flex justify-center gap-0.5 mt-3">
                                                {Array.from({ length: 8 }).map((_, i) => (
                                                    <div key={i} className="h-0.5 w-5 rounded-full transition-all duration-200"
                                                        style={{ background: i < code.length ? '#5ab2ff' : 'rgba(255,255,255,0.12)' }} />
                                                ))}
                                            </div>
                                        </div>

                                        {codeError && (
                                            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                                className="flex items-center gap-2 px-3 py-2.5 rounded-[12px] mb-4"
                                                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                                                <AlertCircle size={11} className="text-red-400 flex-shrink-0" />
                                                <span className="text-[10px] text-red-300">{codeError}</span>
                                            </motion.div>
                                        )}

                                        <motion.button
                                            whileTap={{ scale: 0.97 }}
                                            onClick={handleJoinByCode}
                                            disabled={codeLoading || code.length !== 8}
                                            className="w-full py-3.5 rounded-[16px] font-black text-sm flex items-center justify-center gap-2 text-white disabled:opacity-40 transition-opacity"
                                            style={{
                                                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                                boxShadow: code.length === 8 ? '0 6px 22px rgba(59,130,246,0.28)' : 'none',
                                            }}>
                                            {codeLoading ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                                            Rejoindre le clan
                                        </motion.button>
                                    </motion.div>
                                )}

                            </AnimatePresence>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
