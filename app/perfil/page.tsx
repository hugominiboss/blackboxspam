'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CreditCard, KeyRound, Shield, ChevronLeft, Copy, Check, Wrench } from 'lucide-react'
import LogoutButton from '@/app/components/logout-button'
import CoinIcon from '@/app/components/coin-icon'

function maskKey(key: string): string {
  if (key.length <= 8) return '••••••••'
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`
}

export default function ProfilePage() {
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [licenseRole, setLicenseRole] = useState<string | null>(null);
  const [userCredits, setUserCredits] = useState<number | null>(null);
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
      <div className="min-h-screen bg-black text-zinc-100 flex items-center justify-center">
        <p>Carregando perfil...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 p-6 md:p-12 flex flex-col items-center">
        <div className="max-w-md w-full">
          <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm mb-12 group">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Voltar para a vitrine
          </Link>
          <p className="text-red-500">Erro: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-black text-zinc-100 px-4 py-6 sm:p-6 md:p-12 flex flex-col items-center">
      <div className="w-full max-w-md min-w-0">
        <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm mb-12 group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Voltar para a vitrine
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tighter text-white break-words">Meu Perfil</h1>
          <LogoutButton variant="outline" />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-5 sm:p-8 rounded-3xl shadow-xl w-full min-w-0">
          {/* License Info Card */}
          <div className="mb-6 pb-6 border-b border-zinc-800 flex flex-wrap items-center gap-4">
            <div className="p-3 bg-zinc-800/60 rounded-lg text-zinc-300">
              <KeyRound className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-zinc-500 text-xs uppercase font-bold tracking-widest">License Key</p>
              <p className="text-lg font-mono font-bold text-white truncate">{licenseKey ? (revealed ? licenseKey : maskKey(licenseKey)) : 'N/A'}</p>
              {licenseRole && (
                <p className="text-zinc-500 text-xs uppercase tracking-widest mt-1 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> {licenseRole}
                </p>
              )}
            </div>
            {licenseKey && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setRevealed((v) => !v)}
                  className="text-xs text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 rounded-lg px-3 py-1.5 transition-colors"
                >
                  {revealed ? 'Ocultar' : 'Revelar'}
                </button>
                <button
                  onClick={copyKey}
                  title="Copiar License Key"
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>

          {/* Credits Card */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4 min-w-0">
              <div className="p-3 bg-zinc-800/60 rounded-lg text-zinc-300">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <p className="text-zinc-500 text-xs uppercase font-bold tracking-widest">Seu Saldo</p>
                <p className="text-3xl font-mono font-bold text-white flex items-center gap-2"><CoinIcon size={30} />{userCredits}</p>
              </div>
            </div>
            <Link href="/perfil/pagamentos" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-all text-sm font-semibold inline-block">
              + Adicionar Créditos
            </Link>
          </div>

          {/* Atalhos */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/ferramentas" className="inline-flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
              <Wrench className="w-4 h-4" /> Ferramentas
            </Link>
            <LogoutButton variant="outline" label="Encerrar sessão" />
          </div>
        </div>
      </div>
    </div>
  );
}