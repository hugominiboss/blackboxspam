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
    <div className="bg-zinc-900/70 border border-zinc-800 p-5 sm:p-6 rounded-3xl min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-4 min-w-0">
          <div className="p-3 bg-zinc-800/60 rounded-2xl text-emerald-300 shrink-0">
            <Globe className="w-7 h-7" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Proxy Scraper <span className="text-emerald-400">PRO</span></h2>
            <p className="text-zinc-400 text-sm">Licença por validade (7/15/30 dias), ativada por dispositivo.</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full shrink-0">
          <CoinIcon size={16} />
          <span className="text-white font-mono font-bold text-sm">{credits === null ? '—' : credits}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-zinc-500 mb-5">
        <ShieldCheck className="w-4 h-4 text-zinc-300" />
        A chave é separada do seu login e fica vinculada a um único dispositivo (troca liberada pelo painel).
      </div>

      {aviso && (
        <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm px-4 py-3 rounded-xl break-words">
          {aviso}
        </div>
      )}
      {erro && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl break-words">
          {erro}
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        {PLANOS.map((p) => {
          const semSaldo = credits !== null && credits < p.price
          return (
            <div
              key={p.id}
              className={`relative bg-zinc-950/60 border p-4 rounded-2xl flex flex-col gap-3 transition-all ${
                p.destaque ? 'border-emerald-500/50' : 'border-zinc-800'
              }`}
            >
              {p.destaque && (
                <span className="absolute -top-2 right-3 text-[10px] font-bold text-black bg-emerald-400 px-2 py-0.5 rounded-full">
                  MELHOR VALOR
                </span>
              )}
              <div className="flex items-center gap-2 text-zinc-300">
                <Clock className="w-4 h-4" />
                <span className="font-semibold text-white">{p.label}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <CoinIcon size={18} />
                <span className="text-2xl font-mono font-bold text-white">{p.price}</span>
                <span className="text-zinc-500 text-xs">CR</span>
              </div>
              <button
                onClick={() => comprar(p.id, p.price)}
                disabled={busy !== null || semSaldo}
                className={`mt-auto flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  semSaldo
                    ? 'bg-zinc-800 text-red-400 border border-red-500/40'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {busy === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {busy === p.id ? 'Gerando...' : semSaldo ? 'Saldo insuficiente' : 'Comprar'}
              </button>
            </div>
          )
        })}
      </div>

      <div>
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-3">Minhas Licenças</h3>
        {loading ? (
          <div className="text-zinc-500 text-sm flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando licenças...
          </div>
        ) : licenses.length === 0 ? (
          <p className="text-zinc-500 text-sm">Você ainda não possui licenças do Proxy Scraper. Escolha um plano acima.</p>
        ) : (
          <div className="grid gap-3">
            {licenses.map((l) => {
              const expirada = l.days_left <= 0
              return (
                <div
                  key={l.key}
                  className="bg-zinc-950/60 border border-zinc-800 p-4 rounded-2xl flex flex-wrap items-center gap-3 justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 bg-zinc-800/60 rounded-lg text-zinc-300 shrink-0">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono font-bold text-white text-sm truncate">{maskKey(l.key)}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                        <span className="text-zinc-400">{l.plan_label}</span>
                        {expirada ? (
                          <span className="text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">EXPIRADA</span>
                        ) : l.activated ? (
                          <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                            {l.days_left}d restantes
                          </span>
                        ) : (
                          <span className="text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">NÃO ATIVADA</span>
                        )}
                        {!l.status && (
                          <span className="text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">INATIVA</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => copy(l.key)}
                      title="Copiar chave"
                      className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                    >
                      {copied === l.key ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => resetDevice(l.key)}
                      disabled={busy !== null || !l.activated}
                      title={l.activated ? 'Desvincular deste dispositivo' : 'Licença ainda não ativada'}
                      className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {busy === 'reset:' + l.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
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

