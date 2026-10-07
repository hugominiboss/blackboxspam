'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

    // A validação (key, status, expiração e role) acontece no servidor,
    // que grava os cookies httpOnly de sessão. O cliente só envia a key.
    const response = await fetch('/api/auth/set-license-cookie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: licenseKey.trim() }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.message || 'License Key inválida ou não encontrada.');
      setLoading(false);
      return;
    }

    // Redireciona com base na role derivada no servidor.
    const { role } = await response.json().catch(() => ({ role: 'user' }));
    if (role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/'); // Ou '/dashboard', '/perfil' conforme a lógica
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-black text-zinc-100 flex items-center justify-center px-4 py-6 sm:p-6">
      <div className="bg-zinc-900 border border-zinc-800 p-6 sm:p-8 rounded-3xl shadow-xl max-w-md w-full min-w-0">
        <h1 className="text-3xl font-bold tracking-tighter text-white mb-6 text-center">
          Acessar <span className="text-white">BlackBox</span> <span className="text-[#FF6A00]">Vault</span>
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