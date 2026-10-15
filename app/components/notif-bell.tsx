'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'

/** Sino de notificações — polling 30s, badge com não-lidas. */
export function NotifBell() {
  const [unread, setUnread] = useState(0)

  const fetchCount = async () => {
    try {
      const res = await fetch('/api/notifications?unread=1')
      if (!res.ok) return
      const data = await res.json()
      setUnread(data.unread_count ?? (data.notifications ?? []).length)
    } catch { /* silencioso */ }
  }

  useEffect(() => {
    fetchCount()
    const t = setInterval(fetchCount, 30_000)
    // Atualiza ao voltar o foco na aba.
    const onFocus = () => fetchCount()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus) }
  }, [])

  return (
    <Link href="/notificacoes" className="chip relative !px-2.5" title="Notificações" aria-label={`Notificações${unread > 0 ? ` (${unread} não lidas)` : ''}`}>
      <Bell className="h-3.5 w-3.5" />
      {unread > 0 && (
        <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full border border-danger/50 bg-danger px-1 font-mono text-[10px] font-bold text-white">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  )
}
