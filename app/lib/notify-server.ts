import { getSupabaseAdmin } from '@/app/lib/license-guard'
import { prefGroupFor, type NotifType } from '@/app/lib/notifications'

/**
 * Motor central de notificações (SERVIDOR apenas).
 *
 * Regras:
 * - Toda notificação nasce aqui, nunca no cliente (padrão antifraude).
 * - Respeita `notify_prefs` da license (grupo desligado = não cria).
 * - Telegram é ADDON opcional: só tenta se a license vinculou o chat
 *   (`telegram_chat_id`) E manteve `notify_telegram = true` E o bot do
 *   admin está configurado (NOTIF_TELEGRAM_BOT_TOKEN). Fire-and-forget:
 *   nunca quebra a request principal.
 */

export async function isPrefOn(licenseKey: string, group: string): Promise<boolean> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data } = await supabaseAdmin
      .from('licenses')
      .select('notify_prefs')
      .eq('key', licenseKey)
      .maybeSingle()
    const prefs = (data?.notify_prefs ?? {}) as Record<string, boolean>
    return prefs[group] !== false
  } catch {
    return true
  }
}

async function tryTelegramUser(licenseKey: string, text: string): Promise<boolean> {
  const token = process.env.NOTIF_TELEGRAM_BOT_TOKEN || process.env.SUPPORT_TELEGRAM_BOT_TOKEN
  if (!token) return false
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data: lic } = await supabaseAdmin
      .from('licenses')
      .select('telegram_chat_id, notify_telegram')
      .eq('key', licenseKey)
      .maybeSingle()
    const chatId = lic?.telegram_chat_id
    if (!chatId || lic?.notify_telegram === false) return false
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 6000)
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4000) }),
      signal: ctrl.signal,
    })
    clearTimeout(t)
    return res.ok
  } catch {
    return false
  }
}

export async function notifyUser(
  licenseKey: string,
  type: NotifType,
  title: string,
  body: string,
  opts: { link?: string; metadata?: Record<string, any>; telegram?: string } = {}
): Promise<string | null> {
  if (!licenseKey) return null
  // Respeita a preferência do grupo (ex: cliente desligou "proxy").
  if (!(await isPrefOn(licenseKey, prefGroupFor(type)))) return null
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        license_key: licenseKey,
        type,
        title: title.slice(0, 120),
        body: body.slice(0, 1000),
        link: opts.link ?? null,
        metadata: opts.metadata ?? {},
      })
      .select('id')
      .single()
    if (error || !data) return null
    // Telegram (addon): tenta em background, marca se entregou.
    if (opts.telegram) {
      const sent = await tryTelegramUser(licenseKey, opts.telegram)
      if (sent) {
        await supabaseAdmin.from('notifications').update({ telegram_sent: true }).eq('id', data.id)
      }
    }
    return data.id
  } catch {
    return null
  }
}

/** Gera token de vínculo Telegram (15 min, um uso). Retorna token + deep-link. */
export async function createTelegramLinkToken(licenseKey: string): Promise<{ token: string; deepLink: string } | null> {
  const botName = process.env.NOTIF_TELEGRAM_BOT_USERNAME
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
    const bytes = new Uint8Array(12)
    crypto.getRandomValues(bytes)
    let token = ''
    for (const b of bytes) token += alphabet[b % alphabet.length]
    const { error } = await supabaseAdmin.from('telegram_link_tokens').insert({ token, license_key: licenseKey })
    if (error) return null
    const deepLink = botName ? `https://t.me/${botName}?start=${token}` : token
    return { token, deepLink }
  } catch {
    return null
  }
}
