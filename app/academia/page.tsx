'use client'
import Link from 'next/link'
import { Database, Radio, Handshake, ArrowRight, GraduationCap } from 'lucide-react'
import { AppShell } from '@/app/components/app-shell'
import { PageHeader } from '@/app/components/qc-ui'

// Valor experimental: custo por episódio na Academia
const CUSTO_AULA = 10

const modulos = [
  {
    id: 'obtencao',
    nome: 'Obtenção',
    desc: 'Fishing, dumps, SQL e cloud leak na prática.',
    icon: Database,
  },
  {
    id: 'spam',
    nome: 'Spam',
    desc: 'Email, SMS e engenharia social em escala.',
    icon: Radio,
  },
  {
    id: 'negociacao',
    nome: 'Negociação',
    desc: 'Comunidades, carreira e vendendo seu valor.',
    icon: Handshake,
  },
]

export default function AcademiaPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Academia"
        title="Módulos"
        subtitle={`Escolha um módulo · ${CUSTO_AULA} CR por episódio desbloqueado.`}
        icon={<GraduationCap className="h-5 w-5" />}
      />

      {/* Mobile: lista compacta (1 linha por módulo). Desktop: cards grandes. */}
      <nav className="grid gap-2 sm:hidden">
        {modulos.map((modulo) => (
          <Link
            key={modulo.id}
            href={`/academia/modulo/${modulo.id}`}
            className="panel group flex items-center gap-3 px-3.5 py-3 transition-all active:border-accent/40"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-accent/30 bg-accent/10 text-accent">
              <modulo.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold leading-tight text-ink">
                {modulo.nome}
              </h2>
              <p className="truncate text-xs text-muted">{modulo.desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-faint transition-all group-active:translate-x-0.5 group-active:text-accent" />
          </Link>
        ))}
      </nav>

      <main className="hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
        {modulos.map((modulo) => (
          <Link
            key={modulo.id}
            href={`/academia/modulo/${modulo.id}`}
            className="panel group relative flex flex-col gap-4 p-5 transition-all hover:border-accent/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-accent/30 bg-accent/10 text-accent">
                <modulo.icon className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-faint transition-all group-hover:translate-x-1 group-hover:text-accent" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold text-ink transition-colors group-hover:text-accent">
                {modulo.nome}
              </h2>
              <p className="mt-1 text-sm text-muted">{modulo.desc}</p>
            </div>
            <div className="mt-auto flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-faint group-hover:text-accent">
              Ver episódios <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        ))}
      </main>
    </AppShell>
  )
}