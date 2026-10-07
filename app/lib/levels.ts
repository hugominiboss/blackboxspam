/**
 * Sistema de níveis (Status) por créditos GASTOS (acumulado `total_spent`).
 *
 * Hierarquia: Bronze → Silver → Gold → Platinum → Black.
 * O nível é DERIVADO do gasto — nunca confiável vindo do cliente.
 * `level` no banco é cache/espelho para leitura rápida; a fonte
 * canônica é `total_spent` + esta tabela de limites.
 */

export const NIVEIS = [
  { nome: 'Bronze', min: 0, cor: 'text-amber-700', glow: '', barra: 'from-amber-700 to-amber-500' },
  { nome: 'Silver', min: 200, cor: 'text-zinc-300', glow: '', barra: 'from-zinc-400 to-zinc-200' },
  { nome: 'Gold', min: 600, cor: 'text-yellow-400', glow: '', barra: 'from-yellow-500 to-amber-300' },
  { nome: 'Platinum', min: 1500, cor: 'text-cyan-300', glow: '', barra: 'from-cyan-400 to-sky-200' },
  { nome: 'Black', min: 3000, cor: 'text-white', glow: 'drop-shadow-[0_0_12px_rgba(255,255,255,0.45)]', barra: 'from-zinc-700 to-white' },
] as const

export type NomeNivel = (typeof NIVEIS)[number]['nome']

export type ProgressoNivel = {
  atual: NomeNivel
  proximo: NomeNivel | null
  /** Créditos gastos acumulados. */
  gasto: number
  /** Quanto falta para o próximo nível (0 se já for Black). */
  falta: number
  /** 0..100 para a barra de progresso. */
  percentual: number
  /** Índice do nível atual em NIVEIS. */
  indice: number
}

/** Deriva o nível atual a partir do total gasto. */
export function nivelParaGasto(totalSpent: number): ProgressoNivel {
  const gasto = Math.max(0, Math.floor(totalSpent || 0))
  let indice = 0
  for (let i = 0; i < NIVEIS.length; i++) {
    if (gasto >= NIVEIS[i].min) indice = i
  }
  const atual = NIVEIS[indice]
  const proximo = NIVEIS[indice + 1] ?? null

  if (!proximo) {
    return { atual: atual.nome, proximo: null, gasto, falta: 0, percentual: 100, indice }
  }

  const faixa = proximo.min - atual.min
  const andado = gasto - atual.min
  const percentual = faixa > 0 ? Math.min(100, Math.max(0, (andado / faixa) * 100)) : 100
  return {
    atual: atual.nome,
    proximo: proximo.nome,
    gasto,
    falta: proximo.min - gasto,
    percentual: Math.round(percentual),
    indice,
  }
}

/** Metadados visuais de um nível (ícone/cor tratados no componente). */
export function metaNivel(nome: string) {
  return NIVEIS.find((n) => n.nome === nome) ?? NIVEIS[0]
}
