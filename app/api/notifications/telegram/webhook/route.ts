import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/app/lib/license-guard'

/**
 * POST /api/notifications/telegram/webhook — recebe updates do bot.
 * Configure no Telegram: setWebhook → https://seu-dominio/api/notifications/telegram/webhook?secret=XXX
 * O segredo vem de NOTIF_TELEGRAM_WEBHOOK_SECRET (evita chamada forjada).
 *
 * Fluxo: usuário abre t.me/seubot?start=TOKEN → bot recebe /start TOKEN →
 * valida (não expirado, não usado) → grava telegram_chat_id na license.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.NOTIF_TELEGRAM_WEBHOOK_SECRET
  if (secret && req.nextUrl.searchParams.get('secret') !== secret) {
    return NextResponse.json({ message: 'Forbidden.' }, { status: 403 })
  }

  let update: any = {}
  try { update = await req.json() } catch { return NextResponse.json({ ok: true }) }
  const msg = update?.message
  const chatId = msg?.chat?.id
  const text = String(msg?.text ?? '').trim()
  if (!chatId || !text.startsWith('/start')) return NextResponse.json({ ok: true })

  const token = text.replace('/start', '').trim()
  const botToken = process.env.NOTIF_TELEGRAM_BOT_TOKEN || process.env.SUPPORT_TELEGRAM_BOT_TOKEN
  const send = async (t: string) => {
    if (!botToken) return
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: t.slice(0, 4000) }),
      })
    } catch { /* ignora */ }
  }

  if (!token) {
    await send('👋 Para vincular, gere um código no painel: Conta → Notificações → Vincular Telegram, e abra o link gerado.')
    return NextResponse.json({ ok: true })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data: row } = await supabaseAdmin
    .from('telegram_link_tokens')
    .select('token, license_key, expires_at, used_at')
    .eq('token', token.toUpperCase())
    .maybeSingle()

  if (!row) {
    await send('❌ Código não encontrado. Gere um novo no painel (vale 15 min).')
    return NextResponse.json({ ok: true })
  }
  if (row.used_at) {
    await send('⚠️ Esse código já foi usado. Gere um novo no painel.')
    return NextResponse.json({ ok: true })
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await send('⌛ Código expirado (vale 15 min). Gere um novo no painel.')
    return NextResponse.json({ ok: true })
  }

  await supabaseAdmin.from('licenses').update({ telegram_chat_id: String(chatId) }).eq('key', row.license_key)
  await supabaseAdmin.from('telegram_link_tokens').update({ used_at: new Date().toISOString() }).eq('token', row.token)
  await send('✅ Telegram vinculado! Você vai receber aqui: respostas de tickets, Proxy expirando, level-up e avisos. Para desligar: Conta → Notificações.')
  return NextResponse.json({ ok: true })
}
