import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseAdmin, requireAdmin } from '@/app/lib/license-guard'
import { SUPPORT_STATUS } from '@/app/lib/support'
import { getSessionLicenseKey, notifyTelegram } from '@/app/lib/support-server'
import { loadTicket } from './route'

/**
 * PATCH /api/support/tickets/[id]
 * Cliente: encerrar (resolvido/fechado) + avaliar 1..5.
 * Admin: troca livre de status.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const licenseKey = await getSessionLicenseKey(cookieStore.get('license_key')?.value)
  if (!licenseKey) return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 })

  const { id } = await params
  const ticket = await loadTicket(id)
  if (!ticket) return NextResponse.json({ message: 'Ticket não encontrado.' }, { status: 404 })

  let body: any = {}
  try { body = await req.json() } catch { return NextResponse.json({ message: 'Corpo inválido.' }, { status: 400 }) }

  const isAdmin = (await requireAdmin()).ok
  const isOwner = ticket.license_key === licenseKey
  if (!isOwner && !isAdmin) return NextResponse.json({ message: 'Acesso negado.' }, { status: 403 })

  const supabaseAdmin = getSupabaseAdmin()

  if (isAdmin && !isOwner) {
    const status = String(body?.status ?? '').trim()
    if (!(status in SUPPORT_STATUS)) return NextResponse.json({ message: 'Status inválido.' }, { status: 400 })
    const { error } = await supabaseAdmin.from('support_tickets').update({ status }).eq('id', id)
    if (error) return NextResponse.json({ message: 'Falha ao atualizar.', error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, status })
  }

  const update: Record<string, any> = {}
  if (body?.status !== undefined) {
    const status = String(body.status).trim()
    if (status !== 'resolvido' && status !== 'fechado') {
      return NextResponse.json({ message: 'Você só pode marcar como resolvido/fechado.' }, { status: 400 })
    }
    update.status = status
  }
  if (body?.rating !== undefined) {
    const rating = Number(body.rating)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ message: 'Avaliação deve ser de 1 a 5.' }, { status: 400 })
    }
    update.rating = rating
    update.rating_comment = String(body?.rating_comment ?? '').slice(0, 1000) || null
    update.rated_at = new Date().toISOString()
    if (!update.status) update.status = 'fechado'
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ message: 'Nada para atualizar.' }, { status: 400 })

  const { error } = await supabaseAdmin.from('support_tickets').update(update).eq('id', id)
  if (error) return NextResponse.json({ message: 'Falha ao atualizar.', error: error.message }, { status: 500 })
  if (update.rating) notifyTelegram(`⭐ <b>Avaliação ${update.rating}/5</b> #${id.slice(0, 8)}\n${ticket.subject}`)
  return NextResponse.json({ ok: true, ...update })
}
