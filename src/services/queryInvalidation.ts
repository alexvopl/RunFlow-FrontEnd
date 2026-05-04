import { useEffect } from 'react';

export type QueryTag =
    | 'activities'
    | 'challenges'
    | 'clans'
    | 'equipment'
    | 'my-clan'
    | 'notifications'
    | 'profile'
    | 'training'
    | 'wars'
    | `battle:${string}`
    | `challenge:${string}`
    | `clan:${string}`
    | `clan-members:${string}`
    | `clan-messages:${string}`
    | `war:${string}`
    | `war-highlights:${string}`
    | `war-scoreboard:${string}`
    | `war-timeline:${string}`;

interface InvalidationEvent {
    tags: QueryTag[];
    method?: string;
    url?: string;
}

type Listener = (event: InvalidationEvent) => void;

const listeners = new Set<Listener>();

export function notifyInvalidation(tags: QueryTag[], meta: Omit<InvalidationEvent, 'tags'> = {}) {
    if (tags.length === 0) return;
    const event = { tags: Array.from(new Set(tags)), ...meta };
    listeners.forEach(listener => listener(event));
}

export function subscribeInvalidation(listener: Listener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function useInvalidation(tags: QueryTag[], onInvalidate: () => void | Promise<void>) {
    useEffect(() => {
        const watched = new Set(tags);
        return subscribeInvalidation(event => {
            if (event.tags.some(tag => watched.has(tag))) {
                void onInvalidate();
            }
        });
    }, [onInvalidate, tags]);
}
