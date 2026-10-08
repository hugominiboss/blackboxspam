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

/** Opções das ferramentas — numéricas ou texto (ex.: faixa de senha, colunas). */
export type Opcoes = Record<string, number | string>

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

/** Separadores suportados na extração de colunas (ordem de prioridade). */
const SEPARADORES_COLUNA = ['\t', ';', ',', '|', ':', '/'] as const

/**
 * Quebra a linha em colunas respeitando aspas simples/duplas — um
 * separador dentro de `'...'` ou `"..."` não divide a coluna. As aspas
 * externas são removidas do valor final.
 */
function dividirColunas(linha: string, sep: string): string[] {
  const colunas: string[] = []
  let atual = ''
  let aspas: "'" | '"' | null = null
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i]
    if (aspas) {
      if (ch === aspas) {
        aspas = null
      } else {
        atual += ch
      }
    } else if (ch === "'" || ch === '"') {
      aspas = ch
    } else if (ch === sep) {
      colunas.push(atual)
      atual = ''
    } else {
      atual += ch
    }
  }
  colunas.push(atual)
  return colunas
}

/**
 * Interpreta a seleção de colunas digitada pelo usuário (ex.: `1,3`).
 * Aceita números separados por vírgula/espaço/ponto-e-vírgula, inclusive
 * faixas como `1-3`. Retorna índices 1-based únicos em ordem crescente.
 */
export function interpretarSelecaoColunas(selecao: string): number[] {
  const indices = new Set<number>()
  for (const parte of String(selecao ?? '').split(/[,\s;]+/)) {
    if (!parte) continue
    const faixa = parte.match(/^(\d+)\s*-\s*(\d+)$/)
    if (faixa) {
      const inicio = Math.max(1, parseInt(faixa[1], 10))
      const fim = Math.max(1, parseInt(faixa[2], 10))
      const [de, ate] = inicio <= fim ? [inicio, fim] : [fim, inicio]
      for (let i = de; i <= ate && indices.size < 1000; i++) indices.add(i)
      continue
    }
    const n = parseInt(parte, 10)
    if (Number.isFinite(n) && n >= 1) indices.add(Math.floor(n))
    if (indices.size >= 1000) break
  }
  return [...indices].sort((a, b) => a - b)
}

/**
 * Detecta o separador da linha: o candidato com mais ocorrências FORA de
 * aspas vence. Retorna `null` quando nenhum separador aparece.
 */
function detectarSeparador(linha: string): string | null {
  let melhor: string | null = null
  let melhorQtd = 0
  for (const sep of SEPARADORES_COLUNA) {
    let qtd = 0
    let aspas: "'" | '"' | null = null
    for (let i = 0; i < linha.length; i++) {
      const ch = linha[i]
      if (aspas) {
        if (ch === aspas) aspas = null
      } else if (ch === "'" || ch === '"') {
        aspas = ch
      } else if (ch === sep) {
        qtd++
      }
    }
    if (qtd > melhorQtd) {
      melhorQtd = qtd
      melhor = sep
    }
  }
  return melhor
}

const colapsarEspacos = (texto: string) => texto.trim().replace(/[ \u00a0]{2,}/g, ' ')

/**
 * Normaliza uma linha de dump SQL: remove parênteses de borda `(...)`,
 * vírgula/ponto-e-vírgula final de statement e aspas residuais soltas.
 * Só mexe nas bordas — o miolo da linha vai para `dividirColunas`.
 */
function normalizarLinhaSql(linha: string): string {
  let s = linha.trim()
  // Remove `INSERT INTO ... VALUES` / prefixos até o primeiro parêntese.
  const paren = s.indexOf('(')
  const ini = s.slice(0, 12).toLowerCase()
  const temValues = ini.startsWith('insert') || ini.startsWith('values') || s.startsWith('(')
  if (temValues && paren > 0) s = s.slice(paren).trim()
  // Tira `;` final de statement e `,` final de tupla.
  while (s.endsWith(';')) s = s.slice(0, -1).trim()
  if (s.endsWith(',') && (s.startsWith('(') || s.endsWith('),'))) {
    s = s.slice(0, -1).trim()
  }
  // Tira parênteses de borda balanceados.
  if (s.startsWith('(') && s.endsWith(')')) {
    s = s.slice(1, -1).trim()
  } else {
    if (s.startsWith('(')) s = s.slice(1).trim()
    if (s.endsWith(')')) s = s.slice(0, -1).trim()
  }
  return s
}

/**
 * Dumps SQL costumam quebrar UMA tupla em várias linhas físicas
 * (cada campo numa linha). Reagrupa por balanço de parênteses fora de
 * aspas: enquanto houver `(` aberto, acumula a próxima linha.
 */
