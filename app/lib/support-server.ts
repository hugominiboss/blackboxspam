import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/app/lib/license-guard'
import { nivelParaGasto } from '@/app/lib/levels'
import { PROXY_SCRAPER_SLUG } from '@/app/lib/product-licenses'

/**
 * Monta o snapshot de contexto do cliente no momento da abertura do ticket:
 * key (mascarada), role, saldo, nível, Proxy Scraper ativo? e contagem de
 * tickets abertos. O admin vê tudo isso sem precisar perguntar.
 */
export function maskLicenseKey(key: string): string {
  if (!key || key.length <= 8) return '••••••••'
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`
}

export async function buildContextSnapshot(licenseKey: string) {
  const supabaseAdmin = getSupabaseAdmin()

  const { data: lic } = await supabaseAdmin
    .from('licenses')
    .select('role, status, credits, total_spent, level, expires_at')
    .eq('key', licenseKey)
    .maybeSingle()

  const progresso = nivelParaGasto(lic?.total_spent ?? 0)

  const { data: proxy } = await supabaseAdmin
    .from('product_licenses')
    .select('key, status, expires_at')
    .eq('owner_key', licenseKey)
    .eq('product_slug', PROXY_SCRAPER_SLUG)
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { count: abertos } = await supabaseAdmin
    .from('support_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('license_key', licenseKey)
    .not('status', 'in', '(resolvido,fechado)')

  return {
    key_mask: maskLicenseKey(licenseKey),
    role: lic?.role ?? 'user',
    credits: lic?.credits ?? 0,
    total_spent: lic?.total_spent ?? 0,
    level: lic?.level ?? progresso.atual,
    license_expires_at: lic?.expires_at ?? null,
    proxy_scraper: proxy
      ? {
          key_mask: maskLicenseKey(proxy.key ?? ''),
          status: proxy.status,
          expires_at: proxy.expires_at,
          expirado: proxy.expires_at ? new Date(proxy.expires_at).getTime() < Date.now() : true,
        }
      : null,
    tickets_abertos: abertos ?? 0,
    snapshot_at: new Date().toISOString(),
  }
}

/**
 * Valida a sessão (cookie license_key) contra a tabela licenses via anon key.
 * Retorna a key válida ou null. Centraliza a regra usada nas rotas de suporte.
 */
export async function getSessionLicenseKey(cookieKey: string | undefined): Promise<string | null> {
  if (!cookieKey) return null
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  const supabase = createClient(url, anonKey, { auth: { persistSession: false } })
  const { data, error } = await supabase
    .from('licenses')
    .select('key, status, expires_at')
    .eq('key', cookieKey)
    .maybeSingle()
  if (error || !data || !data.status) return null
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null
  return data.key
}

/**
 * Dispara notificação de novo ticket / nova resposta no Telegram (se configurado).
 * Usa `fetch` com timeout curto e NUNCA quebra a request principal em caso de erro.
 * Configure no painel Vercel: SUPPORT_TELEGRAM_BOT_TOKEN + SUPPORT_TELEGRAM_CHAT_ID.
 */
export async function notifyTelegram(text: string): Promise<void> {
  const token = process.env.SUPPORT_TELEGRAM_BOT_TOKEN
  const chatId = process.env.SUPPORT_TELEGRAM_CHAT_ID
  if (!token || !chatId) return
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 6000)
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4000), parse_mode: 'HTML' }),
      signal: ctrl.signal,
    })
    clearTimeout(t)
  } catch {
    // fire-and-forget: suporte não pode quebrar por causa do Telegram
  }
}
