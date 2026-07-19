import * as Sentry from '@sentry/capacitor';
import { init as sentryReactInit, browserTracingIntegration } from '@sentry/react';

/**
 * Initialise Sentry (reporting d'erreurs distant).
 *
 * Ne fait rien tant que VITE_SENTRY_DSN n'est pas défini :
 * l'app fonctionne exactement comme avant, sans DSN.
 * Le DSN Sentry est public par nature (il est embarqué côté client),
 * il n'a donc pas besoin d'être gardé secret.
 */
export function initSentry(): void {
    const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();

    if (!dsn) {
        if (import.meta.env.DEV) {
            console.info('[Sentry] VITE_SENTRY_DSN absent → reporting désactivé.');
        }
        return;
    }

    Sentry.init(
        {
            dsn,
            environment: import.meta.env.MODE,
            // Suivi des perfs : capture les navigations lentes (ex. "la page Clan a mis 22s")
            // et les appels API lents. C'est ce qui rend visibles les blocages/hangs
            // qui ne lèvent aucune exception.
            integrations: [browserTracingIntegration()],
            // Beta : on capture 100% des navigations (trafic faible). À baisser (ex. 0.2)
            // quand l'app aura plus d'utilisateurs, pour rester dans le quota gratuit.
            tracesSampleRate: 1.0,
            // On garde les logs console.error/warn locaux visibles pendant le dev.
            debug: false,
        },
        sentryReactInit,
    );
}

/** Rapporte manuellement une erreur à Sentry (no-op si non initialisé). */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
    Sentry.captureException(error, context ? { extra: context } : undefined);
}
