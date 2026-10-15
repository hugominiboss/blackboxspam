'use client'
import { useState } from 'react'
import Link from 'next/link'
import { LifeBuoy, ArrowRight, Clock } from 'lucide-react'
import { StatusPill, EmptyState, ErrorBanner } from '@/app/components/qc-ui'
import { SUPPORT_CATEGORIES } from '@/app/lib/support'
import { STATUS_TONE, PRIORITY_TONE, slaLabel, type Ticket } from './_shared'

export function TicketList({ tickets, loading, error }: { tickets: Ticket[]; loading: boolean; error: string | null }) {
  const [filter, setFilter] = useState<'todos' | 'abertos' | 'encerrados'>('todos')
  const visible = tickets.filter((t) => {
    if (filter === 'abertos') return t.status !== 'resolvido' && t.status !== 'fechado'
    if (filter === 'encerrados') return t.status === 'resolvido' || t.status === 'fechado'
    return true
  })
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {(['todos', 'abertos', 'encerrados'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`chip ${filter === f ? '!border-accent/40 !text-accent' : ''}`}>
            {f === 'todos' ? 'Todos' : f === 'abertos' ? 'Em aberto' : 'Encerrados'}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-24 font-mono text-sm text-muted">
          <LifeBuoy className="h-4 w-4 animate-pulse text-accent" /> carregando_tickets<span className="animate-blink">_</span>
        </div>
      ) : error ? <ErrorBanner message={error} /> : visible.length === 0 ? (
        <EmptyState icon={<LifeBuoy className="h-8 w-8" />} title="Nenhum ticket aqui" hint="Abra seu primeiro ticket no botão acima." />
      ) : (
        <div className="grid gap-2">
          {visible.map((t) => (
            <Link key={t.id} href={`/suporte/${t.id}`} className="panel group flex flex-col gap-2 p-4 transition-all hover:border-accent/40">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] text-faint">#{t.id.slice(0, 8)}</span>
                <StatusPill label={t.status} tone={STATUS_TONE[t.status] ?? 'muted'} />
                <StatusPill label={t.priority} tone={PRIORITY_TONE[t.priority] ?? 'muted'} />
                <span className="chip">{SUPPORT_CATEGORIES[t.category]?.label ?? t.category}</span>
                <span className="ml-auto flex items-center gap-1 font-mono text-[11px] text-faint"><Clock className="h-3 w-3" /> {slaLabel(t.sla_due_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate font-display text-[15px] font-semibold text-ink group-hover:text-accent">{t.subject}</p>
                <ArrowRight className="h-4 w-4 shrink-0 text-faint group-hover:text-accent" />
              </div>
              {t.rating ? <p className="font-mono text-[11px] text-good">★ {t.rating}/5 avaliado</p> : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
