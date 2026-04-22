# RunFlow Frontend

Frontend React + TypeScript + Vite pour RunFlow.

## Full Stack Dev

Une seule commande lance le backend local et le frontend avec hot reload :

```bash
npm run dev:stack
```

Le script :

- cherche le backend dans `../RunFlow_pro_backend`
- charge en priorité `apps/api/.env.local`, sinon `.env.local`, sinon `_env.local`
- installe automatiquement les dépendances manquantes du frontend et du backend
- injecte `FRONTEND_URL`, `ALLOWED_ORIGINS`, `API_URL` et `STRAVA_REDIRECT_URI` côté backend
- injecte `VITE_API_URL` côté frontend
- garde l'URL téléphone visible en haut du terminal
- préfixe les logs avec `frontend` et `backend` sans effacer l'écran

Commande de vérification sans lancer les serveurs :

```bash
npm run dev:stack:check
```

Variables optionnelles :

- `RUNFLOW_BACKEND_DIR` pour changer le chemin du backend
- `RUNFLOW_BACKEND_ENV_FILE` pour forcer un fichier d'env backend
- `RUNFLOW_HOST_IP` pour forcer l'IP locale affichée et utilisée
- `BACKEND_PORT` et `FRONTEND_PORT` pour changer les ports
- `RUNFLOW_SKIP_INSTALL=1` pour désactiver l'installation automatique des dépendances

## Prerequisites

- Node.js 20+
- npm 10+

## Environment

Ce projet ne démarre pas sans `VITE_API_URL`.

1. Copier `.env.example` vers `.env.local`
2. Renseigner l'URL de l'API backend

Exemple :

```bash
cp .env.example .env.local
```

## Scripts

- `npm run dev` lance Vite en local
- `npm run lint` lance ESLint
- `npm run build` lance TypeScript puis le build Vite
- `npm run audit` exécute un audit sécurité npm de niveau `high`

## Security Notes

- Aucun fallback réseau n'est défini en dur : `VITE_API_URL` est obligatoire.
- Les refresh tokens ne sont plus persistés dans le stockage navigateur.
- Les dépendances doivent rester à jour ; utiliser `npm run audit` avant merge.
