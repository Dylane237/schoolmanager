import 'server-only'
import bcrypt from 'bcryptjs'
import { getSupabaseAdmin, isSupabaseConfigured } from './supabase-admin'
import { upsertEcoleCloud } from './licence-cloud-sync'
import type { AuthUser } from './auth'

export type CloudAuthError =
  | 'not_configured'
  | 'email_exists'
  | 'email_not_found'
  | 'invalid_password'
  | 'licence_expired'
  | 'invalid_recovery'
  | 'no_recovery'
  | 'server_error'

export interface CloudLoginResult {
  user: AuthUser & { auth_source: 'cloud'; account_id: string; prenom?: string | null }
  password_hash: string
  ecole_nom: string
  directeur_nom?: string | null
  telephone?: string | null
  sections?: string[]
  cle_licence?: string | null
  licence_plan?: string | null
  licence_date_fin?: string | null
}

export interface CloudRegisterInput {
  email: string
  passwordHash: string
  recoveryHash: string
  ecole_slug: string
  ecole_nom: string
  directeur_nom: string
  telephone?: string | null
  sections?: string[]
}

function supabase() {
  return getSupabaseAdmin()!
}

export function isCloudAuthAvailable(): boolean {
  return isSupabaseConfigured()
}

export async function cloudSlugExists(slug: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  const { data } = await supabase()
    .from('ecoles')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle()
  return !!data
}

export async function uniqueCloudSlug(base: string): Promise<string> {
  const { slugify } = await import('./utils/slug')
  const slug = slugify(base) || 'ecole'
  if (!(await cloudSlugExists(slug))) return slug
  for (let i = 2; i < 1000; i++) {
    const candidate = `${slug}-${i}`
    if (!(await cloudSlugExists(candidate))) return candidate
  }
  return `${slug}-${Date.now()}`
}

export async function activateLicenceOnCloud(params: {
  cle: string
  ecole_slug: string
  ecole_nom: string
  parrain_code?: string | null
  directeur_nom?: string | null
  telephone?: string | null
  machine_fingerprint?: string | null
}): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase non configuré' }

  const cle = params.cle.trim().toUpperCase()
  const sb = supabase()

  const { data: licence, error } = await sb
    .from('licences')
    .select('id, ecole_id, is_active, date_fin')
    .eq('cle_licence', cle)
    .single()

  if (error || !licence) return { ok: false, error: 'Clé invalide' }
  if (!licence.is_active) return { ok: false, error: 'Licence révoquée' }
  if (licence.ecole_id) return { ok: false, error: 'Clé déjà utilisée' }

  const today = new Date().toISOString().split('T')[0]
  if (licence.date_fin < today) return { ok: false, error: 'Licence expirée' }

  await sb.from('licences').update({
    ecole_id: params.ecole_slug,
    ecole_slug: params.ecole_slug,
    ecole_nom: params.ecole_nom,
    parrain_code: params.parrain_code?.startsWith('SM-') ? params.parrain_code : null,
    machine_fingerprint: params.machine_fingerprint ?? null,
    activated_at: new Date().toISOString(),
  }).eq('id', licence.id)

  await upsertEcoleCloud({
    slug: params.ecole_slug,
    nom: params.ecole_nom,
    directeur_nom: params.directeur_nom,
    telephone: params.telephone,
  })

  return { ok: true }
}

export async function verifyLicenceKey(cle: string): Promise<{ valid: boolean; plan?: string; date_fin?: string; error?: string }> {
  if (!isSupabaseConfigured()) return { valid: false, error: 'Supabase non configuré' }

  const key = cle.trim().toUpperCase()
  const { data: licence } = await supabase()
    .from('licences')
    .select('type, date_fin, is_active, ecole_id')
    .eq('cle_licence', key)
    .maybeSingle()

  if (!licence) return { valid: false, error: 'Clé invalide' }
  if (!licence.is_active) return { valid: false, error: 'Licence révoquée' }
  if (licence.ecole_id) return { valid: false, error: 'Clé déjà utilisée' }

  const today = new Date().toISOString().split('T')[0]
  if (licence.date_fin < today) return { valid: false, error: 'Licence expirée' }

  return { valid: true, plan: licence.type, date_fin: licence.date_fin }
}

export async function cloudEmailExists(email: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  const { data } = await supabase()
    .from('cloud_accounts')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()
  return !!data
}

