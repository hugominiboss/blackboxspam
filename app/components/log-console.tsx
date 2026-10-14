'use client'
import { useEffect, useRef, useState } from 'react'
import { Terminal } from 'lucide-react'

/**
 * Console de Logs estilo terminal — clone da estética do QuadCore
 * (LiveJobCard + fonte mono + timestamps + cursor piscante).
 * Hook `useLogConsole` gerencia as linhas; `LogConsole` renderiza com
 * auto-scroll, cor por nível e um prompt `$` com cursor blink.
 * Não altera nenhuma lógica de negócio — apenas exibe eventos.
 */

export type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'cmd'

export interface LogLine {
  id: number
  level: LogLevel
  text: string
  ts: string
}

export function useLogConsole() {
  const [lines, setLines] = useState<LogLine[]>([])
  const seq = useRef(0)

  const log = (level: LogLevel, text: string) => {
    const ts = new Date().toLocaleTimeString('pt-BR', { hour12: false })
    setLines((prev) => [...prev.slice(-199), { id: seq.current++, level, text, ts }])
  }

  const clear = () => setLines([])

  return { lines, log, clear }
}

const LEVEL_MARK: Record<LogLevel, string> = {
  info: '·',
  success: '+',
  warn: '!',
  error: 'x',
  cmd: '>',
}

const LEVEL_CLASS: Record<LogLevel, string> = {
  info: 'text-muted',
  success: 'text-good',
  warn: 'text-warn',
  error: 'text-danger',
  cmd: 'text-accent',
}

export function LogConsole({
  lines,
  title = 'console',
  emptyHint,
}: {
  lines: LogLine[]
  title?: string
  emptyHint?: string
}) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [lines])

  return (
    <div className="panel flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line bg-raised/60 px-3 py-2">
        <Terminal className="h-3.5 w-3.5 text-accent" />
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">{title}</span>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-faint">
          <span className="h-1.5 w-1.5 animate-blink rounded-full bg-good" /> live
        </span>
      </div>
      <div className="max-h-72 min-h-[150px] overflow-y-auto px-3 py-2 font-mono text-xs leading-relaxed">
        {lines.length === 0 && emptyHint ? <div className="text-faint">{emptyHint}</div> : null}
        {lines.map((l) => (
          <div key={l.id} className="flex gap-2 animate-rise">
            <span className="shrink-0 tabular-nums text-faint">{l.ts}</span>
            <span className={`shrink-0 ${LEVEL_CLASS[l.level]}`}>{LEVEL_MARK[l.level]}</span>
            <span className={`break-all ${LEVEL_CLASS[l.level]}`}>{l.text}</span>
          </div>
        ))}
        <div ref={endRef} className="flex items-center gap-1">
          <span className="text-accent">$</span>
          <span className="inline-block h-3.5 w-1.5 animate-blink bg-accent" />
        </div>
      </div>
    </div>
  )
}
