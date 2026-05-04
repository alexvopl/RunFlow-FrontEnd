import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link, Copy, Check, Loader2, RefreshCw, AlertTriangle, Clock, Users } from 'lucide-react';
import { api } from '../../services/api';
import { resolveError } from '../../services/errors';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface RawInvite {
    id: string;
    clanId: string;
    inviteCode: string;
    maxUses: number;
    useCount: number;
    expiresAt: string;
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

export function InviteSheet({ clanId, clanName, isOpen, onClose }: Props) {
    const [maxUses, setMaxUses] = useState(5);
    const [expiresInDays, setExpiresInDays] = useState(7);
    const [loading, setLoading] = useState(false);
    const [invite, setInvite] = useState<RawInvite | null>(null);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const reset = () => {
        setInvite(null);
        setError('');
        setMaxUses(5);
        setExpiresInDays(7);
    };

    const handleCreate = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.post(`/clans/${clanId}/invites`, { maxUses, expiresInDays });
            setInvite(res.data.invite as RawInvite);
        } catch (e) {
            setError(resolveError(e, 'Erreur lors de la création du lien.'));
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        if (!invite?.inviteCode) return;
        await navigator.clipboard.writeText(invite.inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
                                        className="space-y-4"
                                    >
                                        {/* Code display */}
                                        <div className="rounded-[20px] p-5 text-center"
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(90,178,255,0.1), rgba(34,211,238,0.05))',
                                                border: '1px solid rgba(90,178,255,0.2)',
                                            }}>
                                            <div className="text-[8px] font-black uppercase tracking-widest text-white/35 mb-2">
                                                Code d'invitation
                                            </div>
                                            <div
                                                className="font-mono font-black text-3xl tracking-[0.2em] text-white mb-1"
                                                style={{ textShadow: '0 0 20px rgba(90,178,255,0.4)' }}
                                            >
                                                {fmtCode(invite.inviteCode)}
                                            </div>
                                            <div className="flex items-center justify-center gap-3 text-[9px] text-white/35 mt-2">
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

                                        {/* Copy button */}
                                        <motion.button
                                            whileTap={{ scale: 0.97 }}
                                            onClick={handleCopy}
                                            className="w-full py-3.5 rounded-[16px] font-black text-sm flex items-center justify-center gap-2 transition-all"
                                            style={{
                                                background: copied
                                                    ? 'linear-gradient(135deg, rgba(16,185,129,0.22), rgba(16,185,129,0.08))'
                                                    : 'rgba(255,255,255,0.06)',
                                                border: copied
                                                    ? '1px solid rgba(16,185,129,0.38)'
                                                    : '1px solid rgba(255,255,255,0.1)',
                                                color: copied ? '#10b981' : 'rgba(255,255,255,0.7)',
                                            }}
                                        >
                                            {copied ? <Check size={15} /> : <Copy size={15} />}
                                            {copied ? 'Code copié !' : 'Copier le code'}
                                        </motion.button>

                                        {/* Instructions */}
                                        <div className="rounded-[14px] px-4 py-3"
                                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                            <p className="text-[10px] text-white/35 leading-relaxed">
                                                Partage ce code à tes coéquipiers. Ils devront l'entrer dans l'app pour rejoindre <span className="text-white/55 font-bold">{clanName}</span> directement.
                                            </p>
                                        </div>

                                        {/* Create another */}
                                        <button
                                            onClick={reset}
                                            className="w-full py-2.5 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/35 hover:text-white/55 transition-colors"
                                        >
                                            <RefreshCw size={11} />Créer un autre code
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
