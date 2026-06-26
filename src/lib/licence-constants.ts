// Ce fichier est safe côté client : pas d'import server-only
export const LICENCE_PLANS = ['starter', 'standard', 'premium'] as const
export type LicencePlan = (typeof LICENCE_PLANS)[number]

export const PLAN_PRICES: Record<LicencePlan, number> = {
  starter: 150000,
  standard: 350000,
  premium: 650000,
}

export const PLAN_LABELS: Record<LicencePlan, string> = {
  starter: "Starter — jusqu'à 150 élèves",
  standard: "Standard — jusqu'à 400 élèves",
  premium: 'Premium — illimité',
}

export const PLAN_STUDENT_LIMITS: Record<LicencePlan, number | null> = {
  starter: 150,
  standard: 400,
  premium: null,
}
