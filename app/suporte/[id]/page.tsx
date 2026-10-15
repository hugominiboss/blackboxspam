'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { LifeBuoy, Send, CheckCircle, Star } from 'lucide-react'
import { AppShell } from '@/app/components/app-shell'
import { PageHeader, StatusPill, Panel, ErrorBanner } from '@/app/components/qc-ui'
import { SUPPORT_CATEGORIES, type SupportCategory } from '@/app/lib/support'
import { STATUS_TONE, PRIORITY_TONE, slaLabel } from '../_shared'

type Msg = { id: string; sender: string; kind: string; body: string; created_at: string }

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [ticket, setTicket] = useState<any>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [rating, setRating] = useState(5)
  const [ratingComment, setRatingComment] = useState('')

  const fetchAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/support/tickets/${id}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Erro ao carregar ticket.')
      setTicket(data.ticket)
      setMessages(data.messages ?? [])
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { if (id) fetchAll() }, [id])

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reply.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/support/tickets/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: reply }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Falha ao responder.')
      setReply('')
      fetchAll()
    } catch (e: any) { setError(e.message) } finally { setSending(false) }
  }

  const close = async (withRating: boolean) => {
    try {
      const res = await fetch(`/api/support/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withRating ? { rating, rating_comment: ratingComment } : { status: 'resolvido' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Falha ao encerrar.')
      fetchAll()
    } catch (e: any) { setError(e.message) }
  }

  const encerrado = ticket?.status === 'resolvido' || ticket?.status === 'fechado'

  return (
    <AppShell active>
      <PageHeader
        eyebrow={`Ticket #${String(id).slice(0, 8)}`} title={ticket?.subject ?? 'Carregando…'}
        subtitle={ticket ? `${(SUPPORT_CATEGORIES[ticket.category as SupportCategory])?.label ?? ticket.category} · SLA ${slaLabel(ticket.sla_due_at)}` : undefined}
        icon={<LifeBuoy className="h-5 w-5" />}
        actions={ticket ? (<><StatusPill label={ticket.status} tone={STATUS_TONE[ticket.status] ?? 'muted'} /><StatusPill label={ticket.priority} tone={PRIORITY_TONE[ticket.priority] ?? 'muted'} /></>) : undefined}
      />
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-24 font-mono text-sm text-muted">
          <LifeBuoy className="h-4 w-4 animate-pulse text-accent" /> carregando_conversa<span className="animate-blink">_</span>
        </div>
      ) : error && !ticket ? <ErrorBanner message={error} /> : (
        <div className="grid gap-3">
          <Panel className="flex flex-col gap-3 p-5">
            {messages.map((m) => (
              <div key={m.id} className={`max-w-[85%] rounded-lg border px-3 py-2 ${m.sender === 'cliente' ? 'self-end border-accent/30 bg-accent/10' : 'self-start border-line bg-raised/60'}`}>
                <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-faint">{m.sender === 'cliente' ? 'você' : 'suporte'}</p>
                <p className="whitespace-pre-wrap text-sm text-ink">{m.body}</p>
              </div>
            ))}
          </Panel>
          {error && <ErrorBanner message={error} />}
          {!encerrado ? (
            <Panel className="p-5">
              <form onSubmit={sendReply} className="flex gap-2">
                <input className="input" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Escreva sua resposta…" maxLength={5000} />
                <button className="btn btn-primary shrink-0" disabled={sending || !reply.trim()}><Send className="h-4 w-4" /> {sending ? '…' : 'Enviar'}</button>
              </form>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button className="btn btn-ghost" onClick={() => close(false)}><CheckCircle className="h-4 w-4" /> Marcar resolvido</button>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} type="button" onClick={() => setRating(s)} title={`${s} estrelas`}><Star className={`h-4 w-4 ${s <= rating ? 'fill-warn text-warn' : 'text-faint'}`} /></button>
                  ))}
                </div>
                <input className="input max-w-52" value={ratingComment} onChange={(e) => setRatingComment(e.target.value)} placeholder="Comentário (opcional)" maxLength={1000} />
                <button className="btn btn-ghost" onClick={() => close(true)}>Avaliar e fechar</button>
              </div>
            </Panel>
          ) : (
            <Panel className="p-5 text-sm text-muted">
              Ticket encerrado{ticket?.rating ? <> · avaliado ★ {ticket.rating}/5{ticket.rating_comment ? ` — “${ticket.rating_comment}”` : ''}</> : ''}. Precisa de mais ajuda? Abra um novo ticket.
            </Panel>
          )}
        </div>
      )}
    </AppShell>
  )
}
