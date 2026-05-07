import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Globe, Lock, Zap, Users, MessageCircle, Link,
    Swords, Settings, Crown, Shield, Star, Activity,
    CalendarDays, TrendingUp, X,
} from 'lucide-react';
import { MemberList, type ClanMember, type ClanRole } from './MemberManagement';
import { formatDate } from '../../utils/format';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ClanHomeData {
    id: string;
    name: string;
    description?: string | null;
    isPublic: boolean;
    minWeeklyKm: number;
    maxMembers: number;
    memberCount: number;
    totalDistanceM: number;
    totalActivities: number;
    members?: ClanMember[];
}

export interface MembershipData {
    role: ClanRole;
    contributionDistanceM?: number;
    contributionActivities?: number;
    joinedAt?: string;
}

interface Props {
    clan: ClanHomeData;
    membership: MembershipData;
    myUserId: string;
    onInvite: () => void;
    onChat: () => void;
    onRefresh: () => void;
    onLeft: () => void;
}

// ─── Role config ───────────────────────────────────────────────────────────────

const ROLE_CFG: Record<ClanRole, { label: string; Icon: React.ElementType; color: string; glow: string }> = {
    leader:    { label: 'Leader',    Icon: Crown,  color: '#fbbf24', glow: 'rgba(251,191,36,0.15)' },
    co_leader: { label: 'Co-leader', Icon: Shield, color: '#5ab2ff', glow: 'rgba(90,178,255,0.15)' },
    elder:     { label: 'Ancien',    Icon: Star,   color: '#f97316', glow: 'rgba(249,115,22,0.15)' },
    member:    { label: 'Membre',    Icon: Users,  color: '#64748b', glow: 'rgba(100,116,139,0.10)' },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtKm(m: number) {
    const km = m / 1000;
    return km >= 1000 ? `${(km / 1000).toFixed(1)}k` : km.toFixed(0);
}

// ─── Clan badge ────────────────────────────────────────────────────────────────

function ClanBadgeLarge({ name }: { name: string }) {
    const initials = name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?';
    return (
        <div
            className="flex items-center justify-center font-black font-mono text-3xl flex-shrink-0"
            style={{
                width: 72, height: 72,
                borderRadius: 20,
                background: 'linear-gradient(135deg, rgba(90,178,255,0.22), rgba(34,211,238,0.10))',
                border: '1.5px solid rgba(90,178,255,0.30)',
                color: '#5ab2ff',
                boxShadow: '0 0 28px rgba(90,178,255,0.18)',
            }}
        >
            {initials}
        </div>
    );
}

// ─── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
    return (
        <div
            className="flex-1 rounded-[14px] py-3 text-center"
            style={{
                background: accent ? 'rgba(90,178,255,0.08)' : 'rgba(255,255,255,0.03)',
                border: accent ? '1px solid rgba(90,178,255,0.16)' : '1px solid rgba(255,255,255,0.06)',
            }}
        >
            <div className="font-mono font-black text-white text-base leading-tight">{value}</div>
            <div className="text-[8px] text-white/30 font-black uppercase tracking-widest mt-0.5">{label}</div>
        </div>
    );
}

// ─── Quick action button ────────────────────────────────────────────────────────

function ActionBtn({
    Icon, label, onClick, variant = 'default',
}: {
    Icon: React.ElementType;
    label: string;
    onClick: () => void;
    variant?: 'default' | 'primary' | 'danger';
}) {
    const styles = {
        default: { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.7)', iconBg: 'rgba(255,255,255,0.07)' },
        primary: { bg: 'rgba(90,178,255,0.10)', border: 'rgba(90,178,255,0.25)', color: '#5ab2ff', iconBg: 'rgba(90,178,255,0.14)' },
        danger:  { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.22)',  color: '#ef4444', iconBg: 'rgba(239,68,68,0.12)' },
    }[variant];

    return (
        <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className="flex-1 flex flex-col items-center gap-2 py-3.5 rounded-[18px] transition-all active:opacity-80"
            style={{ background: styles.bg, border: `1px solid ${styles.border}` }}
        >
            <div className="w-9 h-9 rounded-[12px] flex items-center justify-center"
                style={{ background: styles.iconBg }}>
                <Icon size={16} style={{ color: styles.color }} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: styles.color }}>
                {label}
            </span>
        </motion.button>
    );
}

