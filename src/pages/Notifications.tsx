import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Bell, CheckCheck, ChevronLeft, Loader2, Trophy, Swords,
    Users, Dumbbell, Zap, Settings, X, ChevronRight,
    Flame, Flag, Medal,
} from 'lucide-react';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { notifyInvalidation } from '../services/queryInvalidation';
import { registerPushToken } from '../hooks/usePushToken';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Notification {
    id: string;
    type: string;
    title: string;
    body: string;
    isRead: boolean;
    createdAt: string;
    data?: Record<string, unknown>;
}

interface NotifPreferences {
    wars?: boolean;
    clans?: boolean;
    challenges?: boolean;
    leaderboards?: boolean;
    training?: boolean;
    warUpdates?: boolean;
    warLeadChanges?: boolean;
    warCloseMatches?: boolean;
    battleReminders?: boolean;
    mvpNotifications?: boolean;
}

// ─── Type config ───────────────────────────────────────────────────────────────

type TypeCfg = { icon: React.ComponentType<{ size?: number }>; accent: string; dot: string };

const TYPE_CONFIG: Record<string, TypeCfg> = {
    // Achievements
    achievement:        { icon: Trophy,   accent: 'bg-amber-500/15 text-amber-400 border-amber-500/20',    dot: 'bg-amber-500' },
    // Leaderboards
    leaderboard:        { icon: Medal,    accent: 'bg-amber-500/15 text-amber-400 border-amber-500/20',    dot: 'bg-amber-500' },
    leaderboard_update: { icon: Medal,    accent: 'bg-amber-500/15 text-amber-400 border-amber-500/20',    dot: 'bg-amber-500' },
    new_rank:           { icon: Medal,    accent: 'bg-amber-500/15 text-amber-400 border-amber-500/20',    dot: 'bg-amber-500' },
    // Challenges
    challenge:          { icon: Swords,   accent: 'bg-primary/15 text-primary border-primary/20',          dot: 'bg-primary' },
    challenge_start:    { icon: Swords,   accent: 'bg-primary/15 text-primary border-primary/20',          dot: 'bg-primary' },
    challenge_ending:   { icon: Swords,   accent: 'bg-primary/15 text-primary border-primary/20',          dot: 'bg-primary' },
    challenge_complete: { icon: Swords,   accent: 'bg-primary/15 text-primary border-primary/20',          dot: 'bg-primary' },
    // Clan/social
    social:             { icon: Users,    accent: 'bg-blue-500/15 text-blue-400 border-blue-500/20',       dot: 'bg-blue-500' },
    clan_invite:        { icon: Users,    accent: 'bg-blue-500/15 text-blue-400 border-blue-500/20',       dot: 'bg-blue-500' },
    clan_joined:        { icon: Users,    accent: 'bg-blue-500/15 text-blue-400 border-blue-500/20',       dot: 'bg-blue-500' },
    clan_message:       { icon: Users,    accent: 'bg-blue-500/15 text-blue-400 border-blue-500/20',       dot: 'bg-blue-500' },
    clan_kick:          { icon: Users,    accent: 'bg-red-500/15 text-red-400 border-red-500/20',          dot: 'bg-red-400' },
    clan_role_changed:  { icon: Users,    accent: 'bg-blue-500/15 text-blue-400 border-blue-500/20',       dot: 'bg-blue-500' },
    // Wars
    war_started:        { icon: Flame,    accent: 'bg-red-500/15 text-red-400 border-red-500/20',          dot: 'bg-red-500' },
    war_ended:          { icon: Flame,    accent: 'bg-red-500/15 text-red-400 border-red-500/20',          dot: 'bg-red-500' },
    war_result:         { icon: Trophy,   accent: 'bg-red-500/15 text-red-400 border-red-500/20',          dot: 'bg-red-500' },
    war_reminder:       { icon: Flame,    accent: 'bg-orange-500/15 text-orange-400 border-orange-500/20', dot: 'bg-orange-400' },
    war_highlight:      { icon: Zap,      accent: 'bg-red-500/15 text-red-400 border-red-500/20',          dot: 'bg-red-500' },
    war_plan_locked:    { icon: Flag,     accent: 'bg-amber-500/15 text-amber-400 border-amber-500/20',    dot: 'bg-amber-400' },
    war_vote_deadline:  { icon: Flag,     accent: 'bg-orange-500/15 text-orange-400 border-orange-500/20', dot: 'bg-orange-400' },
    // Battles
    battle_opened:      { icon: Swords,   accent: 'bg-red-500/15 text-red-400 border-red-500/20',          dot: 'bg-red-500' },
    battle_closed:      { icon: Swords,   accent: 'bg-white/5 text-text-muted border-white/8',             dot: 'bg-text-muted' },
    battle_result:      { icon: Trophy,   accent: 'bg-amber-500/15 text-amber-400 border-amber-500/20',    dot: 'bg-amber-500' },
    // Training
    training:           { icon: Dumbbell, accent: 'bg-purple-500/15 text-purple-400 border-purple-500/20', dot: 'bg-purple-500' },
    training_reminder:  { icon: Dumbbell, accent: 'bg-purple-500/15 text-purple-400 border-purple-500/20', dot: 'bg-purple-500' },
    // Strava
    strava:             { icon: Zap,      accent: 'bg-orange-500/15 text-orange-400 border-orange-500/20', dot: 'bg-orange-500' },
};

