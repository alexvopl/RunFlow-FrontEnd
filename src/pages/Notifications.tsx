import { useState, useEffect } from 'react';
import { Bell, CheckCheck, ChevronLeft, Loader2 } from 'lucide-react';
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
    isRead: boolean;   // mapped from backend's `read` field
    createdAt: string;
}

const getNotificationAccent = (type: string) => {
    switch (type) {
        case 'achievement': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        case 'challenge': return 'bg-primary/10 text-primary border-primary/20';
        case 'social': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        case 'training': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
        case 'strava': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
        default: return 'bg-white/5 text-text-muted border-white/5';
    }
};

const getNotificationDot = (type: string) => {
    switch (type) {
        case 'achievement': return 'bg-amber-500';
        case 'challenge': return 'bg-primary';
        case 'social': return 'bg-blue-500';
        case 'training': return 'bg-purple-500';
        case 'strava': return 'bg-orange-500';
        default: return 'bg-text-muted';
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
            // Backend returns { notifications: [...], unreadCount: N, hasMore: bool }
            const raw = res.data?.notifications ?? res.data;
            const list = Array.isArray(raw) ? raw : [];
            // Map backend `read` -> frontend `isRead`
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

    useEffect(() => {
        fetchNotifications();
    }, []);

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
        <div className="min-h-screen pb-8">
            {/* Header */}
            <div className="px-4 pt-4 pb-4 flex items-center justify-between sticky top-0 glass-heavy z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-black uppercase tracking-tight leading-none">Notifications</h1>
                        {unreadCount > 0 && (
                            <p className="text-[10px] text-primary font-bold uppercase tracking-widest mt-0.5">{unreadCount} non lu{unreadCount > 1 ? 'es' : 'e'}</p>
                        )}
                    </div>
                </div>

                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        disabled={markingAll}
                        className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        {markingAll ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={14} />}
                        Tout lire
                    </button>
                )}
            </div>

            <div className="px-4 pt-4 space-y-3">
                {loading ? (
                    // Skeleton
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="bg-surface rounded-3xl p-5 flex items-start gap-4 border border-white/5">
                            <div className="skeleton w-11 h-11 rounded-2xl flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="skeleton h-3 w-2/3 rounded" />
                                <div className="skeleton h-3 w-full rounded" />
                                <div className="skeleton h-2 w-1/4 rounded" />
                            </div>
                        </div>
                    ))
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center">
                            <Bell size={36} className="text-text-muted/30" />
                        </div>
                        <div className="text-center">
                            <p className="font-black text-sm uppercase tracking-widest text-text-muted">Aucune notification</p>
                            <p className="text-xs text-text-muted/50 mt-1 font-medium">Vous êtes à jour !</p>
                        </div>
                    </div>
                ) : (
                    <AnimatePresence>
                        {notifications.map((notif, i) => (
                            <motion.div
                                key={notif.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04, duration: 0.2 }}
                                onClick={() => !notif.isRead && markAsRead(notif.id)}
                                className={`relative flex items-start gap-4 p-5 rounded-3xl border transition-all cursor-pointer press-effect ${notif.isRead
                                    ? 'bg-surface border-white/5 opacity-60'
                                    : 'bg-surface border-white/[0.08] shadow-lg'
                                    }`}
                            >
                                {/* Type dot */}
                                {!notif.isRead && (
                                    <div className={`absolute top-5 right-5 w-2 h-2 rounded-full ${getNotificationDot(notif.type)}`} />
                                )}

                                {/* Icon */}
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border ${getNotificationAccent(notif.type)}`}>
                                    <Bell size={18} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 pr-4">
                                    <p className={`text-sm font-black uppercase tracking-tight leading-snug ${notif.isRead ? 'text-text-muted' : 'text-white'}`}>
                                        {notif.title}
                                    </p>
                                    <p className="text-xs text-text-muted font-medium mt-1 leading-relaxed">{notif.body}</p>
                                    <p className="text-[9px] text-text-muted/50 font-bold uppercase tracking-widest mt-2">
                                        {safeRelativeTime(notif.createdAt)}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
