'use client'
import Link from 'next/link'
import { ArrowRight, Gift } from 'lucide-react'
import { AppShell } from '@/app/components/app-shell'
import { PageHeader } from '@/app/components/qc-ui'
import { FERRAMENTAS_GRATUITAS } from './_lib/tools'

/**
 * Menu das Ferramentas Gratuitas — cada ferramenta tem sua própria página
 * em `/ferramentas/gratuitas/[slug]` e é linkada aqui.
 */
export default function FerramentasGratuitasPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Gratuitas"
        title="Ferramentas Gratuitas"
        subtitle="Utilitários rápidos e gratuitos — sem custo de créditos. Cada ferramenta abre em sua própria página e suporta listas de até 100.000 linhas."
        icon={<Gift className="h-5 w-5" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FERRAMENTAS_GRATUITAS.map((ferramenta) => {
          const Icone = ferramenta.iconComponent
          return (
            <Link
              key={ferramenta.slug}
              href={`/ferramentas/gratuitas/${ferramenta.slug}`}
              className="panel group flex flex-col p-5 transition-all hover:border-accent/40"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-accent/30 bg-accent/10 text-accent">
                  <Icone className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-display text-base font-semibold leading-tight text-ink">
                    {ferramenta.nome}
                  </h2>
                  <p className="text-xs text-muted">{ferramenta.desc}</p>
                </div>
              </div>
              <span className="mt-auto flex items-center gap-2 pt-4 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-faint transition-all group-hover:gap-3 group-hover:text-accent">
                Abrir ferramenta <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          )
        })}
      </div>
    </AppShell>
  )
}
