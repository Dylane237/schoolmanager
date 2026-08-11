import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminLicencesAuthed } from '@/lib/admin-licences-auth'

export async function GET(request: NextRequest) {
  if (!(await isAdminLicencesAuthed(request))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Configuration Supabase manquante' }, { status: 503 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: licences, error } = await supabase
    .from('licences')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ecoleIds = (licences || [])
    .map(l => l.ecole_id)
    .filter(Boolean)

  const { data: ecoles } = ecoleIds.length > 0
    ? await supabase.from('ecoles').select('id, nom').in('id', ecoleIds)
    : { data: [] }

  const ecolesMap = Object.fromEntries((ecoles || []).map(e => [e.id, e]))

  const licencesWithEcoles = (licences || []).map(l => ({
    ...l,
    ecoles: l.ecole_id ? (ecolesMap[l.ecole_id] ?? null) : null
  }))

  return NextResponse.json({ licences: licencesWithEcoles })
}
