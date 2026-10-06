'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import Link from 'next/link'

export default function LoginPage() {
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Validar a License Key no Supabase
    const { data: licenseData, error: dbError } = await supabase
      .from('licenses')
      .select('key, status, role, expires_at')
      .eq('key', licenseKey)
      .single();

    if (dbError || !licenseData) {
      setError('License Key inválida ou não encontrada.');
      setLoading(false);
      return;
    }

    if (!licenseData.status) {
      setError('Sua License Key está inativa.');
      setLoading(false);
      return;
    }

    if (licenseData.expires_at && new Date(licenseData.expires_at) < new Date()) {
      setError('Sua License Key expirou.');
      setLoading(false);
      return;
    }

    // 2. Se a chave for válida, definir o cookie seguro via API Route
    const response = await fetch('/api/auth/set-license-cookie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: licenseData.key, role: licenseData.role }),
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.message || 'Erro ao processar a License Key.');
      setLoading(false);
      return;
    }

    // 3. Redirecionar com base na role
    if (licenseData.role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/'); // Ou '/dashboard', '/perfil' conforme a lógica
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-extrabold tracking-tighter text-white mb-6 text-center">
          Acessar Blackbox<span className="text-blue-500">Spam</span>
        </h1>
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label htmlFor="licenseKey" className="block text-sm font-medium text-zinc-400 mb-2">
              License Key
            </label>
            <input
              type="text"
              id="licenseKey"
              className="w-full p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Insira sua License Key"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Verificando...' : 'Acessar'}
          </button>
        </form>
        <p className="text-zinc-500 text-sm text-center mt-6">
          Não possui uma Key? {' '}
          <Link href="https://t.me/seulinktelegram" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
            Solicite acesso via Telegram
          </Link>
        </p>
      </div>
    </div>
  );
}