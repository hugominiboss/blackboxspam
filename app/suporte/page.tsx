'use client'
import { useEffect, useState } from 'react'
import { LifeBuoy, Plus } from 'lucide-react'
import { AppShell } from '@/app/components/app-shell'
import { PageHeader, Panel, ErrorBanner } from '@/app/components/qc-ui'
import { SUPPORT_CATEGORIES, type SupportCategory } from '@/app/lib/support'
import { TicketList } from './_list'

export default function SuportePage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [category, setCategory] = useState<SupportCategory>('duvida')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchTickets = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/support/tickets')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Erro ao carregar tickets.')
      setTickets(data.tickets ?? [])
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { fetchTickets() }, [])

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setFormError(null)
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, subject, message }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Falha ao abrir ticket.')
      setShowForm(false)
      setSubject('')
      setMessage('')
      fetchTickets()
    } catch (e: any) { setFormError(e.message) } finally { setSending(false) }
  }

  return (
    <AppShell active>
      <PageHeader
        eyebrow="Ajuda" title="Suporte" subtitle="Abra tickets e acompanhe as respostas."
        icon={<LifeBuoy className="h-5 w-5" />}
        actions={<button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}><Plus className="h-4 w-4" /> {showForm ? 'Fechar' : 'Abrir ticket'}</button>}
      />
      {showForm && (
        <Panel className="mb-4 p-5">
          <form onSubmit={handleOpen} className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Categoria</label>
                <select className="input" value={category} onChange={(e) => setCategory(e.target.value as SupportCategory)}>
                  {Object.values(SUPPORT_CATEGORIES).map((c) => (<option key={c.id} value={c.id}>{c.label}</option>))}
                </select>
                <p className="mt-1 font-mono text-[11px] text-faint">{SUPPORT_CATEGORIES[category].desc}</p>
              </div>
              <div>
                <label className="label">Assunto (5–140)</label>
                <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: meu saldo não atualizou" maxLength={140} required />
              </div>
            </div>
            <div>
              <label className="label">Descreva o problema</label>
              <textarea className="textarea-io min-h-28" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="O que aconteceu e quando…" maxLength={5000} required />
            </div>
            {formError && <ErrorBanner message={formError} />}
            <div><button className="btn btn-primary" disabled={sending}>{sending ? 'Enviando…' : 'Enviar ticket'}</button></div>
          </form>
        </Panel>
      )}
      <TicketList tickets={tickets} loading={loading} error={error} />
    </AppShell>
  )
}
