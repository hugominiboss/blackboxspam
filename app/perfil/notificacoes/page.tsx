'use client'
import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { AppShell } from '@/app/components/app-shell'
import { PageHeader, Panel, ErrorBanner, StatusPill } from '@/app/components/qc-ui'
import { PREF_KEYS } from '@/app/lib/notifications'
import { TelegramCard } from './_telegram'

export default function NotifPrefsPage() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({})
  const [linked, setLinked] = useState(false)
  const [tgOn, setTgOn] = useState(true)
  const [botOk, setBotOk] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/notifications/prefs')
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.message || 'Erro ao carregar.')
        setPrefs(data.prefs ?? {})
        setLinked(Boolean(data.telegram_linked))
        setTgOn(data.notify_telegram !== false)
        setBotOk(Boolean(data.bot_configured))
      } catch (e: any) { setError(e.message) }
    })()
  }, [])

  const togglePref = async (group: string, on: boolean) => {
    setPrefs((p) => ({ ...p, [group]: on }))
    await fetch('/api/notifications/prefs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group, on }),
    })
  }

  return (
    <AppShell active>
      <PageHeader
        eyebrow="Conta" title="Notificações" subtitle="Escolha o que chega no sino e vincule o Telegram (opcional)."
        icon={<Bell className="h-5 w-5" />}
        actions={<StatusPill label={linked ? 'telegram on' : 'sino on'} tone={linked ? 'good' : 'accent'} />}
      />
      {error && <div className="mb-3"><ErrorBanner message={error} /></div>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-5">
          <h2 className="mb-1 font-display text-lg font-bold text-ink">O que notificar</h2>
          <p className="mb-4 text-sm text-muted">Desligou, não cria nem no sino.</p>
          <div className="grid gap-2">
            {PREF_KEYS.map((p) => {
              const on = prefs[p.id] !== false
              return (
                <button key={p.id} onClick={() => togglePref(p.id, !on)} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${on ? 'border-accent/30 bg-accent/5' : 'border-line bg-raised/40 opacity-70'}`}>
                  <span className="text-sm text-ink">{p.label}</span>
                  <span className={`font-mono text-[11px] uppercase tracking-widest ${on ? 'text-accent' : 'text-faint'}`}>{on ? 'on' : 'off'}</span>
                </button>
              )
            })}
          </div>
        </Panel>
        <TelegramCard linked={linked} tgOn={tgOn} botOk={botOk} setLinked={setLinked} setTgOn={setTgOn} />
      </div>
    </AppShell>
  )
}
