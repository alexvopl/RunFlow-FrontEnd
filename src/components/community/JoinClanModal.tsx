import { useState, useEffect } from 'react';
import { X, Loader2, Users, Search, AlertCircle, ChevronRight, Hash, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import { resolveError } from '../../services/errors';

interface JoinClanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onJoined: () => void;
}

export function JoinClanModal({ isOpen, onClose, onJoined }: JoinClanModalProps) {
    const [tab, setTab] = useState<'browse' | 'code'>('browse');

    // ── Browse state ──────────────────────────────────────────────────────
    const [clans, setClans] = useState<any[]>([]);
    const [browseLoading, setBrowseLoading] = useState(true);
    const [joiningId, setJoiningId] = useState<string | null>(null);
    const [browseError, setBrowseError] = useState('');

    // ── Code state ────────────────────────────────────────────────────────
    const [code, setCode] = useState('');
    const [codeLoading, setCodeLoading] = useState(false);
    const [codeError, setCodeError] = useState('');

    const fetchClans = async () => {
        setBrowseLoading(true);
        setBrowseError('');
        try {
            const res = await api.get('/clans');
            setClans(Array.isArray(res.data?.clans) ? res.data.clans : []);
        } catch {
            setBrowseError('Impossible de charger les clans pour le moment.');
        } finally {
            setBrowseLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setTab('browse');
            setCode('');
            setCodeError('');
            void fetchClans();
        }
    }, [isOpen]);

    const handleJoin = async (clanId: string) => {
        setJoiningId(clanId);
        setBrowseError('');
        try {
            await api.post(`/clans/${clanId}/join`);
            onJoined();
            onClose();
        } catch (e) {
            setBrowseError(resolveError(e, 'Impossible de rejoindre ce clan pour le moment.'));
        } finally {
            setJoiningId(null);
        }
    };

    const handleJoinByCode = async () => {
        const raw = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        if (raw.length !== 8) {
            setCodeError('Le code doit comporter 8 caractères.');
            return;
        }
        setCodeLoading(true);
        setCodeError('');
        try {
            await api.post(`/clans/join/${raw}`);
            onJoined();
            onClose();
        } catch (e) {
            setCodeError(resolveError(e, "Erreur lors de l'utilisation du code."));
        } finally {
            setCodeLoading(false);
        }
    };

    const handleCodeInput = (v: string) => {
        setCodeError('');
        // Keep only alphanumeric, uppercase, max 8 chars
        setCode(v.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-end justify-center"
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 40, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                        className="relative w-full max-w-lg glass-card rounded-t-[36px] flex flex-col overflow-hidden"
                        style={{ maxHeight: '85vh' }}
                    >
                        {/* Handle */}
                        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-4 mb-2 flex-shrink-0" />

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pb-3 pt-2 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                                    <Search size={16} className="text-primary" />
                                </div>
                                <h2 className="text-lg font-black tracking-tight">Rejoindre un clan</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 glass-card rounded-2xl flex items-center justify-center text-text-muted hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="px-5 pb-3 flex-shrink-0">
                            <div className="flex gap-1 p-1 glass-card rounded-2xl">
                                {(['browse', 'code'] as const).map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setTab(t)}
                                        className="flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                                        style={{
                                            background: tab === t ? 'rgba(90,178,255,0.18)' : 'transparent',
                                            color: tab === t ? '#5ab2ff' : 'rgba(255,255,255,0.35)',
                                            border: tab === t ? '1px solid rgba(90,178,255,0.28)' : '1px solid transparent',
                                        }}
                                    >
                                        {t === 'browse' ? <><Users size={11} /> Parcourir</> : <><Hash size={11} /> Via un code</>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Content */}
                        <AnimatePresence mode="wait">

                            {/* ── Browse tab ── */}
                            {tab === 'browse' && (
                                <motion.div
                                    key="browse"
                                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                                    className="flex-1 overflow-y-auto px-5 pb-6 space-y-2.5"
                                    style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
                                >
                                    {browseError && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                                            className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-2xl flex items-center gap-2.5 text-sm"
                                        >
                                            <AlertCircle size={15} className="flex-shrink-0" />
                                            {browseError}
                                        </motion.div>
                                    )}

                                    {browseLoading ? (
                                        Array.from({ length: 4 }).map((_, i) => (
                                            <div key={i} className="glass-card rounded-[22px] p-4 flex items-center gap-3">
                                                <div className="skeleton w-11 h-11 rounded-2xl flex-shrink-0" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="skeleton h-3 w-1/2 rounded-lg" />
                                                    <div className="skeleton h-2.5 w-1/3 rounded-lg" />
                                                </div>
                                                <div className="skeleton w-20 h-8 rounded-full flex-shrink-0" />
                                            </div>
                                        ))
                                    ) : clans.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                                            <div className="w-16 h-16 glass-hero rounded-[20px] flex items-center justify-center">
                                                <Users size={26} className="text-text-muted/40" />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-black text-sm text-white">Aucun clan disponible</p>
                                                <p className="text-xs text-text-muted mt-1">Crée le premier !</p>
                                            </div>
                                        </div>
                                    ) : (
                                        clans.map((clan, i) => (
                                            <motion.div
                                                key={clan.id}
                                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.04 }}
                                                className="glass-card rounded-[22px] p-4 flex items-center gap-3.5"
                                            >
                                                <div className="w-11 h-11 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-sm font-black text-primary">
                                                        {clan.name?.slice(0, 2).toUpperCase() || '??'}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-sm text-white truncate">{clan.name}</p>
                                                    <div className="flex items-center gap-2.5 mt-0.5">
                                                        <span className="text-[10px] text-text-muted font-medium flex items-center gap-1">
                                                            <Users size={10} />
                                                            {clan.memberCount ?? 0}/{clan.maxMembers ?? 50}
                                                        </span>
                                                        {clan.minWeeklyKm > 0 && (
                                                            <span className="text-[10px] text-text-muted font-medium">
                                                                Min. {clan.minWeeklyKm} km/sem
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleJoin(clan.id)}
                                                    disabled={!!joiningId}
                                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white text-xs font-black rounded-full hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 flex-shrink-0"
                                                    style={{ boxShadow: '0 4px 14px rgba(90,178,255,0.25)' }}
                                                >
                                                    {joiningId === clan.id
                                                        ? <Loader2 size={13} className="animate-spin" />
                                                        : <><ChevronRight size={13} /> Rejoindre</>
                                                    }
                                                </button>
                                            </motion.div>
                                        ))
                                    )}
                                </motion.div>
                            )}

                            {/* ── Code tab ── */}
                            {tab === 'code' && (
                                <motion.div
                                    key="code"
                                    initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                                    className="flex-1 px-5 pb-6 flex flex-col"
                                    style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
                                >
                                    <p className="text-xs text-text-muted mb-5 leading-relaxed">
                                        Entre le code que t'a partagé un membre du clan. Les codes sont composés de 8 caractères.
                                    </p>

                                    {/* Code input */}
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
                                                <div
                                                    key={i}
                                                    className="h-0.5 w-5 rounded-full transition-all duration-200"
                                                    style={{ background: i < code.length ? '#5ab2ff' : 'rgba(255,255,255,0.12)' }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {codeError && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                            className="flex items-center gap-2 px-3 py-2.5 rounded-[12px] mb-4"
                                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}
                                        >
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
                                        }}
                                    >
                                        {codeLoading
                                            ? <Loader2 size={15} className="animate-spin" />
                                            : <ArrowRight size={15} />
                                        }
                                        Rejoindre le clan
                                    </motion.button>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
