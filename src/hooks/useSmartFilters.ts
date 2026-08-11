'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export interface SmartFilterField {
  key: string
  type: 'search' | 'select' | 'pills' | 'date' | 'month'
  label?: string
  placeholder?: string
  options?: { value: string; label: string }[]
  defaultValue?: string
  debounce?: boolean
  /** Ne pas inclure dans l'URL (ex. champs internes) */
  hiddenFromUrl?: boolean
}

export interface SmartFilterPreset {
  id: string
  label: string
  values: Record<string, string>
}

function readFromUrl(
  fields: SmartFilterField[],
  searchParams: URLSearchParams
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const f of fields) {
    out[f.key] = searchParams.get(f.key) ?? f.defaultValue ?? ''
  }
  // Alias rétrocompatibles (liens depuis pages classe, etc.)
  if (fields.some(f => f.key === 'classe') && !out.classe) {
    const alias = searchParams.get('classe_id')
    if (alias) out.classe = alias
  }
  if (fields.some(f => f.key === 'q') && !out.q) {
    const search = searchParams.get('search')
    if (search) out.q = search
  }
  return out
}

function shallowEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of keys) {
    if ((a[k] ?? '') !== (b[k] ?? '')) return false
  }
  return true
}

function buildUrlParams(
  fields: SmartFilterField[],
  values: Record<string, string>
): URLSearchParams {
  const params = new URLSearchParams()
  for (const f of fields) {
    if (f.hiddenFromUrl) continue
    const v = values[f.key]
    const def = f.defaultValue ?? ''
    if (v && v !== def && v !== 'tous') params.set(f.key, v)
  }
  return params
}

export function useSmartFilters(
  fields: SmartFilterField[],
  options?: { debounceMs?: number; syncUrl?: boolean }
) {
  const debounceMs = options?.debounceMs ?? 300
  const syncUrl = options?.syncUrl !== false
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const fieldsRef = useRef(fields)
  fieldsRef.current = fields

  const defaults = useMemo(() => {
    const out: Record<string, string> = {}
    for (const f of fields) out[f.key] = f.defaultValue ?? ''
    return out
  }, [fields])

  const [values, setValues] = useState<Record<string, string>>(() =>
    readFromUrl(fieldsRef.current, searchParams)
  )
  const [debouncedValues, setDebouncedValues] = useState(values)
  const skipUrlSync = useRef(true)
  const isInternalUrlUpdate = useRef(false)

  // Réagir aux changements d'URL (navigation arrière/avant, liens profonds)
  useEffect(() => {
    if (isInternalUrlUpdate.current) {
      isInternalUrlUpdate.current = false
      return
    }
    const fromUrl = readFromUrl(fieldsRef.current, searchParams)
    setValues(prev => (shallowEqual(prev, fromUrl) ? prev : fromUrl))
    setDebouncedValues(prev => (shallowEqual(prev, fromUrl) ? prev : fromUrl))
    skipUrlSync.current = true
  }, [searchParams])

  // Debounce des champs search
  useEffect(() => {
    const debouncedKeys = new Set(
      fieldsRef.current
        .filter(f => f.debounce || f.type === 'search')
        .map(f => f.key)
    )

    const applyUpdate = (patch: Record<string, string>) => {
      setDebouncedValues(prev => {
        const next = { ...prev, ...patch }
        return shallowEqual(prev, next) ? prev : next
      })
    }

    const immediate: Record<string, string> = {}
    const delayed: Record<string, string> = {}
    for (const [k, v] of Object.entries(values)) {
      if (debouncedKeys.has(k)) delayed[k] = v
      else immediate[k] = v
    }

    if (Object.keys(immediate).length > 0) applyUpdate(immediate)

    const timer = setTimeout(() => {
      if (Object.keys(delayed).length > 0) applyUpdate(delayed)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [values, debounceMs])

  // Sync URL sans boucle
  useEffect(() => {
    if (!syncUrl) return
    if (skipUrlSync.current) {
      skipUrlSync.current = false
      return
    }

    const params = buildUrlParams(fieldsRef.current, values)
    const nextQs = params.toString()
    const currentQs = searchParams.toString()
    if (nextQs === currentQs) return

    const next = nextQs ? `${pathname}?${nextQs}` : pathname
    isInternalUrlUpdate.current = true
    router.replace(next, { scroll: false })
  }, [values, pathname, router, syncUrl, searchParams])

  const setFilter = useCallback((key: string, value: string) => {
    setValues(prev => {
      if ((prev[key] ?? '') === value) return prev
      return { ...prev, [key]: value }
    })
  }, [])

  const setFilters = useCallback((patch: Record<string, string>) => {
    setValues(prev => ({ ...prev, ...patch }))
  }, [])

  const applyPreset = useCallback((preset: SmartFilterPreset) => {
    setValues({ ...defaults, ...preset.values })
  }, [defaults])

  const reset = useCallback(() => {
    setValues({ ...defaults })
  }, [defaults])

  const activeFilters = useMemo(() => {
    return fieldsRef.current
      .filter(f => {
        const v = values[f.key]
        const def = f.defaultValue ?? ''
        return v && v !== def && v !== 'tous'
      })
      .map(f => {
        const v = values[f.key]
        const opt = f.options?.find(o => o.value === v)
        return {
          key: f.key,
          label: f.label || f.key,
          value: v,
          display: opt?.label ?? v,
        }
      })
  }, [values])

  const hasActiveFilters = activeFilters.length > 0

  const buildParams = useCallback(
    (extra?: Record<string, string>) => {
      const params = buildUrlParams(fieldsRef.current, debouncedValues)
      if (extra) {
        for (const [k, v] of Object.entries(extra)) {
          if (v) params.set(k, v)
        }
      }
      return params
    },
    [debouncedValues]
  )

  return {
    values,
    debouncedValues,
    setFilter,
    setFilters,
    applyPreset,
    reset,
    activeFilters,
    hasActiveFilters,
    buildParams,
  }
}
