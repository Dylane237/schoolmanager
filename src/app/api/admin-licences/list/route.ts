import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function isAuthed(request: NextRequest) {
  const token = request.cookies.get('admin_licences_token')?.value
  return token === process.env.SUPER_ADMIN_PASSWORD
}

export async function GET(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

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
