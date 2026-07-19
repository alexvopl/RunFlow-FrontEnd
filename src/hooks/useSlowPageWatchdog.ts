import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getPendingRequestCount, subscribePendingRequests } from '../services/api';
import { reportError } from '../services/sentry';

// Une page est considérée "stabilisée" quand le réseau reste inactif ce court
// délai (gère les appels enchaînés, ex. /clans/me puis /clans/:id).
const SETTLE_DELAY_MS = 500;

/**
 * Surveille chaque changement de page. Si une page met plus de `thresholdMs`
 * à se stabiliser (appels API encore en cours), envoie une erreur à Sentry
 * → crée une Issue → email.
 *
 * Comble le trou principal : une page lente ou bloquée ne lève aucune
 * exception, donc rien ne remontait jusque-là.
 */
export function useSlowPageWatchdog(thresholdMs = 4000) {
    const { pathname } = useLocation();

    useEffect(() => {
        const start = performance.now();
        let reported = false;
        let settleTimer: ReturnType<typeof setTimeout> | undefined;

        const report = (stuck: boolean) => {
            if (reported) return;
            reported = true;
            const durationMs = Math.round(performance.now() - start);
            if (durationMs < thresholdMs) return;
            // Message stable (sans la durée) pour que Sentry regroupe par page.
            reportError(new Error(`Page lente (>${Math.round(thresholdMs / 1000)}s) : ${pathname}`), {
                pathname,
                durationMs,
                stuck,
                pendingRequests: getPendingRequestCount(),
            });
        };

        const onPendingChange = (count: number) => {
            clearTimeout(settleTimer);
            if (count === 0) {
                settleTimer = setTimeout(() => report(false), SETTLE_DELAY_MS);
            }
        };
        const unsubscribe = subscribePendingRequests(onPendingChange);
        // Amorce : gère les pages sans aucun appel API.
        onPendingChange(getPendingRequestCount());

        // Filet de sécurité : au seuil, si des requêtes sont encore en vol → bloquée.
        const watchdog = setTimeout(() => {
            if (getPendingRequestCount() > 0) report(true);
        }, thresholdMs);

        return () => {
            clearTimeout(settleTimer);
            clearTimeout(watchdog);
            unsubscribe();
        };
    }, [pathname, thresholdMs]);
}
