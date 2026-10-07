'use client'
import Link from 'next/link'
import { Database, Radio, Handshake, ArrowRight, ChevronLeft, GraduationCap } from 'lucide-react'
import LogoutButton from '@/app/components/logout-button'

// Valor experimental: custo por episódio na Academia
const CUSTO_AULA = 10

const modulos = [
  {
    id: 'obtencao',
    nome: 'Obtenção',
    desc: 'Fishing, dumps, SQL e cloud leak na prática.',
    cor: 'from-blue-600 to-cyan-500',
    icon: Database,
  },
  {
    id: 'spam',
    nome: 'Spam',
    desc: 'Email, SMS e engenharia social em escala.',
    cor: 'from-purple-600 to-pink-500',
    icon: Radio,
  },
  {
    id: 'negociacao',
    nome: 'Negociação',
    desc: 'Comunidades, carreira e vendendo seu valor.',
    cor: 'from-emerald-600 to-teal-500',
    icon: Handshake,
  },
]

export default function AcademiaPage() {
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-black text-zinc-100 px-4 py-6 sm:p-6 md:p-12">
      <div className="w-full max-w-5xl mx-auto min-w-0">
        <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm mb-12 group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Voltar para a vitrine
        </Link>

        <header className="mb-12 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex flex-wrap items-center gap-4 min-w-0">
            <div className="p-3 bg-zinc-800/60 rounded-2xl text-zinc-300 shrink-0">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight break-words">Academia</h1>
              <p className="text-zinc-400 text-sm mt-1">Escolha um módulo · {CUSTO_AULA} CR por episódio desbloqueado.</p>
            </div>
          </div>
          <LogoutButton />
        </header>

        <main className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {modulos.map((modulo) => (
            <Link
              key={modulo.id}
              href={`/academia/modulo/${modulo.id}`}
              className="group relative bg-zinc-900 border border-zinc-800 p-6 sm:p-8 rounded-3xl hover:border-zinc-700 transition-all duration-500 hover:-translate-y-2 overflow-hidden min-w-0"
            >
              <div className={`absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br ${modulo.cor} opacity-10 blur-3xl group-hover:opacity-20 transition-opacity`} />

              <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${modulo.cor} text-white mb-6 shadow-lg`}>
                <modulo.icon className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
                {modulo.nome}
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-8">{modulo.desc}</p>

              <div className="flex items-center gap-2 text-white font-semibold text-sm group-hover:gap-4 transition-all">
                VER EPISÓDIOS <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </main>
      </div>
    </div>
  )
}