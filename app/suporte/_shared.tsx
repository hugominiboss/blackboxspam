'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LifeBuoy, Plus, ArrowRight, Clock } from 'lucide-react'
import { AppShell } from '@/app/components/app-shell'
import { PageHeader, StatusPill, Panel, EmptyState, ErrorBanner } from '@/app/components/qc-ui'
import { SUPPORT_CATEGORIES, SUPPORT_STATUS, type SupportCategory } from '@/app/lib/support'

export type Ticket = {
  id: string
  category: SupportCategory
  priority: string
  status: keyof typeof SUPPORT_STATUS
  subject: string
  sla_due_at: string | null
  rating: number | null
  created_at: string
  updated_at: string
}

export const STATUS_TONE: Record<string, 'accent' | 'warn' | 'danger' | 'good' | 'muted'> = {
  aberto: 'warn',
  'aguardando-suporte': 'danger',
  'aguardando-cliente': 'accent',
  resolvido: 'good',
  fechado: 'muted',
}

export const PRIORITY_TONE: Record<string, 'accent' | 'warn' | 'danger' | 'good' | 'muted'> = {
  baixa: 'muted',
  normal: 'accent',
  alta: 'warn',
  urgente: 'danger',
}

export function slaLabel(due: string | null): string {
  if (!due) return '—'
  const ms = new Date(due).getTime() - Date.now()
  if (ms <= 0) return 'SLA estourado'
  const h = Math.floor(ms / 3600000)
  if (h < 1) return 'menos de 1h'
  if (h < 24) return `${h}h restantes`
  return `${Math.floor(h / 24)}d restantes`
}
