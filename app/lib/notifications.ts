/**
 * Sistema de Notificações — tipos e links (lado cliente + servidor).
 * O envio real (INSERT) acontece SÓ no servidor via notify-server.ts.
 */

export const NOTIF_TYPES = {
  ticket_resposta: { id: 'ticket_resposta', label: 'Resposta no ticket', linkBase: '/suporte/' },
  ticket_fechado: { id: 'ticket_fechado', label: 'Ticket encerrado', linkBase: '/suporte/' },
  creditos_topup: { id: 'creditos_topup', label: 'Créditos adicionados', linkBase: '/perfil' },
  creditos_insuficientes: { id: 'creditos_insuficientes', label: 'Saldo insuficiente', linkBase: '/perfil/pagamentos' },
  unlock: { id: 'unlock', label: 'Conteúdo desbloqueado', linkBase: '/' },
  level_up: { id: 'level_up', label: 'Subiu de nível', linkBase: '/perfil' },
  proxy_criada: { id: 'proxy_criada', label: 'Licença Proxy criada', linkBase: '/ferramentas' },
  proxy_expirando: { id: 'proxy_expirando', label: 'Proxy expirando', linkBase: '/ferramentas' },
  proxy_expirada: { id: 'proxy_expirada', label: 'Proxy expirada', linkBase: '/ferramentas' },
  anuncio: { id: 'anuncio', label: 'Aviso', linkBase: '/' },
} as const

export type NotifType = keyof typeof NOTIF_TYPES

export type Notif = {
  id: string
  type: NotifType
  title: string
  body: string
  link: string | null
  metadata: Record<string, any>
  read_at: string | null
  created_at: string
}

/** Preferências padrão (tudo ligado). Chave ausente = ligado. */
export const PREF_KEYS = [
  { id: 'ticket_resposta', label: 'Respostas de tickets' },
  { id: 'creditos', label: 'Créditos e saldo' },
  { id: 'progresso', label: 'Níveis e desbloqueios' },
  { id: 'proxy', label: 'Proxy Scraper' },
  { id: 'anuncio', label: 'Avisos gerais' },
] as const

/** Mapeia tipo → grupo de preferência. 'anuncio' respeita o próprio grupo. */
export function prefGroupFor(type: NotifType): string {
  if (type === 'ticket_resposta' || type === 'ticket_fechado') return 'ticket_resposta'
  if (type === 'creditos_topup' || type === 'creditos_insuficientes') return 'creditos'
  if (type === 'unlock' || type === 'level_up') return 'progresso'
  if (type === 'proxy_criada' || type === 'proxy_expirando' || type === 'proxy_expirada') return 'proxy'
  return 'anuncio'
}

/** Tempo relativo curto em pt-BR ("agora", "5min", "2h", "3d"). */
export function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'agora'
  const min = Math.floor(ms / 60_000)
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}
