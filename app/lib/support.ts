/**
 * Setor de Suporte — constantes e regras (nível intermediário).
 *
 * Categorias, prioridades e SLA são definidos NO SERVIDOR.
 * O cliente envia apenas `category`; prioridade e SLA são derivados aqui,
 * para impedir manipulação (mesmo padrão antifraude do /api/credits/purchase).
 */

export const SUPPORT_CATEGORIES = {
  duvida: { id: 'duvida', label: 'Dúvida', desc: 'Perguntas gerais sobre a plataforma.' },
  tecnico: { id: 'tecnico', label: 'Problema técnico', desc: 'Erro, bug ou algo que não carrega.' },
  financeiro: { id: 'financeiro', label: 'Financeiro / Créditos', desc: 'Saldo, pagamentos, débitos.' },
  'proxy-scraper': { id: 'proxy-scraper', label: 'Proxy Scraper', desc: 'Licença, validação ou dispositivo.' },
  sugestao: { id: 'sugestao', label: 'Sugestão', desc: 'Ideias de melhoria.' },
} as const

export type SupportCategory = keyof typeof SUPPORT_CATEGORIES

export const SUPPORT_PRIORITIES = {
  baixa: { id: 'baixa', label: 'Baixa' },
  normal: { id: 'normal', label: 'Normal' },
  alta: { id: 'alta', label: 'Alta' },
  urgente: { id: 'urgente', label: 'Urgente' },
} as const

export type SupportPriority = keyof typeof SUPPORT_PRIORITIES

export const SUPPORT_STATUS = {
  aberto: { id: 'aberto', label: 'Aberto' },
  'aguardando-suporte': { id: 'aguardando-suporte', label: 'Aguardando suporte' },
  'aguardando-cliente': { id: 'aguardando-cliente', label: 'Aguardando você' },
  resolvido: { id: 'resolvido', label: 'Resolvido' },
  fechado: { id: 'fechado', label: 'Fechado' },
} as const

export type SupportStatus = keyof typeof SUPPORT_STATUS

/** Categoria → prioridade padrão + SLA em horas (servidor). */
export const CATEGORY_POLICY: Record<SupportCategory, { priority: SupportPriority; slaHours: number }> = {
  duvida: { priority: 'normal', slaHours: 24 },
  tecnico: { priority: 'alta', slaHours: 12 },
  financeiro: { priority: 'urgente', slaHours: 6 },
  'proxy-scraper': { priority: 'alta', slaHours: 12 },
  sugestao: { priority: 'baixa', slaHours: 72 },
}

export function isSupportCategory(v: unknown): v is SupportCategory {
  return typeof v === 'string' && v in SUPPORT_CATEGORIES
}

/** Soma horas a partir de agora e retorna ISO. */
export function slaDueFromNow(hours: number, from: Date = new Date()): string {
  const d = new Date(from)
  d.setHours(d.getHours() + hours)
  return d.toISOString()
}

/** SLA estourado? */
export function isSlaBreached(dueAt: string | null | undefined, status: string): boolean {
  if (!dueAt) return false
  if (status === 'resolvido' || status === 'fechado') return false
  return new Date(dueAt).getTime() < Date.now()
}
