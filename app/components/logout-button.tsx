'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

type Props = {
  variant?: 'header' | 'outline' | 'danger'
  label?: string
}

/**
 * Botão Sair reutilizável: limpa os cookies httpOnly de licença
 * via API e redireciona para /login.
 */
export default function LogoutButton({ variant = 'header', label = 'Sair' }: Props) {
  const router = useRouter()
  const [leaving, setLeaving] = useState(false)

  const styles =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50'
      : variant === 'outline'
        ? 'inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 rounded-lg px-3 py-2 transition-colors disabled:opacity-50'
        : 'inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-3 py-2 rounded-lg transition-colors disabled:opacity-50'

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
