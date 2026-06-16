import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link, Copy, Check, Loader2, RefreshCw, AlertTriangle, Clock, Users, UserPlus, Share2, Search } from 'lucide-react';
import { api } from '../../services/api';
import { resolveError } from '../../services/errors';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface RawInvite {
    id: string;
    clanId: string;
    inviteCode: string | null;
    maxUses: number;
    useCount: number;
    expiresAt: string;
}

interface UserProfile {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
}

interface Props {
    clanId: string;
    clanName: string;
    isOpen: boolean;
    onClose: () => void;
}

// ─── Config options ─────────────────────────────────────────────────────────────

const MAX_USES_OPTIONS = [
    { value: 1,   label: '1 utilisation' },
    { value: 5,   label: '5 utilisations' },
    { value: 10,  label: '10 utilisations' },
    { value: 100, label: 'Illimité' },
];

const EXPIRES_OPTIONS = [
    { value: 1,  label: '1 jour' },
    { value: 3,  label: '3 jours' },
    { value: 7,  label: '7 jours' },
    { value: 30, label: '30 jours' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtCode(code: string): string {
    // ABCD·EFGH for readability — but API expects raw 8 chars
    return code.length === 8 ? `${code.slice(0, 4)}·${code.slice(4)}` : code;
}

function fmtExpiry(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Component ─────────────────────────────────────────────────────────────────

function buildInviteLink(code: string): string {
    return `${window.location.origin}/join/${code}`;
}

export function InviteSheet({ clanId, clanName, isOpen, onClose }: Props) {
    const [maxUses, setMaxUses] = useState(5);
    const [expiresInDays, setExpiresInDays] = useState(7);
    const [loading, setLoading] = useState(false);
    const [invite, setInvite] = useState<RawInvite | null>(null);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [shared, setShared] = useState(false);

    // User search for targeted invite
    const [userSearch, setUserSearch] = useState('');
    const [userResults, setUserResults] = useState<UserProfile[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [searching, setSearching] = useState(false);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        if (!userSearch.trim() || selectedUser) {
            setUserResults([]);
            return;
        }
        setSearching(true);
        searchTimer.current = setTimeout(async () => {
            try {
                const res = await api.get(`/profiles/search?q=${encodeURIComponent(userSearch)}`);
                const raw = res.data?.profiles ?? [];
                setUserResults(raw.map((p: any) => ({
                    id: p.id,
                    username: p.username,
                    displayName: p.display_name ?? null,
                    avatarUrl: p.avatar_url ?? null,
                })));
            } catch {
                setUserResults([]);
            } finally {
                setSearching(false);
            }
        }, 350);
    }, [userSearch, selectedUser]);

    const reset = () => {
        setInvite(null);
        setError('');
        setMaxUses(5);
        setExpiresInDays(7);
        setUserSearch('');
        setUserResults([]);
        setSelectedUser(null);
        setCopied(false);
        setShared(false);
    };

    const handleCreate = async () => {
        setLoading(true);
        setError('');
        try {
            const body: Record<string, unknown> = { maxUses, expiresInDays };
            if (selectedUser) body.invitedUserId = selectedUser.id;
            const res = await api.post(`/clans/${clanId}/invites`, body);
            setInvite(res.data.invite as RawInvite);
        } catch (e) {
            setError(resolveError(e, 'Erreur lors de la création du lien.'));
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        if (!invite?.inviteCode) return;
        const link = buildInviteLink(invite.inviteCode);
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleShare = async () => {
        if (!invite?.inviteCode) return;
        const link = buildInviteLink(invite.inviteCode);
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Rejoins mon clan ${clanName} sur Runflow !`,
                    text: `Utilise ce lien pour rejoindre mon clan de running 🏃`,
                    url: link,
                });
                setShared(true);
                setTimeout(() => setShared(false), 2500);
            } catch {
                // User cancelled or share failed — fall back to clipboard
                await handleCopy();
            }
        } else {
            await handleCopy();
        }
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50"
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                        className="fixed inset-x-0 bottom-0 z-50 max-w-md mx-auto rounded-t-[28px] pb-10"
                        style={{
                            background: 'linear-gradient(180deg, #0d1e33 0%, #07111f 100%)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderBottom: 'none',
                        }}
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1 rounded-full bg-white/15" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pb-4 border-b border-white/[0.06]">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-[10px] flex items-center justify-center"
                                    style={{ background: 'rgba(90,178,255,0.14)', border: '1px solid rgba(90,178,255,0.22)' }}>
                                    <Link size={13} className="text-primary" />
                                </div>
                                <div>
                                    <div className="text-sm font-black text-white">Inviter dans le clan</div>
                                    <div className="text-[10px] text-white/35">{clanName}</div>
                                </div>
                            </div>
                            <button onClick={handleClose}
                                className="w-8 h-8 glass-card rounded-[10px] flex items-center justify-center text-white/40 hover:text-white transition-colors">
                                <X size={14} />
                            </button>
                        </div>

                        <div className="px-5 pt-4">
                            <AnimatePresence mode="wait">

                                {/* ── Form step ── */}
                                {!invite && (
                                    <motion.div key="form"
                                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        className="space-y-4"
                                    >
                                        {/* Max uses */}
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-white/35 flex items-center gap-1.5 mb-2">
                                                <Users size={9} />Nombre d'utilisations
                                            </label>
                                            <div className="grid grid-cols-4 gap-1.5">
                                                {MAX_USES_OPTIONS.map(opt => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => setMaxUses(opt.value)}
                                                        className="py-2.5 rounded-[12px] text-[10px] font-black transition-all text-center"
                                                        style={{
                                                            background: maxUses === opt.value
                                                                ? 'rgba(90,178,255,0.16)'
                                                                : 'rgba(255,255,255,0.04)',
                                                            border: maxUses === opt.value
                                                                ? '1px solid rgba(90,178,255,0.38)'
                                                                : '1px solid rgba(255,255,255,0.07)',
                                                            color: maxUses === opt.value ? '#5ab2ff' : 'rgba(255,255,255,0.40)',
                                                        }}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Expiry */}
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-white/35 flex items-center gap-1.5 mb-2">
                                                <Clock size={9} />Durée de validité
                                            </label>
                                            <div className="grid grid-cols-4 gap-1.5">
                                                {EXPIRES_OPTIONS.map(opt => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => setExpiresInDays(opt.value)}
                                                        className="py-2.5 rounded-[12px] text-[10px] font-black transition-all text-center"
                                                        style={{
                                                            background: expiresInDays === opt.value
                                                                ? 'rgba(34,211,238,0.12)'
                                                                : 'rgba(255,255,255,0.04)',
                                                            border: expiresInDays === opt.value
                                                                ? '1px solid rgba(34,211,238,0.32)'
                                                                : '1px solid rgba(255,255,255,0.07)',
                                                            color: expiresInDays === opt.value ? '#22d3ee' : 'rgba(255,255,255,0.40)',
                                                        }}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Optional targeted user search */}
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-white/35 flex items-center gap-1.5 mb-2">
                                                <UserPlus size={9} />Invitation ciblée
                                                <span className="text-white/20 normal-case tracking-normal font-bold">(optionnel)</span>
                                            </label>

                                            {selectedUser ? (
                                                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-[12px]"
                                                    style={{ background: 'rgba(90,178,255,0.08)', border: '1px solid rgba(90,178,255,0.28)' }}>
                                                    <div className="w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0 font-black text-xs"
                                                        style={{ background: 'rgba(90,178,255,0.18)', color: '#5ab2ff' }}>
                                                        {(selectedUser.displayName || selectedUser.username).charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[11px] font-black text-white truncate">
                                                            {selectedUser.displayName || selectedUser.username}
                                                        </div>
                                                        <div className="text-[9px] text-white/40">@{selectedUser.username}</div>
                                                    </div>
                                                    <button
                                                        onClick={() => setSelectedUser(null)}
                                                        className="text-white/30 hover:text-white/60 transition-colors">
                                                        <X size={13} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="relative">
                                                    <div className="relative">
                                                        <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                                                        <input
                                                            type="text"
                                                            value={userSearch}
                                                            onChange={e => setUserSearch(e.target.value)}
                                                            placeholder="Rechercher par pseudo…"
                                                            className="w-full pl-8 pr-3.5 py-2.5 rounded-[12px] text-[11px] text-white placeholder:text-white/25 focus:outline-none transition-all"
                                                            style={{
                                                                background: 'rgba(255,255,255,0.04)',
                                                                border: userSearch
                                                                    ? '1px solid rgba(90,178,255,0.35)'
                                                                    : '1px solid rgba(255,255,255,0.08)',
                                                            }}
                                                        />
                                                        {searching && (
                                                            <Loader2 size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 animate-spin" />
                                                        )}
                                                    </div>

                                                    {userResults.length > 0 && (
                                                        <div className="mt-1.5 rounded-[12px] overflow-hidden"
                                                            style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#0a1829' }}>
                                                            {userResults.map(u => (
                                                                <button
                                                                    key={u.id}
                                                                    onClick={() => { setSelectedUser(u); setUserSearch(''); setUserResults([]); }}
                                                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/[0.04] transition-colors"
                                                                >
                                                                    <div className="w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0 font-black text-xs"
                                                                        style={{ background: 'rgba(90,178,255,0.12)', color: '#5ab2ff' }}>
                                                                        {(u.displayName || u.username).charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-[11px] font-black text-white truncate">
                                                                            {u.displayName || u.username}
                                                                        </div>
                                                                        <div className="text-[9px] text-white/40">@{u.username}</div>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <p className="text-[8px] text-white/20 mt-1.5 leading-relaxed">
                                                Si renseigné, seul cet utilisateur pourra accepter cette invitation.
                                            </p>
                                        </div>

                                        {error && (
                                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-[12px]"
                                                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                                                <AlertTriangle size={11} className="text-red-400 shrink-0" />
                                                <span className="text-[10px] text-red-300">{error}</span>
                                            </div>
                                        )}

                                        <motion.button
                                            whileTap={{ scale: 0.97 }}
                                            onClick={handleCreate}
                                            disabled={loading}
                                            className="w-full py-3.5 rounded-[16px] font-black text-sm flex items-center justify-center gap-2 text-white disabled:opacity-50"
                                            style={{
                                                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                                boxShadow: '0 6px 22px rgba(59,130,246,0.28)',
                                            }}
                                        >
                                            {loading
                                                ? <Loader2 size={15} className="animate-spin" />
                                                : <Link size={15} />
                                            }
                                            Générer le code
                                        </motion.button>
                                    </motion.div>
                                )}

                                {/* ── Success step ── */}
                                {invite && (
                                    <motion.div key="success"
                                        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="space-y-3"
                                    >
                                        {invite.inviteCode ? (
                                            <>
                                                {/* Code + link display (generic invite) */}
                                                <div className="rounded-[20px] p-5 text-center"
                                                    style={{
                                                        background: 'linear-gradient(135deg, rgba(90,178,255,0.1), rgba(34,211,238,0.05))',
                                                        border: '1px solid rgba(90,178,255,0.2)',
                                                    }}>
                                                    <div className="text-[8px] font-black uppercase tracking-widest text-white/35 mb-2">
                                                        Code d'invitation
                                                    </div>
                                                    <div
                                                        className="font-mono font-black text-3xl tracking-[0.2em] text-white mb-3"
                                                        style={{ textShadow: '0 0 20px rgba(90,178,255,0.4)' }}
                                                    >
                                                        {fmtCode(invite.inviteCode)}
                                                    </div>
                                                    <div className="text-[9px] font-mono text-white/30 bg-white/[0.04] rounded-[10px] px-3 py-1.5 break-all">
                                                        {buildInviteLink(invite.inviteCode)}
                                                    </div>
                                                    <div className="flex items-center justify-center gap-3 text-[9px] text-white/35 mt-3">
                                                        <span className="flex items-center gap-1">
                                                            <Users size={9} />
                                                            {invite.maxUses >= 100 ? 'Illimité' : `${invite.maxUses} max`}
                                                        </span>
                                                        <span>·</span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock size={9} />
                                                            Expire le {fmtExpiry(invite.expiresAt)}
                                                        </span>
                                                    </div>
                                                </div>

                                                <motion.button
                                                    whileTap={{ scale: 0.97 }}
                                                    onClick={handleShare}
                                                    className="w-full py-3.5 rounded-[16px] font-black text-sm flex items-center justify-center gap-2 text-white"
                                                    style={{
                                                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                                        boxShadow: '0 6px 22px rgba(59,130,246,0.28)',
                                                    }}
                                                >
                                                    {shared ? <Check size={15} /> : <Share2 size={15} />}
                                                    {shared ? 'Lien partagé !' : 'Partager le lien'}
                                                </motion.button>

                                                <motion.button
                                                    whileTap={{ scale: 0.97 }}
                                                    onClick={handleCopy}
                                                    className="w-full py-3 rounded-[16px] font-black text-sm flex items-center justify-center gap-2 transition-all"
                                                    style={{
                                                        background: copied
                                                            ? 'linear-gradient(135deg, rgba(16,185,129,0.22), rgba(16,185,129,0.08))'
                                                            : 'rgba(255,255,255,0.06)',
                                                        border: copied
                                                            ? '1px solid rgba(16,185,129,0.38)'
                                                            : '1px solid rgba(255,255,255,0.1)',
                                                        color: copied ? '#10b981' : 'rgba(255,255,255,0.6)',
                                                    }}
                                                >
                                                    {copied ? <Check size={15} /> : <Copy size={15} />}
                                                    {copied ? 'Lien copié !' : 'Copier le lien'}
                                                </motion.button>

                                                <div className="rounded-[14px] px-4 py-3"
                                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                    <p className="text-[10px] text-white/35 leading-relaxed">
                                                        Envoie ce lien à tes coéquipiers. En cliquant dessus, ils rejoignent <span className="text-white/55 font-bold">{clanName}</span> directement.
                                                    </p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {/* Targeted invite success */}
                                                <div className="rounded-[20px] p-5 text-center"
                                                    style={{
                                                        background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.04))',
                                                        border: '1px solid rgba(16,185,129,0.2)',
                                                    }}>
                                                    <div className="w-12 h-12 rounded-[14px] flex items-center justify-center mx-auto mb-3"
                                                        style={{ background: 'rgba(16,185,129,0.15)' }}>
                                                        <Check size={22} className="text-emerald-400" />
                                                    </div>
                                                    <div className="text-base font-black text-white mb-1">Invitation envoyée !</div>
                                                    {selectedUser && (
                                                        <p className="text-[11px] text-white/50 leading-relaxed">
                                                            <span className="text-white/70 font-bold">
                                                                {selectedUser.displayName || `@${selectedUser.username}`}
                                                            </span>{' '}
                                                            recevra une invitation pour rejoindre <span className="text-white/70 font-bold">{clanName}</span>.
                                                        </p>
                                                    )}
                                                    <div className="flex items-center justify-center gap-1 text-[9px] text-white/30 mt-3">
                                                        <Clock size={9} />
                                                        Expire le {fmtExpiry(invite.expiresAt)}
                                                    </div>
                                                </div>

                                                <div className="rounded-[14px] px-4 py-3"
                                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                    <p className="text-[10px] text-white/35 leading-relaxed">
                                                        L'utilisateur verra cette invitation dans la section Communauté de son app et pourra l'accepter directement.
                                                    </p>
                                                </div>
                                            </>
                                        )}

                                        {/* Create another */}
                                        <button
                                            onClick={reset}
                                            className="w-full py-2.5 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/35 hover:text-white/55 transition-colors"
                                        >
                                            <RefreshCw size={11} />Créer un autre lien
                                        </button>
                                    </motion.div>
                                )}

                            </AnimatePresence>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
