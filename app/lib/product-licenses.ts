import { createClient, SupabaseClient } from '@supabase/supabase-js'

/** Slug do produto gerenciado por este módulo. */
export const PROXY_SCRAPER_SLUG = 'proxy-scraper'

/**
 * Planos de licença do Proxy Scraper.
 * `price` em CRÉDITOS (CR) debitados do saldo do dono (tabela `licenses`).
 * `days` de validade contados a partir da ativação.
 */
export const PLANS = {
  '7d': { id: '7d', label: '7 dias', days: 7, price: 100 },
  '15d': { id: '15d', label: '15 dias', days: 15, price: 180 },
  '30d': { id: '30d', label: '30 dias', days: 30, price: 300 },
} as const

export type PlanId = keyof typeof PLANS

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && value in PLANS
}

/**
 * Gera uma chave de produto no formato PXY-XXXX-XXXX-XXXX (base32 crockford,
 * sem letras ambíguas). Usa crypto do Node (seguro o suficiente para licença).
 */
export function generateProductKey(): string {
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ' // 32 chars, sem I/L/O/U
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  let body = ''
  for (let i = 0; i < bytes.length; i++) {
    body += alphabet[bytes[i] % alphabet.length]
  }
  // Agrupa em blocos de 4 para leitura humana: PXY-XXXX-XXXX-XXXX
  return `PXY-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`
}

/** Soma `days` dias a uma data base (default: agora) e retorna ISO string. */
export function addDays(days: number, from: Date = new Date()): string {
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export function daysRemaining(expiresAt: string | null | undefined): number {
  if (!expiresAt) return 0
  const ms = new Date(expiresAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export function isExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true
  return new Date(expiresAt).getTime() < Date.now()
}

/**
 * Valida uma chave de produto para o slug informado contra a tabela
 * `product_licenses`. Retorna o registro normalizado + motivo de falha.
 * NÃO faz mutações — usado apenas para checagem.
 */
export async function validateProductLicense(
  key: string,
  slug: string = PROXY_SCRAPER_SLUG
): Promise<{ ok: boolean; reason?: string; record?: any }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return { ok: false, reason: 'Configuração do servidor ausente.' }
  }
  const supabaseAdmin: SupabaseClient = createClient(url, serviceKey, {
    auth: { persistSession: false },
  })

  const { data, error } = await supabaseAdmin
    .from('product_licenses')
    .select('*')
    .eq('key', key.trim())
    .eq('product_slug', slug)
    .single()

  if (error || !data) return { ok: false, reason: 'Chave não encontrada.' }
  if (!data.status) return { ok: false, reason: 'Chave desativada.', record: data }
  if (isExpired(data.expires_at)) return { ok: false, reason: 'Chave expirada.', record: data }
  return { ok: true, record: data }
}