function reagruparTuplas(linhas: string[]): string[] {
  const grupos: string[] = []
  let buffer = ''
  let saldo = 0
  let emAspas: "'" | '"' | null = null

  const saldoParenteses = (texto: string): number => {
    let delta = 0
    for (let i = 0; i < texto.length; i++) {
      const ch = texto[i]
      if (emAspas) {
        if (ch === emAspas) emAspas = null
      } else if (ch === "'" || ch === '"') {
        emAspas = ch
      } else if (ch === '(') {
        delta++
      } else if (ch === ')') {
        delta--
      }
    }
    return delta
  }

  for (const crua of linhas) {
    let linha = crua
    if (linha.endsWith('\r')) linha = linha.slice(0, -1)
    if (!linha.trim() && !buffer) continue
    buffer = buffer ? `${buffer} ${linha.trim()}` : linha
    saldo += saldoParenteses(linha)
    // Fecha o grupo quando os parênteses equilibram (ou nunca abriram).
    if (saldo <= 0) {
      saldo = 0
      emAspas = null
      if (buffer.trim()) grupos.push(buffer)
      buffer = ''
    }
  }
  if (buffer.trim()) grupos.push(buffer)
  return grupos
}

/**
 * Extrai as colunas selecionadas de cada linha.
 *
 * - Separadores: tab, `;`, `,`, `|`, `:`, `/` (auto-detectado por linha);
 * - Aspas `'...'`/`"..."` protegem o separador interno (dumps SQL);
 * - `opcoes.colunas` ex.: `1,3` ou `1-3` (1-based). Vazio => modo limpeza
 *   antigo (remove linhas vazias e aparas cada coluna com o separador de
 *   origem preservado);
 * - `opcoes.separador` força um separador; `auto` (padrão) detecta;
 * - a saída junta as colunas com `opcoes.separadorSaida` (padrão: `, `).
 */
export function filtrarColunas(input: string, opcoes: Opcoes = {}): string {
  if (!input) return ''
  const selecao = interpretarSelecaoColunas(String(opcoes.colunas ?? ''))
  const modoExtracao = selecao.length > 0
  const forçado = String(opcoes.separador ?? 'auto')
  const sepForçado = forçado !== 'auto' && forçado !== '' ? forçado : null
  const sepSaida = String(opcoes.separadorSaida ?? ', ')

  const saida: string[] = []
  const linhasFisicas = input.split('\n')
  // Só reagrupa por parênteses quando a entrada tem cara de dump SQL —
  // CSV/TSV normal com parênteses no texto não deve ser juntado.
  const pareceDump = linhasFisicas.some((l) => {
    const t = l.trimStart().toLowerCase()
    if (t.startsWith('insert') || t.startsWith('values') || t.startsWith('(')) return true
    // Tupla numérica: `( 33 , ...`
    const p = l.indexOf('(')
    if (p >= 0) {
      const apos = l.slice(p + 1).trimStart()
      let k = 0
      while (k < apos.length && apos[k] >= '0' && apos[k] <= '9') k++
      if (k > 0 && apos.slice(k).trimStart().startsWith(',')) return true
    }
    return false
  })
  const registros = pareceDump ? reagruparTuplas(linhasFisicas) : linhasFisicas

  for (const bruto of registros) {
    let linha = bruto
    if (linha.endsWith('\r')) linha = linha.slice(0, -1)
    if (!linha.trim()) continue
    // Normaliza bordas de tupla SQL antes de detectar/dividir.
    if (pareceDump) linha = normalizarLinhaSql(linha)
    if (!linha) continue

    const delimitador = sepForçado ?? detectarSeparador(linha)

    if (!delimitador) {
      // Texto solto: só colapsa espaços repetidos.
      saida.push(colapsarEspacos(linha))
      continue
    }

    const colunas = dividirColunas(linha, delimitador)

    if (!modoExtracao) {
      // Sem seleção => comportamento antigo de limpeza.
      for (let i = 0; i < colunas.length; i++) {
        colunas[i] = colapsarEspacos(colunas[i])
      }
      saida.push(colunas.join(delimitador))
      continue
    }

    const extraidas: string[] = []
    for (const n of selecao) {
      const valor = colunas[n - 1]
      if (valor === undefined) continue
      extraidas.push(colapsarEspacos(valor))
    }
    if (extraidas.length === 0) continue
    saida.push(extraidas.join(sepSaida))
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
  const min = Number.isFinite(Number(opcoes.min)) ? Math.max(0, Number(opcoes.min)) : 0
  const max = Number.isFinite(Number(opcoes.max)) ? Math.max(0, Number(opcoes.max)) : 0
  const saida: string[] = []
  for (const bruto of input.split(/[\s,;]+/)) {
    if (!bruto) continue
    if (bruto.length < min) continue
    if (max > 0 && bruto.length > max) continue
    saida.push(bruto)
  }
  return saida.join('\n')
}
