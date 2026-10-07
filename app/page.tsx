'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { GraduationCap, Wrench, User, ArrowRight, LogIn, Gift } from 'lucide-react'
import LogoutButton from '@/app/components/logout-button'
import CoinIcon from '@/app/components/coin-icon'

export default function Home() {
  const [userCredits, setUserCredits] = useState(0);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    // Créditos vêm da License Key logada (cookie httpOnly) via API,
    // já que o app autentica por License Key e não por Supabase Auth.
    const fetchUserCredits = async () => {
      try {
        const res = await fetch('/api/credits');
        if (!res.ok) {
          setLoggedIn(false);
          return; // Sem license válida -> mantém 0
        }
        const json = await res.json();
        setUserCredits(json.credits ?? 0);
        setLoggedIn(true);
      } catch {
        setLoggedIn(false);
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
    { 
      id: 'recursos-gratuitos', 
      nome: "Recursos Gratuitos", 
      desc: "Ferramentas úteis e gratuitas para escala.", 
      cor: "from-yellow-600 to-orange-500", 
      icon: 'Gift',
      path: '/ferramentas/gratuitas'
    },
  ]

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-black text-zinc-100 px-4 py-6 sm:p-6 md:p-12">
      <header className="max-w-5xl mx-auto mb-10 md:mb-16 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left min-w-0 w-full md:w-auto">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter text-white mb-2 break-words">
            <span className="text-white">BlackBox</span>{' '}
            <span className="text-[#FF6A00]">Vault</span>
          </h1>
           <p className="text-zinc-400">Bem-vindo ao ecossistema de escala.</p>
         </div>
        {/* Widget de Créditos / Sessão */}
        <div className="w-full sm:w-auto max-w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex flex-wrap items-center gap-x-4 gap-y-3 shadow-xl">
          <div className="p-2 bg-zinc-800/60 rounded-lg text-zinc-300">
            <CoinIcon size={22} />
          </div>
          <div>
            <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Seu Saldo</p>
            <p className="text-xl font-mono font-bold text-white flex items-center gap-1.5"><CoinIcon size={22} />{userCredits}</p>
          </div>
          <Link href="/perfil/pagamentos" className="ml-2 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1 rounded-md transition-all">
            + Adicionar
          </Link>
          {loggedIn === false ? (
            <Link href="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg transition-colors">
              <LogIn className="w-4 h-4" /> Entrar
            </Link>
          ) : loggedIn === true ? (
            <LogoutButton />
          ) : null}
        </div>
      </header>

      <main className="max-w-5xl mx-auto grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {hubs.map((hub) => (
          <Link 
            href={hub.path} 
            key={hub.id}
            className="group relative bg-zinc-900 border border-zinc-800 p-6 sm:p-8 rounded-3xl hover:border-zinc-700 transition-all duration-500 hover:-translate-y-2 overflow-hidden"
          >
            <div className={`absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br ${hub.cor} opacity-10 blur-3xl group-hover:opacity-20 transition-opacity`} />
            
            <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${hub.cor} text-white mb-6 shadow-lg`}>
              {hub.icon === 'GraduationCap' && <GraduationCap className="w-8 h-8" />}
              {hub.icon === 'Wrench' && <Wrench className="w-8 h-8" />}
              {hub.icon === 'User' && <User className="w-8 h-8" />}
              {hub.icon === 'Gift' && <Gift className="w-8 h-8" />}
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




















































