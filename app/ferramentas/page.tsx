'use client'
import { useEffect, useState } from 'react'
import { Wrench, Download, Lock, Zap, Mail, MessageSquare, ShieldCheck, Globe, Users, Smartphone } from 'lucide-react'
import LogoutButton from '@/app/components/logout-button'
import CoinIcon from '@/app/components/coin-icon'
import ProxyScraperPanel from './_components/proxy-scraper-panel'
import { AppShell } from '@/app/components/app-shell'
import { PageHeader, StatusPill } from '@/app/components/qc-ui'

interface Ferramenta {
  id: string; nome: string; descricao: string; custo_creditos: number; link_download: string;
}

// Ferramentas simuladas (modo demonstração): exibidas sempre, mesmo que a
// tabela `ferramentas` ainda esteja vazia no Supabase. Se o banco retornar
// itens, eles são somados a esta lista sem duplicar ids.
const SIMULADAS: Ferramenta[] = [
  { id: 'sim-mail-blast', nome: 'MailBlast Pro', descricao: 'Disparador de e-mail em massa com rotação de SMTP e warm-up automático.', custo_creditos: 50, link_download: '#' },
  { id: 'sim-sms-pump', nome: 'SMS Pump', descricao: 'Envio de SMS em escala com gateway redundante e relatórios em tempo real.', custo_creditos: 40, link_download: '#' },
  { id: 'sim-lead-scraper', nome: 'LeadScraper X', descricao: 'Extração de leads de sites, mapas e redes sociais com exportação CSV.', custo_creditos: 30, link_download: '#' },
  { id: 'sim-number-check', nome: 'NumberCheck', descricao: 'Validador de números WhatsApp/SMS com verificação de atividade.', custo_creditos: 20, link_download: '#' },
  { id: 'sim-inbox-warm', nome: 'InboxWarm', descricao: 'Aquecimento automático de caixas de e-mail para máxima entregabilidade.', custo_creditos: 35, link_download: '#' },
  { id: 'sim-proxy-vault', nome: 'ProxyVault', descricao: 'Pool de proxies residenciais rotativos para operações de escala.', custo_creditos: 45, link_download: '#' },
]

const iconFor = (id: string) => {
  if (id.includes('mail') || id.includes('inbox')) return Mail
  if (id.includes('sms')) return MessageSquare
  if (id.includes('scraper') || id.includes('lead')) return Users
  if (id.includes('number') || id.includes('check')) return Smartphone
  if (id.includes('proxy') || id.includes('vault')) return Globe
  return Wrench
}

