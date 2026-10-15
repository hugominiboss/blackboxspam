'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, CheckCheck } from 'lucide-react'
import { AppShell } from '@/app/components/app-shell'
import { PageHeader, StatusPill, Panel, EmptyState, ErrorBanner } from '@/app/components/qc-ui'
import { NOTIF_TYPES, timeAgo, type Notif, type NotifType } from '@/app/lib/notifications'

export default function NotificacoesPage() {
  const [items, setItems] = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'todas' | 'nao-lidas'>('todas')

  const fetchAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/notifications')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Erro ao carregar.')
      setItems(data.notifications ?? [])
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { fetchAll() }, [])

  const mark = async (ids?: string[], all?: boolean) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(all ? { all: true } : { ids }),
      })
      setItems((prev) => prev.map((n) => (all || (ids ?? []).includes(n.id) ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n)))
    } catch { /* silencioso */ }
  }

  const visible = filter === 'nao-lidas' ? items.filter((n) => !n.read_at) : items
  const unread = items.filter((n) => !n.read_at).length

  return (
    <AppShell active>
      <PageHeader
        eyebrow="Avisos" title="Notificações" subtitle="Tudo que importa: tickets, créditos, níveis e Proxy."
        icon={<Bell className="h-5 w-5" />}
        actions={<><StatusPill label={`${unread} não lidas`} tone={unread > 0 ? 'warn' : 'good'} />{unread > 0 && (<button className="btn btn-ghost" onClick={() => mark(undefined, true)}><CheckCheck className="h-4 w-4" /> Marcar todas</button>)}</>}
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(['todas', 'nao-lidas'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`chip ${filter === f ? '!border-accent/40 !text-accent' : ''}`}>
            {f === 'todas' ? 'Todas' : 'Não lidas'}
          </button>
        ))}
        <Link href="/perfil/notificacoes" className="chip ml-auto">⚙️ Preferências + Telegram</Link>
      </div>
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-24 font-mono text-sm text-muted">
          <Bell className="h-4 w-4 animate-pulse text-accent" /> carregando_avisos<span className="animate-blink">_</span>
        </div>
      ) : error ? <ErrorBanner message={error} /> : visible.length === 0 ? (
        <EmptyState icon={<Bell className="h-8 w-8" />} title="Nada por aqui" hint="Quando algo importante acontecer, aparece aqui." />
      ) : (
        <div className="grid gap-2">
          {visible.map((n) => (
            <div key={n.id} className={`panel flex flex-col gap-1.5 p-4 ${n.read_at ? 'opacity-70' : 'border-accent/30'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip">{NOTIF_TYPES[n.type as NotifType]?.label ?? n.type}</span>
                {!n.read_at && <StatusPill label="nova" tone="accent" pulse />}
                <span className="ml-auto font-mono text-[11px] text-faint">{timeAgo(n.created_at)}</span>
              </div>
              <p className="font-display text-[15px] font-semibold text-ink">{n.title}</p>
              <p className="whitespace-pre-wrap text-sm text-muted">{n.body}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {n.link && <Link href={n.link} className="btn btn-ghost !py-1 !text-xs">Abrir →</Link>}
                {!n.read_at && <button className="btn btn-ghost !py-1 !text-xs" onClick={() => mark([n.id])}>Marcar lida</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  )
}
