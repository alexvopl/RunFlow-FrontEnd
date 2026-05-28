/**
 * useOfflineSync
 *
 * Mount once at the app root (App.tsx).
 * Listens for the browser `online` event and retries any activities that
 * were queued in localStorage while the backend was unreachable.
 *
 * Also fires once on mount so that activities queued during a previous
 * session are flushed as soon as the user opens the app with connectivity.
 */

import { useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { flushQueue, getPendingCount } from '../services/offlineQueue';

export function useOfflineSync(): void {
    const flush = useCallback(async () => {
        if (getPendingCount() === 0) return;

        const { flushed } = await flushQueue(async (payload) => {
            await api.post('/activities', payload);
        });

        if (flushed > 0) {
            console.info(`[offline-sync] ${flushed} activité(s) synchronisée(s) depuis la file hors-ligne`);
        }
    }, []);

    useEffect(() => {
        // Try immediately — the user may already be online from a previous session
        void flush();

        window.addEventListener('online', flush);
        return () => window.removeEventListener('online', flush);
    }, [flush]);
}