const DEFAULT_CFG: TypeCfg = { icon: Bell, accent: 'bg-white/5 text-text-muted border-white/8', dot: 'bg-text-muted' };
const getTypeCfg = (type: string): TypeCfg => TYPE_CONFIG[type] ?? DEFAULT_CFG;

// ─── Deep links ────────────────────────────────────────────────────────────────

function resolveDeepLink(type: string, data?: Record<string, unknown>): string | null {
    // Data-driven routes take priority over type fallbacks
    if (data?.warId && data?.battleId) return `/wars/${data.warId as string}`;
    if (data?.warId) return `/wars/${data.warId as string}`;
    if (data?.challengeId) return `/challenges/${data.challengeId as string}`;
    if (data?.activityId) return `/activities/${data.activityId as string}`;
    if (data?.clanId) return '/community';

    switch (type) {
        case 'war_started':
        case 'war_ended':
        case 'war_result':
        case 'war_reminder':
        case 'war_highlight':
        case 'war_plan_locked':
        case 'war_vote_deadline':
        case 'battle_opened':
        case 'battle_closed':
        case 'battle_result':
            return '/wars';
        case 'clan_message':
            return '/community?chat=1';
        case 'clan_invite':
        case 'clan_joined':
        case 'clan_kick':
        case 'clan_role_changed':
            return '/community';
        case 'challenge_start':
        case 'challenge_ending':
        case 'challenge_complete':
            return '/community';
        default:
            return null;
    }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function safeRelativeTime(dateStr: string): string {
    try {
        return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: fr });
    } catch {
        return 'récemment';
    }
}

function normalizeNotification(n: Record<string, unknown>): Notification {
    return {
        id: n.id as string,
        type: n.type as string,
        title: n.title as string,
        body: n.body as string,
        isRead: (n.read ?? n.isRead ?? false) as boolean,
        createdAt: (n.createdAt ?? n.created_at) as string,
        data: (n.data ?? n.payload ?? undefined) as Record<string, unknown> | undefined,
    };
}

const PAGE_SIZE = 20;

// ─── Preferences ───────────────────────────────────────────────────────────────

