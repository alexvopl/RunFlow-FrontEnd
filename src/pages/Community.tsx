import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Trophy, Zap, Users, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CreateClanModal } from '../components/community/CreateClanModal';
import { JoinClanModal } from '../components/community/JoinClanModal';
import { LeaderboardTabs } from '../components/community/LeaderboardTabs';
import { InviteSheet } from '../components/community/InviteSheet';
import { ClanHome, type ClanHomeData, type MembershipData } from '../components/community/ClanHome';
import { ClanChat } from '../components/community/ClanChat';
import { UserLeaderboard } from '../components/leaderboard/UserLeaderboard';
import { ClanLeaderboard } from '../components/leaderboard/ClanLeaderboard';
import { useInvalidation, type QueryTag } from '../services/queryInvalidation';

// ────────────────────────────────────────────────────────────────────────
export function Community() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { clanId: linkedClanId } = useParams();
    const [searchParams] = useSearchParams();
    const [clan, setClan] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showChat, setShowChat] = useState(false);
    const [activeTab, setActiveTab] = useState<'players' | 'clans' | 'wars'>('clans');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [showInviteSheet, setShowInviteSheet] = useState(false);
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
                membership: membership,
                score: Math.round((myClan.totalDistanceM ?? 0) / 1000),
                level: 1,
            } : null;
            setClan(normalizedClan);
        } catch (error: any) {
            if (error.response?.status !== 404) console.error('Failed to fetch clan', error);
            setClan(null);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchClan(); }, [fetchClan]);

    // Deep link: open chat when ?chat=1 is in URL
    useEffect(() => {
        if (searchParams.get('chat') === '1' && clan) setShowChat(true);
    }, [searchParams, clan]);

    useEffect(() => {
        if (linkedClanId) setActiveTab('clans');
    }, [linkedClanId]);

    const clanInvalidationTags = useMemo<QueryTag[]>(() => ['clans', 'my-clan'], []);
    useInvalidation(clanInvalidationTags, fetchClan);


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
            {clan && (
                <InviteSheet
                    clanId={clan.id}
                    clanName={clan.name}
                    isOpen={showInviteSheet}
                    onClose={() => setShowInviteSheet(false)}
                />
            )}

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


                {/* ── Tab content ──────────────────────────────────── */}
                <AnimatePresence mode="wait">

                    {/* CLANS */}
                    {activeTab === 'clans' && (
                        <motion.div key="clans" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="space-y-4">
                            {clan ? (
                                <ClanHome
                                    clan={clan as ClanHomeData}
                                    membership={(clan.membership ?? { role: clan.role }) as MembershipData}
                                    myUserId={user?.id ?? ''}
                                    onInvite={() => setShowInviteSheet(true)}
                                    onChat={() => setShowChat(true)}
                                    onRefresh={fetchClan}
                                    onLeft={() => setClan(null)}
                                />
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
                            <UserLeaderboard myUserId={user?.id} />
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

            {/* ── Chat ──────────────────────────────────────────────── */}
            {clan && (
                <ClanChat
                    clanId={clan.id}
                    clanName={clan.name}
                    myUser={{
                        id: user?.id ?? '',
                        displayName: user?.name,
                        avatarUrl: null,
                    }}
                    isOpen={showChat}
                    onClose={() => setShowChat(false)}
                />
            )}
        </div>
    );
}
