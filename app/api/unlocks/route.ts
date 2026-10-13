import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/app/lib/license-guard';

/**
 * API de Unlocks — persistência servidor dos desbloqueios (Onda 2).
 *
 * Somente LEITURA (GET). A ESCRITA de desbloqueios acontece de forma atômica
 * dentro de `POST /api/credits/purchase` (débito + unlock numa única operação
 * servidor), para impedir que o cliente dispare um desbloqueio sem pagar.
 *
 * A autenticação é pela License Key do cookie httpOnly `license_key`.
 */

/**
 * GET /api/unlocks
 * Retorna a lista de content_id já desbloqueados pela License Key da sessão.
 */
export async function GET() {
  const cookieStore = await cookies();
  const licenseKey = cookieStore.get('license_key')?.value;

  if (!licenseKey) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('unlocks')
    .select('content_id, content_type, unlocked_at')
    .eq('license_key', licenseKey)
    .order('unlocked_at', { ascending: false });

  if (error) {
    return NextResponse.json({ message: 'Erro ao buscar desbloqueios.', error: error.message }, { status: 500 });
  }

  const content_ids = (data || []).map((u: any) => u.content_id);
  return NextResponse.json({ content_ids, unlocks: data || [] });
}
