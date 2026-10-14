'use client'
import { useState, type ReactNode } from 'react'
import { Menu, ShieldCheck, X } from 'lucide-react'
import { Reactor } from './reactor'
import { Sidebar } from './sidebar'

/**
 * AppShell — clone da `Layout.tsx` do QuadCore.
 * Rail lateral (w-64) fixo no desktop, drawer no mobile, header sticky com o
 * Reactor + chip "authorized" e main com largura máxima max-w-6xl.
 * Envolve as páginas autenticadas sem tocar na lógica de negócio delas.
 */
export function AppShell({ children, active = false }: { children: ReactNode; active?: boolean }) {
  const [mobileNav, setMobileNav] = useState(false)

  return (
    <div className="flex min-h-screen bg-bg text-ink">
      {/* Rail — desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-line bg-surface/60 backdrop-blur lg:block">
        <Sidebar active={active} />
      </aside>

      {/* Drawer — mobile */}
      {mobileNav && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileNav(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 border-r border-line bg-surface">
            <button
              type="button"
              className="btn btn-ghost absolute right-3 top-3 !p-2"
              onClick={() => setMobileNav(false)}
              aria-label="Fechar navegação"
            >
              <X className="h-4 w-4" />
            </button>
            <Sidebar active={active} onNavigate={() => setMobileNav(false)} />
          </aside>
        </div>
      )}

      {/* Coluna principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-bg/80 px-4 py-3 backdrop-blur-md sm:px-6">
          <button
            type="button"
            className="btn btn-ghost !p-2 lg:hidden"
            onClick={() => setMobileNav(true)}
            aria-label="Abrir navegação"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            <Reactor size={28} active={active} />
            <div className="hidden flex-col leading-none sm:flex">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Reactor</span>
              <span className={`font-mono text-xs ${active ? 'text-warn' : 'text-accent'}`}>
                {active ? 'active' : 'idle'}
              </span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="chip text-accent" title="Acesso autorizado">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">authorized</span>
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
