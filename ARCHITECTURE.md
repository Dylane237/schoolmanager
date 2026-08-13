# Architecture SchoolManager

## Modèle de déploiement

```
┌─────────────────┐     push/pull blob      ┌──────────────────┐
│  App bureau     │ ◄──────────────────────►│  Supabase        │
│  SQLite locale  │     + tables cloud_*    │  Storage + PG    │
│  (offline OK)   │                         └────────┬─────────┘
└─────────────────┘                                  │
                                                     │ hydrate
┌─────────────────┐     flush après save             ▼
│  App web        │ ◄───────────────────────  schoolmanager.db
│  SQLite mémoire │                         (snapshot par école)
│  (serverless)   │
└─────────────────┘
```

- **Bureau** : fichier SQLite dans `userData`, travail offline, sync au retour réseau.
- **Web** : base en mémoire par requête Vercel, rechargée depuis le blob cloud, flush après modification.
- **Cloud** : blob SQLite + miroir structuré (`cloud_eleves`, `cloud_tranches_config`, …) pour lecture rapide.

## Sync

| Opération | Comportement |
|-----------|--------------|
| Sauvegarde métier | `persistSchoolChanges` → flush blob + sync structurée |
| Comparaison manuelle | `/api/sync/compare` — diff sans écrasement |
| Fusion ligne à ligne | `/api/sync/merge` — mode additif par défaut |
| Conflit | Push bloqué ; résolution via page Données ou cloche de notifs |

## Auth & données

- JWT cookie httpOnly, rôles par module (`rbac.ts`).
- Comptes cloud (`cloud_accounts`) + base locale par école (slug).
- Licence liée à l'empreinte machine au premier login bureau.

## Stack

Next.js 16 · React 19 · better-sqlite3 · Supabase · Electron · Tailwind 4 · next-intl
