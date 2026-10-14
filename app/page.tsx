'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { GraduationCap, Wrench, User, ArrowRight, LogIn, Gift } from 'lucide-react'
import LogoutButton from '@/app/components/logout-button'
import CoinIcon from '@/app/components/coin-icon'
import { AppShell } from '@/app/components/app-shell'
import { PageHeader, StatusPill } from '@/app/components/qc-ui'

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
      icon: GraduationCap,
      path: '/academia'
    },
    { 
      id: 'ferramentas', 
      nome: "Ferramentas", 
      desc: "Softwares, licenças e utilitários de escala.", 
      icon: Wrench,
      path: '/ferramentas'
    },
    { 
      id: 'perfil', 
      nome: "Minha Conta", 
      desc: "Gestão de créditos, licenças e perfil.", 
      icon: User,
      path: '/perfil'
    },
    { 
      id: 'recursos-gratuitos', 
      nome: "Recursos Gratuitos", 
      desc: "Ferramentas úteis e gratuitas para escala.", 
      icon: Gift,
      path: '/ferramentas/gratuitas'
    },
  ]

  return (
    <AppShell active={loggedIn === true}>
      <PageHeader
        eyebrow="Ecossistema de escala"
        title="Vitrine"
        subtitle="Academia, Ferramentas e gestão de créditos via License Key."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="chip">
              <CoinIcon size={14} />
              <span className="tabular-nums text-ink">{userCredits}</span>
              <span className="text-faint">CR</span>
            </div>
            {loggedIn === false ? (
              <Link href="/login" className="btn btn-primary">
                <LogIn className="h-4 w-4" /> Entrar
              </Link>
            ) : loggedIn === true ? (
              <>
                <StatusPill label="conectado" tone="good" />
                <Link href="/perfil/pagamentos" className="btn btn-primary">
                  + Adicionar CR
                </Link>
                <LogoutButton />
              </>
            ) : null}
          </div>
        }
      />

      <main className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {hubs.map((hub) => (
          <Link
            href={hub.path}
            key={hub.id}
            className="panel group relative flex flex-col gap-4 p-5 transition-all hover:border-accent/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-accent/30 bg-accent/10 text-accent">
                <hub.icon className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-faint transition-all group-hover:translate-x-1 group-hover:text-accent" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold text-ink transition-colors group-hover:text-accent">
                {hub.nome}
              </h2>
              <p className="mt-1 text-sm text-muted">{hub.desc}</p>
            </div>
            <div className="mt-auto flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-faint group-hover:text-accent">
              Acessar <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        ))}
      </main>
    </AppShell>
  )
}




















































