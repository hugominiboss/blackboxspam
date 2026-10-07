/**
 * Processadores puros das Ferramentas Gratuitas.
 *
 * Regras de desempenho (cada ferramenta precisa suportar até 100.000 linhas):
 *  - uma única passagem sobre a lista (sem `.map().filter()` encadeados);
 *  - deduplicação via `Set` (O(1) por item) em vez de `indexOf`/`includes`;
 *  - sem regex com backtracking potencialmente catastrófico sobre a lista inteira;
 *  - sem dependências de React (testáveis isoladamente via Node).
 */

/** Limite recomendado de linhas por ferramenta. */
export const LIMITE_SUGERIDO = 100_000

/** Opções numéricas das ferramentas (ex.: faixa de tamanho da senha). */
export type Opcoes = Record<string, number>

/** Conta linhas de um texto sem materializar o array de linhas na memória. */
export function contarLinhas(texto: string): number {
  if (!texto) return 0
  let linhas = 1
  for (let i = 0; i < texto.length; i++) {
    if (texto.charCodeAt(i) === 10) linhas++
  }
  // Última linha não termina em quebra => não conta o "fantasma" final.
  if (texto.charCodeAt(texto.length - 1) === 10) linhas--
  return linhas
}

/* ─── Email Extractor ─────────────────────────────────────────────── */

const REGEX_EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

export function extrairEmails(input: string): string {
  if (!input) return ''
  const encontrados = input.match(REGEX_EMAIL)
  return encontrados ? encontrados.join('\n') : ''
}

/* ─── Email Cleaner ───────────────────────────────────────────────── */

export function limparEmails(input: string): string {
  if (!input) return ''
  const vistos = new Set<string>()
  const saida: string[] = []
  // Separa por quebra de linha, vírgula, ponto-e-vírgula ou espaço em branco.
  for (const bruto of input.split(/[\s,;]+/)) {
    if (!bruto) continue
    const email = bruto.trim()
    if (!email || !email.includes('@')) continue
    const chave = email.toLowerCase()
    if (vistos.has(chave)) continue
    vistos.add(chave)
    saida.push(email)
  }
  return saida.join('\n')
}

/* ─── Columns Filter ──────────────────────────────────────────────── */

/** Remove linhas vazias e espaços sobrando dentro de cada coluna. */
export function filtrarColunas(input: string): string {
  if (!input) return ''
  const saida: string[] = []
  for (const bruto of input.split('\n')) {
    let linha = bruto
    if (linha.endsWith('\r')) linha = linha.slice(0, -1)
    if (!linha.trim()) continue

    const delimitador = linha.includes('\t')
      ? '\t'
      : linha.includes(';')
        ? ';'
        : linha.includes(',')
          ? ','
          : null

    if (!delimitador) {
      // Texto solto: só colapsa espaços repetidos.
      saida.push(linha.trim().replace(/[ \u00a0]{2,}/g, ' '))
      continue
    }

    // Preserva a quantidade de colunas (alinha CSV/TSV/; ), aparando apenas
    // cada campo — derrubar colunas vazias desalinaria as demais linhas.
    // Importante: NÃO aparar a linha inteira antes do split, senão os
    // delimitadores vazios das pontas somem e as colunas desalinham.
    const colunas = linha.split(delimitador)
    for (let i = 0; i < colunas.length; i++) {
      colunas[i] = colunas[i].trim().replace(/[ \u00a0]{2,}/g, ' ')
    }
    saida.push(colunas.join(delimitador))
  }
  return saida.join('\n')
}

/* ─── Words Filter ────────────────────────────────────────────────── */

/** Remove palavras repetidas (ignora maiúsculas/minúsculas) — 1 por linha. */
export function filtrarPalavras(input: string): string {
  if (!input) return ''
  const vistos = new Set<string>()
  const saida: string[] = []
  for (const bruto of input.split(/\s+/)) {
    if (!bruto) continue
    const chave = bruto.toLowerCase()
    if (vistos.has(chave)) continue
    vistos.add(chave)
    saida.push(bruto)
  }
  return saida.join('\n')
}

/* ─── Password Length Filter ──────────────────────────────────────── */

/**
 * Mantém apenas senhas dentro da faixa de tamanho.
 * `opcoes.max <= 0` significa "sem limite máximo".
 */
export function filtrarSenhas(input: string, opcoes: Opcoes): string {
  if (!input) return ''
  const min = Number.isFinite(opcoes.min) ? Math.max(0, opcoes.min) : 0
  const max = Number.isFinite(opcoes.max) ? Math.max(0, opcoes.max) : 0
  const saida: string[] = []
  for (const bruto of input.split(/[\s,;]+/)) {
    if (!bruto) continue
    if (bruto.length < min) continue
    if (max > 0 && bruto.length > max) continue
    saida.push(bruto)
  }
  return saida.join('\n')
}
