import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/app/lib/license-guard';
import { PROXY_SCRAPER_SLUG } from '@/app/lib/product-licenses';

/**
 * Libera o HWID de uma licença do Proxy Scraper para reativar em outro dispositivo.
 * Protegido pelo cookie de sessão. Só o DONO (owner_key) pode resetar.
 *
 * Reset NÃO renova a validade — apenas desvincula o dispositivo atual.
 * Limite simples de resets para evitar abuso (ex.: 5).
 */
const MAX_RESETS = 5;

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const licenseKey = cookieStore.get('license_key')?.value;
  if (!licenseKey) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  let productKey = '';
  try {
    const body = await req.json();
    productKey = String(body?.key ?? '').trim();
  } catch {
    productKey = '';
  }
  if (!productKey) {
    return NextResponse.json({ message: 'Informe a chave do produto (key).' }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from('product_licenses')
    .select('key, owner_key, status, resets')
    .eq('key', productKey)
    .eq('product_slug', PROXY_SCRAPER_SLUG)
    .single();

  if (error || !data) {
    return NextResponse.json({ message: 'Licença não encontrada.' }, { status: 404 });
  }
  if (data.owner_key !== licenseKey) {
    return NextResponse.json({ message: 'Você não é o dono desta licença.' }, { status: 403 });
  }
  if ((data.resets ?? 0) >= MAX_RESETS) {
    return NextResponse.json(
      { message: `Limite de ${MAX_RESETS} trocas de dispositivo atingido.` },
      { status: 409 }
    );
  }

  const { data: updated, error: updErr } = await supabaseAdmin
    .from('product_licenses')
    .update({ hwid: null, resets: (data.resets ?? 0) + 1 })
    .eq('key', productKey)
    .select('key, hwid, resets')
    .single();

  if (updErr || !updated) {
    return NextResponse.json({ message: 'Falha ao resetar dispositivo.' }, { status: 500 });
  }

  return NextResponse.json({
    message: 'Dispositivo desvinculado. Ative novamente no novo dispositivo.',
    key: updated.key,
    resets: updated.resets,
    resets_left: MAX_RESETS - updated.resets,
  });
}
