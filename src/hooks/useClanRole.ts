import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { ClanRole } from '../components/community/MemberManagement';

export function useClanRole(): ClanRole | null {
    const [role, setRole] = useState<ClanRole | null>(null);

    useEffect(() => {
        api.get('/clans/me')
            .then(res => {
                const r = res.data?.membership?.role as ClanRole | undefined;
                setRole(r ?? null);
            })
            .catch(() => setRole(null));
    }, []);

    return role;
}