const PREF_ROWS: Array<{ key: keyof NotifPreferences; label: string; description: string; sub?: true }> = [
    { key: 'wars',            label: 'Guerres & Battles',       description: 'Démarrages, résultats, deadlines de vote' },
    { key: 'warUpdates',      label: 'Mises à jour de guerre',  description: 'Score live, highlights, fin de guerre', sub: true },
    { key: 'warLeadChanges',  label: 'Changements de tête',     description: 'Quand un clan prend ou perd la tête', sub: true },
    { key: 'warCloseMatches', label: 'Matchs serrés',           description: 'Alertes écart < 10% en fin de guerre', sub: true },
    { key: 'battleReminders', label: 'Rappels battle',          description: 'Ouverture et fermeture imminente', sub: true },
    { key: 'mvpNotifications',label: 'MVP du jour',             description: 'Quand tu décroches ou manques le MVP', sub: true },
    { key: 'clans',           label: 'Clan & Communauté',       description: 'Invitations, messages, changements de rôle' },
    { key: 'challenges',      label: 'Défis',                   description: 'Nouveaux défis et résultats' },
    { key: 'leaderboards',    label: 'Classements',             description: 'Changements de rang et records' },
    { key: 'training',        label: 'Entraînement',            description: 'Rappels et recommandations de séances' },
];

// ─── PushStatusRow ─────────────────────────────────────────────────────────────

function PushStatusRow() {
    const [status, setStatus] = useState<'unknown' | 'granted' | 'denied' | 'unsupported' | 'requesting'>('unknown');

    useEffect(() => {
        if (!('Notification' in window)) {
            setStatus('unsupported');
        } else {
            const p = Notification.permission;
            setStatus(p === 'granted' ? 'granted' : p === 'denied' ? 'denied' : 'unknown');
        }
    }, []);

    const request = async () => {
        if (!('Notification' in window)) return;
        setStatus('requesting');
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
            setStatus('granted');
            void registerPushToken();
        } else {
            setStatus(perm === 'denied' ? 'denied' : 'unknown');
        }
    };

    if (status === 'unsupported') {
        return (
            <p className="text-[11px] text-white/25 font-bold px-1 leading-relaxed">
                Notifications push non disponibles sur ce navigateur.
            </p>
        );
    }
    if (status === 'denied') {
        return (
            <p className="text-[11px] text-white/25 font-bold px-1 leading-relaxed">
                Push bloqués dans les paramètres du navigateur.
            </p>
        );
    }
    if (status === 'granted') {
        return (
            <div className="glass-card rounded-[18px] px-4 py-3.5 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <p className="text-sm font-black text-white/60">Notifications push activées</p>
            </div>
        );
    }
    return (
        <button
            onClick={request}
            disabled={status === 'requesting'}
            className="w-full glass-card rounded-[18px] px-4 py-3.5 flex items-center gap-3 active:scale-[0.98] transition-transform disabled:opacity-50"
        >
            <Bell size={14} className="text-primary flex-shrink-0" />
            <span className="flex-1 text-sm font-black text-white text-left">Activer les notifications push</span>
            {status === 'requesting'
                ? <Loader2 size={14} className="text-white/30 animate-spin" />
                : <ChevronRight size={14} className="text-white/20" />
            }
        </button>
    );
}

// ─── PreferencesSheet ──────────────────────────────────────────────────────────

function PreferencesSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [prefs, setPrefs] = useState<NotifPreferences | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        api.get('/notifications/preferences')
            .then(res => setPrefs(res.data?.preferences ?? res.data ?? {}))
            .catch(() => setPrefs({}))
            .finally(() => setLoading(false));
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setPrefs(null);
            if (debounceRef.current) clearTimeout(debounceRef.current);
        }
    }, [isOpen]);

    const toggle = useCallback((key: keyof NotifPreferences) => {
        setPrefs(prev => {
            if (!prev) return prev;
            const previous = prev;
            const updated = { ...prev, [key]: !(prev[key] ?? true) };
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                setSaving(true);
                api.patch('/notifications/preferences', updated)
                    .catch(() => setPrefs(previous))
                    .finally(() => setSaving(false));
            }, 300);
            return updated;
        });
    }, []);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="fixed inset-x-0 bottom-0 z-50 max-w-md mx-auto rounded-t-[28px] overflow-hidden"
                        style={{
                            background: 'linear-gradient(180deg, #0d1e33 0%, #07111f 100%)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderBottom: 'none',
                        }}
                    >
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-white/15" />
                        </div>

                        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                            <div className="flex items-center gap-2">
                                <Settings size={14} style={{ color: '#5ab2ff' }} />
                                <p className="font-black text-white text-sm">Préférences</p>
                                {saving && <Loader2 size={11} className="animate-spin text-white/30" />}
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 glass-card rounded-[10px] flex items-center justify-center text-white/40 hover:text-white transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <div className="px-5 py-4 pb-10 space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/25 px-1 pb-1">Catégories</p>

                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="skeleton h-16 rounded-[18px]" />
                                ))
                            ) : (
                                PREF_ROWS.map(({ key, label, description, sub }) => {
                                    const enabled = prefs ? (prefs[key] ?? true) : true;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => toggle(key)}
                                            className={`w-full flex items-center gap-4 glass-card rounded-[18px] px-4 py-3.5 text-left active:scale-[0.98] transition-transform ${sub ? 'ml-4 opacity-90' : ''}`}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-black ${enabled ? 'text-white' : 'text-white/35'}`}>
                                                    {label}
                                                </p>
                                                <p className={`text-[10px] mt-0.5 font-bold ${enabled ? 'text-white/40' : 'text-white/20'}`}>
                                                    {description}
                                                </p>
                                            </div>
                                            <div
                                                className="flex-shrink-0 w-11 h-6 rounded-full relative transition-all duration-200"
                                                style={{
                                                    background: enabled ? '#5ab2ff' : 'rgba(255,255,255,0.10)',
                                                    boxShadow: enabled ? '0 0 10px rgba(90,178,255,0.3)' : 'none',
                                                }}
                                            >
                                                <motion.div
                                                    animate={{ x: enabled ? 20 : 2 }}
                                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                    className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                                                />
                                            </div>
                                        </button>
                                    );
                                })
                            )}

                            <div className="pt-3 space-y-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-white/25 px-1 pb-1">
                                    Notifications push
                                </p>
                                <PushStatusRow />
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ─── Notifications ─────────────────────────────────────────────────────────────

export function Notifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);
    const [showPrefs, setShowPrefs] = useState(false);

    const navigate = useNavigate();
    const { notificationId } = useParams();

    const fetchPage = useCallback(async (nextCursor: string | null, append: boolean) => {
        try {
            const params: Record<string, unknown> = { limit: PAGE_SIZE };
            if (nextCursor) params.cursor = nextCursor;

            const res = await api.get('/notifications', { params });
            const raw = res.data?.notifications ?? res.data;
            const list = Array.isArray(raw) ? raw.map(normalizeNotification) : [];
            const next = res.data?.nextCursor ?? res.data?.cursor ?? null;
            const more = res.data?.hasMore ?? (next !== null);

            setNotifications(prev => append ? [...prev, ...list] : list);
            setCursor(next);
            setHasMore(Boolean(more));
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        fetchPage(null, false).finally(() => setLoading(false));
    }, [fetchPage]);

    const loadMore = async () => {
        if (!hasMore || loadingMore) return;
        setLoadingMore(true);
        await fetchPage(cursor, true);
        setLoadingMore(false);
    };

    const markAsRead = useCallback(async (id: string) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            notifyInvalidation(['notifications']);
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
        }
    }, []);

    // Auto-mark deep-linked notification as read
    useEffect(() => {
        if (!notificationId || loading) return;
        const linked = notifications.find(n => n.id === notificationId);
        if (linked && !linked.isRead) void markAsRead(notificationId);
    }, [loading, markAsRead, notificationId, notifications]);

    const markAllAsRead = async () => {
        setMarkingAll(true);
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            notifyInvalidation(['notifications']);
        } catch (err) {
            console.error('Failed to mark all notifications as read:', err);
        }
        finally { setMarkingAll(false); }
    };

    const handleNotifClick = useCallback((notif: Notification) => {
        if (!notif.isRead) void markAsRead(notif.id);
        const link = resolveDeepLink(notif.type, notif.data);
        if (link) navigate(link);
    }, [markAsRead, navigate]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="min-h-screen pb-28">

            {/* ── Header ───────────────────────────────────────── */}
            <div className="px-5 pt-7 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 glass-card rounded-2xl flex items-center justify-center text-white active:scale-95 transition-all"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-white leading-none">Notifications</h1>
                        {unreadCount > 0 && (
                            <p className="text-[10px] text-primary font-bold uppercase tracking-widest mt-0.5">
                                {unreadCount} non lu{unreadCount > 1 ? 'es' : 'e'}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowPrefs(true)}
                        className="w-9 h-9 glass-card rounded-[14px] flex items-center justify-center text-white/40 hover:text-white transition-colors active:scale-95"
                    >
                        <Settings size={15} />
                    </button>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            disabled={markingAll}
                            className="flex items-center gap-1.5 px-3.5 py-2 glass-card rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/8 transition-colors disabled:opacity-50 active:scale-95"
                        >
                            {markingAll ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={13} />}
                            Tout lire
                        </button>
                    )}
                </div>
            </div>

            {/* ── List ─────────────────────────────────────────── */}
            <div className="px-5 space-y-2.5">
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="glass-card rounded-[22px] p-4 flex items-start gap-3">
                            <div className="skeleton w-11 h-11 rounded-2xl flex-shrink-0" />
                            <div className="flex-1 space-y-2 py-0.5">
                                <div className="skeleton h-3 w-2/3 rounded-lg" />
                                <div className="skeleton h-3 w-full rounded-lg" />
                                <div className="skeleton h-2 w-1/4 rounded-lg" />
                            </div>
                        </div>
                    ))
                ) : notifications.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-24 gap-5"
                    >
                        <div className="w-20 h-20 glass-hero rounded-[24px] flex items-center justify-center">
                            <Bell size={32} className="text-text-muted/40" />
                        </div>
                        <div className="text-center">
                            <p className="font-black text-sm text-white">Aucune notification</p>
                            <p className="text-xs text-text-muted mt-1 font-medium">Tu es à jour !</p>
                        </div>
                    </motion.div>
                ) : (
                    <>
                        <AnimatePresence initial={false}>
                            {notifications.map((notif, i) => {
                                const { icon: Icon, accent, dot } = getTypeCfg(notif.type);
                                const hasLink = Boolean(resolveDeepLink(notif.type, notif.data));
                                return (
                                    <motion.div
                                        key={notif.id}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.2 }}
                                        onClick={() => handleNotifClick(notif)}
                                        className={`relative glass-card rounded-[22px] p-4 flex items-start gap-3.5 transition-all active:scale-[0.98] ${
                                            hasLink ? 'cursor-pointer' : 'cursor-default'
                                        } ${notif.isRead ? 'opacity-50' : ''} ${
                                            notif.id === notificationId ? 'ring-1 ring-primary/40' : ''
                                        }`}
                                    >
                                        {!notif.isRead && (
                                            <div className={`absolute top-4 right-4 w-2 h-2 rounded-full ${dot}`} />
                                        )}

                                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border ${accent}`}>
                                            <Icon size={17} />
                                        </div>

                                        <div className="flex-1 min-w-0 pr-3">
                                            <p className={`text-sm font-black tracking-tight leading-snug ${notif.isRead ? 'text-text-muted' : 'text-white'}`}>
                                                {notif.title}
                                            </p>
                                            <p className="text-xs text-text-muted font-medium mt-1 leading-relaxed">
                                                {notif.body}
                                            </p>
                                            <p className="text-[9px] text-text-muted/50 font-bold uppercase tracking-widest mt-2">
                                                {safeRelativeTime(notif.createdAt)}
                                            </p>
                                        </div>

                                        {hasLink && (
                                            <ChevronRight size={14} className="flex-shrink-0 self-center text-white/15" />
                                        )}
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>

                        {/* Load more */}
                        {hasMore && (
                            <div className="pt-1 pb-2 flex justify-center">
                                <button
                                    onClick={loadMore}
                                    disabled={loadingMore}
                                    className="flex items-center gap-2 px-5 py-2.5 glass-card rounded-full text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-colors disabled:opacity-40 active:scale-95"
                                >
                                    {loadingMore ? <Loader2 size={12} className="animate-spin" /> : null}
                                    Charger plus
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            <PreferencesSheet isOpen={showPrefs} onClose={() => setShowPrefs(false)} />
        </div>
    );
}
