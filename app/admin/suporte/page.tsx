'use client'
import { useEffect, useState } from 'react'
import { LifeBuoy } from 'lucide-react'
import { PageHeader, StatusPill, Panel, EmptyState, ErrorBanner } from '@/app/components/qc-ui'
import { SUPPORT_CATEGORIES, SUPPORT_STATUS } from '@/app/lib/support'
import { STATUS_TONE, PRIORITY_TONE, slaLabel } from '@/app/suporte/_shared'
import { AdminTicketView } from './_view'

export type AdminTicket = {
  id: string
  license_key: string
  category: string
  priority: string
  status: string
  subject: string
  sla_due_at: string | null
  rating: number | null
  created_at: string
}

export default function AdminSuportePage() {
  const [tickets, setTickets] = useState<AdminTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('todos')
  const [openId, setOpenId] = useState<string | null>(null)

  const fetchAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const q = filter === 'todos' ? '' : `?all=1&status=${filter}`
      const url = filter === 'todos' ? '/api/support/tickets?all=1' : `/api/support/tickets${q}`
      const res = await fetch(url)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Erro ao carregar tickets.')
      setTickets(data.tickets ?? [])
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { fetchAll() }, [filter])

  const abertos = tickets.filter((t) => t.status !== 'resolvido' && t.status !== 'fechado').length

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-6">
      <PageHeader
        eyebrow="Admin · Suporte" title="Tickets" subtitle={`${abertos} em aberto · clique para responder com contexto do cliente.`}
        icon={<LifeBuoy className="h-5 w-5" />}
        actions={<StatusPill label={`${abertos} abertos`} tone={abertos > 0 ? 'warn' : 'good'} />}
      />
      <div className="mb-3 flex flex-wrap gap-2">
        {['todos', 'aberto', 'aguardando-suporte', 'aguardando-cliente', 'resolvido', 'fechado'].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`chip ${filter === s ? '!border-accent/40 !text-accent' : ''}`}>
            {s === 'todos' ? 'Todos' : (SUPPORT_STATUS as any)[s]?.label ?? s}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-24 font-mono text-sm text-muted">
          <LifeBuoy className="h-4 w-4 animate-pulse text-accent" /> carregando_tickets<span className="animate-blink">_</span>
        </div>
      ) : error ? <ErrorBanner message={error} /> : tickets.length === 0 ? (
        <EmptyState icon={<LifeBuoy className="h-8 w-8" />} title="Nenhum ticket" hint="Quando um cliente abrir, aparece aqui." />
      ) : (
        <div className="grid gap-2">
          {tickets.map((t) => (
            <div key={t.id}>
              <button onClick={() => setOpenId(openId === t.id ? null : t.id)} className="panel flex w-full flex-col gap-2 p-4 text-left transition-all hover:border-accent/40">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] text-faint">#{t.id.slice(0, 8)} · {t.license_key.slice(0, 4)}••••{t.license_key.slice(-4)}</span>
                  <StatusPill label={(SUPPORT_STATUS as any)[t.status]?.label ?? t.status} tone={(STATUS_TONE as any)[t.status] ?? 'muted'} />
                  <StatusPill label={t.priority} tone={(PRIORITY_TONE as any)[t.priority] ?? 'muted'} />
                  <span className="chip">{(SUPPORT_CATEGORIES as any)[t.category]?.label ?? t.category}</span>
                  <span className="ml-auto font-mono text-[11px] text-faint">{slaLabel(t.sla_due_at)}</span>
                </div>
                <p className="font-display text-[15px] font-semibold text-ink">{t.subject}</p>
              </button>
              {openId === t.id && (
                <Panel className="mt-1 border-accent/20 p-4">
                  <AdminTicketView id={t.id} onDone={fetchAll} />
                </Panel>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
