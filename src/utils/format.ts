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
