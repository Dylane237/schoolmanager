'use client'

import { useState, useEffect, useRef } from 'react'
import { Printer, FileText, Download, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import PageShell from '@/components/layout/PageShell'
import EmptyState from '@/components/ui/EmptyState'

interface Classe { id: string; nom: string; section: string }

interface BulletinData {
  ecole: { nom: string; directeur_nom: string; adresse: string }
  classe: { nom: string; section: string }
  periode: string
  noteMax: number
  bulletins: {
    eleve: { nom: string; prenom: string; numero_matricule: string; sexe: string }
    notes: { matiere: string; coefficient: number; note: number | null; appreciation: string | null }[]
    moyenne: number | null
    mention: string | null
    rang: number | null
    noteMax: number
  }[]
}

export default function BulletinsPage() {
  const [classes, setClasses] = useState<Classe[]>([])
  const [classeId, setClasseId] = useState('')
  const [periode, setPeriode] = useState('T1')
  const [section, setSection] = useState('francophone')
  const [data, setData] = useState<BulletinData | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/classes').then(r => r.json()).then(d => setClasses(d.classes || []))
  }, [])

  useEffect(() => {
    if (!classeId) { setData(null); return }
    const c = classes.find(x => x.id === classeId)
    if (c) {
      setSection(c.section)
      setPeriode(c.section === 'anglophone' ? 'S1' : 'T1')
    }
  }, [classeId, classes])

  const periodes = section === 'anglophone'
    ? ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']
    : ['T1', 'T2', 'T3']

  const loadBulletins = async () => {
    if (!classeId || !periode) return
    setLoading(true)
    const res = await fetch(`/api/bulletins?classe_id=${classeId}&periode=${periode}`)
    const d = await res.json()
    if (!res.ok) {
      toast.error(d.error || 'Erreur de chargement')
      setLoading(false)
      return
    }
    setData(d)
    setSelectedIdx(0)
    setLoading(false)
  }

  useEffect(() => { loadBulletins() }, [classeId, periode])

  const bulletin = data?.bulletins[selectedIdx]

  const handlePrint = () => {
    if (!printRef.current || !bulletin || !data) return
    const win = window.open('', '_blank', 'width=800,height=1000')
    if (!win) return

    const isAnglophone = data.classe.section === 'anglophone'
    const titrePeriode = isAnglophone ? `Term ${periode}` : `Trimestre ${periode.slice(1)}`

    win.document.write(`<!DOCTYPE html><html><head>
      <title>Bulletin - ${bulletin.eleve.nom}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Georgia, serif; padding: 40px; color: #1e293b; font-size: 13px; }
        .header { text-align: center; border-bottom: 3px double #10b981; padding-bottom: 16px; margin-bottom: 24px; }
        .header h1 { font-size: 18px; text-transform: uppercase; letter-spacing: 1px; }
        .header h2 { font-size: 14px; color: #64748b; margin-top: 4px; }
        .republique { font-size: 11px; color: #64748b; margin-bottom: 8px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; font-size: 12px; }
        .info-grid span { color: #64748b; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th { background: #f1f5f9; padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; border: 1px solid #e2e8f0; }
        td { padding: 8px; border: 1px solid #e2e8f0; font-size: 12px; }
        .result { display: flex; justify-content: space-around; margin: 24px 0; padding: 16px; background: #f8fafc; border-radius: 8px; }
        .result-item { text-align: center; }
        .result-item .val { font-size: 22px; font-weight: bold; color: #10b981; }
        .result-item .lbl { font-size: 11px; color: #64748b; margin-top: 4px; }
        .footer { margin-top: 40px; display: flex; justify-content: space-between; }
        .sig { border-top: 1px solid #cbd5e1; padding-top: 8px; width: 40%; text-align: center; font-size: 11px; color: #64748b; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      ${printRef.current.innerHTML}
    </body></html>`)
    win.document.close()
    win.focus()
    win.print()
    win.close()
  }

  const handlePrintAll = () => {
    if (!data) return
    toast.success(`Impression de ${data.bulletins.length} bulletins lancée`)
    data.bulletins.forEach((_, i) => {
      setTimeout(() => {
        setSelectedIdx(i)
        setTimeout(handlePrint, 300)
      }, i * 800)
    })
  }

  return (
    <PageShell
      title="Bulletins scolaires"
      subtitle="Génération et impression des bulletins de notes"
      breadcrumb="Bulletins"
      actions={
        data && data.bulletins.length > 0 ? (
          <div className="flex gap-2">
            <button onClick={handlePrint} className="btn-primary flex items-center gap-2 py-2.5">
              <Printer className="w-4 h-4" /> Imprimer
            </button>
            <button onClick={handlePrintAll}
              className="border border-slate-200 text-slate-700 font-semibold rounded-xl px-4 py-2.5 text-base hover:bg-white transition-colors flex items-center gap-2 bg-white">
              <Download className="w-4 h-4" /> Toute la classe
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="card p-5 mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-slate-600 mb-1.5">Classe</label>
          <select value={classeId} onChange={e => setClasseId(e.target.value)} className="input-field">
            <option value="">Sélectionner une classe</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.nom} ({c.section})</option>
            ))}
          </select>
        </div>
        <div className="w-40">
          <label className="block text-sm font-medium text-slate-600 mb-1.5">Période</label>
          <select value={periode} onChange={e => setPeriode(e.target.value)} className="input-field" disabled={!classeId}>
            {periodes.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        {data && (
          <div className="flex items-end">
            <span className="text-base text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
              {data.bulletins.length} bulletin(s) · /{data.noteMax}
            </span>
          </div>
        )}
      </div>

      {!classeId ? (
        <EmptyState
          icon={FileText}
          title="Sélectionnez une classe"
          description="Choisissez une classe et une période pour générer les bulletins."
        />
      ) : loading ? (
        <div className="card p-16 text-center text-slate-400 text-base">Génération des bulletins...</div>
      ) : !bulletin ? (
        <EmptyState
          icon={Users}
          title="Aucun élève ou note"
          description="Inscrivez des élèves et saisissez leurs notes avant de générer les bulletins."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-2 max-h-[600px] overflow-y-auto">
            {data!.bulletins.map((b, i) => (
              <button key={i} onClick={() => setSelectedIdx(i)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedIdx === i
                    ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}>
                <p className="font-semibold text-slate-800 text-base">{b.eleve.nom} {b.eleve.prenom}</p>
                <p className="text-sm text-slate-500 mt-0.5">{b.eleve.numero_matricule}</p>
                {b.moyenne !== null && (
                  <p className="text-sm font-bold text-emerald-600 mt-1">
                    {b.moyenne.toFixed(2)}/{b.noteMax} {b.mention && `· ${b.mention}`}
                  </p>
                )}
              </button>
            ))}
          </div>

          <div className="lg:col-span-3">
            <div ref={printRef} className="card p-8 print-area">
              <div className="header text-center border-b-[3px] border-double border-emerald-500 pb-4 mb-6">
                <p className="republique text-xs text-slate-500 mb-2">
                  {data!.classe.section === 'anglophone'
                    ? 'REPUBLIC OF CAMEROON · MINISTRY OF SECONDARY EDUCATION'
                    : 'RÉPUBLIQUE DU CAMEROUN · MINISTÈRE DES ENSEIGNEMENTS SECONDAIRES'}
                </p>
                <h1 className="text-xl font-bold uppercase tracking-wide">{data!.ecole.nom}</h1>
                <h2 className="text-sm text-slate-500 mt-1">
                  {data!.classe.section === 'anglophone' ? 'REPORT CARD' : 'BULLETIN DE NOTES'} — {periode}
                </h2>
              </div>

              <div className="info-grid grid grid-cols-2 gap-3 mb-6 text-sm">
                <div><span className="text-slate-500">Élève : </span><strong>{bulletin.eleve.nom} {bulletin.eleve.prenom}</strong></div>
                <div><span className="text-slate-500">Matricule : </span>{bulletin.eleve.numero_matricule}</div>
                <div><span className="text-slate-500">Classe : </span>{data!.classe.nom}</div>
                <div><span className="text-slate-500">Sexe : </span>{bulletin.eleve.sexe === 'M' ? 'Masculin' : 'Féminin'}</div>
              </div>

              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left p-2.5 border border-slate-200 text-xs uppercase">Matière</th>
                    <th className="text-center p-2.5 border border-slate-200 text-xs uppercase w-16">Coef.</th>
                    <th className="text-center p-2.5 border border-slate-200 text-xs uppercase w-20">Note/{data!.noteMax}</th>
                    <th className="text-left p-2.5 border border-slate-200 text-xs uppercase">Appréciation</th>
                  </tr>
                </thead>
                <tbody>
                  {bulletin.notes.map((n, i) => (
                    <tr key={i}>
                      <td className="p-2.5 border border-slate-200 text-sm font-medium">{n.matiere}</td>
                      <td className="p-2.5 border border-slate-200 text-sm text-center">{n.coefficient}</td>
                      <td className="p-2.5 border border-slate-200 text-sm text-center font-semibold">
                        {n.note !== null ? n.note : '—'}
                      </td>
                      <td className="p-2.5 border border-slate-200 text-sm text-slate-500 italic">
                        {n.appreciation || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="result flex justify-around my-6 p-5 bg-slate-50 rounded-xl">
                <div className="result-item text-center">
                  <p className="val text-2xl font-bold text-emerald-600">
                    {bulletin.moyenne !== null ? bulletin.moyenne.toFixed(2) : '—'}
                  </p>
                  <p className="lbl text-xs text-slate-500 mt-1">Moyenne /{data!.noteMax}</p>
                </div>
                <div className="result-item text-center">
                  <p className="val text-2xl font-bold text-slate-800">{bulletin.rang ?? '—'}</p>
                  <p className="lbl text-xs text-slate-500 mt-1">Rang</p>
                </div>
                <div className="result-item text-center">
                  <p className="val text-xl font-bold text-blue-600">{bulletin.mention ?? '—'}</p>
                  <p className="lbl text-xs text-slate-500 mt-1">
                    {data!.classe.section === 'anglophone' ? 'Grade' : 'Mention'}
                  </p>
                </div>
              </div>

              <div className="footer flex justify-between mt-10">
                <div className="sig border-t border-slate-300 pt-2 w-[40%] text-center text-xs text-slate-500">
                  Le Directeur des Études
                </div>
                <div className="sig border-t border-slate-300 pt-2 w-[40%] text-center text-xs text-slate-500">
                  {data!.ecole.directeur_nom || 'Le Directeur'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
