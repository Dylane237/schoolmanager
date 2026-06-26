# SchoolManager

Plateforme de gestion scolaire pour les établissements au Cameroun (sections francophone, anglophone et maternelle).

## Fonctionnalités

- Gestion des élèves, classes, personnel et présences
- Paiements par tranches avec historique et soldes restants
- Notes, bulletins et suivi maternelle (compétences)
- Annonces et paramètres d'école
- Console éditeur (super-admin) pour licences et écoles clientes
- Application desktop via Electron

## Prérequis

- Node.js 20+
- npm

## Installation

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Données locales

En développement, les données sont stockées dans `.schoolmanager-data/` :

- `schoolmanager.db` — base SQLite
- `.jwt-secret` — secret JWT local
- `uploads/` — photos élèves
- `backups/` — sauvegardes automatiques

Sous Electron, le dossier est `userData` de l'application.

## Comptes par défaut

Au premier lancement, un super-admin est créé :

- Email : `admin@schoolmanager.cm`
- Mot de passe : valeur de `SM_SUPER_ADMIN_PASSWORD` ou `Admin2026!` par défaut

**Changez ce mot de passe en production.**

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| `SM_JWT_SECRET` | Secret JWT (auto-généré si absent) |
| `SM_SUPER_ADMIN_PASSWORD` | Mot de passe initial du super-admin |
| `SM_USER_DATA` | Chemin des données (Electron) |
| `SM_COOKIE_SECURE` | Mettre à `false` pour désactiver le cookie secure en HTTPS |

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur Next.js de développement |
| `npm run build` | Build production (standalone) |
| `npm run start` | Serveur production |
| `npm run electron:dev` | Next.js + Electron en dev |
| `npm run electron:prepare` | Copie static/public dans standalone |
| `npm run electron:build` | Build installateur Windows (.exe) |

## Compilation Electron (installateur offline)

L'application fonctionne **100 % offline** : base SQLite locale, pas de cloud.

### Prérequis

- Node.js 20+
- Windows (pour l'installateur NSIS)

### Étapes

```bash
# 1. Installer les dépendances
npm install

# 2. Builder Next.js + préparer standalone + créer l'installateur
npm run electron:build
```

L'installateur se trouve dans `dist/SchoolManager Setup x.x.x.exe`.

### Pourquoi l'écran blanc ?

Next.js `standalone` exige que `.next/static` et `public` soient copiés **dans** `.next/standalone/`. Sans ça, le serveur démarre mais les assets JS/CSS manquent → écran blanc. Le script `scripts/prepare-electron.js` le fait automatiquement avant `electron-builder`.

### Données en production

- Base de données : `%APPDATA%/SchoolManager/schoolmanager.db`
- Photos, backups, secret JWT : même dossier `userData` Electron
- Aucune connexion internet requise après installation

### Licence par ordinateur

À la **première inscription** ou **première connexion**, la licence est liée à l'empreinte machine (hostname + utilisateur OS). Elle ne fonctionnera pas sur un autre PC. Contactez le support pour un transfert.

### Dev Electron (sans build)

```bash
npm run electron:dev
```

Lance `next dev` + Electron (fenêtre web sur localhost:3000).

> **Important :** `better-sqlite3` doit être compilé pour **Node.js** (pas Electron) en dev.
> Le `postinstall` fait `npm rebuild better-sqlite3`. Si vous voyez `NODE_MODULE_VERSION` mismatch,
> exécutez : `npm run rebuild:native`

## Licences école

Plans disponibles : **Starter** (150 élèves), **Standard** (400), **Premium** (illimité).

1. Le super-admin génère une clé pool dans `/super-admin/licences`
2. L'école s'inscrit sur `/register` avec cette clé
3. Le renouvellement se fait via une clé liée à l'école

## Rôles utilisateurs

| Rôle | Accès |
|------|-------|
| `admin` | Accès complet à l'école |
| `comptable` | Élèves (lecture/écriture), paiements |
| `secretaire` | Élèves, classes, présences, annonces |
| `enseignant` | Notes, bulletins, présences, maternelle |

## Stack

Next.js 16 · React 19 · SQLite (better-sqlite3) · JWT · Tailwind CSS 4 · Electron
