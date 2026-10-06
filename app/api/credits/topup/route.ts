import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/app/lib/license-guard';

/**
 * Topup SIMULADO de créditos (modo demonstração — sem gateway real).
 * Os valores dos planos ficam fixos NO SERVIDOR; o cliente apenas envia
 * o planId. A vinculação é feita exclusivamente pela License Key do
 * cookie httpOnly (sessão) — nenhum dado pessoal é solicitado (Zero KYC).
 */
const PLANS: Record<string, number> = {
  starter: 200, // R$ 20 → 200 CR
  growth: 550, // R$ 50 → 500 CR + 10% bônus
  premium: 1200, // R$ 100 → 1000 CR + 20% bônus
};

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const licenseKey = cookieStore.get('license_key')?.value;

  if (!licenseKey) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  let planId = '';
  try {
    const body = await req.json();
    planId = String(body?.planId ?? '');
  } catch {
    // sem corpo => plano inválido abaixo
  }

  const added = PLANS[planId];
  if (!added) {
    return NextResponse.json({ message: 'Plano inválido.' }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('licenses')
    .select('key, role, status, credits, access_level, expires_at')
    .eq('key', licenseKey)
    .single();

  if (
    error || !data || !data.status ||
    (data.expires_at && new Date(data.expires_at) < new Date())
  ) {
    return NextResponse.json({ message: 'License Key inválida ou inativa.' }, { status: 404 });
  }

  const novoSaldo = (data.credits ?? 0) + added;

  const { data: atualizado, error: updError } = await supabaseAdmin
    .from('licenses')
    .update({ credits: novoSaldo })
    .eq('key', licenseKey)
    .select('credits')
    .single();

  if (updError || !atualizado) {
    return NextResponse.json(
      { message: 'Não foi possível adicionar os créditos. Tente novamente.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    key: data.key,
    role: data.role,
    credits: atualizado.credits,
    access_level: data.access_level,
    added,
    planId,
    simulated: true,
  });
}
