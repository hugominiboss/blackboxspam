'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CreditCard, KeyRound, Shield, ChevronLeft } from 'lucide-react'

export default function ProfilePage() {
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [licenseRole, setLicenseRole] = useState<string | null>(null);
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <p>Carregando perfil...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-12 flex flex-col items-center">
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-12 flex flex-col items-center">
      <div className="max-w-md w-full">
        <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm mb-12 group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Voltar para a vitrine
        </Link>

        <h1 className="text-4xl font-extrabold tracking-tighter text-white mb-8">Meu Perfil</h1>

        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-xl w-full">
          {/* License Info Card */}
          <div className="mb-6 pb-6 border-b border-zinc-800 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase font-bold tracking-widest">License Key</p>
              <p className="text-lg font-bold text-white">{licenseKey || 'N/A'}</p>
              {licenseRole && (
                <p className="text-zinc-500 text-xs uppercase tracking-widest mt-1 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> {licenseRole}
                </p>
              )}
            </div>
          </div>

          {/* Credits Card */}
          <div className="flex items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <p className="text-zinc-500 text-xs uppercase font-bold tracking-widest">Seu Saldo</p>
                <p className="text-3xl font-mono font-bold text-white">{userCredits} <span className="text-emerald-500 text-sm">CR</span></p>
              </div>
            </div>
            <Link href="/perfil/pagamentos" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-all text-sm font-semibold inline-block">
              + Adicionar Créditos
            </Link>
          </div>

          {/* Placeholder for other profile details */}
          <p className="text-zinc-500 text-sm italic">Mais detalhes do perfil virão aqui...</p>
        </div>
      </div>
    </div>
  );
}