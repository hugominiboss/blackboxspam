'use client'
import { useEffect, useState, use } from 'react'
import { supabase } from '@/app/lib/supabase'
import Link from 'next/link'
import { Play, ChevronLeft, Lock } from 'lucide-react'
import LogoutButton from '@/app/components/logout-button'
import CoinIcon from '@/app/components/coin-icon'
import { AppShell } from '@/app/components/app-shell'
import { PageHeader } from '@/app/components/qc-ui'

interface Aula {
  id: string; titulo: string; descricao: string; link_video: string; ordem: number;
}

// Valor experimental: cada episódio custa 10 créditos para desbloquear
const CUSTO_AULA = 10

export default function ModuloPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [aulas, setAulas] = useState<Aula[]>([])
  const [loading, setLoading] = useState(true)
  const [credits, setCredits] = useState<number | null>(null)
  const [desbloqueadas, setDesbloqueadas] = useState<string[]>([])
  const [aviso, setAviso] = useState<string | null>(null)
  const [pagandoId, setPagandoId] = useState<string | null>(null)

  const filtros: Record<string, string[]> = {
    obtencao: ["obtenção", "fishing", "dump", "sql", "cloud"],
    spam: ["spam", "email", "sms", "engenharia"],
    negociacao: ["comunidades", "carreira", "vendendo", "negociando"]
  }

  useEffect(() => {
    // Aulas do módulo
    async function fetchAulas() {
      try {
        const { data, error } = await supabase.from('aulas').select('*').order('ordem', { ascending: true })
        if (error) throw error
        const palavrasChave = filtros[id] || []
        const filtradas = data?.filter(aula => palavrasChave.some(p => aula.titulo.toLowerCase().includes(p.toLowerCase()))) || []
        setAulas(filtradas)
      } catch (e) { console.error(e) } finally { setLoading(false) }
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

    // Aulas já desbloqueadas no SERVIDOR (tabela unlocks) — persistem entre
    // dispositivos e navegadores, sem depender de localStorage.
    async function fetchUnlocks() {
      try {
        const res = await fetch('/api/unlocks')
        if (res.ok) {
          const d = await res.json()
          setDesbloqueadas(d.content_ids ?? [])
        }
      } catch (e) { console.error(e) }
    }

    fetchAulas()
    fetchCredits()
    fetchUnlocks()
  }, [id])

  async function desbloquear(aula: Aula) {
    if (pagandoId) return
    setAviso(null)

    // Já desbloqueada: abre direto sem cobrar de novo
    if (desbloqueadas.includes(aula.id)) {
      window.open(aula.link_video, '_blank')
      return
    }

    if (credits !== null && credits < CUSTO_AULA) {
      setAviso(`Saldo insuficiente: esta aula custa ${CUSTO_AULA} CR e você tem ${credits} CR.`)
      return
    }

    setPagandoId(aula.id)
    // Abre a aba antes da requisição para não ser bloqueado pelo popup blocker
    const win = window.open('', '_blank')
    try {
      // Compra atômica: débito + desbloqueio numa única operação servidor.
      const res = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_id: aula.id, content_type: 'aula' }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.status === 401) {
        win?.close()
        window.location.href = '/login'
        return
      }
      if (res.status === 409) {
        win?.close()
        setCredits(data.credits ?? 0)
        setAviso(data.message || 'Créditos insuficientes.')
        return
      }
      if (!res.ok) {
        win?.close()
        setAviso(data.message || 'Erro ao liberar a aula.')
        return
      }

      setCredits(data.credits)
      setDesbloqueadas([...desbloqueadas, aula.id])

      if (win) win.location.href = aula.link_video
      else window.open(aula.link_video, '_blank')
    } catch (e) {
      win?.close()
      setAviso('Erro de conexão ao liberar a aula.')
    } finally {
      setPagandoId(null)
    }
  }

  if (loading) return <div className="flex h-screen items-center justify-center gap-3 bg-bg font-mono text-sm text-muted"><span className="h-2 w-2 animate-blink rounded-full bg-accent" />CARREGANDO_EPISODIOS...</div>

  return (
    <AppShell>
      <PageHeader
        eyebrow="Academia BlackBox"
        title={id.replace('_', ' ')}
        subtitle="Assista aos episódios e desbloqueie novos conteúdos com créditos."
        actions={
          <>
            <Link href="/academia" className="btn btn-ghost hidden sm:inline-flex">
              <ChevronLeft className="h-4 w-4" /> Academia
            </Link>
            <span className="chip">
              <CoinIcon size={16} />
              <span className="font-mono font-bold text-ink whitespace-nowrap">{credits === null ? '—' : credits}</span>
            </span>
            <LogoutButton />
          </>
        }
      />

      <div className="w-full min-w-0">
        {aviso && (
          <div className="mb-4 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            {aviso}
          </div>
        )}
        <p className="mb-4 flex items-center gap-1.5 text-xs text-faint">Cada episódio custa <CoinIcon size={14} /> {CUSTO_AULA} para desbloquear.</p>

        <div className="grid gap-3">
          {aulas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-surface/30 p-12 text-center">
              <Lock className="mx-auto mb-4 h-10 w-10 text-faint" />
              <p className="text-sm text-muted">Nenhum episódio disponível neste módulo.</p>
            </div>
          ) : (
            aulas.map((aula, index) => (
              <div
                key={aula.id}
                className="group flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface/60 p-4 transition-all hover:border-accent/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-raised font-mono text-sm text-muted transition-all group-hover:border-accent/50 group-hover:text-accent">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <h3 className="break-words font-medium text-ink transition-colors group-hover:text-accent">{aula.titulo}</h3>
                    <p className="line-clamp-1 break-words text-xs text-faint">{aula.descricao}</p>
                  </div>
                </div>
                <div className="flex sm:shrink-0 sm:justify-end">
                {desbloqueadas.includes(aula.id) ? (
                  <a
                    href={aula.link_video}
                    target="_blank"
                    className="btn btn-primary shrink-0 border-good/40 bg-good/10 text-xs text-good hover:bg-good/20"
                  >
                    <Play className="h-3 w-3 fill-current" /> Assistir
                  </a>
                ) : (
                  <button
                    onClick={() => desbloquear(aula)}
                    disabled={pagandoId === aula.id}
                    className={`btn shrink-0 text-xs disabled:cursor-wait disabled:opacity-60 ${
                      credits !== null && credits < CUSTO_AULA
                        ? 'border-danger/40 bg-danger/10 text-danger'
                        : 'border-accent/40 bg-accent/15 text-accent hover:bg-accent/25'
                    }`}
                  >
                    {pagandoId === aula.id ? 'Processando...' : <><CoinIcon size={13} /> {CUSTO_AULA} · Desbloquear</>}
                  </button>
                )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  )
}