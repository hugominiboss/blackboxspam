'use client'
import { useState } from 'react'
import { Send, Unplug, Copy, Check } from 'lucide-react'
import { Panel, ErrorBanner } from '@/app/components/qc-ui'

export function TelegramCard({ linked, tgOn, botOk, setLinked, setTgOn }: {
  linked: boolean; tgOn: boolean; botOk: boolean
  setLinked: (v: boolean) => void; setTgOn: (v: boolean) => void
}) {
  const [deepLink, setDeepLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const genLink = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/notifications/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'link' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Falha ao gerar código.')
      setDeepLink(data.deepLink)
    } catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }

  const unlink = async () => {
    await fetch('/api/notifications/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unlink' }),
    })
    setLinked(false)
    setDeepLink(null)
  }

  const toggleTg = async (on: boolean) => {
    setTgOn(on)
    await fetch('/api/notifications/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', on }),
    })
  }

  return (
    <Panel className="p-5">
      <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-bold text-ink"><Send className="h-4 w-4 text-accent" /> Telegram (addon opcional)</h2>
      <p className="mb-4 text-sm text-muted">Receba os avisos críticos também no Telegram. Sem vincular, tudo continua no sino.</p>
      {error && <div className="mb-3"><ErrorBanner message={error} /></div>}
      {!botOk && <div className="mb-3"><ErrorBanner message="Bot do Telegram ainda não configurado pelo admin. O sino funciona normalmente." /></div>}
      {linked ? (
        <div className="grid gap-3">
          <p className="font-mono text-xs text-good">✅ Vinculado — avisos chegando no seu Telegram.</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-ghost" onClick={() => toggleTg(!tgOn)}>{tgOn ? 'Pausar envio' : 'Retomar envio'}</button>
            <button className="btn btn-ghost" onClick={unlink}><Unplug className="h-4 w-4" /> Desvincular</button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          <button className="btn btn-primary" disabled={busy || !botOk} onClick={genLink}>{busy ? 'Gerando…' : 'Gerar código de vínculo (15 min)'}</button>
          {deepLink && (
            <div className="rounded-lg border border-line bg-raised/50 p-3">
              <p className="mb-2 font-mono text-[11px] text-muted">1. Abra o link · 2. Dê /start · 3. Pronto.</p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate font-mono text-xs text-accent">{deepLink}</code>
                <button className="btn btn-ghost !px-2.5" onClick={async () => { try { await navigator.clipboard.writeText(deepLink); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {} }} title="Copiar link">{copied ? <Check className="h-4 w-4 text-good" /> : <Copy className="h-4 w-4" />}</button>
              </div>
              <a href={deepLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-2 w-full"><Send className="h-4 w-4" /> Abrir no Telegram</a>
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}
