'use client'
import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ChevronLeft, Gift, Mail, Eraser, Columns3, CaseSensitive, KeyRound } from 'lucide-react'
import LogoutButton from '@/app/components/logout-button'

/* ─── Card reutilizável de ferramenta ─────────────────────────────── */

type ToolCardProps = {
  icon: ReactNode
  title: string
  desc: string
  placeholder: string
  buttonLabel: string
  process: (input: string) => string
}

function ToolCard({ icon, title, desc, placeholder, buttonLabel, process }: ToolCardProps) {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')

  return (
    <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex flex-col min-w-0">
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2 bg-zinc-800/60 rounded-lg text-zinc-300 shrink-0">{icon}</div>
        <div className="min-w-0">
          <h2 className="font-bold text-lg leading-tight text-white">{title}</h2>
          <p className="text-xs text-zinc-400">{desc}</p>
        </div>
      </div>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        className="w-full mt-3 p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 min-h-[96px] resize-y"
      />
      <button
        onClick={() => setOutput(process(input))}
        className="mt-2 w-full p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold text-white transition-colors"
      >
        {buttonLabel}
      </button>
      <textarea
        value={output}
        readOnly
        placeholder="Resultado aqui"
        className="w-full mt-2 p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-emerald-200 placeholder:text-zinc-500 min-h-[96px] resize-y"
      />
    </div>
  )
}

/* ─── Senhas: precisa de controles extras (mín/máx) ───────────────── */

function PasswordLengthCard() {
  const [input, setInput] = useState('')
  const [min, setMin] = useState(8)
  const [max, setMax] = useState(64)
  const [output, setOutput] = useState('')

  const filtrar = () => {
    const senhas = input.split(/[\s,;]+/).filter(Boolean)
    const ok = senhas.filter((s) => s.length >= min && s.length <= max)
    setOutput(ok.join('\n'))
  }

  return (
    <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex flex-col min-w-0">
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2 bg-zinc-800/60 rounded-lg text-zinc-300 shrink-0">
          <KeyRound className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h2 className="font-bold text-lg leading-tight text-white">Password Length Filter</h2>
          <p className="text-xs text-zinc-400">Mantém apenas senhas dentro da faixa de tamanho.</p>
        </div>
      </div>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Cole as senhas aqui (separadas por espaço, vírgula ou quebra de linha)"
        className="w-full mt-3 p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 min-h-[96px] resize-y"
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          Mín.
          <input
            type="number"
            min={0}
            value={min}
            onChange={(e) => setMin(Number(e.target.value) || 0)}
            className="w-full p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          Máx.
          <input
            type="number"
            min={0}
            value={max}
            onChange={(e) => setMax(Number(e.target.value) || 0)}
            className="w-full p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
          />
        </label>
      </div>
      <button
        onClick={filtrar}
        className="mt-2 w-full p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold text-white transition-colors"
      >
        Filtrar Senhas
      </button>
      <textarea
        value={output}
        readOnly
        placeholder="Resultado aqui"
        className="w-full mt-2 p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-emerald-200 placeholder:text-zinc-500 min-h-[96px] resize-y"
      />
    </div>
  )
}

/* ─── Processadores ───────────────────────────────────────────────── */

const extrairEmails = (input: string) =>
  (input.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []).join('\n')

const limparEmails = (input: string) =>
  [...new Set(input.split(/[\s,;]+/).filter(Boolean).map((e) => e.trim()))].join('\n')

const filtrarColunas = (input: string) =>
  input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n')

const filtrarPalavras = (input: string) =>
  [...new Set(input.split(/[\s,;]+/).filter(Boolean).map((w) => w.trim()))].join('\n')

/* ─── Página ──────────────────────────────────────────────────────── */

export default function FerramentasGratuitasPage() {
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-black text-zinc-100 px-4 py-6 sm:p-6 md:p-12">
      <div className="w-full max-w-5xl mx-auto min-w-0">
        <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm mb-8 group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Voltar para a vitrine
        </Link>

        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 min-w-0">
            <div className="p-3 bg-zinc-800/60 rounded-2xl text-zinc-300 shrink-0">
              <Gift className="w-8 h-8" />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight break-words">Ferramentas Gratuitas</h1>
              <p className="text-zinc-400 text-sm mt-1">Utilitários rápidos e gratuitos — sem custo de créditos.</p>
            </div>
          </div>
          <LogoutButton />
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ToolCard
            icon={<Mail className="w-5 h-5" />}
            title="Email Extractor"
            desc="Extrai e-mails de um texto."
            placeholder="Cole o texto aqui"
            buttonLabel="Extrair E-mails"
            process={extrairEmails}
          />
          <ToolCard
            icon={<Eraser className="w-5 h-5" />}
            title="Email Cleaner"
            desc="Remove e-mails duplicados e espaços em branco."
            placeholder="Cole a lista de e-mails aqui"
            buttonLabel="Limpar E-mails"
            process={limparEmails}
          />
          <ToolCard
            icon={<Columns3 className="w-5 h-5" />}
            title="Columns Filter"
            desc="Remove linhas vazias e espaços das colunas."
            placeholder="Cole os dados aqui"
            buttonLabel="Filtrar Colunas"
            process={filtrarColunas}
          />
          <ToolCard
            icon={<CaseSensitive className="w-5 h-5" />}
            title="Words Filter"
            desc="Remove palavras repetidas do texto."
            placeholder="Cole o texto aqui"
            buttonLabel="Filtrar Palavras"
            process={filtrarPalavras}
          />
          <PasswordLengthCard />
        </div>
      </div>
    </div>
  )
}
