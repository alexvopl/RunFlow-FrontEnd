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
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchClans();
        }
    }, [isOpen]);

    const fetchClans = async () => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const res = await api.get('/clans');
            setClans(Array.isArray(res.data?.clans) ? res.data.clans : []);
        } catch (error) {
            console.error('Failed to fetch clans', error);
            setErrorMessage("Impossible de charger les clans pour le moment.");
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async (clanId: string) => {
        setJoiningId(clanId);
        setErrorMessage(null);
        try {
            await api.post(`/clans/${clanId}/join`);
            onJoined();
            onClose();
        } catch (error) {
            console.error('Failed to join clan', error);
            setErrorMessage("Impossible de rejoindre ce clan pour le moment.");
        } finally {
            setJoiningId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative flex h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border-t border-white/10 bg-surface shadow-xl sm:rounded-3xl sm:border">
                <div className="flex justify-between items-center px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Search className="text-primary" /> Rejoindre un clan
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
                    <div className="flex-1 overflow-y-auto space-y-3 px-5 pb-4 sm:px-6 custom-scrollbar">
                        {errorMessage && (
                            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                                {errorMessage}
                            </div>
                        )}
                        {clans.map(clan => (
                            <div key={clan.id} className="bg-background border border-white/10 rounded-2xl p-4 flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold">{clan.name}</h3>
                                    <div className="text-xs text-text-muted flex items-center gap-3">
                                        <span className="flex items-center gap-1"><Users size={12} /> {clan.memberCount}/{clan.maxMembers}</span>
                                        <span>Min. {clan.minWeeklyKm} km</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleJoin(clan.id)}
                                    disabled={!!joiningId}
                                    className="px-4 py-2 bg-white/10 text-white font-bold rounded-lg text-xs hover:bg-white/20 transition-colors"
                                >
                                    {joiningId === clan.id ? <Loader2 className="animate-spin" size={14} /> : 'Rejoindre'}
                                </button>
                            </div>
                        ))}
                        {clans.length === 0 && (
                            <div className="text-center text-text-muted py-10">
                                Aucun clan trouvé. Créez-en un.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
