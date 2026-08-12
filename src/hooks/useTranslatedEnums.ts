'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import type { SmartFilterPreset } from '@/hooks/useSmartFilters'

export function useTranslatedEnums() {
  const t = useTranslations('enums')

  return {
    paymentStatus: (value: string) => t(`paymentStatus.${value}` as 'paymentStatus.paye'),
    sex: (value: string) => t(`sex.${value}` as 'sex.M'),
    section: (value: string) => t(`section.${value}` as 'section.francophone'),
    presenceStatus: (value: string) => t(`presenceStatus.${value}` as 'presenceStatus.present'),
    personnelType: (value: string) => t(`personnelType.${value}` as 'personnelType.enseignant'),
    contractType: (value: string) => t(`contractType.${value}` as 'contractType.cdi'),
    announcementTarget: (value: string) => t(`announcementTarget.${value}` as 'announcementTarget.tous'),
    announcementPriority: (value: string) => t(`announcementPriority.${value}` as 'announcementPriority.normale'),
    maternelleStatus: (value: string) => t(`maternelleStatus.${value}` as 'maternelleStatus.acquis'),
    paymentMethod: (value: string) => t(`paymentMethod.${value}` as 'paymentMethod.especes'),
    annualStatus: (value: string) => t(`annualStatus.${value}` as 'annualStatus.admis'),
    parentLink: (value: string) => t(`parentLink.${value}` as 'parentLink.père'),
    studentStatus: (value: string) => t(`studentStatus.${value}` as 'studentStatus.actif'),
  }
}

export function useSectionOptions() {
  const t = useTranslations('filters')
  const te = useTranslatedEnums()
  return useMemo(() => [
    { value: '', label: t('section.all') },
    { value: 'francophone', label: te.section('francophone') },
    { value: 'anglophone', label: te.section('anglophone') },
    { value: 'maternelle', label: te.section('maternelle') },
  ], [t, te])
}

export function useStudentStatutOptions() {
  const t = useTranslations('filters')
  const te = useTranslatedEnums()
  return useMemo(() => [
    { value: 'tous', label: t('status.all') },
    { value: 'paye', label: te.paymentStatus('paye') },
    { value: 'partiel', label: te.paymentStatus('partiel') },
    { value: 'impaye', label: te.paymentStatus('impaye') },
  ], [t, te])
}

export function useSituationStatutOptions() {
  const t = useTranslations('filters')
  const te = useTranslatedEnums()
  return useMemo(() => [
    { value: 'tous', label: t('status.allStudents') },
    { value: 'impaye', label: t('students.unpaid') },
    { value: 'partiel', label: t('students.partial') },
    { value: 'paye', label: t('students.paid') },
    { value: 'non_configure', label: te.paymentStatus('non_configure') },
  ], [t, te])
}

export function usePaymentMethodOptions() {
  const t = useTranslations('filters')
  const te = useTranslatedEnums()
  return useMemo(() => [
    { value: '', label: t('mode.all') },
    { value: 'especes', label: te.paymentMethod('especes') },
    { value: 'orange_money', label: te.paymentMethod('orange_money') },
    { value: 'mtn_momo', label: te.paymentMethod('mtn_momo') },
    { value: 'virement', label: te.paymentMethod('virement') },
  ], [t, te])
}

export function useStudentFilters(): SmartFilterPreset[] {
  const t = useTranslations('filters')
  return useMemo((): SmartFilterPreset[] => [
    { id: 'impayes', label: t('students.unpaid'), values: { statut: 'impaye' } as Record<string, string> },
    { id: 'partiels', label: t('students.partial'), values: { statut: 'partiel' } as Record<string, string> },
    { id: 'soldes', label: t('students.paid'), values: { statut: 'paye' } as Record<string, string> },
    { id: 'sans_classe', label: t('students.noClass'), values: { classe: '__none__' } as Record<string, string> },
  ], [t])
}

export function usePaymentFilters() {
  const t = useTranslations('filters')
  return useMemo(() => [
    { id: 'impayes', label: t('payments.unpaid'), values: { statut: 'impaye' } },
    { id: 'partiels', label: t('payments.partial'), values: { statut: 'partiel' } },
    { id: 'soldes', label: t('payments.paid'), values: { statut: 'paye' } },
    { id: 'retard', label: t('payments.notConfigured'), values: { statut: 'non_configure' } },
  ], [t])
}

export function usePaymentStatutOptions() {
  const t = useTranslations('filters')
  return useMemo(() => [
    { value: 'paye', label: t('status.paid') },
    { value: 'partiel', label: t('status.partial') },
    { value: 'impaye', label: t('status.unpaid') },
  ], [t])
}

export function usePresenceDatePresets() {
  const t = useTranslations('filters')
  return useMemo(() => [
    { label: t('date.today'), offset: 0 },
    { label: t('date.yesterday'), offset: -1 },
    { label: t('date.dayBefore'), offset: -2 },
  ], [t])
}
