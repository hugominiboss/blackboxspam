import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/app/lib/license-guard'
import { getSessionLicenseKey } from '@/app/lib/support-server'

/**
 * GET /api/notifications?unread=1 — lista (padrão 30, máx 100).
 * Retorna { notifications, unread_count }.
 *
 * PATCH /api/notifications { ids?: string[], all?: true }
 * Marca como lidas (só as da própria license).
 */

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const licenseKey = await getSessionLicenseKey(cookieStore.get('license_key')?.value)
  if (!licenseKey) return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 })

  const supabaseAdmin = getSupabaseAdmin()
  const unreadOnly = req.nextUrl.searchParams.get('unread') === '1'
  let q = supabaseAdmin
    .from('notifications')
    .select('id, type, title, body, link, metadata, read_at, created_at')
    .eq('license_key', licenseKey)
    .order('created_at', { ascending: false })
    .limit(100)
  if (unreadOnly) q = q.is('read_at', null)
  const { data, error } = await q
  if (error) return NextResponse.json({ message: 'Erro ao listar.', error: error.message }, { status: 500 })

  const { count } = await supabaseAdmin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('license_key', licenseKey)
    .is('read_at', null)

  return NextResponse.json({ notifications: data ?? [], unread_count: count ?? 0 })
}

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies()
  const licenseKey = await getSessionLicenseKey(cookieStore.get('license_key')?.value)
  if (!licenseKey) return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 })

  let body: any = {}
  try { body = await req.json() } catch { return NextResponse.json({ message: 'Corpo inválido.' }, { status: 400 }) }

  const supabaseAdmin = getSupabaseAdmin()
  const now = new Date().toISOString()
  if (body?.all === true) {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ read_at: now })
      .eq('license_key', licenseKey)
      .is('read_at', null)
    if (error) return NextResponse.json({ message: 'Falha ao marcar.', error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const ids = Array.isArray(body?.ids) ? body.ids.filter((x: any) => typeof x === 'string').slice(0, 100) : []
  if (ids.length === 0) return NextResponse.json({ message: 'Nada para marcar.' }, { status: 400 })
  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ read_at: now })
    .eq('license_key', licenseKey)
    .in('id', ids)
  if (error) return NextResponse.json({ message: 'Falha ao marcar.', error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, marked: ids.length })
}
