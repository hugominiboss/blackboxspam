'use client'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, Gift } from 'lucide-react'
import LogoutButton from '@/app/components/logout-button'
import { FERRAMENTAS_GRATUITAS } from './_lib/tools'

/**
 * Menu das Ferramentas Gratuitas — cada ferramenta tem sua própria página
 * em `/ferramentas/gratuitas/[slug]` e é linkada aqui.
 */
export default function FerramentasGratuitasPage() {
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-black text-zinc-100 px-4 py-6 sm:p-6 md:p-12">
      <div className="w-full max-w-5xl mx-auto min-w-0">
        <Link
          href="/"
          className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm mb-8 group w-fit"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Voltar
          para a vitrine
        </Link>

        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 min-w-0">
            <div className="p-3 bg-zinc-800/60 rounded-2xl text-zinc-300 shrink-0">
              <Gift className="w-8 h-8" />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight break-words">
                Ferramentas Gratuitas
              </h1>
              <p className="text-zinc-400 text-sm mt-1">
                Utilitários rápidos e gratuitos — sem custo de créditos. Cada ferramenta abre em sua
                própria página e suporta listas de até 100.000 linhas.
              </p>
            </div>
          </div>
          <LogoutButton />
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FERRAMENTAS_GRATUITAS.map((ferramenta) => {
            const Icone = ferramenta.iconComponent
            return (
              <Link
                key={ferramenta.slug}
                href={`/ferramentas/gratuitas/${ferramenta.slug}`}
                className="group bg-zinc-900 p-5 rounded-xl border border-zinc-800 flex flex-col min-w-0 hover:border-amber-500/40 hover:bg-zinc-800/60 transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-zinc-800/60 rounded-lg text-zinc-300 shrink-0 group-hover:text-amber-400 transition-colors">
                    <Icone className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-lg leading-tight text-white break-words">
                      {ferramenta.nome}
                    </h2>
                    <p className="text-xs text-zinc-400">{ferramenta.desc}</p>
                  </div>
                </div>
                <span className="mt-auto pt-4 flex items-center gap-2 text-sm font-semibold text-zinc-400 group-hover:text-amber-400 group-hover:gap-3 transition-all">
                  ABRIR FERRAMENTA <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
