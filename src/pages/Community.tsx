import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Trophy, MessageCircle, Zap, X, Send, Loader2, Users, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CreateClanModal } from '../components/community/CreateClanModal';
import { JoinClanModal } from '../components/community/JoinClanModal';
import { LeaderboardTabs } from '../components/community/LeaderboardTabs';
import { ClanCard } from '../components/community/ClanCard';
import { clsx } from 'clsx';

// ── Clan leaderboard sub-component ──────────────────────────────────────
function ClanLeaderboard() {
    const [clans, setClans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/leaderboards/clans')
            .then(res => setClans(Array.isArray(res.data?.rankings) ? res.data.rankings : []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-primary" size={24} />
        </div>
    );

    if (clans.length === 0) return (
        <div className="glass-card rounded-[24px] p-8 text-center border-dashed">
            <p className="text-text-muted text-sm font-bold">Aucun classement disponible</p>
        </div>
    );

    return (
        <div className="space-y-2">
            {clans.map((clan: any, i: number) => (
                <motion.div key={clan.id || i}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className={clsx('rf-activity-row', i < 3 && 'glass-hero')}>
                    {/* Rank */}
                    {i === 0 && <div className="w-7 h-7 rounded-lg bg-rank-gold flex items-center justify-center font-black text-black text-xs flex-shrink-0">1</div>}
                    {i === 1 && <div className="w-7 h-7 rounded-lg bg-rank-silver flex items-center justify-center font-black text-black text-xs flex-shrink-0">2</div>}
                    {i === 2 && <div className="w-7 h-7 rounded-lg bg-rank-bronze flex items-center justify-center font-black text-white text-xs flex-shrink-0">3</div>}
                    {i > 2 && <div className="w-7 h-7 rounded-lg glass-card flex items-center justify-center font-black text-text-muted text-xs flex-shrink-0">{i + 1}</div>}

                    <div className="w-10 h-10 rounded-2xl glass-card flex items-center justify-center font-black text-primary text-sm flex-shrink-0">
                        {clan.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-black text-sm text-white truncate">{clan.name}</p>
                        <p className="text-[10px] text-text-muted font-bold">{clan.memberCount || 0} membres</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <p className="font-black text-sm text-white">
                            {(((clan.totalDistanceM || clan.totalDistance || 0) as number) / 1000).toFixed(0)}
                        </p>
                        <p className="text-[9px] text-primary font-black">km</p>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────
export function Community() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [clan, setClan] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showChat, setShowChat] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [activeTab, setActiveTab] = useState<'players' | 'clans' | 'wars'>('clans');
    const [filter, setFilter] = useState<'global' | 'local'>('global');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);

    const fetchMessages = useCallback(async (clanId: string) => {
        try {
            const res = await api.get(`/clans/${clanId}/messages`);
            setMessages(Array.isArray(res.data?.messages) ? res.data.messages : []);
        } catch { /* silent */ }
    }, []);

    const fetchClan = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/clans/me');
            const myClan = response.data?.clan ?? null;
            const membership = response.data?.membership ?? null;
            let clanDetails = null;
            if (myClan?.id) {
                const detailsRes = await api.get(`/clans/${myClan.id}`).catch(() => ({ data: null }));
                clanDetails = detailsRes.data;
            }
            const normalizedClan = myClan ? {
                ...myClan,
                members: clanDetails?.members,
                role: membership?.role,
                score: Math.round((myClan.totalDistanceM ?? 0) / 1000),
                level: 1,
            } : null;
            setClan(normalizedClan);
            if (normalizedClan?.id) fetchMessages(normalizedClan.id);
        } catch (error: any) {
            if (error.response?.status !== 404) console.error('Failed to fetch clan', error);
            setClan(null);
        } finally { setLoading(false); }
    }, [fetchMessages]);

    useEffect(() => { fetchClan(); }, [fetchClan]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !clan) return;
        try {
            await api.post(`/clans/${clan.id}/messages`, { content: newMessage });
            setNewMessage('');
            fetchMessages(clan.id);
        } catch { /* silent */ }
    };

    const handleLeaveClan = async () => {
        if (!window.confirm('Voulez-vous vraiment quitter votre clan ?')) return;
        try {
            await api.post(`/clans/${clan.id}/leave`);
            setClan(null);
        } catch { setClan(null); }
    };

    const handleKickMember = async (userId: string) => {
        if (!window.confirm('Voulez-vous vraiment exclure ce membre ?')) return;
        try {
            await api.delete(`/clans/${clan.id}/members/${userId}`);
            fetchClan();
        } catch {
            alert("Impossible d'exclure ce membre pour le moment.");
        }
    };

    if (loading) {
        return (
            <div className="px-5 pt-7 pb-28 space-y-4">
                <div className="skeleton h-20 rounded-[22px]" />
                <div className="skeleton h-36 rounded-[28px]" />
                <div className="skeleton h-12 rounded-2xl" />
                <div className="space-y-2.5">
                    {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded-[20px]" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="pb-28 relative">
            <CreateClanModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreated={fetchClan} />
            <JoinClanModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} onJoined={fetchClan} />

            <div className="px-5 space-y-5 pt-7">

                {/* ── User / clan header card ──────────────────────── */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    className="glass-hero rounded-[28px] p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-rank-gold flex items-center justify-center text-black font-black text-xl">
                                {user?.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                                <h2 className="font-black text-white text-base leading-tight">
                                    {user?.name || 'Mon profil'}
                                </h2>
                                <p className="text-[11px] font-bold text-text-muted mt-0.5">
                                    {clan ? clan.name : 'Aucun clan'}
                                </p>
                            </div>
                        </div>
                        <div className="glass-card rounded-2xl px-3 py-2 flex items-center gap-2">
                            <Trophy size={14} className="text-amber-400" />
                            <span className="font-black text-white text-sm">{(user as any)?.trophies || 0}</span>
                        </div>
                    </div>
                </motion.div>

                {/* ── Tabs ────────────────────────────────────────── */}
                <LeaderboardTabs activeTab={activeTab} onChange={setActiveTab} />

                {/* ── Global / Local filter ────────────────────────── */}
                {activeTab !== 'wars' && (
                    <div className="flex gap-2 p-1 glass-card rounded-2xl w-fit">
                        {(['global', 'local'] as const).map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={clsx(
                                    'px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
                                    filter === f ? 'bg-white text-black shadow-md' : 'text-text-muted hover:text-white'
                                )}>
                                {f === 'global' ? 'Monde' : 'Local'}
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Tab content ──────────────────────────────────── */}
                <AnimatePresence mode="wait">

                    {/* CLANS */}
                    {activeTab === 'clans' && (
                        <motion.div key="clans" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="space-y-4">
                            {clan ? (
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-sm font-bold text-text-muted">Votre clan</h3>
                                        <button onClick={handleLeaveClan}
                                            className="text-[10px] font-black text-red-400 hover:text-red-300 transition-colors">
                                            Quitter
                                        </button>
                                    </div>
                                    <ClanCard clan={clan} rank={1} onClick={() => {}} />

                                    {/* Members management (leaders only) */}
                                    {clan.role === 'leader' && clan.members && (
                                        <div className="mt-5">
                                            <h3 className="text-sm font-bold text-text-muted mb-3">Gérer les membres</h3>
                                            <div className="space-y-2">
                                                {clan.members.map((member: any) => (
                                                    <div key={member.id}
                                                        className="flex items-center justify-between glass-card rounded-[20px] px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-xl glass-hero flex items-center justify-center font-black text-xs text-primary">
                                                                {member.name?.charAt(0)?.toUpperCase() || '?'}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-white">{member.name}</p>
                                                                <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest">{member.role}</p>
                                                            </div>
                                                        </div>
                                                        {member.userId !== user?.id && (
                                                            <button onClick={() => handleKickMember(member.userId)}
                                                                className="w-8 h-8 glass-card rounded-xl flex items-center justify-center text-text-muted/40 hover:text-red-400 transition-colors">
                                                                <X size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                    className="glass-hero rounded-[28px] p-8 text-center">
                                    <div className="w-16 h-16 glass-card rounded-[20px] flex items-center justify-center mx-auto mb-5">
                                        <Shield size={28} className="text-primary" />
                                    </div>
                                    <h3 className="font-black text-white text-xl mb-2">Prêt à rejoindre l'équipe ?</h3>
                                    <p className="text-text-muted text-sm leading-relaxed mb-6">
                                        Rejoins un clan pour courir ensemble, te challenger et remporter des récompenses.
                                    </p>
                                    <div className="flex flex-col gap-3">
                                        <button onClick={() => setShowJoinModal(true)}
                                            className="btn-primary py-3.5 text-sm font-black flex items-center justify-center gap-2">
                                            <Users size={16} /> Rejoindre un clan
                                        </button>
                                        <button onClick={() => setShowCreateModal(true)}
                                            className="w-full py-3.5 rounded-full glass-card text-white text-sm font-black flex items-center justify-center gap-2 border border-white/10 hover:border-primary/30 transition-colors active:scale-[0.97]">
                                            <Shield size={16} className="text-primary" /> Créer un clan
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            <div>
                                <h3 className="text-sm font-bold text-text-muted mb-3">Meilleurs clans</h3>
                                <ClanLeaderboard />
                            </div>
                        </motion.div>
                    )}

                    {/* PLAYERS */}
                    {activeTab === 'players' && (
                        <motion.div key="players" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <div className="glass-card rounded-[24px] p-10 text-center border-dashed">
                                <div className="glass-hero w-16 h-16 rounded-[20px] flex items-center justify-center mx-auto mb-4">
                                    <Users size={28} className="text-primary" />
                                </div>
                                <p className="font-bold text-white mb-1">Classement mondial</p>
                                <p className="text-text-muted text-sm">Disponible très bientôt 👀</p>
                            </div>
                        </motion.div>
                    )}

                    {/* WARS */}
                    {activeTab === 'wars' && (
                        <motion.div key="wars" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate('/wars')}
                                className="w-full text-left glass-hero rounded-[28px] p-5 group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center flex-shrink-0">
                                        <Zap size={22} className="text-red-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-white text-base">Guerres de clans</p>
                                        <p className="text-text-muted text-xs mt-0.5">Affronte d'autres clans en temps réel</p>
                                    </div>
                                    <ChevronRight size={16} className="text-text-muted/40 group-hover:text-primary transition-colors flex-shrink-0" />
                                </div>
                            </motion.button>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            {/* ── Chat overlay ──────────────────────────────────────── */}
            <AnimatePresence>
                {showChat && clan && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowChat(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
                        <motion.div
                            initial={{ y: '100%' }} animate={{ y: '10%' }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed inset-x-0 bottom-0 top-0 glass-heavy rounded-t-[32px] z-50 flex flex-col max-w-md mx-auto"
                        >
                            {/* Chat header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl glass-hero flex items-center justify-center">
                                        <MessageCircle size={16} className="text-primary" />
                                    </div>
                                    <span className="font-black text-white text-sm">{clan.name}</span>
                                </div>
                                <button onClick={() => setShowChat(false)}
                                    className="w-9 h-9 glass-card rounded-xl flex items-center justify-center text-text-muted hover:text-white transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                                {messages.map((msg: any) => (
                                    <div key={msg.id} className={`flex gap-2.5 ${msg.userId === user?.id ? 'flex-row-reverse' : ''}`}>
                                        <div className="w-7 h-7 rounded-xl glass-card flex-shrink-0 flex items-center justify-center text-[10px] font-black text-primary">
                                            {(msg.displayName || msg.username || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div className={`px-3.5 py-2.5 rounded-2xl max-w-[78%] ${
                                            msg.userId === user?.id
                                                ? 'bg-primary/15 border border-primary/20 rounded-tr-sm'
                                                : 'glass-card rounded-tl-sm'
                                        }`}>
                                            <p className={`text-[10px] font-black mb-1 ${msg.userId === user?.id ? 'text-primary' : 'text-text-muted'}`}>
                                                {msg.displayName || msg.username || 'Inconnu'}
                                            </p>
                                            <p className="text-sm text-white leading-snug">{msg.content}</p>
                                        </div>
                                    </div>
                                ))}
                                {messages.length === 0 && (
                                    <div className="text-center text-text-muted text-xs font-bold py-12">
                                        Aucun message pour l'instant.
                                    </div>
                                )}
                            </div>

                            {/* Input */}
                            <div className="px-4 py-4 border-t border-white/8 flex-shrink-0 pb-8">
                                <div className="flex gap-2">
                                    <input type="text" placeholder="Écrire un message…" value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                        className="flex-1 glass-card rounded-2xl px-4 py-3 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-primary/40 transition-all" />
                                    <button onClick={handleSendMessage} disabled={!newMessage.trim()}
                                        className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white disabled:opacity-40 active:scale-95 transition-all shadow-[0_4px_12px_rgba(90,178,255,0.3)]">
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ── Chat FAB ──────────────────────────────────────────── */}
            {clan && !showChat && (
                <motion.button
                    initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowChat(true)}
                    className="fixed right-5 bottom-24 w-14 h-14 bg-primary text-white rounded-2xl shadow-[0_8px_24px_rgba(90,178,255,0.4)] flex items-center justify-center z-40"
                >
                    <MessageCircle size={24} />
                </motion.button>
            )}
        </div>
    );
}
