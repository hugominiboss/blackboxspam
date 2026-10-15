import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/app/lib/license-guard'
import { notifyUser } from '@/app/lib/notify-server'

/**
 * GET /api/cron/proxy-expiry?days=2 — varre licenças Proxy que vencem em N dias
 * (ou já venceram hoje) e notifica no sino + Telegram (idempotente por dia via
 * metadata.aviso_dia — não spamma se o cron rodar 2x).
 *
 * Protegido por CRON_SECRET (?secret=) ou role admin. Agende 1x/dia:
 * Vercel Cron (vercel.json) ou cron externo (cron-job.org) chamando a URL.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const qSecret = req.nextUrl.searchParams.get('secret')
  if (secret && qSecret !== secret) {
    // Sem segredo configurado na URL, exige admin logado.
    const { cookies } = await import('next/headers')
    const { createClient } = await import('@supabase/supabase-js')
    const cookieStore = await cookies()
    const ck = cookieStore.get('license_key')?.value
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!ck || !url || !anon) return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 })
    const sb = createClient(url, anon, { auth: { persistSession: false } })
    const { data: me } = await sb.from('licenses').select('role, status').eq('key', ck).maybeSingle()
    if (!me || me.role !== 'admin' || !me.status) return NextResponse.json({ message: 'Forbidden.' }, { status: 403 })
  }

  const days = Math.max(1, Math.min(7, Number(req.nextUrl.searchParams.get('days') ?? 2)))
  const supabaseAdmin = getSupabaseAdmin()
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const limit = new Date(now.getTime() + days * 24 * 3600 * 1000).toISOString()

  // Licenças ativas vencendo em até `days` dias.
  const { data: vincendas } = await supabaseAdmin
    .from('product_licenses')
    .select('key, owner_key, product_slug, expires_at, status')
    .eq('status', true)
    .not('expires_at', 'is', null)
    .lte('expires_at', limit)
    .gte('expires_at', now.toISOString())
    .limit(500)

  // Licenças que venceram nas últimas 24h.
  const { data: vencidas } = await supabaseAdmin
    .from('product_licenses')
    .select('key, owner_key, product_slug, expires_at, status')
    .eq('status', true)
    .lt('expires_at', now.toISOString())
    .gte('expires_at', new Date(now.getTime() - 24 * 3600 * 1000).toISOString())
    .limit(500)

  let expirando = 0
  let expiradas = 0

  for (const p of vincendas ?? []) {
    // Idempotência diária: pula se já avisou hoje (metadata.aviso_dia).
    const { data: ja } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('license_key', p.owner_key)
      .eq('type', 'proxy_expirando')
      .gte('created_at', `${today}T00:00:00Z`)
      .limit(1)
    if (ja && ja.length > 0) continue
    const diasRest = Math.max(1, Math.ceil((new Date(p.expires_at).getTime() - now.getTime()) / 86400000))
    await notifyUser(p.owner_key, 'proxy_expirando', `Proxy expira em ${diasRest}d`, `Chave ${p.key} vence em ${new Date(p.expires_at).toLocaleDateString('pt-BR')}. Renove em Ferramentas para não perder o acesso.`, {
      link: '/ferramentas',
      metadata: { proxy_key: p.key, expires_at: p.expires_at, aviso_dia: today },
      telegram: `⏳ Sua licença Proxy (${p.key}) expira em ${diasRest}d (${new Date(p.expires_at).toLocaleDateString('pt-BR')}). Renove para não perder o acesso.`,
    })
    expirando++
  }

  for (const p of vencidas ?? []) {
    const { data: ja } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('license_key', p.owner_key)
      .eq('type', 'proxy_expirada')
      .gte('created_at', `${today}T00:00:00Z`)
      .limit(1)
    if (ja && ja.length > 0) continue
    await notifyUser(p.owner_key, 'proxy_expirada', 'Proxy expirada', `Chave ${p.key} venceu. Renove em Ferramentas para reativar.`, {
      link: '/ferramentas',
      metadata: { proxy_key: p.key, expires_at: p.expires_at, aviso_dia: today },
      telegram: `🔴 Sua licença Proxy (${p.key}) expirou. Renove para reativar.`,
    })
    expiradas++
  }

  return NextResponse.json({ ok: true, dia: today, expirando, expiradas })
}