// ─── ClanHome ──────────────────────────────────────────────────────────────────

export function ClanHome({ clan, membership, myUserId, onInvite, onChat, onRefresh, onLeft }: Props) {
    const navigate = useNavigate();
    const [showManage, setShowManage] = useState(false);
    const { role } = membership;
    const rcfg = ROLE_CFG[role];
    const RoleIcon = rcfg.Icon;

    const liveCount = clan.members?.length ?? clan.memberCount;
    const totalKm = clan.totalDistanceM / 1000;
    const avgKm = liveCount > 0 ? Math.round(totalKm / liveCount) : 0;
    const canManageMembers = role === 'leader' || role === 'co_leader';

    return (
        <div className="space-y-3">

            {/* ── Clan Hero ──────────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[24px] p-5"
                style={{
                    background: 'linear-gradient(135deg, rgba(13,30,51,0.9) 0%, rgba(7,17,31,0.95) 100%)',
                    border: '1px solid rgba(90,178,255,0.14)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
            >
                {/* Top: badge + name + description */}
                <div className="flex items-start gap-4 mb-4">
                    <ClanBadgeLarge name={clan.name} />
                    <div className="flex-1 min-w-0 pt-1">
                        <h2 className="text-xl font-black tracking-tight text-white leading-tight">{clan.name}</h2>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {/* Public/private */}
                            <span
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest"
                                style={clan.isPublic
                                    ? { background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.22)', color: '#10b981' }
                                    : { background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.22)', color: '#f59e0b' }
                                }
                            >
                                {clan.isPublic ? <Globe size={7} /> : <Lock size={7} />}
                                {clan.isPublic ? 'Public' : 'Privé'}
                            </span>
                            {/* Min weekly km */}
                            {clan.minWeeklyKm > 0 && (
                                <span
                                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest"
                                    style={{ background: 'rgba(245,158,11,0.09)', border: '1px solid rgba(245,158,11,0.18)', color: '#f59e0b' }}
                                >
                                    <Zap size={7} /> {clan.minWeeklyKm} km/sem
                                </span>
                            )}
                        </div>
                        {clan.description && (
                            <p className="text-[11px] text-white/50 mt-2 leading-relaxed line-clamp-2">{clan.description}</p>
                        )}
                    </div>
                </div>

                {/* Stats row */}
                <div className="flex gap-2">
                    <StatTile value={`${liveCount}/${clan.maxMembers}`} label="Membres" accent />
                    <StatTile value={fmtKm(clan.totalDistanceM)} label="km total" />
                    <StatTile value={String(clan.totalActivities)} label="Activités" />
                    <StatTile value={avgKm > 0 ? `${avgKm}` : '—'} label="moy km" />
                </div>
            </motion.div>

            {/* ── Quick Actions ──────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="flex gap-2"
            >
                <ActionBtn Icon={MessageCircle} label="Chat" onClick={onChat} variant="primary" />
                <ActionBtn Icon={Link} label="Inviter" onClick={onInvite} variant="primary" />
                <ActionBtn Icon={Swords} label="Guerres" onClick={() => navigate('/wars')} />
                {canManageMembers && (
                    <ActionBtn Icon={Settings} label="Gérer" onClick={() => setShowManage(true)} />
                )}
            </motion.div>

            {/* ── My Membership Card ─────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-[20px] p-4"
                style={{
                    background: `linear-gradient(135deg, ${rcfg.glow}, rgba(255,255,255,0.02))`,
                    border: `1px solid ${rcfg.color}28`,
                }}
            >
                <div className="text-[8px] font-black uppercase tracking-widest mb-3"
                    style={{ color: `${rcfg.color}90` }}>
                    Mon membership
                </div>

                <div className="flex items-center gap-3 mb-3">
                    {/* Role avatar */}
                    <div
                        className="w-11 h-11 rounded-[14px] flex items-center justify-center flex-shrink-0"
                        style={{ background: `${rcfg.color}18`, border: `1px solid ${rcfg.color}28` }}
                    >
                        <RoleIcon size={18} style={{ color: rcfg.color }} />
                    </div>
                    <div>
                        <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                            style={{ background: `${rcfg.color}18`, border: `1px solid ${rcfg.color}30`, color: rcfg.color }}
                        >
                            <RoleIcon size={10} /> {rcfg.label}
                        </span>
                        {membership.joinedAt && (
                            <div className="flex items-center gap-1 mt-1">
                                <CalendarDays size={9} className="text-white/25" />
                                <span className="text-[9px] text-white/35 font-bold">
                                    Depuis le {formatDate(membership.joinedAt)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Contribution stats */}
                <div className="grid grid-cols-2 gap-2">
                    <div
                        className="rounded-[12px] px-3 py-2.5 flex items-center gap-2"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                        <TrendingUp size={12} className="text-primary/60 flex-shrink-0" />
                        <div>
                            <div className="font-mono font-black text-white text-sm leading-tight">
                                {fmtKm(membership.contributionDistanceM ?? 0)} km
                            </div>
                            <div className="text-[8px] text-white/30 font-bold uppercase tracking-wider">Ma contribution</div>
                        </div>
                    </div>
                    <div
                        className="rounded-[12px] px-3 py-2.5 flex items-center gap-2"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                        <Activity size={12} className="text-primary/60 flex-shrink-0" />
                        <div>
                            <div className="font-mono font-black text-white text-sm leading-tight">
                                {membership.contributionActivities ?? 0}
                            </div>
                            <div className="text-[8px] text-white/30 font-bold uppercase tracking-wider">Activités</div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── Members ────────────────────────────────────────────── */}
            {clan.members && clan.members.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                >
                    <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/30 flex items-center gap-1.5">
                            <Users size={9} /> Membres
                        </span>
                        <span className="text-[9px] font-mono text-white/25">{clan.members.length}</span>
                    </div>
                    <MemberList
                        clanId={clan.id}
                        members={clan.members}
                        myUserId={myUserId}
                        myRole={role}
                        onRefresh={onRefresh}
                        onLeft={onLeft}
                    />
                </motion.div>
            )}

            {/* ── Management sheet ───────────────────────────────────── */}
            <AnimatePresence>
                {showManage && clan.members && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowManage(false)}
                            className="fixed inset-0 bg-black/55 backdrop-blur-sm z-40"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                            className="fixed inset-x-0 bottom-0 z-40 max-w-md mx-auto rounded-t-[28px] pb-10 flex flex-col"
                            style={{
                                background: 'linear-gradient(180deg, #0d1e33 0%, #07111f 100%)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderBottom: 'none',
                                maxHeight: '85vh',
                            }}
                        >
                            {/* Handle */}
                            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
                                <div className="w-10 h-1 rounded-full bg-white/15" />
                            </div>

                            {/* Header */}
                            <div className="flex items-center justify-between px-5 pb-4 border-b border-white/[0.06] flex-shrink-0">
                                <div className="flex items-center gap-2.5">
                                    <div
                                        className="w-8 h-8 rounded-[10px] flex items-center justify-center"
                                        style={{ background: 'rgba(90,178,255,0.14)', border: '1px solid rgba(90,178,255,0.22)' }}
                                    >
                                        <Settings size={13} className="text-primary" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-black text-white">Gestion des membres</div>
                                        <div className="text-[10px] text-white/35">
                                            {clan.name} · {clan.members.length} membre{clan.members.length > 1 ? 's' : ''}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowManage(false)}
                                    className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white/40 hover:text-white transition-colors"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            {/* Scrollable member list */}
                            <div className="flex-1 overflow-y-auto px-5 py-4">
                                <MemberList
                                    clanId={clan.id}
                                    members={clan.members}
                                    myUserId={myUserId}
                                    myRole={role}
                                    onRefresh={() => { setShowManage(false); onRefresh(); }}
                                    onLeft={() => { setShowManage(false); onLeft(); }}
                                />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
