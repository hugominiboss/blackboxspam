'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import {
  CaseSensitive,
  Check,
  ChevronLeft,
  ClipboardCopy,
  Columns3,
  Download,
  Eraser,
  KeyRound,
  Mail,
  Play,
  Upload,
  type LucideIcon,
} from 'lucide-react'
import LogoutButton from '@/app/components/logout-button'
import {
  LIMITE_SUGERIDO,
  contarLinhas,
  extrairEmails,
  filtrarColunas,
  filtrarPalavras,
  filtrarSenhas,
  limparEmails,
  type Opcoes,
} from '../_lib/processors'
import type { FerramentaIconKey, FerramentaMeta, FerramentaProcessadorKey } from '../_lib/tools'

const ICONES: Record<FerramentaIconKey, LucideIcon> = {
  mail: Mail,
  eraser: Eraser,
  columns: Columns3,
  words: CaseSensitive,
  key: KeyRound,
}

const PROCESSADORES: Record<
  FerramentaProcessadorKey,
  (input: string, opcoes: Opcoes) => string
> = {
  'extrair-emails': (input) => extrairEmails(input),
  'limpar-emails': (input) => limparEmails(input),
  'filtrar-colunas': (input, opcoes) => filtrarColunas(input, opcoes),
  'filtrar-palavras': (input) => filtrarPalavras(input),
  'filtrar-senhas': (input, opcoes) => filtrarSenhas(input, opcoes),
}

const fmt = (n: number) => n.toLocaleString('pt-BR')

const OPCOES_SEPARADOR = [
  { valor: 'auto', rotulo: 'Auto' },
  { valor: '\t', rotulo: 'Tab' },
  { valor: ';', rotulo: ';' },
  { valor: ',', rotulo: ',' },
  { valor: '|', rotulo: '|' },
  { valor: ':', rotulo: ':' },
  { valor: '/', rotulo: '/' },
] as const

type Stats = { entrada: number; saida: number; ms: number }

/**
 * Runner compartilhado de cada ferramenta gratuita (uma por página).
 *
 * Estratégia para listas de até 100.000 linhas:
 *  - `<textarea>` de entrada/saída sem `value` (não controlado): nenhum
 *    re-render do React a cada tecla/processamento sobre strings gigantes;
 *  - leitura/escrita via refs e estatísticas leves em estado;
 *  - processamento em uma passagem (ver `_lib/processors.ts`).
 */
