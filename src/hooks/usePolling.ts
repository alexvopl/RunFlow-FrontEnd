import { useEffect, useRef } from 'react';

interface PollingOptions {
    enabled?: boolean;
    intervalMs?: number;
    refetchOnFocus?: boolean;
}

export function usePolling(
    fn: () => void | Promise<void>,
    { enabled = true, intervalMs = 30_000, refetchOnFocus = true }: PollingOptions = {}
) {
    const fnRef = useRef(fn);

    useEffect(() => {
        fnRef.current = fn;
    }, [fn]);

    useEffect(() => {
        if (!enabled) return;

        void fnRef.current();
        const id = setInterval(() => void fnRef.current(), intervalMs);

        const onVisibility = () => {
            if (document.visibilityState === 'visible') void fnRef.current();
        };
        if (refetchOnFocus) document.addEventListener('visibilitychange', onVisibility);

        return () => {
            clearInterval(id);
            if (refetchOnFocus) document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [enabled, intervalMs, refetchOnFocus]);
}
