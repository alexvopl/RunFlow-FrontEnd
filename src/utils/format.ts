export const formatPoints = (pts: number): string => {
    if (pts >= 1_000_000) return `${(pts / 1_000_000).toFixed(1)}M`;
    if (pts >= 1_000) return `${(pts / 1_000).toFixed(0)}k`;
    return String(Math.round(pts));
};

export const formatDate = (iso: string): string => {
    try {
        return new Date(iso).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'short', year: 'numeric',
        });
    } catch { return iso; }
};

export const formatCountdown = (endsAt: string): string => {
    const ms = new Date(endsAt).getTime() - Date.now();
    if (ms <= 0) return '00:00:00';
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = m.toString().padStart(2, '0');
    const ss = s.toString().padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

export const timeAgo = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${Math.floor(hours / 24)}j`;
};

export const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
};

export const formatDistance = (meters: number): string => {
    return (meters / 1000).toFixed(2);
};

export const calculatePace = (meters: number, seconds: number): string => {
    if (meters === 0) return '0:00';
    const minutesPerKm = (seconds / 60) / (meters / 1000);
    const m = Math.floor(minutesPerKm);
    const s = Math.round((minutesPerKm - m) * 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};
