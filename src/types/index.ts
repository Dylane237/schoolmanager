export type Section = 'francophone' | 'anglophone' | 'maternelle'
export type Role = 'super_admin' | 'admin' | 'secretaire' | 'enseignant' | 'comptable' | 'parent'
export type StatutEleve = 'actif' | 'transfere' | 'archive'
export type StatutAnnuel = 'admis' | 'redoublant' | 'en_attente'
export type ModePaiement = 'especes' | 'orange_money' | 'mtn_momo' | 'virement'
export type TypePersonnel = 'enseignant' | 'administratif' | 'assistant_maternelle' | 'securite' | 'entretien' | 'chauffeur'
export type Contrat = 'cdi' | 'cdd' | 'vacataire' | 'benevole'
export type StatutCompetence = 'acquis' | 'en_cours' | 'non_acquis'

export interface Ecole {
  id: string
  nom: string
  slug: string
  logo_url?: string
  telephone?: string
  adresse?: string
  email?: string
  directeur_nom?: string
  sections: Section[]
  created_at: string
}

export interface Eleve {
  id: string
  ecole_id: string
  classe_id: string
  numero_matricule?: string
  nom: string
  prenom: string
  date_naissance?: string
  lieu_naissance?: string
  sexe?: 'M' | 'F'
  photo_url?: string
  section?: Section
  statut: StatutEleve
  statut_annuel?: StatutAnnuel
  annee_entree?: string
  created_at: string
}

export interface Classe {
  id: string
  ecole_id: string
  nom: string
  section?: Section
  niveau?: string
  annee_scolaire: string
  enseignant_id?: string
  personnel_id?: string
  capacite_max: number
  created_at: string
}

export interface Paiement {
  id: string
  ecole_id: string
  eleve_id: string
  frais_annexe_id?: string
  tranche_numero?: number
  montant: number
  date_paiement: string
  mode_paiement?: ModePaiement
  recu_numero?: string
  enregistre_par?: string
  created_at: string
}

export interface Licence {
  id: string
  ecole_id: string
  type: 'starter' | 'standard' | 'premium'
  date_debut: string
  date_fin: string
  is_active: boolean
  cle_licence: string
}