'use client'
import { useRef, useState } from 'react'
import {
  CaseSensitive,
  Check,
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
import { AppShell } from '@/app/components/app-shell'
import { PageHeader, Panel } from '@/app/components/qc-ui'
import { LogConsole, useLogConsole } from '@/app/components/log-console'
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

  // Console de logs estilo terminal (apenas exibição — não altera a lógica).
  const { lines, log } = useLogConsole()

  async function processar() {
    const entrada = inputRef.current?.value ?? ''
    if (!entrada.trim()) {
      if (outputRef.current) outputRef.current.value = ''
      setStats(null)
      setAviso('Cole a lista ou carregue um arquivo para processar.')
      log('warn', 'entrada vazia — nada a processar')
      return
    }

    setAviso(null)
    setProcessando(true)
    log('cmd', `executando ${ferramenta.processador}…`)
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
        log('warn', `${fmt(linhasEntrada)} linhas — acima do limite sugerido`)
      } else if (linhasSaida === 0) {
        setAviso('Nenhum resultado encontrado para os filtros aplicados.')
        log('warn', 'nenhum resultado para os filtros aplicados')
      } else {
        log('success', `${fmt(linhasEntrada)} → ${fmt(linhasSaida)} linhas em ${Math.round(ms)} ms`)
      }
    } catch (erro) {
      setAviso(`Erro ao processar: ${erro instanceof Error ? erro.message : 'falha inesperada'}`)
      log('error', `falha ao processar: ${erro instanceof Error ? erro.message : 'erro inesperado'}`)
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
      log('info', `arquivo carregado: ${arquivo.name}`)
    }
    leitor.onerror = () => {
      setAviso('Não foi possível ler o arquivo escolhido.')
      log('error', 'falha ao ler o arquivo')
    }
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
    log('success', 'resultado copiado para a área de transferência')
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
    log('success', `download iniciado: ${ferramenta.slug}-resultado.txt`)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function limpar() {
    if (inputRef.current) inputRef.current.value = ''
    if (outputRef.current) outputRef.current.value = ''
    setStats(null)
    setAviso(null)
    setNomeArquivo(null)
    setCopiado(false)
    log('info', 'área de trabalho limpa')
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Ferramenta gratuita"
        title={ferramenta.nome}
        subtitle={ferramenta.desc}
        icon={<Icone className="h-5 w-5" />}
        actions={<LogoutButton />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 font-mono text-xs text-faint">
        <span className="chip">
          Suporta até <span className="font-semibold text-accent">100.000 linhas</span> por
          processamento
        </span>
        <span className="chip">Gratuito — não consome créditos</span>
      </div>

      {aviso && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 font-mono text-xs text-warn">
          <span className="mt-0.5 shrink-0">!</span>
          <span className="break-words">{aviso}</span>
        </div>
      )}

        <Panel className="mb-4 flex flex-col p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <label
              htmlFor="ferramenta-entrada"
              className="label mb-0"
            >
              Entrada
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted transition-colors hover:text-ink">
              <Upload className="h-4 w-4" />
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
            className="textarea-io min-h-[220px]"
          />

          {ferramenta.opcoes && (
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {ferramenta.opcoes.map((opcao) => (
                <label
                  key={opcao.key}
                  title={opcao.ajuda}
                  className="flex min-w-0 flex-col gap-1 rounded-lg border border-line bg-raised/60 p-2 text-xs text-muted"
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-faint">
                    {opcao.label}
                  </span>
                  {opcao.tipo === 'separador' ? (
                    <select
                      value={String(opcoes[opcao.key] ?? opcao.defaultValue)}
                      onChange={(e) =>
                        setOpcoes((atual) => ({ ...atual, [opcao.key]: e.target.value }))
                      }
                      className="w-full min-w-0 rounded-lg border border-line bg-raised p-2 text-sm text-ink"
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
                      className="w-full min-w-0 rounded-lg border border-line bg-raised p-2 font-mono text-sm text-ink placeholder:text-faint"
                    />
                  ) : (
                    <span className="flex min-w-0 items-center gap-2">
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
                        className="w-full min-w-0 rounded-lg border border-line bg-raised p-2 text-sm text-ink"
                      />
                    </span>
                  )}
                  {opcao.ajuda && (
                    <span className="text-[11px] leading-snug text-faint">{opcao.ajuda}</span>
                  )}
                </label>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={processar}
              disabled={processando}
              className="btn btn-primary disabled:cursor-wait disabled:opacity-60"
            >
              <Play className="h-4 w-4" />
              {processando ? 'Processando…' : ferramenta.buttonLabel}
            </button>
            <button onClick={copiar} className="btn">
              {copiado ? (
                <Check className="h-4 w-4 text-good" />
              ) : (
                <ClipboardCopy className="h-4 w-4" />
              )}
              {copiado ? 'Copiado!' : 'Copiar'}
            </button>
            <button onClick={baixar} className="btn">
              <Download className="h-4 w-4" />
              Baixar .txt
            </button>
            <button onClick={limpar} className="btn ml-auto">
              <Eraser className="h-4 w-4" />
              Limpar
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="label mb-0">Resultado</span>
            {stats && (
              <>
                <span className="font-mono text-faint">
                  entrada: <span className="text-muted">{fmt(stats.entrada)} linhas</span>
                </span>
                <span className="font-mono text-faint">
                  saída: <span className="text-good">{fmt(stats.saida)} linhas</span>
                </span>
                <span className="font-mono text-faint">{fmt(stats.ms)} ms</span>
              </>
            )}
          </div>

          <textarea
            ref={outputRef}
            readOnly
            placeholder="O resultado aparece aqui"
            spellCheck={false}
            className="textarea-io mt-2 min-h-[220px] text-good"
          />
        </Panel>

        {/* Console de logs estilo terminal — mostra cada etapa do processamento. */}
        <div className="mt-4">
          <LogConsole
            lines={lines}
            emptyHint="Execute uma ferramenta para ver os logs do processamento."
            title="console.log — BlackBoxSpam"
          />
        </div>
    </AppShell>
  )
}


