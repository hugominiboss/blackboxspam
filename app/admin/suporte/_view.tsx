'use client'
import { useEffect, useState } from 'react'
import { Send, StickyNote, CheckCircle } from 'lucide-react'
import { ErrorBanner } from '@/app/components/qc-ui'

/** Visão expandida de um ticket no admin: contexto + conversa + resposta + nota interna. */
export function AdminTicketView({ id, onDone }: { id: string; onDone: () => void }) {
  const [ticket, setTicket] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const res = await fetch(`/api/support/tickets/${id}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Erro ao carregar.')
      setTicket(data.ticket)
      setMessages(data.messages ?? [])
    } catch (e: any) { setError(e.message) }
  }
  useEffect(() => { load() }, [id])

  const post = async (body: string, kind: 'publica' | 'nota-interna') => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/support/tickets/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, kind }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Falha ao enviar.')
      setReply('')
      setNote('')
      load()
      onDone()
    } catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }

  const setStatus = async (status: string) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/support/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Falha ao atualizar status.')
      load()
      onDone()
    } catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }

  const ctx = ticket?.context_snapshot
  return (
    <div className="grid gap-3">
      {ctx && (
        <div className="grid gap-1 rounded-lg border border-line bg-raised/50 p-3 font-mono text-[11px] text-muted">
          <p><span className="text-faint">key:</span> {ticket.license_key} · <span className="text-faint">role:</span> {ctx.role} · <span className="text-faint">saldo:</span> {ctx.credits} CR · <span className="text-faint">nível:</span> {ctx.level} ({ctx.total_spent} gastos)</p>
          <p><span className="text-faint">proxy:</span> {ctx.proxy_scraper ? `${ctx.proxy_scraper.expirado ? 'expirado' : 'ativo'} · expira ${ctx.proxy_scraper.expires_at ?? '—'}` : 'sem licença'} · <span className="text-faint">tickets abertos (na abertura):</span> {ctx.tickets_abertos}</p>
          {ticket.rating ? <p><span className="text-faint">avaliação:</span> ★ {ticket.rating}/5{ticket.rating_comment ? ` — ${ticket.rating_comment}` : ''}</p> : null}
        </div>
      )}
      <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className={`rounded-lg border px-3 py-2 ${m.kind === 'nota-interna' ? 'border-warn/40 bg-warn/10' : m.sender === 'suporte' ? 'border-line bg-raised/60' : 'border-accent/30 bg-accent/10'}`}>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-faint">
              {m.kind === 'nota-interna' ? 'nota interna (só você vê)' : m.sender === 'suporte' ? 'suporte' : 'cliente'}
            </p>
            <p className="whitespace-pre-wrap text-sm text-ink">{m.body}</p>
          </div>
        ))}
      </div>
      {error && <ErrorBanner message={error} />}
      <div className="flex gap-2">
        <input className="input" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Responder ao cliente…" maxLength={5000} />
        <button className="btn btn-primary shrink-0" disabled={busy || !reply.trim()} onClick={() => post(reply, 'publica')}><Send className="h-4 w-4" /> Responder</button>
      </div>
      <div className="flex gap-2">
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota interna (cliente não vê)…" maxLength={5000} />
        <button className="btn btn-ghost shrink-0" disabled={busy || !note.trim()} onClick={() => post(note, 'nota-interna')}><StickyNote className="h-4 w-4" /> Salvar nota</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {['aguardando-cliente', 'resolvido', 'fechado', 'aberto'].map((s) => (
          <button key={s} className="chip" disabled={busy} onClick={() => setStatus(s)}><CheckCircle className="h-3 w-3" /> {s}</button>
        ))}
      </div>
    </div>
  )
}
