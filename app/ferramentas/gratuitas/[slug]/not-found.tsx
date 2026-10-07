'use client'
import Link from 'next/link'
import { ChevronLeft, Wrench } from 'lucide-react'

export default function FerramentaNaoEncontrada() {
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-black text-zinc-100 px-4 py-6 sm:p-6 md:p-12">
      <div className="w-full max-w-xl mx-auto min-w-0 text-center py-16">
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl inline-flex mb-6">
          <Wrench className="w-10 h-10 text-zinc-500" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
          Ferramenta não encontrada
        </h1>
        <p className="text-zinc-400 text-sm mb-8">
          O endereço acessado não corresponde a nenhuma ferramenta gratuita.
        </p>
        <Link
          href="/ferramentas/gratuitas"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-3 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Ver todas as ferramentas gratuitas
        </Link>
      </div>
    </div>
  )
}
