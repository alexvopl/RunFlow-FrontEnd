/**
 * Offline Activity Queue
 *
 * When the backend is unreachable at the end of a workout, the completed
 * session is saved here and automatically retried the next time the device
 * comes back online.
 *
 * Storage: localStorage key `runflow_offline_activities_v1`
 * Max queue size: 20 items (oldest dropped if exceeded)
 */

const QUEUE_KEY    = 'runflow_offline_activities_v1';
const MAX_QUEUE    = 20;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OfflineActivityPayload {
    name:            string;
    activityType:    string;
    startedAt:       string;        // ISO 8601
    distanceMeters:  number;
    durationSeconds: number;
    source:          string;
    route?:          { lat: number; lng: number }[];
    splits?:         { kmNumber: number; splitTimeSec: number; avgPaceSecPerKm: number }[];
}

export interface QueuedActivity {
    id:      string;
    savedAt: string;    // ISO — when it was queued locally
    payload: OfflineActivityPayload;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function readQueue(): QueuedActivity[] {
    try {
        const raw = localStorage.getItem(QUEUE_KEY);
        return raw ? (JSON.parse(raw) as QueuedActivity[]) : [];
    } catch {
        return [];
    }
}

function writeQueue(queue: QueuedActivity[]): void {
    try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch {
        // localStorage quota exceeded — nothing we can do
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Save a failed activity to the offline queue.
 * Returns the generated local id.
 */
export function enqueueActivity(payload: OfflineActivityPayload): string {
    const id   = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const item: QueuedActivity = { id, savedAt: new Date().toISOString(), payload };

    const current = readQueue();
    // Drop the oldest entry if we hit the cap
    const trimmed = current.length >= MAX_QUEUE ? current.slice(1) : current;
    writeQueue([...trimmed, item]);
    return id;
}

/** Number of activities waiting to be synced. */
export function getPendingCount(): number {
    return readQueue().length;
}

/** Full list of pending activities (for debug / display). */
export function getPendingActivities(): QueuedActivity[] {
    return readQueue();
}

/** Remove one item after a successful sync. */
export function removeFromQueue(id: string): void {
    writeQueue(readQueue().filter(a => a.id !== id));
}

/**
 * Attempt to POST all queued activities via the provided async function.
 * Successful items are removed; failed ones stay for the next retry.
 * Returns flushed / failed counts.
 */
export async function flushQueue(
    poster: (payload: OfflineActivityPayload) => Promise<unknown>,
): Promise<{ flushed: number; failed: number }> {
    const queue = readQueue();
    if (queue.length === 0) return { flushed: 0, failed: 0 };

    let flushed = 0;
    let failed  = 0;

    for (const item of queue) {
        try {
            await poster(item.payload);
            removeFromQueue(item.id);
            flushed++;
        } catch {
            failed++;
        }
    }

    return { flushed, failed };
}
