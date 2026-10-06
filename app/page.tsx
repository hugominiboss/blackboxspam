'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { GraduationCap, Wrench, User, CreditCard, ArrowRight } from 'lucide-react'

export default function Home() {
  const [userCredits, setUserCredits] = useState(0);

  useEffect(() => {
    // Créditos vêm da License Key logada (cookie httpOnly) via API,
    // já que o app autentica por License Key e não por Supabase Auth.
    const fetchUserCredits = async () => {
      try {
        const res = await fetch('/api/credits');
        if (!res.ok) return; // Sem license válida -> mantém 0
        const json = await res.json();
        setUserCredits(json.credits ?? 0);
      } catch {
        // Falha de rede -> mantém 0 sem poluir o console
      }
    };
    fetchUserCredits();
  }, []);

  const hubs = [
    { 
      id: 'academia', 
      nome: "Academia", 
      desc: "Aulas, módulos e treinamentos de elite.", 
      cor: "from-blue-600 to-cyan-500", 
      icon: 'GraduationCap',
      path: '/academia'
    },
    { 
      id: 'ferramentas', 
      nome: "Ferramentas", 
      desc: "Softwares, licenças e utilitários de escala.", 
      cor: "from-purple-600 to-pink-500", 
      icon: 'Wrench',
      path: '/ferramentas'
    },
    { 
      id: 'perfil', 
      nome: "Minha Conta", 
      desc: "Gestão de créditos, licenças e perfil.", 
      cor: "from-emerald-600 to-teal-500", 
      icon: 'User',
      path: '/perfil'
    },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-12">
      <header className="max-w-5xl mx-auto mb-16 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left">
          <h1 className="text-5xl font-extrabold tracking-tighter text-white mb-2">
            Blackbox<span className="text-blue-500">Spam</span>
          </h1>
           <p className="text-zinc-400">Bem-vindo ao ecossistema de escala.</p>
         </div>
        {/* Widget de Créditos */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4 shadow-xl">
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Seu Saldo</p>
            <p className="text-xl font-mono font-bold text-white">{userCredits} <span className="text-blue-500 text-sm">CR</span></p>
          </div>
          <Link href="/perfil" className="ml-2 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1 rounded-md transition-all">
            + Adicionar
          </Link>
         </div>
      </header>

      <main className="max-w-5xl mx-auto grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {hubs.map((hub) => (
          <Link 
            href={hub.path} 
            key={hub.id}
            className="group relative bg-zinc-900 border border-zinc-800 p-8 rounded-3xl hover:border-zinc-700 transition-all duration-500 hover:-translate-y-2 overflow-hidden"
          >
            <div className={`absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br ${hub.cor} opacity-10 blur-3xl group-hover:opacity-20 transition-opacity`} />
            
            <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${hub.cor} text-white mb-6 shadow-lg`}>
              {hub.icon === 'GraduationCap' && <GraduationCap className="w-8 h-8" />}
              {hub.icon === 'Wrench' && <Wrench className="w-8 h-8" />}
              {hub.icon === 'User' && <User className="w-8 h-8" />}
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
              {hub.nome}
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed mb-8">
              {hub.desc}
            </p>
            
            <div className="flex items-center gap-2 text-white font-semibold text-sm group-hover:gap-4 transition-all">
              ACESSAR <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        ))}
      </main>
    </div>
  )
}