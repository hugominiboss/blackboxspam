import { CaseSensitive, Columns3, Eraser, KeyRound, Mail, type LucideIcon } from 'lucide-react'
import {
  extrairEmails,
  filtrarColunas,
  filtrarPalavras,
  filtrarSenhas,
  limparEmails,
  type Opcoes,
} from './processors'

export type FerramentaOpcao = {
  key: string
  label: string
  /** Tipo do campo: número (padrão) ou texto/select customizado. */
  tipo?: 'numero' | 'texto' | 'separador'
  defaultValue: number | string
  min?: number
  placeholder?: string
  ajuda?: string
}

/** Chaves de processador — o `ToolRunner` (client) resolve a função real. */
export type FerramentaProcessadorKey =
  | 'extrair-emails'
  | 'limpar-emails'
  | 'filtrar-colunas'
  | 'filtrar-palavras'
  | 'filtrar-senhas'

/** Chaves de ícone — o `ToolRunner` (client) resolve o componente real. */
export type FerramentaIconKey = 'mail' | 'eraser' | 'columns' | 'words' | 'key'

/**
 * Metadados serializáveis da ferramenta — podem cruzar o boundary
 * server → client sem violar o prerender (sem funções/componentes).
 */
export type FerramentaMeta = {
  slug: string
  nome: string
  desc: string
  icon: FerramentaIconKey
  placeholder: string
  buttonLabel: string
  opcoes?: FerramentaOpcao[]
  processador: FerramentaProcessadorKey
}

export type FerramentaGratuita = FerramentaMeta & {
  iconComponent: LucideIcon
  process: (input: string, opcoes: Opcoes) => string
}

const ICONES: Record<FerramentaIconKey, LucideIcon> = {
  mail: Mail,
  eraser: Eraser,
  columns: Columns3,
  words: CaseSensitive,
  key: KeyRound,
}

const PROCESSADORES: Record<FerramentaProcessadorKey, (input: string, opcoes: Opcoes) => string> = {
  'extrair-emails': (input) => extrairEmails(input),
  'limpar-emails': (input) => limparEmails(input),
  'filtrar-colunas': (input, opcoes) => filtrarColunas(input, opcoes),
  'filtrar-palavras': (input) => filtrarPalavras(input),
  'filtrar-senhas': (input, opcoes) => filtrarSenhas(input, opcoes),
}

/** Catálogo canônico — fonte única para menu, páginas e metadados. */
const CATALOGO: FerramentaMeta[] = [
  {
    slug: 'extrair-emails',
    nome: 'Email Extractor',
    desc: 'Extrai todos os e-mails de um texto, HTML ou lista bagunçada.',
    icon: 'mail',
    placeholder: 'Cole aqui o texto, HTML ou lista que contém e-mails…',
    buttonLabel: 'Extrair E-mails',
    processador: 'extrair-emails',
  },
  {
    slug: 'limpar-emails',
    nome: 'Email Cleaner',
    desc: 'Remove e-mails duplicados, inválidos e espaços em branco.',
    icon: 'eraser',
    placeholder: 'Cole a lista de e-mails aqui (quebra de linha, vírgula ou ponto-e-vírgula)…',
    buttonLabel: 'Limpar E-mails',
    processador: 'limpar-emails',
  },
  {
    slug: 'filtrar-colunas',
    nome: 'Columns Filter',
    desc: 'Extrai colunas por posição (ex.: 1,3) com separador auto-detectado: vírgula, ponto-e-vírgula, barra, dois-pontos, pipe ou tab.',
    icon: 'columns',
    placeholder: "Cole os dados aqui (CSV, dump SQL, lista com , ; / : | ou tab)…\nEx.: (33, 'Maria Silva', 'maria@hotmail.com', NULL, '2020-11-05 18:23:12')",
    buttonLabel: 'Extrair Colunas',
    opcoes: [
      { key: 'colunas', label: 'Colunas', tipo: 'texto', defaultValue: '1,3', placeholder: 'Ex.: 1,3 ou 1-3 (vazio = só limpar)', ajuda: 'Posições 1-based. Ex.: 1,3 extrai a 1ª e a 3ª coluna.' },
      { key: 'separador', label: 'Separador', tipo: 'separador', defaultValue: 'auto', ajuda: 'Auto detecta por linha: tab ; , | : /.' },
      { key: 'separadorSaida', label: 'Saída', tipo: 'texto', defaultValue: ', ', placeholder: ', ', ajuda: 'Junção das colunas extraídas.' },
    ],
    processador: 'filtrar-colunas',
  },
  {
    slug: 'filtrar-palavras',
    nome: 'Words Filter',
    desc: 'Remove palavras repetidas do texto (ignora maiúsculas/minúsculas).',
    icon: 'words',
    placeholder: 'Cole o texto aqui…',
    buttonLabel: 'Filtrar Palavras',
    processador: 'filtrar-palavras',
  },
  {
    slug: 'filtrar-senhas',
    nome: 'Password Length Filter',
    desc: 'Mantém apenas senhas dentro da faixa de tamanho informada.',
    icon: 'key',
    placeholder: 'Cole as senhas aqui (separadas por espaço, vírgula ou quebra de linha)…',
    buttonLabel: 'Filtrar Senhas',
    opcoes: [
      { key: 'min', label: 'Mín.', defaultValue: 8, min: 0 },
      { key: 'max', label: 'Máx. (0 = sem limite)', defaultValue: 64, min: 0 },
    ],
    processador: 'filtrar-senhas',
  },
]

/**
 * Registro das ferramentas gratuitas — cada `slug` vira uma página própria
 * em `/ferramentas/gratuitas/[slug]` e é listado no menu de ferramentas.
 *
 * Versão hidratada (client): inclui componente de ícone e função real —
 * usar apenas em Client Components (`menu`, `ToolRunner`).
 */
export const FERRAMENTAS_GRATUITAS: FerramentaGratuita[] = CATALOGO.map((meta) => ({
  ...meta,
  iconComponent: ICONES[meta.icon],
  process: PROCESSADORES[meta.processador],
}))

/** Slugs válidos — usado para pré-renderizar cada página em `generateStaticParams`. */
export function getSlugsFerramentasGratuitas(): string[] {
  return CATALOGO.map((ferramenta) => ferramenta.slug)
}

/** Metadados serializáveis (server-safe) — para `page.tsx`/`layout.tsx` do `[slug]`. */
export function getFerramentaMeta(slug: string): FerramentaMeta | undefined {
  return CATALOGO.find((ferramenta) => ferramenta.slug === slug)
}

/** Versão hidratada (client) — para menu e `ToolRunner` já no browser. */
export function getFerramentaGratuita(slug: string): FerramentaGratuita | undefined {
  const meta = getFerramentaMeta(slug)
  if (!meta) return undefined
  return { ...meta, iconComponent: ICONES[meta.icon], process: PROCESSADORES[meta.processador] }
}
