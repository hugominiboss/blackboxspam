import { cookies } from 'next/headers';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Cria um cliente Supabase com a Service Role (ignora RLS).
 * Usado apenas nas rotas de API do painel admin.
 */
export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente no .env.local');
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

/**
 * Verifica se a request vem de uma License Key válida com role 'admin'
 * (lê o cookie httpOnly license_key e revalida no banco).
 */
export async function requireAdmin(): Promise<{ ok: boolean; message: string }> {
  const cookieStore = await cookies();
  const licenseKey = cookieStore.get('license_key')?.value;

  if (!licenseKey) {
    return { ok: false, message: 'Não autenticado.' };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { ok: false, message: 'Configuração do Supabase ausente.' };
  }

  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from('licenses')
    .select('role, status, expires_at')
    .eq('key', licenseKey)
    .single();

  if (
    error ||
    !data ||
    !data.status ||
    data.role !== 'admin' ||
    (data.expires_at && new Date(data.expires_at) < new Date())
  ) {
    return { ok: false, message: 'Acesso restrito à Key Mestra (admin).' };
  }

  return { ok: true, message: '' };
}
