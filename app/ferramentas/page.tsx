'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import Link from 'next/link'
import { Wrench, ChevronLeft, Download, Lock, Zap } from 'lucide-react'

interface Ferramenta {
  id: string; nome: string; descricao: string; custo_creditos: number; link_download: string;
}

export default function FerramentasPage() {
  const [ferramentas, setFerramentas] = useState<Ferramenta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFerramentas() {
      try {
        const { data, error } = await supabase
          .from('ferramentas')
          .select('*')
          .order('nome', { ascending: true })
        if (error) throw error
        setFerramentas(data || [])
      } catch (e) { console.error(e) } finally { setLoading(false) }
    }
    fetchFerramentas()
  }, [])

  if (loading) return <div className="h-screen bg-zinc-950 text-white flex items-center justify-center font-mono">CARREGANDO_FERRAMENTAS...</div>

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm mb-12 group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Voltar para a vitrine
        </Link>

        <header className="mb-12 flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-500">
            <Wrench className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight">Ferramentas</h1>
            <p className="text-zinc-400 text-sm mt-1">Softwares, licenças e utilitários de escala.</p>
          </div>
        </header>

        <div className="grid gap-3">
          {ferramentas.length === 0 ? (
            <div className="bg-zinc-900 p-12 rounded-3xl text-center border border-zinc-800">
              <Lock className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500">Nenhuma ferramenta disponível no momento.</p>
            </div>
          ) : (
            ferramentas.map((ferramenta) => (
              <div
                key={ferramenta.id}
                className="group bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between hover:bg-zinc-800/50 hover:border-zinc-700 transition-all"
              >
                <div className="flex items-center gap-5">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:bg-purple-500 group-hover:text-white transition-all">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium group-hover:text-purple-400 transition-colors">{ferramenta.nome}</h3>
                    <p className="text-zinc-500 text-xs line-clamp-1">{ferramenta.descricao}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs font-mono text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full">
                    <Zap className="w-3 h-3" /> {ferramenta.custo_creditos} CR
                  </span>
                  <a
                    href={ferramenta.link_download}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-zinc-800 text-white text-xs px-4 py-2 rounded-full hover:bg-purple-600 transition-all"
                  >
                    <Download className="w-3 h-3" /> Baixar
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}