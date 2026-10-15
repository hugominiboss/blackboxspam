import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/app/lib/license-guard';
import { nivelParaGasto } from '@/app/lib/levels';
import {
  PROXY_SCRAPER_SLUG,
  PLANS,
  isPlanId,
  generateProductKey,
} from '@/app/lib/product-licenses';
import { notifyUser } from '@/app/lib/notify-server';

/**
 * Compra de licença do Proxy Scraper.
 * Protegido pelo cookie httpOnly `license_key` (sessão do painel).
 *
 * Fluxo:
 *  1. Lê o dono (licenses) pelo cookie.
 *  2. Débito ATÔMICO de créditos (só passa se saldo >= price), igual ao /api/credits.
 *  3. Gera uma product_licenses (sem HWID ainda — ativa no 1º uso no Python).
 *  4. Atualiza total_spent/level junto (mantém progressão de status).
 */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const licenseKey = cookieStore.get('license_key')?.value;
  if (!licenseKey) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  let planId: unknown;
  try {
    const body = await req.json();
    planId = body?.plan;
  } catch {
    planId = undefined;
  }
  if (!isPlanId(planId)) {
    return NextResponse.json(
      { message: `Plano inválido. Use um de: ${Object.keys(PLANS).join(', ')}.` },
      { status: 400 }
    );
  }

  const price = PLANS[planId].price;
  const supabaseAdmin = getSupabaseAdmin();

  // 1) Carrega o dono e valida estado.
  const { data: owner, error: ownerErr } = await supabaseAdmin
    .from('licenses')
    .select('key, role, status, credits, access_level, expires_at, total_spent, level')
    .eq('key', licenseKey)
    .single();

  if (
    ownerErr || !owner || !owner.status ||
    (owner.expires_at && new Date(owner.expires_at) < new Date())
  ) {
    return NextResponse.json({ message: 'License Key inválida ou inativa.' }, { status: 404 });
  }

  // 2) Débito atômico (protege contra corrida). Soma total_spent e recalcula level.
  const gastoAcumulado = (owner.total_spent ?? 0) + price;
  const progresso = nivelParaGasto(gastoAcumulado);

  const { data: debitado, error: debitErr } = await supabaseAdmin
    .from('licenses')
    .update({
      credits: (owner.credits ?? 0) - price,
      total_spent: gastoAcumulado,
      level: progresso.atual,
    })
    .eq('key', licenseKey)
    .gte('credits', price)
    .select('credits, total_spent, level')
    .single();

  if (debitErr || !debitado) {
    const { data: recheck } = await supabaseAdmin
      .from('licenses')
      .select('credits')
      .eq('key', licenseKey)
      .single();
    const saldo = recheck?.credits ?? 0;
    return NextResponse.json(
      { message: `Créditos insuficientes. Saldo: ${saldo} CR.`, credits: saldo },
      { status: 409 }
    );
  }

  // 3) Gera a chave do produto (única). Retry simples em colisão.
  let created: any = null;
  let lastErr: any = null;
  for (let i = 0; i < 3 && !created; i++) {
    const key = generateProductKey();
    const { data, error } = await supabaseAdmin
      .from('product_licenses')
      .insert({
        key,
        product_slug: PROXY_SCRAPER_SLUG,
        owner_key: licenseKey,
        plan: planId,
        status: true,
      })
      .select()
      .single();
    if (!error && data) created = data;
    else lastErr = error;
  }

  if (!created) {
    // Estorna os créditos se não conseguiu criar a licença.
    await supabaseAdmin
      .from('licenses')
      .update({ credits: debitado.credits + price })
      .eq('key', licenseKey);
    return NextResponse.json(
      { message: 'Falha ao gerar a licença. Tente novamente.', error: String(lastErr?.message || lastErr) },
      { status: 500 }
    );
  }

  // 🔔 Licença Proxy criada (+ level-up se subiu).
  notifyUser(licenseKey, 'proxy_criada', 'Licença Proxy Scraper ativa', `Plano ${PLANS[created.plan as keyof typeof PLANS]?.label ?? created.plan} · expira ${created.expires_at ? new Date(created.expires_at).toLocaleDateString('pt-BR') : '—'} · chave ${created.key}.`, {
    link: '/ferramentas',
    metadata: { proxy_key: created.key, plan: created.plan, expires_at: created.expires_at },
    telegram: `🔑 Proxy Scraper ativo (${PLANS[created.plan as keyof typeof PLANS]?.label ?? created.plan})
Chave: ${created.key}
Expira: ${created.expires_at ? new Date(created.expires_at).toLocaleDateString('pt-BR') : '—'}`,
  });
  if (debitado.level && debitado.level !== (owner.level ?? nivelParaGasto(owner.total_spent ?? 0).atual)) {
    notifyUser(licenseKey, 'level_up', `Subiu para ${debitado.level}!`, `Total gasto: ${debitado.total_spent} CR.`, {
      link: '/perfil',
      metadata: { level: debitado.level, total_spent: debitado.total_spent },
    });
  }

  return NextResponse.json(
    {
      license: {
        key: created.key,
        plan: created.plan,
        plan_label: PLANS[created.plan as keyof typeof PLANS]?.label,
        expires_at: created.expires_at,
        status: created.status,
      },
      credits: debitado.credits,
      spent: price,
      total_spent: debitado.total_spent,
      level: debitado.level,
    },
    { status: 201 }
  );
}
