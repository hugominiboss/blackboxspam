'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Bitcoin, Check, ChevronRight, Copy, CreditCard, Flame,
  Lock, QrCode, RefreshCw, ShieldCheck, Timer, Zap,
} from 'lucide-react'
import LogoutButton from '@/app/components/logout-button'
import CoinIcon from '@/app/components/coin-icon'
import { AppShell } from '@/app/components/app-shell'
import { PageHeader, Panel } from '@/app/components/qc-ui'

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
      <AppShell>
        <Panel className="mx-auto w-full max-w-md p-10 text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-line bg-raised/60 text-muted">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="mb-2 font-display text-2xl font-bold text-ink">Sessão necessária</h1>
          <p className="mb-8 text-sm text-muted">
            Faça login com sua License Key para recarregar créditos. Nenhum dado
            pessoal é solicitado — Zero KYC.
          </p>
          <Link href="/login" className="btn btn-primary">
            Ir para o login <ChevronRight className="h-4 w-4" />
          </Link>
        </Panel>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <style>{`
        @keyframes bbxFadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bbxPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: .5; } }
        @keyframes bbxPop { 0% { transform: scale(.55); opacity: 0; } 70% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
      `}</style>

      {/* Header */}
      <PageHeader
        eyebrow="BlackBox Vault"
        title="Recarga de Créditos"
        subtitle="Pagamento simulado — Zero KYC, nenhum dado pessoal é coletado."
        actions={
          <>
            <Link href="/perfil" className="btn btn-ghost hidden sm:inline-flex">
              <ArrowLeft className="h-4 w-4" /> Meu Perfil
            </Link>
            <span className="chip hidden border-good/40 bg-good/10 text-good sm:inline-flex">
              <ShieldCheck className="h-3.5 w-3.5" /> Zero KYC
            </span>
            <span className="chip">
              <Zap className="h-3.5 w-3.5 text-accent" />
              <span className="font-mono font-bold text-ink">
                {credits === null ? '—' : credits}{' '}
                <span className="text-xs text-accent">CR</span>
              </span>
            </span>
            <LogoutButton />
          </>
        }
      />

      <main className="w-full min-w-0">
        {/* ESTÁGIO 1 — ESCOLHA DO PLANO */}
        {stage === 'plans' && (
          <section>
            <div className="mb-8" style={{ animation: 'bbxFadeUp .4s ease both' }}>
              <h2 className="font-display text-3xl font-bold tracking-tight text-ink md:text-4xl">
                Recarregue seus créditos
              </h2>
              <p className="mt-2 text-sm text-muted">
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
                    className={`group relative overflow-hidden rounded-xl border p-6 text-left transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-accent/60 ${
                      destaque
                        ? 'border-accent/50 bg-gradient-to-b from-accent/10 via-surface to-surface shadow-glow'
                        : 'border-line bg-surface/70 hover:border-accent/40'
                    }`}
                    style={{
                      animation: 'bbxFadeUp .45s ease both',
                      animationDelay: `${i * 90}ms`,
                    }}
                  >
                    {destaque && (
                      <span className="absolute -right-7 top-3.5 rotate-45 bg-accent px-7 py-0.5 text-[10px] font-black tracking-widest text-bg">
                        MAIS VENDIDO
                      </span>
                    )}
                    <div className="mb-4 flex items-center justify-between pr-10">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-faint">
                        Pacote {p.id === 'starter' ? 'Básico' : p.id === 'growth' ? 'Pro' : 'Premium'}
                      </span>
                      {p.tag && (
                        <span className="flex items-center gap-1 whitespace-nowrap rounded-full border border-warn/30 bg-warn/15 px-2 py-1 text-[10px] font-black text-warn">
                          <Flame className="h-3 w-3" /> {p.tag}
                        </span>
                      )}
                    </div>
                    <div className="mb-1">
                      <span className="text-5xl font-extrabold tracking-tighter text-ink">
                        R$ {p.price}
                      </span>
                      <span className="ml-1 text-sm text-faint">,00</span>
                    </div>
                    <p className="mb-5 text-xs text-faint">
                      pagamento único • créditos imediatos
                    </p>
                    <div className="space-y-2 border-t border-line pt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted">Créditos base</span>
                        <span className="font-mono font-bold text-ink">{p.credits} CR</span>
                      </div>
                      {p.bonusPct > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted">Bônus de crédito</span>
                          <span className="font-mono font-bold text-warn">
                            +{Math.round((p.credits * p.bonusPct) / 100)} CR
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between border-t border-line/60 pt-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-accent">
                          Você recebe
                        </span>
                        <span className="font-mono text-xl font-extrabold text-accent">
                          {total} CR
                        </span>
                      </div>
                    </div>
                    <div className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-raised/70 py-3 text-sm font-medium text-muted transition-colors group-hover:border-accent/50 group-hover:bg-accent/15 group-hover:text-accent">
                      Escolher plano{' '}
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </button>
                )
              })}
            </div>

            <div
              className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-faint"
              style={{ animation: 'bbxFadeUp .5s ease both', animationDelay: '300ms' }}
            >
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-muted" /> Zero KYC — sem CPF ou documentos
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-muted" /> Créditos vinculados à sua License Key
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-muted" /> Modo simulado para testes
              </span>
            </div>
          </section>
        )}
        {/* ESTÁGIO 2 — CHECKOUT */}
        {stage === 'checkout' && plan && (
          <section style={{ animation: 'bbxFadeUp .4s ease both' }}>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-accent">
                  Checkout simulado
                </p>
                <h2 className="font-display text-2xl font-bold text-ink md:text-3xl">
                  Finalizar recarga
                </h2>
              </div>
              <button
                onClick={() => setStage('plans')}
                className="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar aos planos
              </button>
            </div>

            <div className="grid gap-5 grid-cols-1 md:grid-cols-5">
              {/* Resumo do pedido */}
              <div
                className="panel h-fit min-w-0 p-5 sm:p-6 md:col-span-2"
                style={{ animation: 'bbxFadeUp .45s ease both', animationDelay: '80ms' }}
              >
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-faint">
                  Resumo do pedido
                </p>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="font-medium text-ink">
                    Pacote {plan.id === 'starter' ? 'Básico' : plan.id === 'growth' ? 'Pro' : 'Premium'}
                  </span>
                  <span className="whitespace-nowrap font-mono font-bold text-ink">
                    R$ {plan.price},00
                  </span>
                </div>
                <div className="mb-1 flex items-center justify-between text-sm text-muted">
                  <span>Créditos base</span>
                  <span className="flex items-center gap-1 font-mono"><CoinIcon size={14} /> {plan.credits}</span>
                </div>
                {plan.bonusPct > 0 && (
                  <div className="flex items-center justify-between text-sm text-warn">
                    <span>Bônus de crédito ({plan.bonusPct}%)</span>
                    <span className="flex items-center gap-1 font-mono">+<CoinIcon size={14} /> {Math.round((plan.credits * plan.bonusPct) / 100)}</span>
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-accent">
                    Total a creditar
                  </span>
                  <span className="flex items-center gap-1 text-2xl font-mono font-extrabold text-accent"><CoinIcon size={18} /> {totalCredits(plan)}</span>
                </div>

                {licenseKey && (
                  <div className="mt-5 rounded-xl border border-line bg-raised px-3 py-2.5">
                    <p className="mb-1 text-[10px] uppercase tracking-widest text-faint">
                      Vinculado à License Key
                    </p>
                    <p className="break-all font-mono text-[11px] text-muted">
                      {licenseKey.slice(0, 8)}••••••{licenseKey.slice(-4)}
                    </p>
                  </div>
                )}

                <div className="mt-4 space-y-2 text-xs text-faint">
                  <p className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />{' '}
                    Zero KYC — sem CPF, documentos ou dados pessoais
                  </p>
                  <p className="flex items-start gap-2">
                    <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />{' '}
                    Modo simulado — nenhum valor real é cobrado
                  </p>
                </div>
              </div>
              {/* Painel de pagamento */}
              <div
                className="panel min-w-0 p-5 sm:p-6 md:col-span-3"
                style={{ animation: 'bbxFadeUp .45s ease both', animationDelay: '160ms' }}
              >
                {/* Tabs de método */}
                <div className="mb-6 grid min-w-0 grid-cols-3 gap-1.5 sm:gap-2">
                  {([
                    { id: 'pix', label: 'PIX', sub: 'Instantâneo', icon: <CreditCard className="h-4 w-4" /> },
                    { id: 'usdt', label: 'USDT', sub: 'TRC20', icon: <Zap className="h-4 w-4" /> },
                    { id: 'btc', label: 'BTC', sub: 'Bitcoin', icon: <Bitcoin className="h-4 w-4" /> },
                  ] as const).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setMethod(m.id)
                        setQrFailed(false)
                      }}
                      className={`flex min-w-0 flex-col items-center gap-0.5 rounded-xl border px-1 py-3 text-sm font-bold transition-all ${
                        method === m.id
                          ? 'border-accent/50 bg-accent/10 text-accent shadow-glow'
                          : 'border-line bg-raised/60 text-muted hover:border-accent/40'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {m.icon}
                        {m.label}
                      </span>
                      <span className="text-[10px] font-medium text-faint">{m.sub}</span>
                    </button>
                  ))}
                </div>

                {/* Timer de expiração */}
                <div className="mb-5 flex justify-center">
                  <div
                    className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-bold ${
                      expired
                        ? 'border-danger/40 bg-danger/10 text-danger'
                        : 'border-warn/40 bg-warn/10 text-warn'
                    }`}
                  >
                    <span
                      className="h-2 w-2 rounded-full bg-current"
                      style={expired ? undefined : { animation: 'bbxPulse 1s ease-in-out infinite' }}
                    />
                    <Timer className="h-3.5 w-3.5" />
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
                  <div className="relative rounded-xl border border-line bg-raised/60 p-4">
                    {!qrFailed ? (
                      <img
                        src={qrUrl(
                          method === 'pix' ? pixPayload(plan.price) : WALLETS[method].address
                        )}
                        alt="QR Code simulado"
                        className="h-48 w-48 max-w-full rounded-lg bg-raised p-1 sm:h-52 sm:w-52"
                        onError={() => setQrFailed(true)}
                      />
                    ) : (
                      <div className="flex h-48 w-48 max-w-full items-center justify-center rounded-lg bg-raised p-6 text-xs text-faint sm:h-52 sm:w-52">
                        QR temporariamente indisponível — copie o código abaixo
                      </div>
                    )}
                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-[9px] font-black tracking-widest text-faint">
                      <QrCode className="h-3 w-3" /> QR SIMULADO
                    </span>
                    {expired && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-bg/90">
                        <span className="text-sm font-bold tracking-widest text-danger">
                          EXPIRADO
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="mt-4 text-sm font-medium text-ink">
                    {method === 'pix'
                      ? `Pague R$ ${plan.price},00 via PIX`
                      : `Envie o valor equivalente a R$ ${plan.price},00`}
                  </p>

                  <div className="mt-3 w-full rounded-xl border border-line bg-raised/60 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1 text-left">
                        <p className="mb-1 text-[10px] uppercase tracking-widest text-faint">
                          {method === 'pix'
                            ? 'PIX Copia e Cola'
                            : `Carteira ${WALLETS[method].label} • ${WALLETS[method].network}`}
                        </p>
                        <p className="break-all font-mono text-[11px] text-muted">
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
                        className={`btn shrink-0 text-xs font-bold ${
                          copied === method
                            ? 'border-good/40 bg-good/10 text-good'
                            : 'border-line bg-raised text-ink hover:border-accent/40'
                        }`}
                      >
                        {copied === method ? (
                          <>
                            <Check className="h-3.5 w-3.5" /> Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" /> Copiar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  {errorMsg && (
                    <p className="mt-3 text-center text-sm text-danger">{errorMsg}</p>
                  )}

                  {expired ? (
                    <button
                      onClick={() => setSecondsLeft(CHECKOUT_SECONDS)}
                      className="btn btn-primary mt-5 w-full py-3.5"
                    >
                      <RefreshCw className="h-4 w-4" /> Gerar novo código (15:00)
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={confirmarPagamento}
                        disabled={processing}
                        className="btn mt-5 w-full border-dashed border-warn/50 bg-warn/10 py-3.5 font-bold text-warn hover:bg-warn/20 disabled:cursor-wait disabled:opacity-50"
                      >
                        <Zap className="h-4 w-4" />
                        {processing ? 'Creditando...' : 'Simular Confirmação de Pagamento'}
                      </button>
                      <p className="mt-2 text-center text-[11px] text-faint">
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
            <div className="panel w-full min-w-0 max-w-md p-6 text-center shadow-glow sm:p-10">
              <div
                className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-good/40 bg-good/10"
                style={{ animation: 'bbxPop .5s ease both' }}
              >
                <Check className="h-10 w-10 text-good" />
              </div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-good">
                Pagamento confirmado
              </p>
              <h2 className="mb-2 flex items-center justify-center gap-1 font-display text-3xl font-bold text-ink">
                +{added} <CoinIcon size={20} /> creditados!
              </h2>
              <p className="mb-6 text-sm text-muted">
                Pacote{' '}
                {plan.id === 'starter' ? 'Básico' : plan.id === 'growth' ? 'Pro' : 'Premium'}{' '}
                — pagamento simulado concluído com sucesso.
              </p>
              <div className="mb-8 rounded-xl border border-line bg-raised/60 px-4 py-5">
                <p className="mb-1 text-xs uppercase tracking-widest text-faint">
                  Novo saldo
                </p>
                <p className="text-4xl font-mono font-extrabold text-ink">
                  {credits} <CoinIcon size={22} />
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/perfil"
                  className="btn btn-primary flex-1"
                >
                  Ver meu perfil <ChevronRight className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => setStage('plans')}
                  className="btn flex-1"
                >
                  <RefreshCw className="h-4 w-4" /> Recarregar mais
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
    </AppShell>
  )
}
