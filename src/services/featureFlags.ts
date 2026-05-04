import { useState, useEffect } from 'react';
import { api } from './api';

const cache = new Map<string, boolean>();
const pending = new Map<string, Promise<boolean>>();

function responseStatus(error: unknown): number {
    const maybeAxiosError = error as { response?: { status?: number } };
    return maybeAxiosError.response?.status ?? 0;
}

async function probe(flag: string, path: string): Promise<boolean> {
    if (cache.has(flag)) return cache.get(flag)!;
    if (!pending.has(flag)) {
        const p = api.get(path, { timeout: 5000 })
            .then(() => true)
            .catch((e: unknown) => responseStatus(e) !== 404)
            .then((result: boolean) => {
                cache.set(flag, result);
                pending.delete(flag);
                return result;
            });
        pending.set(flag, p);
    }
    return pending.get(flag)!;
}

export const FLAGS = {
    GAME_WARS_V1: '/game/wars/current',
} as const;

export type FeatureFlag = keyof typeof FLAGS;

export function invalidateFlag(flag?: FeatureFlag) {
    if (flag) cache.delete(flag);
    else cache.clear();
}

export function useFeatureFlag(flag: FeatureFlag): boolean | null {
    const [enabled, setEnabled] = useState<boolean | null>(
        cache.has(flag) ? cache.get(flag)! : null
    );
    useEffect(() => {
        probe(flag, FLAGS[flag]).then(setEnabled);
    }, [flag]);
    return enabled;
}
