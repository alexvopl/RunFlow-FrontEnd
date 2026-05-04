export const GAME_ERRORS: Record<string, string> = {
    // Generic
    FORBIDDEN:                    'Permissions insuffisantes.',
    UNAUTHORIZED:                 'Session expirée. Reconnecte-toi.',
    NOT_FOUND:                    'Ressource introuvable.',
    // Clan
    CLAN_NOT_FOUND:               'Clan introuvable.',
    ALREADY_IN_CLAN:              "Tu es déjà membre d'un clan.",
    CLAN_FULL:                    'Ce clan est complet.',
    CANNOT_KICK_LEADER:           "Impossible d'exclure le leader.",
    LEADER_CANNOT_LEAVE:          'Transfère le leadership avant de quitter.',
    MEMBER_NOT_FOUND:             'Membre introuvable.',
    // Invites
    INVALID_INVITE:               'Code invalide ou expiré.',
    INVITE_EXHAUSTED:             "Ce code a atteint son nombre maximum d'utilisations.",
    // Wars
    WAR_NOT_FOUND:                'Guerre introuvable.',
    WAR_NOT_ACTIVE:               "Cette guerre n'est pas active.",
    ROSTER_LOCKED:                'Le roster est verrouillé pour cette guerre.',
    // Battles
    BATTLE_NOT_FOUND:             'Battle introuvable.',
    BATTLE_CLOSED:                'La fenêtre de cette battle est fermée.',
    BATTLE_NOT_ENROLLED:          "Tu n'es pas inscrit à cette battle.",
    ACTIVITY_ALREADY_CREDITED:   'Cette activité a déjà été créditée.',
    INVALID_ACTIVITY:             'Activité invalide pour cette battle.',
    // Votes
    VOTE_ALREADY_CAST:            'Tu as déjà voté.',
    VOTE_WINDOW_CLOSED:           'La fenêtre de vote est fermée.',
    // Challenges
    CHALLENGE_NOT_FOUND:          'Challenge introuvable.',
    CHALLENGE_EXPIRED:            'Ce challenge est terminé.',
    // Activities
    ACTIVITY_NOT_FOUND:           'Activité introuvable.',
};

export function resolveError(e: unknown, fallback = 'Une erreur est survenue.'): string {
    const err = e as { response?: { data?: { code?: string; message?: string } } };
    const code = err?.response?.data?.code;
    return GAME_ERRORS[code ?? ''] ?? err?.response?.data?.message ?? fallback;
}
