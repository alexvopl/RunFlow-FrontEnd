import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Trophy, MessageCircle, Zap, X, Send, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CreateClanModal } from '../components/community/CreateClanModal';
import { JoinClanModal } from '../components/community/JoinClanModal';
import { LeaderboardTabs } from '../components/community/LeaderboardTabs';
import { ClanCard } from '../components/community/ClanCard';

function ClanLeaderboard() {
    const [clans, setClans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/leaderboards/clans')
            .then(res => setClans(Array.isArray(res.data?.rankings) ? res.data.rankings : []))
            .catch(err => console.error('Failed to fetch clan leaderboard', err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={24} /></div>;

    if (clans.length === 0) return (
        <div className="bg-surface border border-white/5 rounded-3xl p-6 text-center">
            <p className="text-text-muted text-sm font-bold uppercase tracking-widest">Aucun classement disponible</p>
        </div>
    );

    return (
        <div className="bg-surface border border-white/5 rounded-3xl overflow-hidden divide-y divide-white/5 shadow-xl">
            {clans.map((clan: any, i: number) => (
                <div key={clan.id || i} className="p-4 flex items-center gap-4 group hover:bg-white/5 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-lg ${i === 0 ? 'bg-rank-gold text-black' :
                            i === 1 ? 'bg-rank-silver text-black' :
                                i === 2 ? 'bg-rank-bronze text-white' :
                                    'bg-white/5 text-text-muted border border-white/5'
                        }`}>
                        {i + 1}
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-sm">
                        {clan.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-black text-sm uppercase tracking-tight truncate group-hover:text-primary transition-colors">{clan.name}</div>
                        <div className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{clan.memberCount || 0} membres</div>
                    </div>
                        <div className="text-right">
                        <div className="font-black text-base">{(((clan.totalDistanceM || clan.totalDistance || 0) as number) / 1000).toFixed(0)}</div>
                        <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest">KM</div>
                    </div>
                </div>
            ))}
        </div>
    );
}


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

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);

    const fetchMessages = useCallback(async (clanId: string) => {
        try {
            const res = await api.get(`/clans/${clanId}/messages`);
            setMessages(Array.isArray(res.data?.messages) ? res.data.messages : []);
        } catch (error) {
            console.error('Failed to fetch messages', error);
        }
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
            if (normalizedClan?.id) {
                fetchMessages(normalizedClan.id);
            }
        } catch (error: any) {
            if (error.response?.status !== 404) {
                console.error('Failed to fetch clan', error);
            }
            setClan(null);
        } finally {
            setLoading(false);
        }
    }, [fetchMessages]);

    useEffect(() => {
        fetchClan();
    }, [fetchClan]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !clan) return;
        try {
            await api.post(`/clans/${clan.id}/messages`, { content: newMessage });
            setNewMessage('');
            fetchMessages(clan.id);
        } catch (error) {
            console.error('Failed to send message', error);
        }
    };

    const handleLeaveClan = async () => {
        if (!confirm('Voulez-vous vraiment quitter votre clan ?')) return;
        try {
            if (user?.id) {
                await api.post(`/clans/${clan.id}/leave`);
                setClan(null);
            }
        } catch (error) {
            console.error('Failed to leave clan', error);
            setClan(null);
        }
    };

    const handleKickMember = async (userId: string) => {
        if (!confirm('Voulez-vous vraiment exclure ce membre ?')) return;
        try {
            await api.delete(`/clans/${clan.id}/members/${userId}`);
            fetchClan();
        } catch (error) {
            console.error('Failed to kick member', error);
            alert("Impossible d'exclure ce membre pour le moment.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="relative min-h-screen pb-20 px-4">
            <CreateClanModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreated={fetchClan}
            />
            <JoinClanModal
                isOpen={showJoinModal}
                onClose={() => setShowJoinModal(false)}
                onJoined={fetchClan}
            />

            {/* Gaming Header (Pseudo, Level, Trophies) */}
            <div className="pt-2 mb-6">
                <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 p-4 flex items-center justify-between shadow-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-rank-gold flex items-center justify-center text-black font-black text-xl border-2 border-white/20">
                            {user?.name?.charAt(0) || '3'}
                        </div>
                        <div>
                            <h2 className="font-black uppercase tracking-tight text-white leading-none mb-1">
                                {user?.name || 'Inconnu'}
                            </h2>
                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest leading-none">
                                {clan ? clan.name : 'Aucun clan'}
                            </p>
                        </div>
                    </div>
                    <div className="bg-black/40 rounded-xl px-3 py-2 border border-white/5 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center">
                            <Trophy size={14} className="text-orange-500 " />
                        </div>
                        <span className="font-black text-orange-500">{user?.trophies || 0}</span>
                    </div>
                </div>
            </div>

            {/* Tabs System */}
            <LeaderboardTabs activeTab={activeTab} onChange={setActiveTab} />

            {/* Filter Global/Local */}
            {activeTab !== 'wars' && (
                <div className="flex gap-2 mb-6 bg-black/20 p-1 rounded-xl w-fit mx-auto">
                    <button
                        onClick={() => setFilter('global')}
                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase transition-all ${filter === 'global' ? 'bg-white/10 text-white shadow-lg' : 'text-text-muted hover:text-white/60'}`}
                    >
                        Monde
                    </button>
                    <button
                        onClick={() => setFilter('local')}
                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase transition-all ${filter === 'local' ? 'bg-white/10 text-white shadow-lg' : 'text-text-muted hover:text-white/60'}`}
                    >
                        Local
                    </button>
                </div>
            )}

            {/* Main Content Area */}
            <AnimatePresence mode="wait">
                {activeTab === 'clans' && (
                    <motion.div
                        key="clans-tab"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-3"
                    >
                        {clan ? (
                            <div className="mb-6">
                                <div className="flex justify-between items-end mb-2 ml-1">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Votre clan</h3>
                                    <button
                                        onClick={handleLeaveClan}
                                        className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:underline"
                                    >
                                        Quitter
                                    </button>
                                </div>
                                <ClanCard clan={clan} rank={1} onClick={() => { }} />

                                {clan.role === 'leader' && clan.members && (
                                    <div className="mt-8 space-y-4">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted ml-1">Gérer les membres</h3>
                                        <div className="bg-surface border border-white/5 rounded-3xl overflow-hidden divide-y divide-white/5">
                                            {clan.members.map((member: any) => (
                                                <div key={member.id} className="p-4 flex items-center justify-between group hover:bg-white/5 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-bold text-xs">
                                                            {member.name?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold">{member.name}</div>
                                                            <div className="text-[9px] text-text-muted uppercase font-black">{member.role}</div>
                                                        </div>
                                                    </div>
                                                    {member.userId !== user?.id && (
                                                        <button
                                                            onClick={() => handleKickMember(member.userId)}
                                                            className="p-2 text-text-muted/30 hover:text-red-500 transition-colors"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-surface border border-white/5 rounded-3xl p-8 text-center mb-8">
                                <Shield size={48} className="text-text-muted/30 mx-auto mb-4" />
                                <h3 className="font-black uppercase text-xl mb-2">Prêt à rejoindre l'équipe ?</h3>
                                <p className="text-text-muted text-sm mb-6">Rejoignez un clan pour courir ensemble, vous challenger et gagner des récompenses.</p>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => setShowJoinModal(true)}
                                        className="w-full py-4 bg-primary text-white font-black uppercase rounded-2xl hover:bg-primary/90 transition-all shadow-lg"
                                    >
                                        Rejoindre un clan
                                    </button>
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="w-full py-4 bg-white/5 border border-white/10 text-white font-black uppercase rounded-2xl hover:bg-white/10 transition-all"
                                    >
                                        Créer un clan
                                    </button>
                                </div>
                            </div>
                        )}

                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-2 ml-1">Meilleurs clans</h3>
                        <ClanLeaderboard />
                    </motion.div>
                )}

                {activeTab === 'players' && (
                    <motion.div
                        key="players-tab"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-3"
                    >
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-2 ml-1">Meilleurs joueurs</h3>
                        <div className="bg-surface border border-white/5 rounded-3xl p-6 text-center">
                            <p className="text-text-muted text-sm font-bold uppercase tracking-widest">Classement mondial bientôt disponible</p>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'wars' && (
                    <motion.div
                        key="wars-tab"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-3"
                    >
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-2 ml-1">Guerres de clans</h3>
                        <div className="bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 rounded-3xl p-8 text-center">
                            <Zap size={48} className="text-red-500 mx-auto mb-4" />
                            <h3 className="font-black uppercase text-xl mb-2 text-red-500">Aucune guerre en cours</h3>
                            <p className="text-text-muted text-sm mb-6">Votre clan n'est pas engagé actuellement. Les leaders pourront lancer ce mode plus tard.</p>
                            <button
                                onClick={() => navigate('/challenges')}
                                className="px-8 py-3 bg-red-500 text-white font-black uppercase rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                            >
                                Voir l'historique
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Overlay if Clan Exists */}
            <AnimatePresence>
                {showChat && clan && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowChat(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: "10%" }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed inset-x-0 bottom-0 top-0 bg-secondary rounded-t-3xl z-50 flex flex-col border-t border-white/10"
                        >
                            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-surface/50 rounded-t-3xl">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                        <MessageCircle size={16} className="text-primary" />
                                    </div>
                                    <span className="font-black uppercase tracking-tight text-sm">Chat du clan</span>
                                </div>
                                <button onClick={() => setShowChat(false)} className="p-2 hover:bg-white/5 rounded-full">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.map((msg: any) => (
                                    <div key={msg.id} className={`flex gap-3 ${msg.userId === user?.id ? 'flex-row-reverse' : ''}`}>
                                        <div className="w-8 h-8 rounded-xl bg-white/10 flex-shrink-0 flex items-center justify-center text-[10px] font-black uppercase border border-white/10 shadow-lg">
                                            {(msg.displayName || msg.username || '?').charAt(0)}
                                        </div>
                                        <div className={`p-3 rounded-2xl max-w-[80%] shadow-xl ${msg.userId === user?.id
                                            ? 'bg-primary/10 border border-primary/20 rounded-tr-sm'
                                            : 'bg-surface border border-white/5 rounded-tl-sm'
                                            }`}>
                                            <div className={`text-[10px] font-black uppercase tracking-wider mb-1 ${msg.userId === user?.id ? 'text-primary' : 'text-blue-400'
                                            }`}>{msg.displayName || msg.username || 'Inconnu'}</div>
                                            <p className="text-sm leading-tight">{msg.content}</p>
                                        </div>
                                    </div>
                                ))}
                                {messages.length === 0 && (
                                    <div className="text-center text-text-muted text-xs font-bold uppercase tracking-widest mt-10">
                                        Aucun message pour le moment.
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-surface border-t border-white/5 mb-safe pb-8">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Écrire un message..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        className="flex-1 bg-background border border-white/5 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all shadow-inner"
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={!newMessage.trim()}
                                        className="p-3 bg-primary text-white rounded-xl font-black shadow-lg disabled:opacity-50 active:scale-95 transition-all"
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Quick Chat Bubble if Clan exists */}
            {clan && !showChat && (
                <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowChat(true)}
                    className="fixed right-6 bottom-24 w-16 h-16 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center z-40 border-4 border-background"
                >
                    <MessageCircle size={28} />
                </motion.button>
            )}
        </div>
    );
}
