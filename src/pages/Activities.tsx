import { useState, useEffect } from 'react';
import { Activity, Clock, MapPin, ChevronRight, TrendingUp, Plus, Flame, Zap } from 'lucide-react';
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
                api.get('/activities/stats').catch(() => ({ data: {} }))
            ]);
            const activityList = activitiesRes.data?.activities ?? activitiesRes.data ?? [];
            const rawStats = statsRes.data?.stats ?? statsRes.data ?? {};
            setActivities(Array.isArray(activityList) ? activityList : []);
            setStats({
                weeklyKm: ((rawStats.totalDistanceM ?? 0) as number) / 1000,
                count: rawStats.totalActivities ?? 0,
            });
        } catch {
            setActivities([]);
            setStats({ weeklyKm: 0, count: 0 });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    if (loading) {
        return (
            <div className="px-5 pt-7 pb-28 space-y-6">
                <div className="flex justify-between items-start">
                    <div className="space-y-2">
                        <div className="skeleton h-7 w-28 rounded-xl" />
                        <div className="skeleton h-4 w-36 rounded-lg" />
                    </div>
                    <div className="flex gap-2">
                        <div className="skeleton w-10 h-10 rounded-2xl" />
                        <div className="skeleton w-10 h-10 rounded-2xl" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="skeleton h-24 rounded-[22px]" />
                    <div className="skeleton h-24 rounded-[22px]" />
                </div>
                <div className="space-y-2.5">
                    {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-[22px]" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="pb-28">
            <div className="px-5 space-y-6 pt-7">

                {/* Header */}
                <header className="flex justify-between items-start">
                    <div>
                        <h1 className="text-[1.7rem] font-black tracking-tight leading-tight text-white">Activités</h1>
                        <p className="text-text-muted text-sm mt-0.5">Ton journal de course</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setIsAddModalOpen(true)}
                            className="w-10 h-10 glass-hero rounded-2xl flex items-center justify-center text-primary">
                            <Plus size={18} />
                        </button>
                        <button onClick={() => navigate('/challenges')}
                            className="w-10 h-10 glass-card rounded-2xl flex items-center justify-center text-text-muted hover:text-white transition-colors">
                            <TrendingUp size={18} />
                        </button>
                    </div>
                </header>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="glass-hero rounded-[22px] p-4">
                        <div className="flex items-center gap-1.5 mb-2">
                            <MapPin size={12} className="text-primary" />
                            <span className="text-[10px] font-bold text-text-muted">Cette semaine</span>
                        </div>
                        <div className="text-2xl font-black text-white">
                            {(stats.weeklyKm || 0).toFixed(1)}
                            <span className="text-sm font-bold text-text-muted ml-1">km</span>
                        </div>
                    </div>
                    <div className="glass-card rounded-[22px] p-4">
                        <div className="flex items-center gap-1.5 mb-2">
                            <Flame size={12} className="text-primary" />
                            <span className="text-[10px] font-bold text-text-muted">Total</span>
                        </div>
                        <div className="text-2xl font-black text-white">
                            {stats.count || 0}
                            <span className="text-sm font-bold text-text-muted ml-1">séances</span>
                        </div>
                    </div>
                </div>

                {/* Activity list */}
                <div>
                    <h3 className="text-sm font-bold text-text-muted mb-3">Historique récent</h3>
                    <div className="space-y-2.5">
                        <AnimatePresence>
                            {activities.map((activity, i) => (
                                <Link to={`/activities/${activity.id}`} key={activity.id}>
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="rf-activity-row group mb-0"
                                    >
                                        <div className="w-11 h-11 rounded-2xl glass-hero flex items-center justify-center text-primary flex-shrink-0 group-hover:bg-primary group-hover:text-white transition-all">
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
                                            <div className="flex items-center gap-3.5 text-[10px] text-text-muted font-bold">
                                                <span className="flex items-center gap-1">
                                                    <MapPin size={10} className="text-primary/70" />
                                                    {formatDistance(activity.distanceMeters || 0)} km
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={10} className="text-primary/70" />
                                                    {calculatePace(activity.distanceMeters || 0, activity.durationSeconds || 0)} /km
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight size={14} className="text-text-muted/30 group-hover:text-primary transition-colors flex-shrink-0" />
                                    </motion.div>
                                </Link>
                            ))}
                        </AnimatePresence>

                        {activities.length === 0 && (
                            <div className="glass-card rounded-[24px] p-12 text-center border-dashed">
                                <div className="glass-hero w-16 h-16 rounded-[20px] flex items-center justify-center mx-auto mb-4">
                                    <Activity size={28} className="text-primary" />
                                </div>
                                <p className="font-bold text-white mb-1">Aucune activité</p>
                                <p className="text-text-muted text-sm">Connecte Strava ou ajoute une activité manuellement</p>
                            </div>
                        )}
                    </div>

                    {activities.length > 0 && (
                        <p className="text-center text-[10px] text-text-muted/40 font-medium mt-6 pb-4">
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
