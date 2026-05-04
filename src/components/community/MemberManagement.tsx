import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Crown, Shield, Star, Users, X, ChevronRight,
    AlertTriangle, Check, Loader2, LogOut, UserMinus,
} from 'lucide-react';
import { api } from '../../services/api';
import { resolveError } from '../../services/errors';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ClanRole = 'leader' | 'co_leader' | 'elder' | 'member';

export interface ClanMember {
    id: string;
    userId: string;
    role: ClanRole;
    username?: string;
    displayName?: string;
    name?: string;
    avatarUrl?: string | null;
    contributionDistanceM?: number;
    contributionActivities?: number;
    joinedAt?: string;
}

interface Props {
    clanId: string;
    members: ClanMember[];
    myUserId: string;
    myRole: ClanRole;
    onRefresh: () => void;
    onLeft: () => void;
}

// ─── Role config ───────────────────────────────────────────────────────────────

const ROLE_CFG: Record<ClanRole, { label: string; icon: React.ReactNode; color: string }> = {
    leader:    { label: 'Leader',     icon: <Crown size={11} />,  color: '#fbbf24' },
    co_leader: { label: 'Co-leader',  icon: <Shield size={11} />, color: '#5ab2ff' },
    elder:     { label: 'Ancien',     icon: <Star size={11} />,   color: '#f97316' },
    member:    { label: 'Membre',     icon: <Users size={11} />,  color: '#64748b' },
};

const ROLE_ORDER: ClanRole[] = ['leader', 'co_leader', 'elder', 'member'];

function displayName(m: ClanMember): string {
    return m.displayName || m.name || m.username || 'Inconnu';
}

function initials(m: ClanMember): string {
    return displayName(m).charAt(0).toUpperCase();
}

function fmtKm(meters?: number): string {
    if (!meters) return '0 km';
    return `${(meters / 1000).toFixed(1)} km`;
}

// ─── Permission helpers ────────────────────────────────────────────────────────

function canManage(myRole: ClanRole, targetRole: ClanRole, isSelf: boolean): boolean {
    if (isSelf) return false;
    if (myRole === 'leader') return targetRole !== 'leader';
    if (myRole === 'co_leader') return targetRole === 'elder' || targetRole === 'member';
    return false;
}

function availableRoles(myRole: ClanRole, targetRole: ClanRole): ClanRole[] {
    const assignable: ClanRole[] = myRole === 'leader'
        ? ['co_leader', 'elder', 'member']
        : myRole === 'co_leader'
            ? ['elder', 'member']
            : [];
    return assignable.filter(r => r !== targetRole);
}

// ─── RoleBadge ─────────────────────────────────────────────────────────────────

function RoleBadge({ role, size = 'sm' }: { role: ClanRole; size?: 'xs' | 'sm' }) {
    const cfg = ROLE_CFG[role];
    const textSize = size === 'xs' ? 'text-[7px]' : 'text-[8px]';
    return (
        <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest ${textSize}`}
            style={{ background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}28` }}
        >
            {cfg.icon}{cfg.label}
        </span>
    );
}

// ─── MemberRow ─────────────────────────────────────────────────────────────────

