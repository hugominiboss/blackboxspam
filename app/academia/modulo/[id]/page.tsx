'use client'
import { useEffect, useState, use } from 'react'
import { supabase } from '@/app/lib/supabase'
import Link from 'next/link'
import { Play, ChevronLeft, Lock, Coins } from 'lucide-react'

interface Aula {
  id: string; titulo: string; descricao: string; link_video: string; ordem: number;
}

// Valor experimental: cada episódio custa 10 créditos para desbloquear
const CUSTO_AULA = 10
const STORAGE_KEY = 'bbx_aulas_desbloqueadas'

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

    // Aulas já desbloqueadas neste navegador (não pagam de novo)
    try {
      const salvas = localStorage.getItem(STORAGE_KEY)
      if (salvas) setDesbloqueadas(JSON.parse(salvas))
    } catch {}

    fetchAulas()
    fetchCredits()
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
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: CUSTO_AULA }),
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
      const nova = [...desbloqueadas, aula.id]
      setDesbloqueadas(nova)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(nova)) } catch {}

      if (win) win.location.href = aula.link_video
      else window.open(aula.link_video, '_blank')
    } catch (e) {
      win?.close()
      setAviso('Erro de conexão ao liberar a aula.')
    } finally {
      setPagandoId(null)
    }
  }

  if (loading) return <div className="h-screen bg-zinc-950 text-white flex items-center justify-center font-mono">CARREGANDO_EPISODIOS...</div>

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Link href="/academia" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm mb-12 group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Voltar para a Academia
        </Link>

        <header className="mb-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h1 className="text-4xl font-extrabold text-white capitalize tracking-tight">
              {id.replace('_', ' ')}
            </h1>
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full">
              <Coins className="w-4 h-4 text-yellow-500" />
              <span className="text-white font-mono font-bold text-sm">{credits === null ? '—' : credits} CR</span>
            </div>
          </div>
          <div className="h-1 w-20 bg-blue-500 rounded-full mt-4" />
          <p className="text-zinc-500 text-xs mt-3">Cada episódio custa {CUSTO_AULA} CR para desbloquear.</p>
        </header>

        {aviso && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
            {aviso}
          </div>
        )}

        <div className="grid gap-3">
          {aulas.length === 0 ? (
            <div className="bg-zinc-900 p-12 rounded-3xl text-center border border-zinc-800">
              <Lock className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500">Nenhum episódio disponível neste módulo.</p>
            </div>
          ) : (
            aulas.map((aula, index) => (
              <div 
                key={aula.id} 
                className="group bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between hover:bg-zinc-800/50 hover:border-zinc-700 transition-all"
              >
                <div className="flex items-center gap-5">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 font-mono text-sm group-hover:bg-blue-500 group-hover:text-white transition-all">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-white font-medium group-hover:text-blue-400 transition-colors">{aula.titulo}</h3>
                    <p className="text-zinc-500 text-xs line-clamp-1">{aula.descricao}</p>
                  </div>
                </div>
                {desbloqueadas.includes(aula.id) ? (
                  <a
                    href={aula.link_video}
                    target="_blank"
                    className="flex items-center gap-2 bg-emerald-600 text-white text-xs px-4 py-2 rounded-full hover:bg-emerald-500 transition-all shrink-0"
                  >
                    <Play className="w-3 h-3 fill-current" /> Assistir
                  </a>
                ) : (
                  <button
                    onClick={() => desbloquear(aula)}
                    disabled={pagandoId === aula.id}
                    className={`flex items-center gap-2 text-xs px-4 py-2 rounded-full transition-all shrink-0 disabled:opacity-60 disabled:cursor-wait ${
                      credits !== null && credits < CUSTO_AULA
                        ? 'bg-zinc-800 text-red-400 border border-red-500/40'
                        : 'bg-zinc-800 text-white hover:bg-blue-600'
                    }`}
                  >
                    <Coins className="w-3 h-3 text-yellow-400" />
                    {pagandoId === aula.id ? 'Processando...' : `${CUSTO_AULA} CR · Desbloquear`}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}