import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/app/lib/license-guard'
import {
  CATEGORY_POLICY,
  SUPPORT_CATEGORIES,
  isSupportCategory,
  slaDueFromNow,
  type SupportCategory,
} from '@/app/lib/support'
import { buildContextSnapshot, getSessionLicenseKey, notifyTelegram } from '@/app/lib/support-server'

/**
 * Setor de Suporte — Tickets (nível intermediário).
 *
 * GET /api/support/tickets
 *   Cliente: lista os próprios tickets (com contagem de mensagens).
 *   Admin (role admin): com ?all=1 lista todos (para o painel /admin).
 *
 * POST /api/support/tickets { category, subject, message }
 *   Abre um ticket. Prioridade + SLA vêm da CATEGORY_POLICY no servidor
 *   (cliente não escolhe). Anexa context_snapshot e notifica no Telegram.
 */

// Quanto o admin vê de cada ticket na listagem.
const ADMIN_SELECT =
  'id, license_key, category, priority, status, subject, sla_due_at, rating, created_at, updated_at'

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const licenseKey = await getSessionLicenseKey(cookieStore.get('license_key')?.value)
  if (!licenseKey) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const all = req.nextUrl.searchParams.get('all') === '1'

  // ?all=1 exige role admin (Key Mestra).
  if (all) {
    const { data: me } = await supabaseAdmin
      .from('licenses')
      .select('role, status')
      .eq('key', licenseKey)
      .maybeSingle()
    if (!me || me.role !== 'admin' || !me.status) {
      return NextResponse.json({ message: 'Acesso restrito à Key Mestra (admin).' }, { status: 403 })
    }
    const status = req.nextUrl.searchParams.get('status')
    let q = supabaseAdmin.from('support_tickets').select(ADMIN_SELECT).order('created_at', { ascending: false }).limit(200)
    if (status && status !== 'todos') q = q.eq('status', status)
    const { data, error } = await q
    if (error) return NextResponse.json({ message: 'Erro ao listar tickets.', error: error.message }, { status: 500 })
    return NextResponse.json({ tickets: data ?? [] })
  }

  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .select('id, category, priority, status, subject, sla_due_at, rating, created_at, updated_at')
    .eq('license_key', licenseKey)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ message: 'Erro ao listar tickets.', error: error.message }, { status: 500 })
  }
  return NextResponse.json({ tickets: data ?? [] })
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const licenseKey = await getSessionLicenseKey(cookieStore.get('license_key')?.value)
  if (!licenseKey) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 })
  }

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ message: 'Corpo inválido.' }, { status: 400 })
  }

  const category = String(body?.category ?? '').trim() as SupportCategory
  const subject = String(body?.subject ?? '').trim()
  const message = String(body?.message ?? '').trim()

  if (!isSupportCategory(category)) {
    return NextResponse.json(
      { message: `Categoria inválida. Use: ${Object.keys(SUPPORT_CATEGORIES).join(', ')}.` },
      { status: 400 }
    )
  }
  if (subject.length < 5 || subject.length > 140) {
    return NextResponse.json({ message: 'Assunto deve ter entre 5 e 140 caracteres.' }, { status: 400 })
  }
  if (message.length < 1 || message.length > 5000) {
    return NextResponse.json({ message: 'Mensagem deve ter entre 1 e 5000 caracteres.' }, { status: 400 })
  }

  // Anti-spam: no máximo 5 tickets abertos por license.
  const supabaseAdmin = getSupabaseAdmin()
  const { count: abertos } = await supabaseAdmin
    .from('support_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('license_key', licenseKey)
    .not('status', 'in', '(resolvido,fechado)')

  if ((abertos ?? 0) >= 5) {
    return NextResponse.json(
      { message: 'Você já tem 5 tickets em aberto. Aguarde a resposta antes de abrir outro.' },
      { status: 429 }
    )
  }

  // Prioridade + SLA definidos no SERVIDOR pela categoria.
  const policy = CATEGORY_POLICY[category]
  const snapshot = await buildContextSnapshot(licenseKey)

  const { data: ticket, error: tErr } = await supabaseAdmin
    .from('support_tickets')
    .insert({
      license_key: licenseKey,
      category,
      priority: policy.priority,
      status: 'aberto',
      subject,
      sla_due_at: slaDueFromNow(policy.slaHours),
      context_snapshot: snapshot,
    })
    .select('id, category, priority, status, subject, sla_due_at, created_at')
    .single()

  if (tErr || !ticket) {
    return NextResponse.json({ message: 'Falha ao abrir ticket.', error: tErr?.message }, { status: 500 })
  }

  // Primeira mensagem do ticket.
  const { error: mErr } = await supabaseAdmin.from('support_messages').insert({
    ticket_id: ticket.id,
    sender: 'cliente',
    kind: 'publica',
    body: message,
  })

  if (mErr) {
    // Rollback: apaga o ticket órfão.
    await supabaseAdmin.from('support_tickets').delete().eq('id', ticket.id)
    return NextResponse.json({ message: 'Falha ao registrar mensagem.', error: mErr.message }, { status: 500 })
  }

  // Notificação fire-and-forget (não bloqueia a resposta).
  const catLabel = SUPPORT_CATEGORIES[category].label
  notifyTelegram(
    `🎫 <b>Novo ticket</b> #${ticket.id.slice(0, 8)}\n<b>${catLabel}</b> · ${policy.priority} · SLA ${policy.slaHours}h\n${subject}\nNível ${snapshot.level} · ${snapshot.credits} CR · Proxy: ${snapshot.proxy_scraper ? (snapshot.proxy_scraper.expirado ? 'expirado' : 'ativo') : '—'}`
  )

  return NextResponse.json({ ok: true, ticket }, { status: 201 })
}
