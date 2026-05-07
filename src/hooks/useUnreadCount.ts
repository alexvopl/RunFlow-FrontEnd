import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { useInvalidation, type QueryTag } from '../services/queryInvalidation';

export function useUnreadCount(): number {
    const [count, setCount] = useState(0);

    const refresh = useCallback(async () => {
        try {
            const res = await api.get('/notifications/unread-count');
            setCount(res.data?.count ?? res.data?.unreadCount ?? 0);
        } catch {}
    }, []);

    useEffect(() => { void refresh(); }, [refresh]);

    const tags = useMemo<QueryTag[]>(() => ['notifications'], []);
    useInvalidation(tags, refresh);

    return count;
}
