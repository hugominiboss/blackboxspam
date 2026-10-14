'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { Reactor } from '@/app/components/reactor'

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
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-x-clip px-4 py-6">
      <div className="panel w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Reactor size={44} active />
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
              Acessar <span className="text-ink">BlackBox</span> <span className="text-accent">Vault</span>
            </h1>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
              autenticação por license key
            </p>
          </div>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label htmlFor="licenseKey" className="label">
              License Key
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
              <input
                type="text"
                id="licenseKey"
                className="input pl-9"
                placeholder="••••-••••-••••"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 font-mono text-xs text-danger">
              <span className="mt-0.5 shrink-0">!</span>
              <span className="break-all">{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            <ShieldCheck className="h-4 w-4" />
            {loading ? 'Verificando...' : 'Acessar'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Não possui uma Key? {' '}
          <Link href="https://t.me/seulinktelegram" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            Solicite acesso via Telegram
          </Link>
        </p>
      </div>
    </div>
  );
}