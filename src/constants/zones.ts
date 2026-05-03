// ─── Zone HR configuration — single source of truth ──────────────────────────
// z3 = orange, z4 = red, z5 = fuchsia. Referenced everywhere in the app.

export const ZONE_CONFIG = {
    z1: {
        num: 1,
        color: '#64748b',
        label: 'Récup',
        fullLabel: 'Récupération',
        pct: '< 70%',
        tip: 'Tu peux parler en phrases complètes sans effort.',
        desc: "La zone de régénération. Idéale pour les footings de récupération le lendemain d'une séance dure. Le corps élimine les déchets métaboliques et reconstitue les réserves.",
        trainingUse: 'Footings de récupération, entre les intervalles',
    },
    z2: {
        num: 2,
        color: '#22c55e',
        label: 'Aérobie',
        fullLabel: 'Endurance aérobie',
        pct: '70–80%',
        tip: 'Tu peux tenir une conversation sans problème.',
        desc: "Le moteur de base — 80% de ton entraînement devrait être ici. Le corps brûle principalement les graisses et développe l'infrastructure aérobie : capillaires, mitochondries, enzymes.",
        trainingUse: 'Footings faciles, sorties longues, volume de base',
    },
    z3: {
        num: 3,
        color: '#f97316',
        label: 'Tempo',
        fullLabel: 'Seuil aérobie',
        pct: '80–87%',
        tip: 'Quelques mots seulement entre chaque respiration.',
        desc: "La zone tempo. Tu peux tenir cet effort 30–60 min. Repousse le seuil lactique et améliore l'efficacité à vitesse soutenue. Exigeant mais très productif.",
        trainingUse: 'Tempos, progressions, fartlek',
    },
    z4: {
        num: 4,
        color: '#ef4444',
        label: 'Seuil',
        fullLabel: 'Seuil lactique',
        pct: '87–92%',
        tip: "Impossible de parler. Tu t'exprimes par fragments.",
        desc: "La zone de seuil — le point où l'acide lactique s'accumule plus vite que le corps ne peut l'éliminer. Développer cette zone repousse la limite de vitesse tenable sur longue durée.",
        trainingUse: 'Intervalles seuil, allure 10k/semi',
    },
    z5: {
        num: 5,
        color: '#ec4899',
        label: 'VO₂',
        fullLabel: 'VO₂max / Anaérobie',
        pct: '> 92%',
        tip: 'Maximum. Quelques secondes à quelques minutes.',
        desc: "La zone rouge. Améliore la capacité aérobie maximale (VO₂max), la puissance et la vitesse. Ne peut être tenu que sur de courtes répétitions. Très stressant pour l'organisme — à doser.",
        trainingUse: 'Intervalles courts (200–800 m), côtes, strides',
    },
} as const;

export type ZoneKey = keyof typeof ZONE_CONFIG;

// Ordered list for iteration (used in TrainingZones page)
export type ZoneEntry = {
    key: ZoneKey;
    num: number;
    color: string;
    label: string;
    fullLabel: string;
    pct: string;
    tip: string;
    desc: string;
    trainingUse: string;
};

export const ZONE_LIST: ZoneEntry[] = [
    { key: 'z1', ...ZONE_CONFIG.z1 },
    { key: 'z2', ...ZONE_CONFIG.z2 },
    { key: 'z3', ...ZONE_CONFIG.z3 },
    { key: 'z4', ...ZONE_CONFIG.z4 },
    { key: 'z5', ...ZONE_CONFIG.z5 },
];

// Resolve a zone key to its color, with fallback
export function zoneColor(key: string | undefined): string {
    if (!key || !(key in ZONE_CONFIG)) return '#64748b';
    return ZONE_CONFIG[key as ZoneKey].color;
}

// ─── Workout type colors ──────────────────────────────────────────────────────

export const WORKOUT_COLORS: Record<string, string> = {
    easy_run:             '#22c55e',
    long_run:             '#5ab2ff',
    recovery_run:         '#64748b',
    tempo:                '#f97316',  // z3
    threshold_intervals:  '#ef4444',  // z4
    vo2max_intervals:     '#ec4899',  // z5
    hill_repeats:         '#ef4444',  // z4
    fartlek:              '#f97316',  // z3
    progression_run:      '#22d3ee',
    race_pace:            '#f97316',  // z3
    strides:              '#ec4899',  // z5
    aet_test:             '#22d3ee',  // test seuil aérobie
};

export const WORKOUT_LABELS: Record<string, string> = {
    easy_run:             'Footing facile',
    long_run:             'Sortie longue',
    recovery_run:         'Récupération',
    tempo:                'Tempo',
    threshold_intervals:  'Intervalles seuil',
    vo2max_intervals:     'VO₂max',
    hill_repeats:         'Côtes',
    fartlek:              'Fartlek',
    progression_run:      'Progression',
    race_pace:            'Allure course',
    strides:              'Accélérations',
    aet_test:             'Test AeT',
};

export const WORKOUT_SHORT: Record<string, string> = {
    easy_run:             'Facile',
    long_run:             'Long',
    recovery_run:         'Récup',
    tempo:                'Tempo',
    threshold_intervals:  'Seuil',
    vo2max_intervals:     'VO₂',
    hill_repeats:         'Côtes',
    fartlek:              'Fartlek',
    progression_run:      'Prog.',
    race_pace:            'Course',
    strides:              'Stride',
    aet_test:             'AeT',
};

// ─── Pace zones (TrainingZones page) ─────────────────────────────────────────

export const PACE_ZONES = [
    { key: 'easyPace',       label: 'Course facile',   color: '#22c55e',          zone: 'Z1–Z2', desc: 'Footings quotidiens et longues sorties' },
    { key: 'longRunPace',    label: 'Sortie longue',   color: '#5ab2ff',          zone: 'Z2',    desc: 'Ta sortie longue hebdomadaire' },
    { key: 'tempoPace',      label: 'Tempo / Seuil',   color: ZONE_CONFIG.z3.color, zone: 'Z3',  desc: 'Séances tempo 20–40 min' },
    { key: 'intervalPace',   label: 'Intervalles',     color: ZONE_CONFIG.z4.color, zone: 'Z4',  desc: 'Répétitions seuil lactique' },
    { key: 'repetitionPace', label: 'Répétitions',     color: ZONE_CONFIG.z5.color, zone: 'Z5',  desc: 'Courts efforts à pleine vitesse' },
    { key: 'marathonPace',   label: 'Allure marathon', color: '#fbbf24',          zone: 'Z3',    desc: 'Allure objectif marathon' },
] as const;
