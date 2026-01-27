import { Activity, Clock, MapPin, ChevronRight, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const activities = [
    { id: 1, type: 'Long Run', date: 'Yesterday', dist: '15.2 km', time: '1:24:30', pace: '5:33 /km', feels: 'good' },
    { id: 2, type: 'Recovery', date: 'Oct 24', dist: '5.0 km', time: '32:15', pace: '6:27 /km', feels: 'great' },
    { id: 3, type: 'Intervals', date: 'Oct 22', dist: '8.5 km', time: '45:10', pace: '5:18 /km', feels: 'tired' },
    { id: 4, type: 'Easy Run', date: 'Oct 20', dist: '6.2 km', time: '38:45', pace: '6:15 /km', feels: 'good' },
];

export function Activities() {
    return (
        <div className="pt-6 px-4 pb-20">
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Activities</h1>
                <button className="p-2 bg-surface rounded-full border border-white/5 hover:bg-white/10 transition-colors">
                    <TrendingUp size={20} className="text-primary" />
                </button>
            </header>

            <div className="flex gap-4 mb-6 overflow-x-auto no-scrollbar -mx-4 px-4">
                <div className="min-w-[140px] bg-surface p-4 rounded-3xl border border-white/5">
                    <div className="text-text-muted text-xs uppercase font-bold mb-1">Weekly Dist</div>
                    <div className="text-2xl font-black">34.9 <span className="text-sm font-normal text-text-muted">km</span></div>
                </div>
                <div className="min-w-[140px] bg-surface p-4 rounded-3xl border border-white/5">
                    <div className="text-text-muted text-xs uppercase font-bold mb-1">Activities</div>
                    <div className="text-2xl font-black">4</div>
                </div>
            </div>

            <div className="space-y-4">
                {activities.map((activity, i) => (
                    <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-surface p-4 rounded-2xl border border-white/5 flex items-center gap-4 active:scale-[0.98] transition-transform"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-primary">
                            <Activity size={24} />
                        </div>

                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold">{activity.type}</h3>
                                <span className="text-xs text-text-muted">{activity.date}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-text-muted">
                                <span className="flex items-center gap-1"><MapPin size={12} /> {activity.dist}</span>
                                <span className="flex items-center gap-1"><Clock size={12} /> {activity.pace}</span>
                            </div>
                        </div>

                        <ChevronRight size={16} className="text-text-muted" />
                    </motion.div>
                ))}

                <div className="text-center mt-8">
                    <p className="text-sm text-text-muted">Sync with Strava to see more history.</p>
                </div>
            </div>
        </div>
    );
}
