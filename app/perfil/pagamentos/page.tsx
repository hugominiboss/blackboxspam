'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Bitcoin, Check, ChevronRight, Copy, CreditCard, Flame,
  Lock, QrCode, RefreshCw, ShieldCheck, Timer, Zap,
} from 'lucide-react'
import LogoutButton from '@/app/components/logout-button'
import CoinIcon from '@/app/components/coin-icon'

type Plan = {
  id: string
  price: number
  credits: number
  bonusPct: number
  tag?: string
}
type Stage = 'plans' | 'checkout' | 'success'
type Method = 'pix' | 'usdt' | 'btc'

const PLANS: Plan[] = [
  { id: 'starter', price: 20, credits: 200, bonusPct: 0 },
  { id: 'growth', price: 50, credits: 500, bonusPct: 10, tag: 'BÔNUS +10%' },
  { id: 'premium', price: 100, credits: 1000, bonusPct: 20, tag: '+20% BÔNUS' },
]

const WALLETS: Record<'usdt' | 'btc', { label: string; network: string; address: string }> = {
  usdt: { label: 'USDT', network: 'TRC20 (Tron)', address: 'TJmVc9rQ3xK8sVw2LpB6nHfY4dEzA1uXgS' },
  btc: { label: 'BTC', network: 'Bitcoin', address: 'bc1qk9v8m2xr7dp4tj6wz0fy3nq5hs8u4c2v7l0e9a' },
}

const CHECKOUT_SECONDS = 15 * 60

/** Payload PIX simulado (formato BR Code/EMV, apenas visual — sem gateway real). */
function pixPayload(brl: number): string {
  return (
    '00020126580014BR.GOV.BCB.PIX0136a7f3c9e1-4b2d-4f8a-9c1e-2d3b5f7a9c11' +
    `520400005303986540${brl.toFixed(2)}5802BR5917BLACKBOXSPAM LTD6009SAO PAULO` +
    '62070503***6304B4X1'
  )
}

function qrUrl(data: string): string {
  return (
    'https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&qzone=1' +
    `&color=E4E4E7&bgcolor=18181B&data=${encodeURIComponent(data)}`
  )
}

const totalCredits = (p: Plan) => Math.round(p.credits * (1 + p.bonusPct / 100))

