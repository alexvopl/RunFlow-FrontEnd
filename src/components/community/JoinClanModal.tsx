import { useState, useEffect } from 'react';
import { X, Loader2, Users, Search } from 'lucide-react';
import { api } from '../../services/api';

interface JoinClanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onJoined: () => void;
}

export function JoinClanModal({ isOpen, onClose, onJoined }: JoinClanModalProps) {
    const [clans, setClans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [joiningId, setJoiningId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchClans();
        }
    }, [isOpen]);

    const fetchClans = async () => {
        setLoading(true);
        try {
            const res = await api.get('/clans');
            setClans(res.data);
        } catch (error) {
            console.error('Failed to fetch clans', error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async (clanId: string) => {
        setJoiningId(clanId);
        try {
            await api.post(`/clans/${clanId}/join`);
            onJoined();
            onClose();
        } catch (error) {
            console.error('Failed to join clan', error);
            alert('Failed to join clan');
        } finally {
            setJoiningId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-surface border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-xl h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Search className="text-primary" /> Find a Clan
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto space-y-3">
                        {clans.map(clan => (
                            <div key={clan.id} className="bg-background border border-white/10 rounded-2xl p-4 flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold">{clan.name}</h3>
                                    <div className="text-xs text-text-muted flex items-center gap-3">
                                        <span className="flex items-center gap-1"><Users size={12} /> {clan.memberCount}/{clan.maxMembers}</span>
                                        <span>Min: {clan.minWeeklyKm}km</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleJoin(clan.id)}
                                    disabled={!!joiningId}
                                    className="px-4 py-2 bg-white/10 text-white font-bold rounded-lg text-xs hover:bg-white/20 transition-colors"
                                >
                                    {joiningId === clan.id ? <Loader2 className="animate-spin" size={14} /> : 'Join'}
                                </button>
                            </div>
                        ))}
                        {clans.length === 0 && (
                            <div className="text-center text-text-muted py-10">
                                No clans found. Create one!
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
