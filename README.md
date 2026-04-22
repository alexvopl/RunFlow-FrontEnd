# RunFlow Frontend

Frontend React + TypeScript + Vite pour RunFlow.

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
