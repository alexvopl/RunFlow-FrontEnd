import { useState, useEffect } from 'react';
import { Activity, Clock, MapPin, ChevronRight, TrendingUp, Calendar, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { formatDistance, calculatePace } from '../utils/format';
import { format, parseISO } from 'date-fns';
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
            return format(parseISO(dateStr), 'd MMM');
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
            <div className="runna-screen pb-20">
                <div className="px-4 pt-2 space-y-8">
                    <div className="flex justify-between items-center mb-6">
                        <div className="skeleton h-6 w-32 rounded-xl" />
                        <div className="flex gap-2">
                            <div className="skeleton w-10 h-10 rounded-xl" />
                            <div className="skeleton w-10 h-10 rounded-xl" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="skeleton h-20 rounded-3xl" />
                        <div className="skeleton h-20 rounded-3xl" />
                    </div>
                    <div className="space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="bg-surface rounded-[2rem] border border-white/5 p-5 flex items-center gap-5">
                                <div className="skeleton w-12 h-12 rounded-2xl flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="skeleton h-3 w-3/4 rounded" />
                                    <div className="skeleton h-3 w-1/2 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="runna-screen pb-20">
            <div className="px-4 space-y-8 pt-4">
                <header>
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <p className="page-eyebrow mb-2">Journal de course</p>
                            <h1 className="page-title">Activités</h1>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="icon-badge text-primary hover:scale-[1.04] transition-transform"
                            >
                                <Plus size={18} />
                            </button>
                            <button
                                onClick={() => navigate('/challenges')}
                                className="icon-badge text-highlight hover:scale-[1.04] transition-transform"
                            >
                                <TrendingUp size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="runna-hero rounded-[28px] p-5 mb-4">
                        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
                            <p className="page-subtitle max-w-xs">Retrouve toutes tes sorties dans une vue plus claire, plus mobile et plus fidèle à l'identité RunFlow.</p>
                            <div className="metric-pill">
                                <Activity size={13} className="text-primary" />
                                {stats.count || 0} séances
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="runna-card runna-metric p-5 rounded-[28px] relative overflow-hidden">
                            <div className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] mb-2">Distance hebdo</div>
                            <div className="text-2xl font-black text-white">{(stats.weeklyKm || 0).toFixed(1)} <span className="text-sm font-bold text-text-muted">KM</span></div>
                            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full blur-2xl -mr-8 -mt-8" />
                        </div>
                        <div className="runna-card runna-metric p-5 rounded-[28px] relative overflow-hidden">
                            <div className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] mb-2">Activités</div>
                            <div className="text-2xl font-black text-white">{stats.count || 0}</div>
                            <div className="absolute top-0 right-0 w-16 h-16 bg-highlight/20 rounded-full blur-2xl -mr-8 -mt-8 opacity-70" />
                        </div>
                    </div>
                </header>

                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-2">Historique récent</h3>
                    <AnimatePresence>
                        {activities.map((activity, i) => (
                            <Link to={`/activities/${activity.id}`} key={activity.id}>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="runna-card p-5 rounded-[28px] flex items-center gap-5 active:scale-[0.98] transition-all group mb-4"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-primary/12 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors shadow-inner">
                                        <Activity size={24} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="font-black text-sm uppercase tracking-tight truncate group-hover:text-primary transition-colors">
                                                {activity.name || (activity.activityType === 'run' ? 'Course à pied' : 'Activité')}
                                            </h3>
                                            <div className="flex items-center gap-1.5 text-text-muted">
                                                <Calendar size={12} />
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                                                    {safeFormatDate(activity.startedAt)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-[10px] text-text-muted font-black uppercase tracking-widest">
                                            <span className="flex items-center gap-1.5">
                                                <MapPin size={12} className="text-primary" />
                                                {formatDistance(activity.distanceMeters || 0)} KM
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Clock size={12} className="text-primary" />
                                                {calculatePace(activity.distanceMeters || 0, activity.durationSeconds || 0)} /KM
                                            </span>
                                        </div>
                                    </div>

                                    <ChevronRight size={16} className="text-text-muted group-hover:text-primary transition-colors" />
                                </motion.div>
                            </Link>
                        ))}
                    </AnimatePresence>

                    {activities.length === 0 && (
                        <div className="text-center py-20 runna-card rounded-[28px] border-dashed">
                            <Activity size={48} className="text-text-muted/40 mx-auto mb-4" />
                            <p className="text-text-muted text-xs font-black uppercase tracking-widest">Aucune activité trouvée</p>
                        </div>
                    )}

                    <div className="text-center pt-8 pb-4 opacity-30">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Synchronisez avec Strava pour plus d'historique</p>
                    </div>
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
