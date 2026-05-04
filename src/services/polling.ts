const parseInterval = (value: unknown, fallback: number) => {
    const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number.NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const WAR_POLL_INTERVAL_MS = parseInterval(import.meta.env.VITE_WAR_POLL_INTERVAL_MS, 30_000);
export const TIMELINE_POLL_INTERVAL_MS = parseInterval(import.meta.env.VITE_TIMELINE_POLL_INTERVAL_MS, 45_000);
export const HIGHLIGHTS_POLL_INTERVAL_MS = parseInterval(import.meta.env.VITE_HIGHLIGHTS_POLL_INTERVAL_MS, 45_000);
