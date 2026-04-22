# RunFlow Frontend

Frontend React + TypeScript + Vite pour RunFlow.

## Full Stack Dev

Une seule commande lance le backend local et le frontend avec hot reload :

```bash
npm run dev:stack
```

Le script :

- cherche le backend dans `../RunFlow_pro_backend`
- charge `apps/api/.env.local` côté backend
- relit `.env.local` côté frontend pour respecter `VITE_APP_URL`, `VITE_AUTH_REDIRECT_URL`, `VITE_PASSWORD_RESET_URL` et `VITE_DEV_PORT`
- installe automatiquement les dépendances manquantes du frontend et du backend
- injecte `FRONTEND_URL`, `ALLOWED_ORIGINS`, `AUTH_REDIRECT_URL_DEFAULT`, `PASSWORD_RESET_URL_DEFAULT` et `STRAVA_REDIRECT_URI` côté backend
- injecte `VITE_API_URL`, `VITE_APP_URL`, `VITE_AUTH_REDIRECT_URL` et `VITE_PASSWORD_RESET_URL` côté frontend
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
2. Renseigner les URLs locales ou de staging

Variables attendues :

- `VITE_API_URL` : URL du backend (`http://localhost:3000/api` en dev)
- `VITE_APP_URL` : URL publique du frontend pour les liens auth
- `VITE_AUTH_REDIRECT_URL` : callback email confirmation / magic link
- `VITE_PASSWORD_RESET_URL` : écran de reset mot de passe
- `VITE_DEV_PORT` : port local du serveur Vite si vous ne voulez pas `5173`

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

## Shared Environments

- Chaque développeur garde son propre `.env.local`, jamais versionné.
- Le projet Supabase `dev` reste partagé ; ne changez pas le `Site URL` selon la machine.
- Les liens email doivent venir des variables `VITE_AUTH_REDIRECT_URL` et `VITE_PASSWORD_RESET_URL`, pas d'un `localhost` hardcodé.
- En production, définir les mêmes variables avec l'URL publique finale et ajouter ces URLs dans Supabase Auth > Redirect URLs.
- Si vous voulez un autre port local, changez `VITE_APP_URL`, `VITE_AUTH_REDIRECT_URL`, `VITE_PASSWORD_RESET_URL` et `VITE_DEV_PORT` ensemble.