export default function ToolRunner({ ferramenta }: { ferramenta: FerramentaMeta }) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const outputRef = useRef<HTMLTextAreaElement>(null)
  const Icone = ICONES[ferramenta.icon]
  const processarFerramenta = PROCESSADORES[ferramenta.processador]

  const [opcoes, setOpcoes] = useState<Opcoes>(() =>
    Object.fromEntries((ferramenta.opcoes ?? []).map((o) => [o.key, o.defaultValue])),
  )
  const [stats, setStats] = useState<Stats | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [processando, setProcessando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null)

  async function processar() {
    const entrada = inputRef.current?.value ?? ''
    if (!entrada.trim()) {
      if (outputRef.current) outputRef.current.value = ''
      setStats(null)
      setAviso('Cole a lista ou carregue um arquivo para processar.')
      return
    }

    setAviso(null)
    setProcessando(true)
    // Deixa a UI pintar o estado "Processando..." antes do trabalho pesado.
    await new Promise((resolver) => setTimeout(resolver, 16))

    try {
      const inicio = performance.now()
      const saida = processarFerramenta(entrada, opcoes)
      const ms = performance.now() - inicio

      if (outputRef.current) outputRef.current.value = saida

      const linhasEntrada = contarLinhas(entrada)
      const linhasSaida = contarLinhas(saida)
      setStats({ entrada: linhasEntrada, saida: linhasSaida, ms: Math.round(ms) })

      if (linhasEntrada > LIMITE_SUGERIDO) {
        setAviso(
          `Esta lista tem ${fmt(linhasEntrada)} linhas — acima do limite suportado de ${fmt(
            LIMITE_SUGERIDO,
          )} linhas. O processamento pode ficar mais lento.`,
        )
      } else if (linhasSaida === 0) {
        setAviso('Nenhum resultado encontrado para os filtros aplicados.')
      }
    } catch (erro) {
      setAviso(`Erro ao processar: ${erro instanceof Error ? erro.message : 'falha inesperada'}`)
    } finally {
      setProcessando(false)
    }
  }

  function carregarArquivo(event: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0]
    // Permite selecionar o mesmo arquivo novamente depois de limpar.
    event.target.value = ''
    if (!arquivo) return

    const leitor = new FileReader()
    leitor.onload = () => {
      if (inputRef.current) inputRef.current.value = String(leitor.result ?? '')
      if (outputRef.current) outputRef.current.value = ''
      setStats(null)
      setAviso(null)
      setNomeArquivo(arquivo.name)
    }
    leitor.onerror = () => setAviso('Não foi possível ler o arquivo escolhido.')
    leitor.readAsText(arquivo)
  }

  async function copiar() {
    const texto = outputRef.current?.value ?? ''
    if (!texto) {
      setAviso('Não há resultado para copiar.')
      return
    }
    try {
      await navigator.clipboard.writeText(texto)
    } catch {
      // Fallback para contexts sem Clipboard API (http, permissão negada).
      outputRef.current?.select()
      document.execCommand('copy')
      window.getSelection()?.removeAllRanges()
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1500)
  }

  function baixar() {
    const texto = outputRef.current?.value ?? ''
    if (!texto) {
      setAviso('Não há resultado para baixar.')
      return
    }
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${ferramenta.slug}-resultado.txt`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function limpar() {
    if (inputRef.current) inputRef.current.value = ''
    if (outputRef.current) outputRef.current.value = ''
    setStats(null)
    setAviso(null)
    setNomeArquivo(null)
    setCopiado(false)
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-black text-zinc-100 px-4 py-6 sm:p-6 md:p-12">
      <div className="w-full max-w-5xl mx-auto min-w-0">
        <Link
          href="/ferramentas/gratuitas"
          className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm mb-8 group w-fit"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Todas as
          ferramentas gratuitas
        </Link>

        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 min-w-0">
            <div className="p-3 bg-zinc-800/60 rounded-2xl text-zinc-300 shrink-0">
              <Icone className="w-7 h-7" />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight break-words">
                {ferramenta.nome}
              </h1>
              <p className="text-zinc-400 text-sm mt-1">{ferramenta.desc}</p>
            </div>
          </div>
          <LogoutButton />
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full">
            Suporta até <span className="text-amber-400 font-semibold">100.000 linhas</span> por
            processamento
          </span>
          <span className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full">
            Gratuito — não consome créditos
          </span>
        </div>

        {aviso && (
          <div className="mb-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm px-4 py-3 rounded-xl break-words">
            {aviso}
          </div>
        )}

        <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex flex-col min-w-0">
          <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
            <label
              htmlFor="ferramenta-entrada"
              className="text-xs font-bold uppercase tracking-widest text-zinc-400"
            >
              Entrada
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer hover:text-white transition-colors">
              <Upload className="w-4 h-4" />
              {nomeArquivo ? nomeArquivo : 'Carregar arquivo (.txt, .csv)'}
              <input
                type="file"
                accept=".txt,.csv,.tsv,.log,text/plain,text/csv"
                onChange={carregarArquivo}
                className="sr-only"
              />
            </label>
          </div>

          <textarea
            id="ferramenta-entrada"
            ref={inputRef}
            placeholder={ferramenta.placeholder}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 min-h-[220px] resize-y font-mono"
          />

          {ferramenta.opcoes && (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {ferramenta.opcoes.map((opcao) => (
                <label
                  key={opcao.key}
                  title={opcao.ajuda}
                  className="flex flex-col gap-1 text-xs text-zinc-400 min-w-0 bg-zinc-800/60 border border-zinc-800 rounded-lg p-2"
                >
                  <span className="font-bold uppercase tracking-widest text-[10px] text-zinc-500">
                    {opcao.label}
                  </span>
                  {opcao.tipo === 'separador' ? (
                    <select
                      value={String(opcoes[opcao.key] ?? opcao.defaultValue)}
                      onChange={(e) =>
                        setOpcoes((atual) => ({ ...atual, [opcao.key]: e.target.value }))
                      }
                      className="w-full min-w-0 p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
                    >
                      {OPCOES_SEPARADOR.map((s) => (
                        <option key={s.valor} value={s.valor}>
                          {s.rotulo}
                        </option>
                      ))}
                    </select>
                  ) : opcao.tipo === 'texto' ? (
                    <input
                      type="text"
                      placeholder={opcao.placeholder}
                      value={String(opcoes[opcao.key] ?? '')}
                      onChange={(e) =>
                        setOpcoes((atual) => ({ ...atual, [opcao.key]: e.target.value }))
                      }
                      className="w-full min-w-0 p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white font-mono placeholder:text-zinc-600"
                    />
                  ) : (
                    <span className="flex items-center gap-2 min-w-0">
                      <input
                        type="number"
                        min={opcao.min ?? 0}
                        value={Number(opcoes[opcao.key] ?? 0)}
                        onChange={(e) =>
                          setOpcoes((atual) => ({
                            ...atual,
                            [opcao.key]: e.target.value === '' ? 0 : Number(e.target.value),
                          }))
                        }
                        className="w-full min-w-0 p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
                      />
                    </span>
                  )}
                  {opcao.ajuda && (
                    <span className="text-[11px] text-zinc-500 leading-snug">{opcao.ajuda}</span>
                  )}
                </label>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={processar}
              disabled={processando}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-wait"
            >
              <Play className="w-4 h-4" />
              {processando ? 'Processando…' : ferramenta.buttonLabel}
            </button>
            <button
              onClick={copiar}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-semibold text-zinc-200 transition-colors"
            >
              {copiado ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <ClipboardCopy className="w-4 h-4" />
              )}
              {copiado ? 'Copiado!' : 'Copiar'}
            </button>
            <button
              onClick={baixar}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-semibold text-zinc-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              Baixar .txt
            </button>
            <button
              onClick={limpar}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-semibold text-zinc-200 transition-colors ml-auto"
            >
              <Eraser className="w-4 h-4" />
              Limpar
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-zinc-500 uppercase tracking-widest font-bold">Resultado</span>
            {stats && (
              <>
                <span className="bg-zinc-800 border border-zinc-700 px-2 py-1 rounded-full text-zinc-300 font-mono">
                  entrada: {fmt(stats.entrada)} linhas
                </span>
                <span className="bg-zinc-800 border border-zinc-700 px-2 py-1 rounded-full text-emerald-300 font-mono">
                  saída: {fmt(stats.saida)} linhas
                </span>
                <span className="bg-zinc-800 border border-zinc-700 px-2 py-1 rounded-full text-zinc-400 font-mono">
                  {fmt(stats.ms)} ms
                </span>
              </>
            )}
          </div>

          <textarea
            ref={outputRef}
            readOnly
            placeholder="O resultado aparece aqui"
            spellCheck={false}
            className="w-full mt-2 p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-emerald-200 placeholder:text-zinc-500 min-h-[220px] resize-y font-mono"
          />
        </div>
      </div>
    </div>
  )
}