export default function FerramentasPage() {
  const [ferramentas, setFerramentas] = useState<Ferramenta[]>([])
  const [loading, setLoading] = useState(true)
  const [credits, setCredits] = useState<number | null>(null)
  const [desbloqueadas, setDesbloqueadas] = useState<string[]>([])
  const [aviso, setAviso] = useState<string | null>(null)
  const [pagandoId, setPagandoId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchFerramentas() {
      try {
        const { supabase } = await import('@/app/lib/supabase')
        const { data, error } = await supabase
          .from('ferramentas')
          .select('*')
          .order('nome', { ascending: true })
        if (error) throw error
        const banco: Ferramenta[] = (data as Ferramenta[]) || []
        const ids = new Set(banco.map((f) => f.id))
        setFerramentas([...banco, ...SIMULADAS.filter((s) => !ids.has(s.id))])
      } catch (e) {
        // Banco indisponível: cai para a lista simulada
        console.error(e)
        setFerramentas(SIMULADAS)
      } finally { setLoading(false) }
    }

    // Saldo de créditos da License Key
    async function fetchCredits() {
      try {
        const res = await fetch('/api/credits')
        if (res.status === 401) { window.location.href = '/login'; return }
        if (res.ok) {
          const d = await res.json()
          setCredits(d.credits ?? 0)
        }
      } catch (e) { console.error(e) }
    }

    // Ferramentas já desbloqueadas no SERVIDOR (tabela unlocks) — persistem
    // entre dispositivos e navegadores, sem depender de localStorage.
    async function fetchUnlocks() {
      try {
        const res = await fetch('/api/unlocks')
        if (res.ok) {
          const d = await res.json()
          setDesbloqueadas(d.content_ids ?? [])
        }
      } catch (e) { console.error(e) }
    }

    fetchFerramentas()
    fetchCredits()
    fetchUnlocks()
  }, [])

  async function desbloquear(ferramenta: Ferramenta) {
    if (pagandoId) return
    setAviso(null)

    // Já desbloqueada: abre direto sem cobrar de novo
    if (desbloqueadas.includes(ferramenta.id)) {
      if (ferramenta.link_download && ferramenta.link_download !== '#') {
        window.open(ferramenta.link_download, '_blank')
      } else {
        setAviso(`"${ferramenta.nome}" já está ativa na sua conta (modo simulação).`)
      }
      return
    }

    if (credits !== null && credits < ferramenta.custo_creditos) {
      setAviso(`Saldo insuficiente: "${ferramenta.nome}" custa ${ferramenta.custo_creditos} CR e você tem ${credits} CR.`)
      return
    }

    setPagandoId(ferramenta.id)
    try {
      // Compra atômica: débito + desbloqueio numa única operação servidor.
      const res = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_id: ferramenta.id, content_type: 'ferramenta', amount: ferramenta.custo_creditos }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.status === 401) {
        window.location.href = '/login'
        return
      }
      if (res.status === 409) {
        setCredits(data.credits ?? 0)
        setAviso(data.message || 'Créditos insuficientes.')
        return
      }
      if (!res.ok) {
        setAviso(data.message || 'Não foi possível desbloquear. Tente novamente.')
        return
      }

      setCredits(data.credits ?? 0)
      setDesbloqueadas([...desbloqueadas, ferramenta.id])

      if (ferramenta.link_download && ferramenta.link_download !== '#') {
        window.open(ferramenta.link_download, '_blank')
      }
    } catch {
      setAviso('Erro de rede ao desbloquear. Tente novamente.')
    } finally {
      setPagandoId(null)
    }
  }

  if (loading)
    return (
      <AppShell>
        <div className="flex items-center justify-center gap-3 py-24 font-mono text-sm text-muted">
          <Wrench className="h-4 w-4 animate-pulse text-accent" />
          carregando_ferramentas<span className="animate-blink">_</span>
        </div>
      </AppShell>
    )

  return (
    <AppShell>
      <PageHeader
        eyebrow="Ferramentas"
        title="Ferramentas & Licenças"
        subtitle="Softwares, licenças e utilitários de escala — desbloqueio por créditos."
        icon={<Wrench className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <span className="chip">
              <CoinIcon size={14} />
              <span className="tabular-nums text-ink">{credits === null ? '—' : credits}</span>
              <span className="text-faint">CR</span>
            </span>
            <LogoutButton />
          </div>
        }
      />

      {aviso && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 font-mono text-xs text-danger">
          <span className="mt-0.5 shrink-0">!</span>
          <span className="break-all">{aviso}</span>
        </div>
      )}

      <div className="mb-6 flex items-center gap-2 font-mono text-xs text-faint">
        <ShieldCheck className="h-4 w-4 text-accent" />
        Desbloqueio vinculado à sua License Key — ferramentas ativas não cobram de novo.
      </div>

      {/* Proxy Scraper PRO — licença validade + dispositivo (compra com créditos) */}
      <div className="mb-8">
        <ProxyScraperPanel />
      </div>

        <div className="grid gap-2 sm:gap-3">
          {ferramentas.length === 0 ? (
            <div className="panel p-12 text-center">
              <Lock className="mx-auto mb-4 h-12 w-12 text-faint" />
              <p className="text-muted">Nenhuma ferramenta disponível no momento.</p>
            </div>
          ) : (
            ferramentas.map((ferramenta) => {
              const Icon = iconFor(ferramenta.id)
              const ativa = desbloqueadas.includes(ferramenta.id)
              return (
              <div
                key={ferramenta.id}
                className="panel group flex flex-col gap-3 p-3 transition-all hover:border-accent/40 sm:flex-row sm:items-center sm:justify-between sm:p-4"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-raised/60 text-muted transition-colors group-hover:border-accent/40 group-hover:text-accent sm:h-10 sm:w-10">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="flex flex-wrap items-center gap-2 font-medium text-ink transition-colors group-hover:text-accent">
                      {ferramenta.nome}
                      {ativa && <StatusPill label="ativa" tone="good" />}
                    </h3>
                    <p className="line-clamp-1 text-xs text-muted">{ferramenta.descricao}</p>
                  </div>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
                  {ativa ? (
                    ferramenta.link_download && ferramenta.link_download !== '#' ? (
                      <a
                        href={ferramenta.link_download}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                      >
                        <Download className="h-3.5 w-3.5" /> Baixar
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-lg border border-good/40 bg-good/10 px-4 py-2 text-xs text-good">
                        <Download className="h-3 w-3" /> Ativa
                      </span>
                    )
                  ) : (
                    <button
                      onClick={() => desbloquear(ferramenta)}
                      disabled={pagandoId === ferramenta.id}
                      className={`btn w-full justify-center sm:w-auto shrink-0 disabled:cursor-wait disabled:opacity-60 ${
                        credits !== null && credits < ferramenta.custo_creditos
                          ? 'border-danger/40 bg-danger/10 text-danger'
                          : 'btn-primary'
                      }`}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      {pagandoId === ferramenta.id ? 'Processando...' : <><CoinIcon size={13} /> {ferramenta.custo_creditos} · Desbloquear</>}
                    </button>
                  )}
                </div>
              </div>
              )
            })
          )}
        </div>
    </AppShell>
  )
}
