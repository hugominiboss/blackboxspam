import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/app/lib/license-guard';

/**
 * Retorna os dados (créditos, role, nível) da License Key autenticada
 * pelo cookie httpOnly license_key. A autenticação deste app é por
 * License Key, não por Supabase Auth — por isso não usamos user_credits.
 */
export async function GET() {
  const cookieStore = await cookies();
  const licenseKey = cookieStore.get('license_key')?.value;

  if (!licenseKey) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('licenses')
    .select('key, role, status, credits, access_level')
    .eq('key', licenseKey)
    .single();

  if (error || !data || !data.status) {
    return NextResponse.json({ message: 'License Key inválida ou inativa.' }, { status: 404 });
  }

  return NextResponse.json({
    key: data.key,
    role: data.role,
    credits: data.credits,
    access_level: data.access_level,
  });
}

/**
 * Debita créditos da License Key autenticada (ex.: 10 CR por aula).
 * Débito atômico: só atualiza se o saldo ainda for maior ou igual ao valor,
 * evitando corrida entre requisições simultâneas.
 */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const licenseKey = cookieStore.get('license_key')?.value;

  if (!licenseKey) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  let amount = 10;
  try {
    const body = await req.json();
    if (body && body.amount !== undefined && body.amount !== null) {
      amount = Number(body.amount);
    }
  } catch {
    // sem corpo => valor experimental padrão de 10
  }

  if (!Number.isInteger(amount) || amount < 1 || amount > 1000) {
    return NextResponse.json({ message: 'Valor de créditos inválido.' }, { status: 400 });
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

  const saldoAtual = data.credits ?? 0;
  if (saldoAtual < amount) {
    return NextResponse.json(
      { message: `Créditos insuficientes. Saldo atual: ${saldoAtual} CR.`, credits: saldoAtual },
      { status: 409 }
    );
  }

  const { data: atualizado, error: updError } = await supabaseAdmin
    .from('licenses')
    .update({ credits: saldoAtual - amount })
    .eq('key', licenseKey)
    .gte('credits', amount)
    .select('credits')
    .single();

  if (updError || !atualizado) {
    const { data: recheck } = await supabaseAdmin
      .from('licenses')
      .select('credits')
      .eq('key', licenseKey)
      .single();
    const saldoFinal = recheck?.credits ?? 0;
    return NextResponse.json(
      { message: `Créditos insuficientes. Saldo atual: ${saldoFinal} CR.`, credits: saldoFinal },
      { status: 409 }
    );
  }

  return NextResponse.json({
    key: data.key,
    role: data.role,
    credits: atualizado.credits,
    access_level: data.access_level,
    spent: amount,
  });
}