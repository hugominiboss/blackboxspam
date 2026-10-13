'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Wrench, ChevronLeft, Download, Lock, Zap, Mail, MessageSquare, ShieldCheck, Globe, Users, Smartphone } from 'lucide-react'
import LogoutButton from '@/app/components/logout-button'
import CoinIcon from '@/app/components/coin-icon'
import ProxyScraperPanel from './_components/proxy-scraper-panel'

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

  if (loading) return <div className="h-screen bg-black text-white flex items-center justify-center font-mono">CARREGANDO_FERRAMENTAS...</div>

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-black text-zinc-100 px-4 py-6 sm:p-6 md:p-12">
      <div className="w-full max-w-4xl mx-auto min-w-0">
        <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm mb-12 group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Voltar para a vitrine
        </Link>

        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 min-w-0">
            <div className="p-3 bg-zinc-800/60 rounded-2xl text-zinc-300 shrink-0">
              <Wrench className="w-8 h-8" />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight break-words">Ferramentas</h1>
              <p className="text-zinc-400 text-sm mt-1">Softwares, licenças e utilitários de escala.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full">
              <CoinIcon size={16} />
              <span className="text-white font-mono font-bold text-sm whitespace-nowrap">{credits === null ? '—' : credits}</span>
            </span>
            <LogoutButton />
          </div>
        </header>

        {aviso && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
            {aviso}
          </div>
        )}

        <div className="mb-6 flex items-center gap-2 text-xs text-zinc-500">
          <ShieldCheck className="w-4 h-4 text-zinc-300" />
          Desbloqueio vinculado à sua License Key — ferramentas ativas não cobram de novo.
        </div>

        {/* Proxy Scraper PRO — licença validade + dispositivo (compra com créditos) */}
        <div className="mb-8">
          <ProxyScraperPanel />
        </div>

        <div className="grid gap-3">
          {ferramentas.length === 0 ? (
            <div className="bg-zinc-900 p-12 rounded-3xl text-center border border-zinc-800">
              <Lock className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500">Nenhuma ferramenta disponível no momento.</p>
            </div>
          ) : (
            ferramentas.map((ferramenta) => {
              const Icon = iconFor(ferramenta.id)
              const ativa = desbloqueadas.includes(ferramenta.id)
              return (
              <div
                key={ferramenta.id}
                className="group bg-zinc-900/70 border border-zinc-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between hover:bg-zinc-800/50 hover:border-zinc-700 transition-all min-w-0"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-10 h-10 shrink-0 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:bg-purple-500 group-hover:text-white transition-all">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-white font-medium group-hover:text-purple-400 transition-colors flex items-center gap-2 flex-wrap">
                      {ferramenta.nome}
                      {ativa && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          ATIVA
                        </span>
                      )}
                    </h3>
                    <p className="text-zinc-500 text-xs line-clamp-1">{ferramenta.descricao}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:shrink-0 sm:justify-end">
                  {ativa ? (
                    ferramenta.link_download && ferramenta.link_download !== '#' ? (
                      <a
                        href={ferramenta.link_download}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-emerald-600 text-white text-xs px-4 py-2 rounded-full hover:bg-emerald-500 transition-all"
                      >
                        <Download className="w-3 h-3" /> Baixar
                      </a>
                    ) : (
                      <span className="flex items-center gap-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-xs px-4 py-2 rounded-full">
                        <Download className="w-3 h-3" /> Ativa
                      </span>
                    )
                  ) : (
                    <button
                      onClick={() => desbloquear(ferramenta)}
                      disabled={pagandoId === ferramenta.id}
                      className={`flex items-center gap-2 text-xs px-4 py-2 rounded-full transition-all shrink-0 disabled:opacity-60 disabled:cursor-wait ${
                        credits !== null && credits < ferramenta.custo_creditos
                          ? 'bg-zinc-800 text-red-400 border border-red-500/40'
                          : 'bg-zinc-800 text-white hover:bg-purple-600'
                      }`}
                    >
                      <Zap className="w-3 h-3 text-zinc-300" />
                      {pagandoId === ferramenta.id ? 'Processando...' : <><CoinIcon size={13} /> {ferramenta.custo_creditos} · Desbloquear</>}
                    </button>
                  )}
                </div>
              </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
