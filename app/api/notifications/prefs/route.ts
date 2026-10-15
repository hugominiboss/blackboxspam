import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/app/lib/license-guard'
import { getSessionLicenseKey } from '@/app/lib/support-server'
import { createTelegramLinkToken } from '@/app/lib/notify-server'
import { PREF_KEYS } from '@/app/lib/notifications'

/**
 * GET /api/notifications/prefs — estado atual do vínculo + preferências.
 * PATCH { group, on } — liga/desliga um grupo.
 * POST /api/notifications/telegram { action: 'link' } — gera token (15min).
 * POST /api/notifications/telegram { action: 'unlink' } — desvincula.
 * POST /api/notifications/telegram { action: 'toggle', on } — liga/desliga envio.
 */

const VALID_GROUPS = new Set(PREF_KEYS.map((p) => p.id))

export async function GET() {
  const cookieStore = await cookies()
  const licenseKey = await getSessionLicenseKey(cookieStore.get('license_key')?.value)
  if (!licenseKey) return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 })
  const supabaseAdmin = getSupabaseAdmin()
  const { data } = await supabaseAdmin
    .from('licenses')
    .select('telegram_chat_id, notify_telegram, notify_prefs')
    .eq('key', licenseKey)
    .maybeSingle()
  return NextResponse.json({
    telegram_linked: Boolean(data?.telegram_chat_id),
    notify_telegram: data?.notify_telegram !== false,
    prefs: (data?.notify_prefs ?? {}) as Record<string, boolean>,
    bot_configured: Boolean(process.env.NOTIF_TELEGRAM_BOT_TOKEN || process.env.SUPPORT_TELEGRAM_BOT_TOKEN),
  })
}

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies()
  const licenseKey = await getSessionLicenseKey(cookieStore.get('license_key')?.value)
  if (!licenseKey) return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 })
  let body: any = {}
  try { body = await req.json() } catch { return NextResponse.json({ message: 'Corpo inválido.' }, { status: 400 }) }
  const group = String(body?.group ?? '')
  if (!VALID_GROUPS.has(group as any)) return NextResponse.json({ message: 'Grupo inválido.' }, { status: 400 })
  const supabaseAdmin = getSupabaseAdmin()
  const { data: lic } = await supabaseAdmin.from('licenses').select('notify_prefs').eq('key', licenseKey).maybeSingle()
  const prefs = { ...((lic?.notify_prefs ?? {}) as Record<string, boolean>), [group]: body?.on !== false }
  const { error } = await supabaseAdmin.from('licenses').update({ notify_prefs: prefs }).eq('key', licenseKey)
  if (error) return NextResponse.json({ message: 'Falha ao salvar.', error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, prefs })
}
