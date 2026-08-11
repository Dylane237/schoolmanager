import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminLicencesAuthed } from '@/lib/admin-licences-auth'

export async function POST(request: NextRequest) {
  if (!(await isAdminLicencesAuthed(request))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Configuration Supabase manquante' }, { status: 503 })
  }

  const { id } = await request.json()
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { error } = await supabase
    .from('licences')
    .update({ is_active: 0 })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
