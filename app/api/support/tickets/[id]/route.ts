import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseAdmin, requireAdmin } from '@/app/lib/license-guard'
import { SUPPORT_STATUS, isSlaBreached } from '@/app/lib/support'
import { getSessionLicenseKey, notifyTelegram } from '@/app/lib/support-server'
import { notifyUser } from '@/app/lib/notify-server'

/** GET /api/support/tickets/[id] — dono vê mensagens públicas; admin vê tudo. */
export async function loadTicket(id: string) {
  const supabaseAdmin = getSupabaseAdmin()
  const { data, error } = await supabaseAdmin.from('support_tickets').select('*').eq('id', id).maybeSingle()
  if (error || !data) return null
  return data
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const licenseKey = await getSessionLicenseKey(cookieStore.get('license_key')?.value)
  if (!licenseKey) return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 })

  const { id } = await params
  const ticket = await loadTicket(id)
  if (!ticket) return NextResponse.json({ message: 'Ticket não encontrado.' }, { status: 404 })

  const isAdmin = (await requireAdmin()).ok
  const isOwner = ticket.license_key === licenseKey
  if (!isOwner && !isAdmin) return NextResponse.json({ message: 'Acesso negado.' }, { status: 403 })

  const supabaseAdmin = getSupabaseAdmin()
  let q = supabaseAdmin.from('support_messages').select('id, sender, kind, body, created_at').eq('ticket_id', id).order('created_at', { ascending: true })
  if (!isAdmin) q = q.eq('kind', 'publica')
  const { data: messages } = await q

  const { context_snapshot, ai_summary, ai_suggested_reply, ...pub } = ticket
  return NextResponse.json({
    ticket: { ...pub, ...(isAdmin ? { context_snapshot, ai_summary, ai_suggested_reply } : {}), sla_breached: isSlaBreached(ticket.sla_due_at, ticket.status) },
    messages: messages ?? [],
  })
}

/** POST — responder. Cliente joga p/ aguardando-suporte; admin p/ aguardando-cliente. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const licenseKey = await getSessionLicenseKey(cookieStore.get('license_key')?.value)
  if (!licenseKey) return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 })

  const { id } = await params
  const ticket = await loadTicket(id)
  if (!ticket) return NextResponse.json({ message: 'Ticket não encontrado.' }, { status: 404 })
  if (ticket.status === 'fechado' || ticket.status === 'resolvido') {
    return NextResponse.json({ message: 'Ticket encerrado. Abra um novo se precisar.' }, { status: 409 })
  }

  let body: any = {}
  try { body = await req.json() } catch { return NextResponse.json({ message: 'Corpo inválido.' }, { status: 400 }) }
  const text = String(body?.body ?? '').trim()
  if (text.length < 1 || text.length > 5000) {
    return NextResponse.json({ message: 'Mensagem deve ter entre 1 e 5000 caracteres.' }, { status: 400 })
  }

  const isAdmin = (await requireAdmin()).ok
  const isOwner = ticket.license_key === licenseKey
  if (!isOwner && !isAdmin) return NextResponse.json({ message: 'Acesso negado.' }, { status: 403 })

  const supabaseAdmin = getSupabaseAdmin()
  if (isAdmin && !isOwner) {
    const kind = body?.kind === 'nota-interna' ? 'nota-interna' : 'publica'
    const { error } = await supabaseAdmin.from('support_messages').insert({ ticket_id: id, sender: 'suporte', kind, body: text })
    if (error) return NextResponse.json({ message: 'Falha ao responder.', error: error.message }, { status: 500 })
    if (kind === 'publica') {
      await supabaseAdmin.from('support_tickets').update({ status: 'aguardando-cliente' }).eq('id', id)
      // 🔔 Cliente recebe no sino + Telegram (se vinculado).
      notifyUser(ticket.license_key, 'ticket_resposta', 'Resposta no seu ticket', `${ticket.subject} — ${text.slice(0, 140)}`, {
        link: `/suporte/${id}`,
        metadata: { ticket_id: id },
        telegram: `💬 Resposta no seu ticket
${ticket.subject}
${text.slice(0, 500)}`,
      })
    }
    return NextResponse.json({ ok: true, kind })
  }

  const { error } = await supabaseAdmin.from('support_messages').insert({ ticket_id: id, sender: 'cliente', kind: 'publica', body: text })
  if (error) return NextResponse.json({ message: 'Falha ao responder.', error: error.message }, { status: 500 })
  await supabaseAdmin.from('support_tickets').update({ status: 'aguardando-suporte' }).eq('id', id)
  notifyTelegram(`💬 <b>Resposta do cliente</b> #${id.slice(0, 8)}
${ticket.subject}`)
  return NextResponse.json({ ok: true })
}

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
  if (update.rating) notifyTelegram(`⭐ <b>Avaliação ${update.rating}/5</b> #${id.slice(0, 8)}
${ticket.subject}`)
  // 🔔 Encerrou (com ou sem avaliação): avisa no sino.
  if (update.status === 'fechado' || update.status === 'resolvido') {
    notifyUser(ticket.license_key, 'ticket_fechado', 'Ticket encerrado', `${ticket.subject}${update.rating ? ` — avaliado ★ ${update.rating}/5` : ''}`, {
      link: `/suporte/${id}`,
      metadata: { ticket_id: id, rating: update.rating ?? null },
    })
  }
  return NextResponse.json({ ok: true, ...update })
}
