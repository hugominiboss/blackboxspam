import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/app/lib/license-guard';

/**
 * API de Unlocks — persistência servidor dos desbloqueios (Onda 2).
 *
 * Substitui o controle via localStorage. A autenticação é pela License Key
 * do cookie httpOnly `license_key`. A escrita usa service_role (ignora RLS);
 * a leitura respeita a policy pública para keys válidas.
 */

const VALID_TYPES = ['aula', 'ferramenta'] as const;

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

/**
 * POST /api/unlocks
 * Registra um desbloqueio. Espera { content_id, content_type }.
 *
 * ⚠️ Ordem do fluxo no cliente: chamar POST /api/credits (débito) PRIMEIRO e,
 * somente em caso de sucesso, chamar este endpoint. Idempotente: registrar o
 * mesmo conteúdo novamente não gera duplicata (UNIQUE license_key+content_id).
 */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const licenseKey = cookieStore.get('license_key')?.value;

  if (!licenseKey) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // corpo vazio -> validação abaixo rejeita
  }
  const content_id = String(body?.content_id ?? '').trim();
  const content_type = String(body?.content_type ?? '').trim();

  if (!content_id) {
    return NextResponse.json({ message: 'content_id é obrigatório.' }, { status: 400 });
  }
  if (!VALID_TYPES.includes(content_type as (typeof VALID_TYPES)[number])) {
    return NextResponse.json({ message: 'content_type inválido. Use: aula ou ferramenta.' }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Valida que a License Key existe e está ativa antes de registrar.
  const { data: lic, error: licErr } = await supabaseAdmin
    .from('licenses')
    .select('status')
    .eq('key', licenseKey)
    .single();

  if (licErr || !lic || !lic.status) {
    return NextResponse.json({ message: 'License Key inválida ou inativa.' }, { status: 404 });
  }

  // Idempotente: se já existe o par (license_key, content_id), ignora.
  const { error: insErr } = await supabaseAdmin
    .from('unlocks')
    .upsert(
      { license_key: licenseKey, content_id, content_type },
      { onConflict: 'license_key,content_id', ignoreDuplicates: true }
    );

  if (insErr) {
    return NextResponse.json({ message: 'Falha ao registrar desbloqueio.', error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, content_id, content_type }, { status: 201 });
}
