import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Check, X, Loader2, Clock } from 'lucide-react';
import { api } from '../../services/api';

interface PendingInvite {
    id: string;
    clanId: string;
    clanName: string;
    invitedByUsername: string | null;
    expiresAt: string;
}

interface Props {
    onJoined: () => void;
}

export function PendingInviteBanner({ onJoined }: Props) {
    const [invites, setInvites] = useState<PendingInvite[]>([]);
    const [loading, setLoading] = useState(false);
    const [accepting, setAccepting] = useState<string | null>(null);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    useEffect(() => {
        api.get('/clans/pending-invites')
            .then(res => setInvites(res.data?.invites ?? []))
            .catch(() => {});
    }, []);

    const visible = invites.filter(i => !dismissed.has(i.id));

    if (visible.length === 0) return null;

    const handleAccept = async (invite: PendingInvite) => {
        setAccepting(invite.id);
        try {
            await api.post(`/clans/invites/${invite.id}/accept`);
            setDismissed(prev => new Set([...prev, invite.id]));
            onJoined();
        } catch {
            // silently ignore — user might already be in a clan
        } finally {
            setAccepting(null);
        }
    };

    const handleDismiss = (id: string) => {
        setDismissed(prev => new Set([...prev, id]));
    };

    void loading; void setLoading;

    return (
        <div className="space-y-2">
            <AnimatePresence>
                {visible.map(invite => (
                    <motion.div
                        key={invite.id}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="rounded-[18px] px-4 py-3.5 flex items-center gap-3"
                        style={{
                            background: 'linear-gradient(135deg, rgba(90,178,255,0.1), rgba(90,178,255,0.04))',
                            border: '1px solid rgba(90,178,255,0.2)',
                        }}
                    >
                        <div
                            className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(90,178,255,0.15)' }}
                        >
                            <UserPlus size={15} className="text-primary" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="text-[12px] font-black text-white truncate">
                                Rejoindre <span className="text-primary">{invite.clanName}</span>
                            </div>
                            <div className="text-[10px] text-white/40 flex items-center gap-1 mt-0.5">
                                {invite.invitedByUsername && (
                                    <span>De {invite.invitedByUsername} · </span>
                                )}
                                <Clock size={8} className="shrink-0" />
                                <span>
                                    Expire le {new Date(invite.expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            <motion.button
                                whileTap={{ scale: 0.93 }}
                                onClick={() => handleAccept(invite)}
                                disabled={accepting === invite.id}
                                className="w-8 h-8 rounded-[10px] flex items-center justify-center"
                                style={{ background: 'rgba(90,178,255,0.2)', border: '1px solid rgba(90,178,255,0.35)' }}
                            >
                                {accepting === invite.id
                                    ? <Loader2 size={13} className="animate-spin text-primary" />
                                    : <Check size={13} className="text-primary" />
                                }
                            </motion.button>
                            <button
                                onClick={() => handleDismiss(invite.id)}
                                className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                            >
                                <X size={13} />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
