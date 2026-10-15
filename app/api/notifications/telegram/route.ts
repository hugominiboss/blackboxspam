import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/app/lib/license-guard'
import { getSessionLicenseKey } from '@/app/lib/support-server'
import { createTelegramLinkToken } from '@/app/lib/notify-server'

/**
 * POST /api/notifications/telegram
 * { action: 'link' } → gera token 15min + deep-link t.me/bot?start=TOKEN.
 * { action: 'unlink' } → remove vínculo.
 * { action: 'toggle', on: bool } → liga/desliga envio (mantém vínculo).
 */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const licenseKey = await getSessionLicenseKey(cookieStore.get('license_key')?.value)
  if (!licenseKey) return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 })

  let body: any = {}
  try { body = await req.json() } catch { return NextResponse.json({ message: 'Corpo inválido.' }, { status: 400 }) }
  const action = String(body?.action ?? '')
  const supabaseAdmin = getSupabaseAdmin()

  if (action === 'link') {
    const out = await createTelegramLinkToken(licenseKey)
    if (!out) return NextResponse.json({ message: 'Falha ao gerar código.' }, { status: 500 })
    return NextResponse.json({ ok: true, ...out, expires_minutes: 15 })
  }
  if (action === 'unlink') {
    await supabaseAdmin.from('licenses').update({ telegram_chat_id: null }).eq('key', licenseKey)
    return NextResponse.json({ ok: true, telegram_linked: false })
  }
  if (action === 'toggle') {
    const on = body?.on !== false
    await supabaseAdmin.from('licenses').update({ notify_telegram: on }).eq('key', licenseKey)
    return NextResponse.json({ ok: true, notify_telegram: on })
  }
  return NextResponse.json({ message: 'Ação inválida. Use: link, unlink, toggle.' }, { status: 400 })
}
