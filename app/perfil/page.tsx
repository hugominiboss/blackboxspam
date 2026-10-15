'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CreditCard, KeyRound, Shield, Copy, Check, Wrench, Bell } from 'lucide-react'
import LogoutButton from '@/app/components/logout-button'
import CoinIcon from '@/app/components/coin-icon'
import LevelCard from './_components/level-card'
import { AppShell } from '@/app/components/app-shell'
import { PageHeader, StatusPill, Panel } from '@/app/components/qc-ui'
import type { ProgressoNivel } from '@/app/lib/levels'

function maskKey(key: string): string {
  if (key.length <= 8) return '••••••••'
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`
}

export default function ProfilePage() {
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [licenseRole, setLicenseRole] = useState<string | null>(null);
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [levelProgress, setLevelProgress] = useState<ProgressoNivel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        // A autenticação é por License Key (cookie httpOnly), via API
        const res = await fetch('/api/credits');
        if (res.status === 401) {
          setError('Usuário não autenticado.');
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Erro ao buscar dados da License Key.');
        }
        const data = await res.json();
        setLicenseKey(data.key);
        setLicenseRole(data.role);
        setUserCredits(data.credits ?? 0);
        setLevelProgress(data.levelProgress ?? null);
      } catch (err: any) {
        console.error('Error fetching profile data:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  const copyKey = async () => {
    if (!licenseKey) return
    try {
      await navigator.clipboard.writeText(licenseKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard indisponível (http) — mantém a key visível
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center gap-3 py-24 font-mono text-sm text-muted">
          <KeyRound className="h-4 w-4 animate-pulse text-accent" />
          carregando_perfil<span className="animate-blink">_</span>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <PageHeader eyebrow="Conta" title="Meu Perfil" />
        <div className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 font-mono text-xs text-danger">
          <span className="mt-0.5 shrink-0">!</span>
          <span className="break-all">Erro: {error}</span>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Conta"
        title="Meu Perfil"
        subtitle="Gestão de créditos, licenças e sessão da sua License Key."
        icon={<Shield className="h-5 w-5" />}
        actions={<StatusPill label={licenseRole ?? 'user'} tone="accent" />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-5">
          {/* Card de Status (nível por créditos gastos) */}
          <LevelCard progresso={levelProgress} />

          {/* License Info */}
          <div className="mb-6 flex flex-wrap items-center gap-4 border-b border-line pb-6">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-accent/30 bg-accent/10 text-accent">
              <KeyRound className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="label mb-0">License Key</p>
              <p className="truncate font-mono text-lg font-bold text-ink">
                {licenseKey ? (revealed ? licenseKey : maskKey(licenseKey)) : 'N/A'}
              </p>
              {licenseRole && (
                <p className="mt-1 flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-muted">
                  <Shield className="h-3 w-3" /> {licenseRole}
                </p>
              )}
            </div>
            {licenseKey && (
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => setRevealed((v) => !v)}
                  className="btn btn-ghost"
                >
                  {revealed ? 'Ocultar' : 'Revelar'}
                </button>
                <button
                  onClick={copyKey}
                  title="Copiar License Key"
                  className="btn btn-ghost !px-2.5"
                >
                  {copied ? <Check className="h-4 w-4 text-good" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            )}
          </div>

          {/* Créditos */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-accent/30 bg-accent/10 text-accent">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="label mb-0">Seu Saldo</p>
                <p className="flex items-center gap-2 font-mono text-3xl font-bold text-ink">
                  <CoinIcon size={26} />
                  {userCredits}
                </p>
              </div>
            </div>
            <Link href="/perfil/pagamentos" className="btn btn-primary">
              + Adicionar Créditos
            </Link>
          </div>

          {/* Atalhos */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link href="/ferramentas" className="btn btn-ghost">
              <Wrench className="h-4 w-4" /> Ferramentas
            </Link>
            <Link href="/perfil/notificacoes" className="btn btn-ghost">
              <Bell className="h-4 w-4" /> Notificações
            </Link>
            <LogoutButton variant="outline" label="Encerrar sessão" />
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}