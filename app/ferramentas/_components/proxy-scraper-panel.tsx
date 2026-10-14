'use client'
import { useEffect, useState } from 'react'
import { Globe, Copy, Check, RotateCcw, KeyRound, Clock, ShieldCheck, Loader2 } from 'lucide-react'
import CoinIcon from '@/app/components/coin-icon'

type License = {
  key: string
  plan: string
  plan_label: string
  status: boolean
  activated: boolean
  resets: number
  expires_at: string | null
  days_left: number
  created_at: string
}

const PLANOS: { id: string; label: string; price: number; days: number; destaque?: boolean }[] = [
  { id: '7d', label: '7 dias', price: 100, days: 7 },
  { id: '15d', label: '15 dias', price: 180, days: 15 },
  { id: '30d', label: '30 dias', price: 300, days: 30, destaque: true },
]

function maskKey(key: string): string {
  if (key.length <= 8) return key
  return `${key.slice(0, 8)}••••••••${key.slice(-4)}`
}

export default function ProxyScraperPanel() {
  const [licenses, setLicenses] = useState<License[]>([])
  const [credits, setCredits] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setErro(null)
    try {
      const [listRes, credRes] = await Promise.all([
        fetch('/api/tools/proxy-scraper/list'),
        fetch('/api/credits'),
      ])
      if (listRes.status === 401 || credRes.status === 401) {
        window.location.href = '/login'
        return
      }
      const listData = await listRes.json().catch(() => ({}))
      const credData = await credRes.json().catch(() => ({}))
      setLicenses(listData.licenses ?? [])
      setCredits(credData.credits ?? 0)
    } catch (e: any) {
      setErro(e?.message || 'Falha ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function comprar(planId: string, price: number) {
    if (busy) return
    setAviso(null)
    setErro(null)
    if (credits !== null && credits < price) {
      setAviso(`Saldo insuficiente: você tem ${credits} CR e precisa de ${price} CR.`)
      return
    }
    setBusy(planId)
    try {
      const res = await fetch('/api/tools/proxy-scraper/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) { window.location.href = '/login'; return }
      if (!res.ok) {
        setAviso(data.message || 'Não foi possível concluir a compra.')
        if (data.credits !== undefined) setCredits(data.credits)
        return
      }
      setCredits(data.credits ?? 0)
      setAviso(`Licença ${data.license?.key} gerada com sucesso!`)
      await load()
    } catch {
      setAviso('Erro de rede ao comprar. Tente novamente.')
    } finally {
      setBusy(null)
    }
  }

  async function resetDevice(key: string) {
    if (busy) return
    setAviso(null)
    setErro(null)
    setBusy('reset:' + key)
    try {
      const res = await fetch('/api/tools/proxy-scraper/reset-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAviso(data.message || 'Falha ao resetar dispositivo.')
        return
      }
      setAviso(data.message || 'Dispositivo desvinculado.')
      await load()
    } catch {
      setAviso('Erro de rede ao resetar.')
    } finally {
      setBusy(null)
    }
  }

  async function copy(key: string) {
    try {
      await navigator.clipboard.writeText(key)
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    } catch { /* clipboard indisponível */ }
  }

  return (
    <div className="panel p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-accent/30 bg-accent/10 text-accent">
            <Globe className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold tracking-tight text-ink">
              Proxy Scraper <span className="text-accent">PRO</span>
            </h2>
            <p className="text-sm text-muted">Licença por validade (7/15/30 dias), ativada por dispositivo.</p>
          </div>
        </div>
        <div className="chip shrink-0 !py-1.5">
          <CoinIcon size={15} />
          <span className="tabular-nums text-ink">{credits === null ? '—' : credits}</span>
          <span className="text-faint">CR</span>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-2 font-mono text-xs text-faint">
        <ShieldCheck className="h-4 w-4 text-accent" />
        A chave é separada do seu login e fica vinculada a um único dispositivo (troca liberada pelo painel).
      </div>

      {aviso && (
        <div className="mb-4 break-words rounded-lg border border-good/40 bg-good/10 px-3 py-2 font-mono text-xs text-good">
          {aviso}
        </div>
      )}
      {erro && (
        <div className="mb-4 break-words rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 font-mono text-xs text-danger">
          {erro}
        </div>
      )}

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        {PLANOS.map((p) => {
          const semSaldo = credits !== null && credits < p.price
          return (
            <div
              key={p.id}
              className={`relative flex flex-col gap-3 rounded-xl border p-4 transition-all ${
                p.destaque ? 'border-accent/50 bg-accent/5' : 'border-line bg-raised/40'
              }`}
            >
              {p.destaque && (
                <span className="absolute -top-2 right-3 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-bg">
                  MELHOR VALOR
                </span>
              )}
              <div className="flex items-center gap-2 text-muted">
                <Clock className="h-4 w-4" />
                <span className="font-semibold text-ink">{p.label}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <CoinIcon size={18} />
                <span className="font-mono text-2xl font-bold text-ink">{p.price}</span>
                <span className="text-xs text-faint">CR</span>
              </div>
              <button
                onClick={() => comprar(p.id, p.price)}
                disabled={busy !== null || semSaldo}
                className={`btn mt-auto w-full ${
                  semSaldo
                    ? 'border-danger/40 bg-danger/10 text-danger hover:bg-danger/20'
                    : 'btn-primary'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {busy === p.id ? 'Gerando...' : semSaldo ? 'Saldo insuficiente' : 'Comprar'}
              </button>
            </div>
          )
        })}
      </div>

      <div>
        <h3 className="label">Minhas Licenças</h3>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando licenças...
          </div>
        ) : licenses.length === 0 ? (
          <p className="text-sm text-muted">Você ainda não possui licenças do Proxy Scraper. Escolha um plano acima.</p>
        ) : (
          <div className="grid gap-3">
            {licenses.map((l) => {
              const expirada = l.days_left <= 0
              return (
                <div
                  key={l.key}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-raised/40 p-4"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-surface text-muted">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-bold text-ink">{maskKey(l.key)}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-muted">{l.plan_label}</span>
                        {expirada ? (
                          <span className="rounded-full border border-danger/40 bg-danger/10 px-2 py-0.5 font-bold text-danger">EXPIRADA</span>
                        ) : l.activated ? (
                          <span className="rounded-full border border-good/40 bg-good/10 px-2 py-0.5 font-bold text-good">
                            {l.days_left}d restantes
                          </span>
                        ) : (
                          <span className="rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 font-bold text-warn">NÃO ATIVADA</span>
                        )}
                        {!l.status && (
                          <span className="rounded-full border border-danger/40 bg-danger/10 px-2 py-0.5 font-bold text-danger">INATIVA</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => copy(l.key)}
                      title="Copiar chave"
                      className="btn btn-ghost !px-2.5"
                    >
                      {copied === l.key ? <Check className="h-4 w-4 text-good" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => resetDevice(l.key)}
                      disabled={busy !== null || !l.activated}
                      title={l.activated ? 'Desvincular deste dispositivo' : 'Licença ainda não ativada'}
                      className="btn btn-ghost disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {busy === 'reset:' + l.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                      Trocar dispositivo
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

