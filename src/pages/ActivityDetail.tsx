import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, MapPin, Gauge, Loader2, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { formatDuration, formatDistance, calculatePace } from '../utils/format';
import { format, parseISO } from 'date-fns';

export function ActivityDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activity, setActivity] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const response = await api.get(`/activities/${id}`);
                setActivity(response.data?.activity ?? response.data);
            } catch (error) {
                console.error('Failed to fetch activity detail', error);
                navigate('/activities'); // fallback
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id, navigate]);

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete this activity?')) {
            try {
                await api.delete(`/activities/${id}`);
                navigate('/activities');
            } catch (error) {
                console.error('Failed to delete', error);
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    if (!activity) return null;

    return (
        <div className="min-h-screen bg-background pb-20">
            <header className="fixed top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-background/80 backdrop-blur-md">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full">
                    <ChevronLeft size={24} />
                </button>
                <span className="font-bold">{format(parseISO(activity.startedAt), 'MMMM d, yyyy')}</span>
                <button onClick={handleDelete} className="p-2 hover:bg-red-500/10 text-red-500 rounded-full">
                    <Trash2 size={20} />
                </button>
            </header>

            <div className="pt-20 px-4 space-y-6">
                <div className="text-center mb-8">
                    <div className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase mb-2">
                        {activity.activityType}
                    </div>
                    <h1 className="text-3xl font-black italic uppercase">{activity.name}</h1>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface p-5 rounded-3xl border border-white/5 text-center">
                        <div className="flex justify-center mb-2 text-text-muted"><MapPin size={24} /></div>
                        <div className="text-3xl font-black">{formatDistance(activity.distanceMeters)}</div>
                        <div className="text-xs font-bold text-text-muted uppercase">Kilometers</div>
                    </div>
                    <div className="bg-surface p-5 rounded-3xl border border-white/5 text-center">
                        <div className="flex justify-center mb-2 text-text-muted"><Clock size={24} /></div>
                        <div className="text-3xl font-black">{formatDuration(activity.durationSeconds)}</div>
                        <div className="text-xs font-bold text-text-muted uppercase">Time</div>
                    </div>
                    <div className="col-span-2 bg-surface p-5 rounded-3xl border border-white/5 flex items-center justify-between px-8">
                        <div className="text-center">
                            <div className="flex justify-center mb-2 text-text-muted"><Gauge size={24} /></div>
                            <div className="text-3xl font-black">{calculatePace(activity.distanceMeters, activity.durationSeconds)}</div>
                            <div className="text-xs font-bold text-text-muted uppercase">Avg Pace (/km)</div>
                        </div>
                        {/* Placeholder for Heart Rate if available */}
                        <div className="text-center opacity-50">
                            <div className="text-3xl font-black">--</div>
                            <div className="text-xs font-bold text-text-muted uppercase">Avg HR</div>
                        </div>
                    </div>
                </div>

                {/* Splits (if available) */}
                {activity.splits && activity.splits.length > 0 && (
                    <div className="bg-surface rounded-3xl p-6 border border-white/5">
                        <h3 className="font-bold mb-4">Splits</h3>
                        <div className="space-y-3">
                            {activity.splits.map((split: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-sm border-b border-white/5 last:border-0 pb-2 last:pb-0">
                                    <span className="font-bold text-text-muted">{split.kmNumber} km</span>
                                    <span className="font-mono">{formatDuration(split.splitTimeSec)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
