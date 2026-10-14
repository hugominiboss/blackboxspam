'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { GraduationCap, Home, Gift, User, Wrench, type LucideIcon } from 'lucide-react'
import { LogoLockup } from './reactor'
import LogoutButton from './logout-button'

/**
 * Sidebar de navegação por ícones — clone da `Sidebar.tsx` do QuadCore.
 * Usa next/link + usePathname (em vez de react-router). Item ativo recebe
 * borda/ Glow verde-neon e uma barra lateral indicadora.
 */

interface NavItem {
  to: string
  label: string
  hint: string
  icon: LucideIcon
}

const NAV: NavItem[] = [
  { to: '/', label: 'Vitrine', hint: 'Visão geral', icon: Home },
  { to: '/academia', label: 'Academia', hint: 'Aulas e módulos', icon: GraduationCap },
  { to: '/ferramentas', label: 'Ferramentas', hint: 'Softwares e licenças', icon: Wrench },
  { to: '/ferramentas/gratuitas', label: 'Gratuitas', hint: 'Utilitários rápidos', icon: Gift },
  { to: '/perfil', label: 'Conta', hint: 'Créditos e licenças', icon: User },
]

export function Sidebar({ active = false, onNavigate }: { active?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  const isActive = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to))

  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="px-2 pt-2">
        <LogoLockup active={active} />
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-faint">
          Operações
        </div>
        {NAV.map((item) => {
          const on = isActive(item.to)
          return (
            <Link
              key={item.to}
              href={item.to}
              onClick={onNavigate}
              className={`group relative flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all ${
                on
                  ? 'border-accent/40 bg-accent/10 text-ink shadow-glow'
                  : 'border-transparent text-muted hover:border-line hover:bg-raised/50 hover:text-ink'
              }`}
            >
              <span
                className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent transition-opacity ${
                  on ? 'opacity-100' : 'opacity-0'
                }`}
              />
              <item.icon
                className={`h-4 w-4 shrink-0 ${on ? 'text-accent' : 'text-muted group-hover:text-accent'}`}
              />
              <span className="flex flex-col leading-tight">
                <span className="font-display text-sm font-medium">{item.label}</span>
                <span className="text-[10px] text-faint">{item.hint}</span>
              </span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        <div className="px-1">
          <LogoutButton variant="sidebar" />
        </div>
        <p className="px-3 pt-1 font-mono text-[10px] leading-relaxed text-faint">
          BlackBox Vault · acesso por License Key.
        </p>
      </div>
    </div>
  )
}
