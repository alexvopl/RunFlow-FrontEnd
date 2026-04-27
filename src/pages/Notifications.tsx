import { useState, useEffect } from 'react';
import { Bell, CheckCheck, ChevronLeft, Loader2, Trophy, Swords, Users, Dumbbell, Zap } from 'lucide-react';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Notification {
    id: string;
    type: string;
    title: string;
    body: string;
    isRead: boolean;
    createdAt: string;
}

const getTypeConfig = (type: string) => {
    switch (type) {
        case 'achievement': return { icon: Trophy, accent: 'bg-amber-500/15 text-amber-400 border-amber-500/20', dot: 'bg-amber-500' };
        case 'challenge':   return { icon: Swords,  accent: 'bg-primary/15 text-primary border-primary/20',       dot: 'bg-primary' };
        case 'social':      return { icon: Users,   accent: 'bg-blue-500/15 text-blue-400 border-blue-500/20',   dot: 'bg-blue-500' };
        case 'training':    return { icon: Dumbbell,accent: 'bg-purple-500/15 text-purple-400 border-purple-500/20', dot: 'bg-purple-500' };
        case 'strava':      return { icon: Zap,     accent: 'bg-orange-500/15 text-orange-400 border-orange-500/20', dot: 'bg-orange-500' };
        default:            return { icon: Bell,    accent: 'bg-white/5 text-text-muted border-white/8',          dot: 'bg-text-muted' };
    }
};

function safeRelativeTime(dateStr: string): string {
    try {
        return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: fr });
    } catch {
        return 'récemment';
    }
}

export function Notifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [markingAll, setMarkingAll] = useState(false);
    const navigate = useNavigate();

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications');
            const raw = res.data?.notifications ?? res.data;
            const list = Array.isArray(raw) ? raw : [];
            setNotifications(list.map((n: any) => ({
                id: n.id,
                type: n.type,
                title: n.title,
                body: n.body,
                isRead: n.read ?? n.isRead ?? false,
                createdAt: n.createdAt ?? n.created_at,
            })));
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchNotifications(); }, []);

    const markAsRead = async (id: string) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (err) {
            console.error(err);
        }
    };

    const markAllAsRead = async () => {
        setMarkingAll(true);
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (err) {
            console.error(err);
        } finally {
            setMarkingAll(false);
        }
    };

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

            {/* ── Content ──────────────────────────────────────── */}
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
                    <AnimatePresence>
                        {notifications.map((notif, i) => {
                            const { icon: Icon, accent, dot } = getTypeConfig(notif.type);
                            return (
                                <motion.div
                                    key={notif.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.04, duration: 0.2 }}
                                    onClick={() => !notif.isRead && markAsRead(notif.id)}
                                    className={`relative glass-card rounded-[22px] p-4 flex items-start gap-3.5 transition-all cursor-pointer active:scale-[0.98] ${
                                        notif.isRead ? 'opacity-50' : ''
                                    }`}
                                >
                                    {/* Unread dot */}
                                    {!notif.isRead && (
                                        <div className={`absolute top-4 right-4 w-2 h-2 rounded-full ${dot}`} />
                                    )}

                                    {/* Icon */}
                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border ${accent}`}>
                                        <Icon size={17} />
                                    </div>

                                    {/* Content */}
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
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
