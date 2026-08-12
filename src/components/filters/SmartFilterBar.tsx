'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Search, X, RotateCcw, ChevronDown, Check } from 'lucide-react'
import type { SmartFilterField, SmartFilterPreset } from '@/hooks/useSmartFilters'

interface SmartFilterBarProps {
  fields: SmartFilterField[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onReset: () => void
  activeFilters: { key: string; label: string; display: string }[]
  presets?: SmartFilterPreset[]
  onPreset?: (preset: SmartFilterPreset) => void
  resultCount?: number
  resultLabel?: string
  loading?: boolean
  extra?: React.ReactNode
  className?: string
}

function fieldTitle(field: SmartFilterField): string {
  if (field.label) return field.label
  return field.key.charAt(0).toUpperCase() + field.key.slice(1)
}

function isDefaultValue(field: SmartFilterField, value: string | undefined): boolean {
  const v = value ?? ''
  const def = field.defaultValue ?? ''
  return !v || v === def || v === 'tous'
}

function FilterDropdown({
  field,
  value,
  onChange,
}: {
  field: SmartFilterField
  value: string
  onChange: (key: string, value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const title = fieldTitle(field)
  const current = field.options?.find(o => o.value === (value || field.defaultValue || ''))
  const active = !isDefaultValue(field, value)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl border transition-colors whitespace-nowrap ${
          active
            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
        }`}
      >
        <span>{title}</span>
        {active && current && (
          <>
            <span className="text-emerald-400/80">·</span>
            <span className="font-semibold truncate max-w-[120px]">{current.label}</span>
          </>
        )}
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-40 min-w-[168px] max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg py-1">
          {field.options?.map(o => {
            const selected = (value || field.defaultValue || '') === o.value
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(field.key, o.value)
                  setOpen(false)
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors ${
                  selected ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {o.label}
                {selected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const selectClass =
  'border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 min-w-[148px] max-w-[220px]'

export default function SmartFilterBar({
  fields,
  values,
  onChange,
  onReset,
  activeFilters,
  presets,
  onPreset,
  extra,
  className = '',
}: SmartFilterBarProps) {
  const t = useTranslations('components.smartFilterBar')

  return (
    <div className={`space-y-3 ${className}`}>
      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {presets.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPreset?.(p)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div className="card p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {fields.map(field => {
            if (field.type === 'search') {
              return (
                <div
                  key={field.key}
                  className="flex items-center gap-2 flex-1 min-w-[200px] border border-slate-200 rounded-xl px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-emerald-400/30 focus-within:border-emerald-400"
                >
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="search"
                    placeholder={field.placeholder ?? t('search')}
                    value={values[field.key] ?? ''}
                    onChange={e => onChange(field.key, e.target.value)}
                    className="flex-1 text-sm focus:outline-none text-slate-700 placeholder-slate-400 bg-transparent min-w-0"
                  />
                  {values[field.key] && (
                    <button type="button" onClick={() => onChange(field.key, '')} className="text-slate-400 hover:text-slate-600 shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )
            }

            if (field.type === 'select') {
              return (
                <select
                  key={field.key}
                  value={values[field.key] ?? ''}
                  onChange={e => onChange(field.key, e.target.value)}
                  aria-label={fieldTitle(field)}
                  className={selectClass}
                >
                  {field.options?.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              )
            }

            if (field.type === 'pills') {
              return (
                <FilterDropdown
                  key={field.key}
                  field={field}
                  value={values[field.key] ?? ''}
                  onChange={onChange}
                />
              )
            }

            if (field.type === 'date' || field.type === 'month') {
              return (
                <input
                  key={field.key}
                  type={field.type === 'month' ? 'month' : 'date'}
                  value={values[field.key] ?? ''}
                  onChange={e => onChange(field.key, e.target.value)}
                  aria-label={fieldTitle(field)}
                  className={`${selectClass} w-auto`}
                />
              )
            }

            return null
          })}

          {(extra || activeFilters.length > 0) && (
            <div className="flex items-center gap-2 ml-auto shrink-0 flex-wrap justify-end">
              {extra}
              {activeFilters.length > 0 && (
                <button
                  type="button"
                  onClick={onReset}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t('reset')}
                </button>
              )}
            </div>
          )}
        </div>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
            {activeFilters.map(f => (
              <span
                key={f.key}
                className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full pl-2.5 pr-1 py-1"
              >
                <span className="text-emerald-600">{f.label} :</span> {f.display}
                <button
                  type="button"
                  onClick={() => onChange(f.key, fields.find(x => x.key === f.key)?.defaultValue ?? '')}
                  className="p-0.5 rounded-full hover:bg-emerald-200 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
