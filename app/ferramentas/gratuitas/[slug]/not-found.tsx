'use client'
import Link from 'next/link'
import { ChevronLeft, Wrench } from 'lucide-react'
import { AppShell } from '@/app/components/app-shell'
import { Panel } from '@/app/components/qc-ui'

export default function FerramentaNaoEncontrada() {
  return (
    <AppShell>
      <Panel className="mx-auto w-full max-w-xl min-w-0 px-6 py-14 text-center">
        <div className="mb-6 inline-flex rounded-xl border border-line bg-raised/60 p-4">
          <Wrench className="h-8 w-8 text-faint" />
        </div>
        <h1 className="mb-2 font-display text-2xl font-bold text-ink sm:text-3xl">
          Ferramenta não encontrada
        </h1>
        <p className="mb-8 text-sm text-muted">
          O endereço acessado não corresponde a nenhuma ferramenta gratuita.
        </p>
        <Link href="/ferramentas/gratuitas" className="btn btn-primary">
          <ChevronLeft className="h-4 w-4" /> Ver todas as ferramentas gratuitas
        </Link>
      </Panel>
    </AppShell>
  )
}
