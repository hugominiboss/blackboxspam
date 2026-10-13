import { NextRequest, NextResponse } from 'next/server';
import {
  PROXY_SCRAPER_SLUG,
  PLANS,
  isPlanId,
  addDays,
  daysRemaining,
  isExpired,
  type PlanId,
} from '@/app/lib/product-licenses';

/**
 * Endpoint PÚBLICO usado pela ferramenta Python para validar/ativar a licença.
 *
 * Recebe { key, hwid }.
 * - Na 1ª chamada (hwid ainda null no banco): amarra o HWID e liga o cronômetro
 *   (expires_at = agora + dias do plano).
 * - Nas chamadas seguintes: confere se o HWID bate e se não expirou.
 *
 * Respostas:
 *  - 200 { valid: true, plan, days_left, expires_at }
 *  - 400 chave/hwid ausentes
 *  - 403 chave inválida/inativa/expirada/HWID diferente (com `code`)
 *  - 429 rate limit básico
 */

// Rate limiting em memória (bem básico, suficiente para coibir brute-force).
// Em serverless é por-instância, mas ajuda. Chave: IP. Janela: 60s.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > RATE_MAX;
}

function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return (req as any).ip ?? 'unknown';
}

export async function POST(req: NextRequest) {
  try {
    if (rateLimited(clientIp(req))) {
      return NextResponse.json(
        { valid: false, code: 'RATE_LIMIT', message: 'Muitas tentativas. Aguarde um minuto.' },
        { status: 429 }
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { valid: false, code: 'BAD_REQUEST', message: 'Corpo inválido.' },
        { status: 400 }
      );
    }

    const key = String(body?.key ?? '').trim();
    const hwid = String(body?.hwid ?? '').trim();
    if (!key || !hwid) {
      return NextResponse.json(
        { valid: false, code: 'BAD_REQUEST', message: 'Informe key e hwid.' },
        { status: 400 }
      );
    }

    // Usa service role direto (endpoint público não tem cookie de sessão).
    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(url, serviceKey, { auth: { persistSession: false } });

    const { data, error } = await supabaseAdmin
      .from('product_licenses')
      .select('*')
      .eq('key', key)
      .eq('product_slug', PROXY_SCRAPER_SLUG)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { valid: false, code: 'NOT_FOUND', message: 'Chave não encontrada.' },
        { status: 403 }
      );
    }
    if (!data.status) {
      return NextResponse.json(
        { valid: false, code: 'INACTIVE', message: 'Chave desativada.' },
        { status: 403 }
      );
    }

    // Já expirada (mesmo sem nova ativação).
    if (data.expires_at && isExpired(data.expires_at)) {
      return NextResponse.json(
        {
          valid: false,
          code: 'EXPIRED',
          message: 'Licença expirada.',
          days_left: 0,
          expires_at: data.expires_at,
        },
        { status: 403 }
      );
    }

    // Primeira ativação: amarra HWID e inicia o cronômetro.
    if (!data.hwid) {
      const plan: PlanId = isPlanId(data.plan) ? data.plan : '7d';
      const days = PLANS[plan].days;
      const expiresAt = addDays(days);
      const { data: updated, error: updErr } = await supabaseAdmin
        .from('product_licenses')
        .update({ hwid, activated_at: new Date().toISOString(), expires_at: expiresAt })
        .eq('key', key)
        .is('hwid', null) // protege contra ativação concorrente
        .select()
        .single();

      if (updErr || !updated) {
        // Outra request ativou primeiro: recarrega e segue pelo caminho normal.
        const { data: fresh } = await supabaseAdmin
          .from('product_licenses')
          .select('*')
          .eq('key', key)
          .single();
        if (!fresh || fresh.hwid !== hwid) {
          return NextResponse.json(
            { valid: false, code: 'HWID_MISMATCH', message: 'Chave já ativa em outro dispositivo.' },
            { status: 403 }
          );
        }
        return NextResponse.json({
          valid: true,
          plan: fresh.plan,
          days_left: daysRemaining(fresh.expires_at),
          expires_at: fresh.expires_at,
          newly_activated: true,
        });
      }

      return NextResponse.json({
        valid: true,
        plan: updated.plan,
        days_left: daysRemaining(updated.expires_at),
        expires_at: updated.expires_at,
        newly_activated: true,
      });
    }

    // Já ativada: confere HWID.
    if (data.hwid !== hwid) {
      return NextResponse.json(
        { valid: false, code: 'HWID_MISMATCH', message: 'Chave vinculada a outro dispositivo.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      valid: true,
      plan: data.plan,
      days_left: daysRemaining(data.expires_at),
      expires_at: data.expires_at,
      newly_activated: false,
    });
  } catch (err: any) {
    return NextResponse.json(
      { valid: false, code: 'SERVER_ERROR', message: String(err?.message || err) },
      { status: 500 }
    );
  }
}
