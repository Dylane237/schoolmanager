import { getJwtSecret } from './secrets'

// Source unique pour le secret JWT utilisé par toutes les routes API qui
// vérifient un token de session (sm_token). Toute route d'authentification
// doit importer JWT_SECRET d'ici — ne JAMAIS le redéclarer localement avec
// `process.env.SM_JWT_SECRET || 'valeur en dur'`.
//
// C'est exactement cette redéclaration locale qui a causé le bug sur
// /api/paiements/recu : la route avait sa propre copie avec un secret par
// défaut codé en dur, qui ne correspondait plus au vrai secret généré par
// getJwtSecret() une fois SM_JWT_SECRET actif — d'où l'erreur "Non autorisé"
// alors que l'utilisateur était bien connecté.
//
// ⚠️ Je suppose ici que getJwtSecret() dans ./secrets renvoie une string
// (le secret en clair) de façon synchrone et idempotente — cohérent avec
// son usage dans instrumentation.ts (`process.env.SM_JWT_SECRET = getJwtSecret()`).
// Si sa signature réelle diffère (async, retourne un Buffer, etc.), ajustez
// la ligne ci-dessous en conséquence.
export const JWT_SECRET = new TextEncoder().encode(getJwtSecret())