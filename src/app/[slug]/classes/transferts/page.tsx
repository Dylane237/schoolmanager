'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { GripVertical, ArrowRightLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import PageShell from '@/components/layout/PageShell'
import { sectionLabel } from '@/lib/cameroon-levels'

interface Classe {
  id: string
  nom: string
  section: string
  capacite_max: number
  nb_eleves: number
}

interface Eleve {
  id: string
  nom: string
  prenom: string
  numero_matricule: string
  sexe: string
  classe_id: string | null
}

export default function ClassTransferBoard() {
  const { slug } = useParams<{ slug: string }>()
  const [classes, setClasses] = useState<Classe[]>([])
  const [eleves, setEleves] = useState<Eleve[]>([])
  const [loading, setLoading] = useState(true)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [filterSection, setFilterSection] = useState('tous')
  const [transferring, setTransferring] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [cRes, eRes] = await Promise.all([
      fetch('/api/classes'),
      fetch('/api/eleves'),
    ])
    const cData = await cRes.json()
    const eData = await eRes.json()
    setClasses(cData.classes || [])
    setEleves((eData.eleves || []).filter((e: Eleve & { statut?: string }) => e.statut !== 'archive'))
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredClasses = filterSection === 'tous'
    ? classes
    : classes.filter(c => c.section === filterSection)

  const getElevesForClasse = (classeId: string | null) =>
    eleves.filter(e => (classeId ? e.classe_id === classeId : !e.classe_id))

  const handleDrop = async (eleveId: string, targetClasseId: string | null) => {
    const eleve = eleves.find(e => e.id === eleveId)
    if (!eleve || eleve.classe_id === targetClasseId) return

    setTransferring(true)
    const res = await fetch('/api/eleves/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eleve_id: eleveId, classe_id: targetClasseId }),
    })
    const data = await res.json()
    setTransferring(false)

    if (!res.ok) {
      toast.error(data.error || 'Erreur de transfert')
      return
    }

    setEleves(prev => prev.map(e =>
      e.id === eleveId ? { ...e, classe_id: targetClasseId } : e
    ))
    toast.success(`${eleve.nom} ${eleve.prenom} transféré(e)`)
    fetchData()
  }

  const onDragStart = (e: React.DragEvent, eleveId: string) => {
    e.dataTransfer.setData('text/eleve-id', eleveId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingId(eleveId)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const onDrop = (e: React.DragEvent, classeId: string | null) => {
    e.preventDefault()
    const eleveId = e.dataTransfer.getData('text/eleve-id')
    setDraggingId(null)
    if (eleveId) handleDrop(eleveId, classeId)
  }

  const renderColumn = (classe: Classe | null) => {
    const classeId = classe?.id ?? null
    const columnEleves = getElevesForClasse(classeId)
    const isOverCapacity = classe && columnEleves.length > classe.capacite_max

    return (
      <div
        key={classe?.id ?? 'sans-classe'}
        onDragOver={onDragOver}
        onDrop={e => onDrop(e, classeId)}
        className={`card flex flex-col min-w-[260px] max-w-[300px] shrink-0 transition-all ${
          draggingId ? 'ring-2 ring-emerald-400/30' : ''
        }`}
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-600">
          <h3 className="font-bold text-slate-800 text-sm">
            {classe ? classe.nom : 'Sans classe'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {classe ? sectionLabel(classe.section) : 'Non affectés'}
            {' · '}
            <span className={isOverCapacity ? 'text-red-500 font-semibold' : ''}>
              {columnEleves.length}
              {classe ? ` / ${classe.capacite_max}` : ''}
            </span>
          </p>
        </div>
        <div className="flex-1 p-2 space-y-1.5 min-h-[120px] max-h-[420px] overflow-y-auto">
          {columnEleves.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">
              Glissez un élève ici
            </p>
          ) : columnEleves.map(el => (
            <div
              key={el.id}
              draggable={!transferring}
              onDragStart={e => onDragStart(e, el.id)}
              onDragEnd={() => setDraggingId(null)}
              className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-grab active:cursor-grabbing transition-all ${
                draggingId === el.id
                  ? 'opacity-50 border-emerald-400 bg-emerald-50'
                  : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm'
              }`}
            >
              <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {el.nom} {el.prenom}
                </p>
                <p className="text-xs text-slate-400 font-mono truncate">{el.numero_matricule}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <PageShell
      title="Répartition des élèves"
      subtitle="Glissez-déposez les élèves entre les classes"
      breadcrumb="Transferts"
      actions={
        <div className="flex items-center gap-2">
          <select
            value={filterSection}
            onChange={e => setFilterSection(e.target.value)}
            className="input-field text-sm py-2 w-auto"
          >
            <option value="tous">Toutes sections</option>
            <option value="francophone">Francophone</option>
            <option value="anglophone">Anglophone</option>
            <option value="maternelle">Maternelle</option>
          </select>
        </div>
      }
    >
      <div className="card p-4 mb-6 flex items-start gap-3 bg-emerald-50 border-emerald-200">
        <ArrowRightLeft className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-sm text-emerald-800">
          <p className="font-semibold">Comment utiliser</p>
          <p className="text-emerald-700 mt-1">
            Cliquez et maintenez sur un élève, puis déposez-le dans la colonne de la classe cible.
            Les classes pleines refuseront le transfert automatiquement.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card p-16 text-center text-slate-400">Chargement...</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {renderColumn(null)}
          {filteredClasses.map(c => renderColumn(c))}
        </div>
      )}

      {transferring && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm shadow-lg">
          Transfert en cours...
        </div>
      )}
    </PageShell>
  )
}