function MemberRow({
    member, myRole, isSelf, onTap,
}: {
    member: ClanMember;
    myRole: ClanRole;
    isSelf: boolean;
    onTap: () => void;
}) {
    const manageable = canManage(myRole, member.role, isSelf);
    const cfg = ROLE_CFG[member.role];

    return (
        <motion.button
            layout
            whileTap={{ scale: 0.98 }}
            onClick={manageable || isSelf ? onTap : undefined}
            className="w-full text-left flex items-center gap-3 rounded-[18px] px-4 py-3 transition-all"
            style={{
                background: isSelf
                    ? 'linear-gradient(135deg, rgba(90,178,255,0.08), rgba(90,178,255,0.03))'
                    : 'rgba(255,255,255,0.025)',
                border: isSelf ? '1px solid rgba(90,178,255,0.16)' : '1px solid rgba(255,255,255,0.05)',
                cursor: manageable || isSelf ? 'pointer' : 'default',
            }}
        >
            {/* Avatar */}
            <div
                className="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0 font-black text-sm"
                style={{ background: `${cfg.color}14`, color: cfg.color, border: `1px solid ${cfg.color}22` }}
            >
                {initials(member)}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px] font-black text-white truncate">{displayName(member)}</span>
                    {isSelf && (
                        <span className="text-[6px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/22 shrink-0">
                            Moi
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <RoleBadge role={member.role} size="xs" />
                    {member.contributionDistanceM !== undefined && (
                        <span className="text-[9px] font-mono text-white/30">{fmtKm(member.contributionDistanceM)}</span>
                    )}
                </div>
            </div>

            {/* Action indicator */}
            {(manageable || isSelf) && (
                <ChevronRight size={13} className="text-white/20 shrink-0" />
            )}
        </motion.button>
    );
}

// ─── MemberSheet ───────────────────────────────────────────────────────────────

type SheetStep = 'actions' | 'change_role' | 'confirm_kick' | 'confirm_leave';

function MemberSheet({
    member, myRole, isSelf, clanId, isLeaderWithOthers,
    onClose, onRefresh, onLeft,
}: {
    member: ClanMember;
    myRole: ClanRole;
    isSelf: boolean;
    clanId: string;
    isLeaderWithOthers: boolean;
    onClose: () => void;
    onRefresh: () => void;
    onLeft: () => void;
}) {
    const [step, setStep] = useState<SheetStep>('actions');
    const [selectedRole, setSelectedRole] = useState<ClanRole | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const manageable = canManage(myRole, member.role, isSelf);
    const roles = availableRoles(myRole, member.role);
    const cfg = ROLE_CFG[member.role];

    const handleRoleChange = async () => {
        if (!selectedRole) return;
        setLoading(true);
        setError('');
        try {
            await api.put(`/clans/${clanId}/members/${member.userId}`, { role: selectedRole });
            onRefresh();
            onClose();
        } catch (e) {
            setError(resolveError(e, 'Erreur lors du changement de rôle.'));
        } finally {
            setLoading(false);
        }
    };

    const handleKick = async () => {
        setLoading(true);
        setError('');
        try {
            await api.delete(`/clans/${clanId}/members/${member.userId}`);
            onRefresh();
            onClose();
        } catch (e) {
            setError(resolveError(e, "Erreur lors de l'exclusion."));
        } finally {
            setLoading(false);
        }
    };

    const handleLeave = async () => {
        setLoading(true);
        setError('');
        try {
            await api.post(`/clans/${clanId}/leave`);
            onLeft();
            onClose();
        } catch (e) {
            setError(resolveError(e, 'Erreur lors de la sortie du clan.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-white/15" />
            </div>

            {/* Member header */}
            <div className="px-5 pb-4 border-b border-white/[0.06] flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div
                        className="w-11 h-11 rounded-[14px] flex items-center justify-center font-black text-base shrink-0"
                        style={{ background: `${cfg.color}14`, color: cfg.color, border: `1px solid ${cfg.color}22` }}
                    >
                        {initials(member)}
                    </div>
                    <div>
                        <div className="font-black text-white text-base leading-tight">{displayName(member)}</div>
                        <div className="flex items-center gap-2 mt-1">
                            <RoleBadge role={member.role} />
                            {member.contributionDistanceM !== undefined && (
                                <span className="text-[9px] font-mono text-white/30">{fmtKm(member.contributionDistanceM)}</span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-auto w-8 h-8 glass-card rounded-[10px] flex items-center justify-center text-white/40 hover:text-white transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Step content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
                <AnimatePresence mode="wait">

                    {/* ── Actions ── */}
                    {step === 'actions' && (
                        <motion.div key="actions"
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                            className="space-y-2"
                        >
                            {manageable && (
                                <>
                                    <button
                                        onClick={() => setStep('change_role')}
                                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[16px] text-left transition-all"
                                        style={{ background: 'rgba(90,178,255,0.07)', border: '1px solid rgba(90,178,255,0.15)' }}
                                    >
                                        <div className="w-8 h-8 rounded-[10px] flex items-center justify-center"
                                            style={{ background: 'rgba(90,178,255,0.14)' }}>
                                            <Shield size={14} className="text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-black text-white">Changer le rôle</div>
                                            <div className="text-[10px] text-white/40">
                                                {roles.map(r => ROLE_CFG[r].label).join(', ')}
                                            </div>
                                        </div>
                                        <ChevronRight size={13} className="text-white/25" />
                                    </button>

                                    <button
                                        onClick={() => setStep('confirm_kick')}
                                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[16px] text-left transition-all"
                                        style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.14)' }}
                                    >
                                        <div className="w-8 h-8 rounded-[10px] flex items-center justify-center"
                                            style={{ background: 'rgba(239,68,68,0.12)' }}>
                                            <UserMinus size={14} className="text-red-400" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-black text-red-400">Exclure du clan</div>
                                            <div className="text-[10px] text-white/35">Action irréversible</div>
                                        </div>
                                    </button>
                                </>
                            )}

                            {isSelf && (
                                <button
                                    onClick={() => setStep('confirm_leave')}
                                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[16px] text-left transition-all"
                                    style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.14)' }}
                                >
                                    <div className="w-8 h-8 rounded-[10px] flex items-center justify-center"
                                        style={{ background: 'rgba(239,68,68,0.12)' }}>
                                        <LogOut size={14} className="text-red-400" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-black text-red-400">Quitter le clan</div>
                                        <div className="text-[10px] text-white/35">
                                            {isLeaderWithOthers ? "Transfère le leadership d'abord" : 'Confirmation requise'}
                                        </div>
                                    </div>
                                </button>
                            )}

                            {!manageable && !isSelf && (
                                <div className="text-center py-8 text-white/30 text-sm font-bold">
                                    Aucune action disponible
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ── Change role ── */}
                    {step === 'change_role' && (
                        <motion.div key="role"
                            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                            className="space-y-3"
                        >
                            <button onClick={() => setStep('actions')}
                                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white/35 hover:text-white/60 transition-colors mb-2">
                                ← Retour
                            </button>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/35 mb-3">
                                Nouveau rôle pour {displayName(member)}
                            </p>
                            {roles.map(role => {
                                const rcfg = ROLE_CFG[role];
                                const selected = selectedRole === role;
                                return (
                                    <motion.button
                                        key={role}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => setSelectedRole(role)}
                                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[16px] text-left transition-all"
                                        style={{
                                            background: selected ? `${rcfg.color}12` : 'rgba(255,255,255,0.03)',
                                            border: selected ? `1px solid ${rcfg.color}35` : '1px solid rgba(255,255,255,0.07)',
                                            boxShadow: selected ? `0 0 14px ${rcfg.color}12` : 'none',
                                        }}
                                    >
                                        <div
                                            className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0"
                                            style={{ background: `${rcfg.color}15`, color: rcfg.color }}
                                        >
                                            {ROLE_ORDER.indexOf(role) === 1 ? <Shield size={14} /> :
                                             ROLE_ORDER.indexOf(role) === 2 ? <Star size={14} /> :
                                             <Users size={14} />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-black text-white">{rcfg.label}</div>
                                            <div className="text-[9px] text-white/35">
                                                {role === 'co_leader' && 'Peut gérer membres et elders, verrouiller roster'}
                                                {role === 'elder' && 'Rôle intermédiaire reconnu dans le clan'}
                                                {role === 'member' && 'Accès standard, participation aux guerres'}
                                            </div>
                                        </div>
                                        {selected && (
                                            <div
                                                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                                style={{ background: rcfg.color }}
                                            >
                                                <Check size={10} className="text-white" />
                                            </div>
                                        )}
                                    </motion.button>
                                );
                            })}

                            {error && (
                                <div className="flex items-center gap-2 px-3 py-2.5 rounded-[12px]"
                                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                                    <AlertTriangle size={11} className="text-red-400 shrink-0" />
                                    <span className="text-[10px] text-red-300">{error}</span>
                                </div>
                            )}

                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={handleRoleChange}
                                disabled={!selectedRole || loading}
                                className="w-full py-3.5 rounded-[16px] font-black text-sm flex items-center justify-center gap-2 transition-all mt-2 disabled:opacity-40"
                                style={{
                                    background: selectedRole
                                        ? `linear-gradient(135deg, ${ROLE_CFG[selectedRole].color}28, ${ROLE_CFG[selectedRole].color}10)`
                                        : 'rgba(255,255,255,0.06)',
                                    border: selectedRole
                                        ? `1px solid ${ROLE_CFG[selectedRole].color}40`
                                        : '1px solid rgba(255,255,255,0.09)',
                                    color: selectedRole ? ROLE_CFG[selectedRole].color : 'rgba(255,255,255,0.3)',
                                }}
                            >
                                {loading ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                                Confirmer le changement
                            </motion.button>
                        </motion.div>
                    )}

                    {/* ── Confirm kick ── */}
                    {step === 'confirm_kick' && (
                        <motion.div key="kick"
                            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                            className="space-y-4"
                        >
                            <button onClick={() => setStep('actions')}
                                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white/35 hover:text-white/60 transition-colors">
                                ← Retour
                            </button>

                            <div className="rounded-[18px] p-4 text-center"
                                style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}>
                                <div className="w-12 h-12 rounded-[14px] flex items-center justify-center mx-auto mb-3"
                                    style={{ background: 'rgba(239,68,68,0.12)' }}>
                                    <UserMinus size={20} className="text-red-400" />
                                </div>
                                <div className="text-base font-black text-white mb-1">
                                    Exclure {displayName(member)} ?
                                </div>
                                <p className="text-[11px] text-white/40 leading-relaxed">
                                    Ce membre sera retiré du clan immédiatement. Il pourra rejoindre un autre clan ou être réinvité.
                                </p>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 px-3 py-2.5 rounded-[12px]"
                                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                                    <AlertTriangle size={11} className="text-red-400 shrink-0" />
                                    <span className="text-[10px] text-red-300">{error}</span>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button onClick={() => setStep('actions')}
                                    className="flex-1 py-3 rounded-[14px] font-black text-sm text-white/50"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    Annuler
                                </button>
                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={handleKick}
                                    disabled={loading}
                                    className="flex-1 py-3 rounded-[14px] font-black text-sm flex items-center justify-center gap-2"
                                    style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.28), rgba(239,68,68,0.12))', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444' }}
                                >
                                    {loading ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
                                    Exclure
                                </motion.button>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Confirm leave ── */}
                    {step === 'confirm_leave' && (
                        <motion.div key="leave"
                            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                            className="space-y-4"
                        >
                            <button onClick={() => setStep('actions')}
                                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white/35 hover:text-white/60 transition-colors">
                                ← Retour
                            </button>

                            {isLeaderWithOthers ? (
                                <div className="rounded-[18px] p-5 text-center"
                                    style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)' }}>
                                    <div className="w-12 h-12 rounded-[14px] flex items-center justify-center mx-auto mb-3"
                                        style={{ background: 'rgba(245,158,11,0.12)' }}>
                                        <AlertTriangle size={20} className="text-amber-400" />
                                    </div>
                                    <div className="text-base font-black text-white mb-2">Impossible de quitter</div>
                                    <p className="text-[11px] text-white/45 leading-relaxed">
                                        Tu es le leader du clan et d'autres membres sont présents. Le transfert de leadership n'est pas encore disponible via l'app.
                                    </p>
                                    <p className="text-[10px] text-amber-400/60 mt-2 font-bold">
                                        Exclus tous les membres d&apos;abord, ou contacte le support.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="rounded-[18px] p-4 text-center"
                                        style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}>
                                        <div className="w-12 h-12 rounded-[14px] flex items-center justify-center mx-auto mb-3"
                                            style={{ background: 'rgba(239,68,68,0.12)' }}>
                                            <LogOut size={20} className="text-red-400" />
                                        </div>
                                        <div className="text-base font-black text-white mb-1">
                                            Quitter le clan ?
                                        </div>
                                        <p className="text-[11px] text-white/40 leading-relaxed">
                                            {myRole === 'leader'
                                                ? 'Tu es le seul membre. Quitter dissoudra définitivement le clan.'
                                                : "Tu perdras l'accès au chat, aux guerres et aux défis en cours."}
                                        </p>
                                    </div>

                                    {error && (
                                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-[12px]"
                                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                                            <AlertTriangle size={11} className="text-red-400 shrink-0" />
                                            <span className="text-[10px] text-red-300">{error}</span>
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <button onClick={() => setStep('actions')}
                                            className="flex-1 py-3 rounded-[14px] font-black text-sm text-white/50"
                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                            Annuler
                                        </button>
                                        <motion.button
                                            whileTap={{ scale: 0.97 }}
                                            onClick={handleLeave}
                                            disabled={loading}
                                            className="flex-1 py-3 rounded-[14px] font-black text-sm flex items-center justify-center gap-2"
                                            style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.28), rgba(239,68,68,0.12))', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444' }}
                                        >
                                            {loading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                                            {myRole === 'leader' ? 'Dissoudre' : 'Quitter'}
                                        </motion.button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
}

// ─── MemberList (export principal) ─────────────────────────────────────────────

export function MemberList({ clanId, members, myUserId, myRole, onRefresh, onLeft }: Props) {
    const [selectedMember, setSelectedMember] = useState<ClanMember | null>(null);
    const sorted = [...members].sort(
        (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
    );
    const hasOtherMembers = members.length > 1;
    const isLeaderWithOthers = myRole === 'leader' && hasOtherMembers;

    return (
        <>
            {/* List */}
            <div className="space-y-1.5">
                {sorted.map((m, i) => (
                    <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                    >
                        <MemberRow
                            member={m}
                            myRole={myRole}
                            isSelf={m.userId === myUserId}
                            onTap={() => setSelectedMember(m)}
                        />
                    </motion.div>
                ))}
            </div>

            {/* Bottom sheet */}
            <AnimatePresence>
                {selectedMember && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSelectedMember(null)}
                            className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50"
                        />

                        {/* Sheet */}
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                            className="fixed inset-x-0 bottom-0 z-50 max-w-md mx-auto rounded-t-[28px] pb-8"
                            style={{
                                background: 'linear-gradient(180deg, #0d1e33 0%, #07111f 100%)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderBottom: 'none',
                                maxHeight: '80vh',
                            }}
                        >
                            <MemberSheet
                                member={selectedMember}
                                myRole={myRole}
                                isSelf={selectedMember.userId === myUserId}
                                clanId={clanId}
                                isLeaderWithOthers={isLeaderWithOthers}
                                onClose={() => setSelectedMember(null)}
                                onRefresh={() => { setSelectedMember(null); onRefresh(); }}
                                onLeft={() => { setSelectedMember(null); onLeft(); }}
                            />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
