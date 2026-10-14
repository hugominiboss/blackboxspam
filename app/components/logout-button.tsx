'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

type Props = {
  variant?: 'header' | 'outline' | 'danger' | 'sidebar'
  label?: string
}

/**
 * Botão Sair reutilizável: limpa os cookies httpOnly de licença
 * via API e redireciona para /login. Estilo "Dark Terminal".
 */
export default function LogoutButton({ variant = 'header', label = 'Sair' }: Props) {
  const router = useRouter()
  const [leaving, setLeaving] = useState(false)

  const styles =
    variant === 'danger'
      ? 'inline-flex items-center gap-2 btn btn-danger font-bold'
      : variant === 'sidebar'
        ? 'inline-flex w-full items-center gap-2 rounded-lg border border-line bg-transparent px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-50'
        : variant === 'outline'
          ? 'inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-muted transition-colors hover:border-accent/40 hover:text-ink disabled:opacity-50'
          : 'inline-flex items-center gap-2 rounded-lg border border-line bg-raised/70 px-3 py-2 text-xs font-semibold text-muted transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-50'

  const handleLogout = async () => {
    if (leaving) return
    setLeaving(true)
    try {
      await fetch('/api/auth/clear-license-cookie', { method: 'POST' })
    } catch {
      // Mesmo com falha de rede, força a saída no cliente.
    } finally {
      router.push('/login')
      router.refresh()
    }
  }

  return (
    <button onClick={handleLogout} disabled={leaving} className={styles} title="Encerrar sessão da License Key">
      <LogOut className="w-4 h-4" />
      {leaving ? 'Saindo...' : label}
    </button>
  )
}