export async function createCloudAccount(input: CloudRegisterInput): Promise<{ ok: true; account_id: string; user_id: string } | { ok: false; error: CloudAuthError }> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'not_configured' }

  const email = input.email.trim().toLowerCase()

  if (await cloudEmailExists(email)) {
    return { ok: false, error: 'email_exists' }
  }

  await upsertEcoleCloud({
    slug: input.ecole_slug,
    nom: input.ecole_nom,
    directeur_nom: input.directeur_nom,
    telephone: input.telephone,
  })

  const { data: account, error: accErr } = await supabase()
    .from('cloud_accounts')
    .insert({
      email,
      password_hash: input.passwordHash,
      recovery_code_hash: input.recoveryHash,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (accErr || !account) {
    console.error('[cloud-auth] create account', accErr)
    return { ok: false, error: 'server_error' }
  }

  const { data: cloudUser, error: userErr } = await supabase()
    .from('cloud_users')
    .insert({
      account_id: account.id,
      ecole_slug: input.ecole_slug,
      role: 'admin',
      nom: input.directeur_nom,
      is_primary_admin: true,
      telephone: input.telephone ?? null,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (userErr || !cloudUser) {
    console.error('[cloud-auth] create user', userErr)
    await supabase().from('cloud_accounts').delete().eq('id', account.id)
    return { ok: false, error: 'server_error' }
  }

  return { ok: true, account_id: account.id, user_id: cloudUser.id }
}

export async function linkCloudUserLocalId(accountId: string, ecoleSlug: string, localUserId: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  await supabase()
    .from('cloud_users')
    .update({ local_user_id: localUserId, updated_at: new Date().toISOString() })
    .eq('account_id', accountId)
    .eq('ecole_slug', ecoleSlug)
}

export async function loginCloudUser(
  email: string,
  password: string,
): Promise<{ ok: true; result: CloudLoginResult } | { ok: false; error: CloudAuthError }> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'not_configured' }

  const normalized = email.trim().toLowerCase()

  const { data: account, error } = await supabase()
    .from('cloud_accounts')
    .select('id, email, password_hash')
    .eq('email', normalized)
    .maybeSingle()

  if (error || !account) return { ok: false, error: 'email_not_found' }

  const valid = await bcrypt.compare(password, account.password_hash)
  if (!valid) return { ok: false, error: 'invalid_password' }

  const { data: cloudUser } = await supabase()
    .from('cloud_users')
    .select('id, ecole_slug, role, nom, prenom, telephone')
    .eq('account_id', account.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!cloudUser) return { ok: false, error: 'email_not_found' }

  const { data: ecole } = await supabase()
    .from('ecoles')
    .select('nom, directeur_nom, telephone')
    .eq('slug', cloudUser.ecole_slug)
    .maybeSingle()

  const { data: licence } = await supabase()
    .from('licences')
    .select('cle_licence, type, date_fin, is_active')
    .eq('ecole_slug', cloudUser.ecole_slug)
    .eq('is_active', true)
    .order('date_fin', { ascending: false })
    .limit(1)
    .maybeSingle()

  const today = new Date().toISOString().split('T')[0]
  if (!licence?.is_active || (licence.date_fin && licence.date_fin < today)) {
    return { ok: false, error: 'licence_expired' }
  }

  await supabase()
    .from('cloud_accounts')
    .update({ last_login_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', account.id)

  return {
    ok: true,
    result: {
      user: {
        id: cloudUser.id,
        account_id: account.id,
        role: cloudUser.role,
        ecole_id: cloudUser.ecole_slug,
        ecole_slug: cloudUser.ecole_slug,
        nom: cloudUser.nom,
        auth_source: 'cloud',
        prenom: cloudUser.prenom,
      },
      password_hash: account.password_hash,
      ecole_nom: ecole?.nom ?? cloudUser.ecole_slug,
      directeur_nom: ecole?.directeur_nom,
      telephone: ecole?.telephone ?? cloudUser.telephone,
      cle_licence: licence.cle_licence ?? null,
      licence_plan: licence.type ?? null,
      licence_date_fin: licence.date_fin ?? null,
    },
  }
}

export async function resetCloudPassword(
  email: string,
  recoveryCode: string,
  newPasswordHash: string,
  verifyRecovery: (code: string, hash: string | null) => Promise<boolean>,
  normalizeCode: (code: string) => string,
): Promise<{ ok: true } | { ok: false; error: CloudAuthError }> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'not_configured' }

  const normalized = email.trim().toLowerCase()

  const { data: account } = await supabase()
    .from('cloud_accounts')
    .select('id, recovery_code_hash')
    .eq('email', normalized)
    .maybeSingle()

  if (!account) return { ok: false, error: 'email_not_found' }
  if (!account.recovery_code_hash) return { ok: false, error: 'no_recovery' }

  const valid = await verifyRecovery(normalizeCode(recoveryCode), account.recovery_code_hash)
  if (!valid) return { ok: false, error: 'invalid_recovery' }

  const { error } = await supabase()
    .from('cloud_accounts')
    .update({
      password_hash: newPasswordHash,
      updated_at: new Date().toISOString(),
    })
    .eq('id', account.id)

  if (error) return { ok: false, error: 'server_error' }
  return { ok: true }
}

export async function fetchCloudLicenceForSlug(ecoleSlug: string): Promise<{ type: string; date_fin: string } | null> {
  if (!isSupabaseConfigured()) return null

  const { data } = await supabase()
    .from('licences')
    .select('type, date_fin, is_active')
    .eq('ecole_slug', ecoleSlug)
    .eq('is_active', true)
    .order('date_fin', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data?.is_active) return null
  const today = new Date().toISOString().split('T')[0]
  const dateFin = String(data.date_fin).slice(0, 10)
  if (dateFin < today) return null
  return { type: data.type, date_fin: dateFin }
}

export async function fetchCloudEcole(slug: string): Promise<{ id: string; nom: string; logo_url: string | null } | null> {
  if (!isSupabaseConfigured()) return null

  const { data } = await supabase()
    .from('ecoles')
    .select('slug, nom')
    .eq('slug', slug)
    .maybeSingle()

  if (!data) return null
  return { id: data.slug, nom: data.nom, logo_url: null }
}

export async function fetchCloudAnneeScolaire(ecoleSlug: string): Promise<string> {
  if (!isSupabaseConfigured()) return new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)

  const { data } = await supabase()
    .from('cloud_sync_meta')
    .select('annee_scolaire')
    .eq('ecole_slug', ecoleSlug)
    .maybeSingle()

  return data?.annee_scolaire ?? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
}

export function cloudAuthErrorMessage(error: CloudAuthError): string {
  switch (error) {
    case 'email_exists': return 'Cet email est déjà enregistré'
    case 'email_not_found': return 'Email introuvable'
    case 'invalid_password': return 'Mot de passe incorrect'
    case 'licence_expired': return 'Licence expirée'
    case 'invalid_recovery': return 'Code de secours incorrect'
    case 'no_recovery': return 'Aucun code de secours enregistré'
    case 'not_configured': return 'Authentification cloud indisponible'
    default: return 'Erreur serveur'
  }
}