export default function PagamentosPage() {
  const [stage, setStage] = useState<Stage>('plans')
  const [plan, setPlan] = useState<Plan | null>(null)
  const [method, setMethod] = useState<Method>('pix')
  const [secondsLeft, setSecondsLeft] = useState(CHECKOUT_SECONDS)
  const [credits, setCredits] = useState<number | null>(null)
  const [licenseKey, setLicenseKey] = useState<string | null>(null)
  const [added, setAdded] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [authError, setAuthError] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [qrFailed, setQrFailed] = useState(false)

  // Sessão: lê a License Key do cookie httpOnly via API (Zero KYC)
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/credits')
        if (res.status === 401) {
          setAuthError(true)
          return
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.message || 'Erro ao carregar a sessão.')
        }
        const data = await res.json()
        setCredits(data.credits ?? 0)
        setLicenseKey(data.key)
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao carregar a sessão.')
      }
    }
    load()
  }, [])

  // Timer de "Aguardando Pagamento" (15:00)
  useEffect(() => {
    if (stage !== 'checkout' || secondsLeft <= 0) return
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [stage, secondsLeft])

  const startCheckout = (p: Plan) => {
    setPlan(p)
    setMethod('pix')
    setSecondsLeft(CHECKOUT_SECONDS)
    setQrFailed(false)
    setErrorMsg(null)
    setStage('checkout')
  }

  const copiar = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  // Simula a confirmação do pagamento e credita na tabela licenses
  const confirmarPagamento = async () => {
    if (!plan || processing) return
    setProcessing(true)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/credits/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Erro ao confirmar o pagamento.')
      setAdded(data.added)
      setCredits(data.credits)
      setStage('success')
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao confirmar o pagamento.')
    } finally {
      setProcessing(false)
    }
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')
  const expired = secondsLeft <= 0

  if (authError) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full text-center bg-black/80 backdrop-blur-sm border-[0.5px] border-zinc-800 rounded-3xl p-10">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-zinc-800/60 text-zinc-300 flex items-center justify-center mb-6">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-2">Sessão necessária</h1>
          <p className="text-zinc-400 text-sm mb-8">
            Faça login com sua License Key para recarregar créditos. Nenhum dado
            pessoal é solicitado — Zero KYC.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Ir para o login <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-black text-zinc-100 pb-24">
      <style>{`
        @keyframes bbxFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bbxPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: .5; } }
        @keyframes bbxPop { 0% { transform: scale(.55); opacity: 0; } 70% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
      `}</style>

      {/* Header */}
      <header className="border-b border-zinc-900">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/perfil"
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Meu Perfil
          </Link>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" /> Zero KYC
            </span>
            <div className="flex items-center gap-2 bg-black/80 backdrop-blur-sm border-[0.5px] border-zinc-800 px-3 py-1.5 rounded-full">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono font-bold text-white text-sm">
                {credits === null ? '—' : credits}{' '}
                <span className="text-emerald-400 text-xs">CR</span>
              </span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="w-full max-w-5xl mx-auto min-w-0 px-4 sm:px-6 pt-8 sm:pt-10">
        {/* ESTÁGIO 1 — ESCOLHA DO PLANO */}
        {stage === 'plans' && (
          <section>
            <div className="mb-8" style={{ animation: 'bbxFadeUp .4s ease both' }}>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                Recarregue seus créditos
              </h1>
              <p className="text-zinc-400 text-sm mt-2">
                Quanto maior o pacote, maior o bônus. Pagamento simulado — nenhum
                dado pessoal é coletado.
              </p>
            </div>

            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {PLANS.map((p, i) => {
                const total = totalCredits(p)
                const destaque = p.bonusPct >= 20
                return (
                  <button
                    key={p.id}
                    onClick={() => startCheckout(p)}
                    className={`group relative overflow-hidden rounded-3xl border p-6 text-left transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 ${
                      destaque
                        ? 'border-emerald-500/60 bg-gradient-to-b from-emerald-500/15 via-zinc-900 to-zinc-900 shadow-[0_0_50px_-15px_rgba(16,185,129,0.6)]'
                        : 'border-zinc-800 bg-black/80 backdrop-blur-sm hover:border-zinc-600'
                    }`}
                    style={{
                      animation: 'bbxFadeUp .45s ease both',
                      animationDelay: `${i * 90}ms`,
                    }}
                  >
                    {destaque && (
                      <span className="absolute -right-7 top-3.5 rotate-45 bg-emerald-500 px-7 py-0.5 text-[10px] font-black tracking-widest text-zinc-950">
                        MAIS VENDIDO
                      </span>
                    )}
                    <div className="flex items-center justify-between mb-4 pr-10">
                      <span className="text-[11px] font-bold tracking-widest uppercase text-zinc-500">
                        Pacote {p.id === 'starter' ? 'Básico' : p.id === 'growth' ? 'Pro' : 'Premium'}
                      </span>
                      {p.tag && (
                        <span className="flex items-center gap-1 bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-black px-2 py-1 rounded-full whitespace-nowrap">
                          <Flame className="w-3 h-3" /> {p.tag}
                        </span>
                      )}
                    </div>
                    <div className="mb-1">
                      <span className="text-5xl font-extrabold tracking-tighter text-white">
                        R$ {p.price}
                      </span>
                      <span className="text-zinc-500 text-sm ml-1">,00</span>
                    </div>
                    <p className="text-zinc-500 text-xs mb-5">
                      pagamento único • créditos imediatos
                    </p>
                    <div className="border-t border-zinc-800 pt-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-400">Créditos base</span>
                        <span className="font-mono font-bold text-white">{p.credits} CR</span>
                      </div>
                      {p.bonusPct > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-400">Bônus de crédito</span>
                          <span className="font-mono font-bold text-amber-400">
                            +{Math.round((p.credits * p.bonusPct) / 100)} CR
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                        <span className="text-xs font-bold tracking-widest uppercase text-emerald-400">
                          Você recebe
                        </span>
                        <span className="font-mono font-extrabold text-xl text-emerald-400">
                          {total} CR
                        </span>
                      </div>
                    </div>
                    <div className="mt-5 flex items-center justify-center gap-2 w-full bg-zinc-800 group-hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
                      Escolher plano{' '}
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </button>
                )
              })}
            </div>

            <div
              className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-500"
              style={{ animation: 'bbxFadeUp .5s ease both', animationDelay: '300ms' }}
            >
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-300" /> Zero KYC — sem CPF ou documentos
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-zinc-300" /> Créditos vinculados à sua License Key
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-zinc-300" /> Modo simulado para testes
              </span>
            </div>
          </section>
        )}
        {/* ESTÁGIO 2 — CHECKOUT */}
        {stage === 'checkout' && plan && (
          <section style={{ animation: 'bbxFadeUp .4s ease both' }}>
            <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-emerald-400 text-xs font-bold tracking-[0.2em] uppercase mb-1">
                  Checkout simulado
                </p>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white">
                  Finalizar recarga
                </h1>
              </div>
              <button
                onClick={() => setStage('plans')}
                className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar aos planos
              </button>
            </div>

            <div className="grid gap-5 grid-cols-1 md:grid-cols-5">
              {/* Resumo do pedido */}
              <div
                className="md:col-span-2 rounded-3xl border-[0.5px] border-zinc-800 bg-black/80 backdrop-blur-sm p-5 sm:p-6 h-fit min-w-0"
                style={{ animation: 'bbxFadeUp .45s ease both', animationDelay: '80ms' }}
              >
                <p className="text-zinc-500 text-xs uppercase font-bold tracking-widest mb-4">
                  Resumo do pedido
                </p>
                <div className="flex items-baseline justify-between mb-1 gap-3">
                  <span className="text-white font-bold">
                    Pacote {plan.id === 'starter' ? 'Básico' : plan.id === 'growth' ? 'Pro' : 'Premium'}
                  </span>
                  <span className="text-white font-mono font-bold whitespace-nowrap">
                    R$ {plan.price},00
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-zinc-400 mb-1">
                  <span>Créditos base</span>
                  <span className="font-mono flex items-center gap-1"><CoinIcon size={14} /> {plan.credits}</span>
                </div>
                {plan.bonusPct > 0 && (
                  <div className="flex items-center justify-between text-sm text-amber-400">
                    <span>Bônus de crédito ({plan.bonusPct}%)</span>
                    <span className="font-mono flex items-center gap-1">+<CoinIcon size={14} /> {Math.round((plan.credits * plan.bonusPct) / 100)}</span>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest font-bold text-emerald-400">
                    Total a creditar
                  </span>
                  <span className="text-2xl font-mono font-extrabold text-emerald-400 flex items-center gap-1"><CoinIcon size={18} /> {totalCredits(plan)}</span>
                </div>

                {licenseKey && (
                  <div className="mt-5 bg-zinc-950 border-[0.5px] border-zinc-800 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">
                      Vinculado à License Key
                    </p>
                    <p className="font-mono text-[11px] text-zinc-300 break-all">
                      {licenseKey.slice(0, 8)}••••••{licenseKey.slice(-4)}
                    </p>
                  </div>
                )}

                <div className="mt-4 space-y-2 text-xs text-zinc-500">
                  <p className="flex gap-2 items-start">
                    <ShieldCheck className="w-3.5 h-3.5 text-zinc-300 shrink-0 mt-0.5" />{' '}
                    Zero KYC — sem CPF, documentos ou dados pessoais
                  </p>
                  <p className="flex gap-2 items-start">
                    <Lock className="w-3.5 h-3.5 text-zinc-300 shrink-0 mt-0.5" />{' '}
                    Modo simulado — nenhum valor real é cobrado
                  </p>
                </div>
              </div>
              {/* Painel de pagamento */}
              <div
                className="md:col-span-3 rounded-3xl border-[0.5px] border-zinc-800 bg-black/80 backdrop-blur-sm p-5 sm:p-6 min-w-0"
                style={{ animation: 'bbxFadeUp .45s ease both', animationDelay: '160ms' }}
              >
                {/* Tabs de método */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-6 min-w-0">
                  {([
                    { id: 'pix', label: 'PIX', sub: 'Instantâneo', icon: <CreditCard className="w-4 h-4" /> },
                    { id: 'usdt', label: 'USDT', sub: 'TRC20', icon: <Zap className="w-4 h-4" /> },
                    { id: 'btc', label: 'BTC', sub: 'Bitcoin', icon: <Bitcoin className="w-4 h-4" /> },
                  ] as const).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setMethod(m.id)
                        setQrFailed(false)
                      }}
                      className={`flex min-w-0 flex-col items-center gap-0.5 px-1 py-3 rounded-xl border text-sm font-bold transition-all ${
                        method === m.id
                          ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_-6px_rgba(16,185,129,0.5)]'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {m.icon}
                        {m.label}
                      </span>
                      <span className="text-[10px] font-medium text-zinc-500">{m.sub}</span>
                    </button>
                  ))}
                </div>

                {/* Timer de expiração */}
                <div className="flex justify-center mb-5">
                  <div
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold ${
                      expired
                        ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full bg-current"
                      style={expired ? undefined : { animation: 'bbxPulse 1s ease-in-out infinite' }}
                    />
                    <Timer className="w-3.5 h-3.5" />
                    {expired ? (
                      'Cobrança expirada'
                    ) : (
                      <>
                        Aguardando pagamento —{' '}
                        <span className="font-mono tabular-nums">
                          {mm}:{ss}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* QR + código (transição animada ao trocar de método) */}
                <div
                  key={method}
                  style={{ animation: 'bbxFadeUp .35s ease both' }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="relative bg-zinc-950 border-[0.5px] border-zinc-800 rounded-2xl p-4">
                    {!qrFailed ? (
                      <img
                        src={qrUrl(
                          method === 'pix' ? pixPayload(plan.price) : WALLETS[method].address
                        )}
                        alt="QR Code simulado"
                        className="w-48 h-48 sm:w-52 sm:h-52 max-w-full rounded-lg bg-black/80 backdrop-blur-sm"
                        onError={() => setQrFailed(true)}
                      />
                    ) : (
                      <div className="w-48 h-48 sm:w-52 sm:h-52 max-w-full rounded-lg bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 text-zinc-500 text-xs">
                        QR temporariamente indisponível — copie o código abaixo
                      </div>
                    )}
                    <span className="absolute top-2 left-2 flex items-center gap-1 bg-black/85 backdrop-blur-sm border-[0.5px] border-zinc-800 text-[9px] font-black tracking-widest text-zinc-400 px-2 py-1 rounded-md">
                      <QrCode className="w-3 h-3" /> QR SIMULADO
                    </span>
                    {expired && (
                      <div className="absolute inset-0 bg-zinc-950/85 rounded-2xl flex items-center justify-center">
                        <span className="text-red-400 font-bold text-sm tracking-widest">
                          EXPIRADO
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="mt-4 text-sm text-zinc-300 font-semibold">
                    {method === 'pix'
                      ? `Pague R$ ${plan.price},00 via PIX`
                      : `Envie o valor equivalente a R$ ${plan.price},00`}
                  </p>

                  <div className="mt-3 w-full bg-zinc-950 border-[0.5px] border-zinc-800 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">
                          {method === 'pix'
                            ? 'PIX Copia e Cola'
                            : `Carteira ${WALLETS[method].label} • ${WALLETS[method].network}`}
                        </p>
                        <p className="font-mono text-[11px] text-zinc-300 break-all">
                          {method === 'pix' ? pixPayload(plan.price) : WALLETS[method].address}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          copiar(
                            method === 'pix' ? pixPayload(plan.price) : WALLETS[method].address,
                            method
                          )
                        }
                        className={`shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition-colors ${
                          copied === method
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                        }`}
                      >
                        {copied === method ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copiar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  {errorMsg && (
                    <p className="text-red-400 text-sm mt-3 text-center">{errorMsg}</p>
                  )}

                  {expired ? (
                    <button
                      onClick={() => setSecondsLeft(CHECKOUT_SECONDS)}
                      className="mt-5 w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" /> Gerar novo código (15:00)
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={confirmarPagamento}
                        disabled={processing}
                        className="mt-5 w-full flex items-center justify-center gap-2 border-2 border-dashed border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-wait"
                      >
                        <Zap className="w-4 h-4" />
                        {processing ? 'Creditando...' : 'Simular Confirmação de Pagamento'}
                      </button>
                      <p className="text-[11px] text-zinc-600 text-center mt-2">
                        Botão de teste — em produção a confirmação viria do gateway.
                      </p>
                    </>
                  )}
                </div>
              </div>



            </div>
          </section>
        )}

        {/* ESTÁGIO 3 — SUCESSO */}
        {stage === 'success' && plan && (
          <section
            className="flex justify-center"
            style={{ animation: 'bbxFadeUp .4s ease both' }}
          >
            <div className="w-full max-w-md text-center bg-black/80 backdrop-blur-sm border-[0.5px] border-zinc-800 rounded-3xl p-6 sm:p-10 min-w-0 shadow-[0_0_60px_-20px_rgba(16,185,129,0.4)]">
              <div
                className="mx-auto w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6"
                style={{ animation: 'bbxPop .5s ease both' }}
              >
                <Check className="w-10 h-10 text-emerald-400" />
              </div>
              <p className="text-emerald-400 text-xs font-bold tracking-[0.2em] uppercase mb-2">
                Pagamento confirmado
              </p>
              <h1 className="text-3xl font-extrabold text-white mb-2 flex items-center justify-center gap-1">
                +{added} <CoinIcon size={20} /> creditados!
              </h1>
              <p className="text-zinc-400 text-sm mb-6">
                Pacote{' '}
                {plan.id === 'starter' ? 'Básico' : plan.id === 'growth' ? 'Pro' : 'Premium'}{' '}
                — pagamento simulado concluído com sucesso.
              </p>
              <div className="bg-zinc-950 border-[0.5px] border-zinc-800 rounded-2xl px-4 py-5 mb-8">
                <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">
                  Novo saldo
                </p>
                <p className="text-4xl font-mono font-extrabold text-white">
                  {credits} <CoinIcon size={22} />
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/perfil"
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  Ver meu perfil <ChevronRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => setStage('plans')}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  <RefreshCw className="w-4 h-4" /> Recarregar mais
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
