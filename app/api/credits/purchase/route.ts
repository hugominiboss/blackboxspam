import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/app/lib/license-guard';
import { nivelParaGasto } from '@/app/lib/levels';

/**
 * Compra atômica de conteúdo (aula/ferramenta) — Onda 3 (antifraude).
 *
 * O cliente NÃO controla mais a ordem "débito → unlock". Esta rota faz as duas
 * coisas no servidor, em sequência imediata via service_role:
 *   1. valida a License Key (ativa, não expirada);
 *   2. se já desbloqueado, retorna sem cobrar (idempotente);
 *   3. resolve o PREÇO no servidor (cliente não define o valor);
 *   4. debita créditos de forma atômica (.gte anti-corrida);
 *   5. insere o unlock; se falhar, ESTORNA o débito.
 *
 * Só retorna sucesso se débito + unlock ocorrerem.
 */

// Preço fixo (servidor) de um episódio da Academia.
const PRECO_AULA = 10;

const VALID_TYPES = ['aula', 'ferramenta'] as const;

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
    // corpo vazio -> validação abaixo
  }
  const content_id = String(body?.content_id ?? '').trim();
  const content_type = String(body?.content_type ?? '').trim();
  const requestedAmount = Number(body?.amount);

  if (!content_id) {
    return NextResponse.json({ message: 'content_id é obrigatório.' }, { status: 400 });
  }
  if (!VALID_TYPES.includes(content_type as (typeof VALID_TYPES)[number])) {
    return NextResponse.json({ message: 'content_type inválido. Use: aula ou ferramenta.' }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  // 1) Valida a licença (ativa e não expirada).
  const { data: lic, error: licErr } = await supabaseAdmin
    .from('licenses')
    .select('key, status, credits, total_spent, expires_at')
    .eq('key', licenseKey)
    .single();

  if (licErr || !lic || !lic.status || (lic.expires_at && new Date(lic.expires_at) < new Date())) {
    return NextResponse.json({ message: 'License Key inválida ou inativa.' }, { status: 404 });
  }

  // 2) Já desbloqueado? Não cobra de novo.
  const { data: existing } = await supabaseAdmin
    .from('unlocks')
    .select('content_id')
    .eq('license_key', licenseKey)
    .eq('content_id', content_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, already: true, content_id, content_type, credits: lic.credits }, { status: 200 });
  }

  // 3) Preço definido no SERVIDOR (cliente não define o valor).
  let price: number;
  if (content_type === 'aula') {
    price = PRECO_AULA;
  } else {
    // Ferramenta: usa o custo cadastrado no banco quando existir;
    // caso contrário (ferramentas de demonstração), aceita o valor enviado
    // dentro de uma faixa segura — NUNCA zero ou negativo.
    const { data: fer } = await supabaseAdmin
      .from('ferramentas')
      .select('custo_creditos')
      .eq('id', content_id)
      .maybeSingle();

    if (fer && Number.isFinite(Number(fer.custo_creditos))) {
      price = Math.floor(Number(fer.custo_creditos));
    } else if (Number.isInteger(requestedAmount) && requestedAmount >= 1 && requestedAmount <= 1000) {
      price = requestedAmount;
    } else {
      return NextResponse.json({ message: 'Preço inválido para a ferramenta.' }, { status: 400 });
    }
  }

  // 4) Débito atômico (só passa se o saldo ainda for >= price).
  const gastoAcumulado = (lic.total_spent ?? 0) + price;
  const progresso = nivelParaGasto(gastoAcumulado);

  const { data: debitado, error: debitErr } = await supabaseAdmin
    .from('licenses')
    .update({ credits: lic.credits - price, total_spent: gastoAcumulado, level: progresso.atual })
    .eq('key', licenseKey)
    .gte('credits', price)
    .select('credits, total_spent, level')
    .single();

  if (debitErr || !debitado) {
    const { data: recheck } = await supabaseAdmin.from('licenses').select('credits').eq('key', licenseKey).single();
    const saldo = recheck?.credits ?? 0;
    return NextResponse.json({ message: `Créditos insuficientes. Saldo: ${saldo} CR.`, credits: saldo }, { status: 409 });
  }

  // 5) Insere o unlock (idempotente). Se falhar, estorna o débito.
  const { error: insErr } = await supabaseAdmin
    .from('unlocks')
    .upsert(
      { license_key: licenseKey, content_id, content_type },
      { onConflict: 'license_key,content_id', ignoreDuplicates: true }
    );

  if (insErr) {
    await supabaseAdmin
      .from('licenses')
      .update({ credits: debitado.credits + price, total_spent: (debitado.total_spent ?? gastoAcumulado) - price })
      .eq('key', licenseKey);
    return NextResponse.json({ message: 'Falha ao registrar desbloqueio. Débito estornado.', error: insErr.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      ok: true,
      already: false,
      content_id,
      content_type,
      credits: debitado.credits,
      spent: price,
      total_spent: debitado.total_spent,
      level: debitado.level,
    },
    { status: 201 }
  );
}
