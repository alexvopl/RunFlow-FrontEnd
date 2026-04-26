import { useState, useEffect } from 'react';
import { Activity, Clock, MapPin, ChevronRight, TrendingUp, Calendar, Plus, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { formatDistance, calculatePace } from '../utils/format';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom';
import { ManualActivityModal } from '../components/activities/ManualActivityModal';

interface ActivityItem {
    id: string;
    activityType: string;
    name: string;
    startedAt: string;
    distanceMeters: number;
    durationSeconds: number;
    source: string;
}

export function Activities() {
    const navigate = useNavigate();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ weeklyKm: 0, count: 0 });
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const safeFormatDate = (dateStr: string) => {
        try {
            if (!dateStr) return 'Récent';
            return format(parseISO(dateStr), 'd MMM', { locale: fr });
        } catch {
            return 'Récent';
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [activitiesRes, statsRes] = await Promise.all([
                api.get('/activities'),
                api.get('/activities/stats').catch(() => ({ data: { weeklyKm: 0, count: 0 } }))
            ]);

            const activityList = activitiesRes.data?.activities ?? activitiesRes.data ?? [];
            const rawStats = statsRes.data?.stats ?? statsRes.data ?? {};

            setActivities(Array.isArray(activityList) ? activityList : []);
            setStats({
                weeklyKm: ((rawStats.totalDistanceM ?? 0) as number) / 1000,
                count: rawStats.totalActivities ?? 0,
            });
        } catch (error) {
            console.error('Failed to fetch activities', error);
            setActivities([]);
            setStats({ weeklyKm: 0, count: 0 });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="runna-screen pb-24 px-4 pt-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <div className="skeleton h-4 w-24 rounded-lg mb-2" />
                        <div className="skeleton h-7 w-32 rounded-xl" />
                    </div>
                    <div className="flex gap-2">
                        <div className="skeleton w-10 h-10 rounded-2xl" />
                        <div className="skeleton w-10 h-10 rounded-2xl" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="skeleton h-24 rounded-[22px]" />
                    <div className="skeleton h-24 rounded-[22px]" />
                </div>
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="skeleton h-20 rounded-[22px]" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="runna-screen pb-24">
            <div className="px-4 space-y-6 pt-6">

                {/* Header */}
                <header className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-white">Activités</h1>
                        <p className="text-text-muted text-sm mt-1">Ton journal de course</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
                        >
                            <Plus size={18} />
                        </button>
                        <button
                            onClick={() => navigate('/challenges')}
                            className="w-10 h-10 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center text-text-muted hover:bg-white/10 transition-colors"
                        >
                            <TrendingUp size={18} />
                        </button>
                    </div>
                </header>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="rf-stat-card">
                        <div className="rf-stat-label">Cette semaine</div>
                        <div className="rf-stat-value">{(stats.weeklyKm || 0).toFixed(1)} <span className="text-sm font-bold text-text-muted">km</span></div>
                        <div className="flex items-center gap-1.5 mt-2">
                            <MapPin size={11} className="text-primary" />
                            <span className="text-[10px] text-text-muted font-medium">Distance</span>
                        </div>
                    </div>
                    <div className="rf-stat-card">
                        <div className="rf-stat-label">Total</div>
                        <div className="rf-stat-value">{stats.count || 0}</div>
                        <div className="flex items-center gap-1.5 mt-2">
                            <Flame size={11} className="text-primary" />
                            <span className="text-[10px] text-text-muted font-medium">Séances</span>
                        </div>
                    </div>
                </div>

                {/* Activity list */}
                <div>
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Historique récent</h3>
                    <div className="space-y-2.5">
                        <AnimatePresence>
                            {activities.map((activity, i) => (
                                <Link to={`/activities/${activity.id}`} key={activity.id}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.06 }}
                                        className="rf-activity-row group mb-0"
                                    >
                                        <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center text-primary flex-shrink-0 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                                            <Activity size={20} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <h3 className="font-black text-sm tracking-tight truncate group-hover:text-primary transition-colors">
                                                    {activity.name || (activity.activityType === 'run' ? 'Course à pied' : 'Activité')}
                                                </h3>
                                                <span className="text-[10px] font-bold text-text-muted flex-shrink-0 ml-2">
                                                    {safeFormatDate(activity.startedAt)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-[10px] text-text-muted font-bold uppercase tracking-wide">
                                                <span className="flex items-center gap-1">
                                                    <MapPin size={10} className="text-primary" />
                                                    {formatDistance(activity.distanceMeters || 0)} km
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={10} className="text-primary" />
                                                    {calculatePace(activity.distanceMeters || 0, activity.durationSeconds || 0)} /km
                                                </span>
                                            </div>
                                        </div>

                                        <ChevronRight size={14} className="text-text-muted/40 group-hover:text-primary transition-colors flex-shrink-0" />
                                    </motion.div>
                                </Link>
                            ))}
                        </AnimatePresence>

                        {activities.length === 0 && (
                            <div className="text-center py-16 bg-surface border border-white/6 border-dashed rounded-3xl">
                                <Activity size={36} className="text-text-muted/20 mx-auto mb-3" />
                                <p className="text-text-muted text-xs font-bold uppercase tracking-widest mb-1">Aucune activité</p>
                                <p className="text-text-muted/50 text-xs">Connecte Strava ou ajoute une activité manuellement</p>
                            </div>
                        )}
                    </div>

                    {activities.length > 0 && (
                        <p className="text-center text-[10px] text-text-muted/40 font-medium mt-6">
                            Connecte Strava pour plus d'historique
                        </p>
                    )}
                </div>
            </div>

            <ManualActivityModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onActivityAdded={fetchData}
            />
        </div>
    );
}
