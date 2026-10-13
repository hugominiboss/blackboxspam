import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/app/lib/license-guard';
import { PROXY_SCRAPER_SLUG, PLANS, daysRemaining } from '@/app/lib/product-licenses';

/**
 * Lista as licenças do Proxy Scraper pertencentes à sessão atual (cookie).
 * Usado pela UI do painel para mostrar chaves, dias restantes e status.
 */
export async function GET() {
  const cookieStore = await cookies();
  const licenseKey = cookieStore.get('license_key')?.value;
  if (!licenseKey) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('product_licenses')
    .select('key, plan, status, hwid, resets, activated_at, expires_at, created_at')
    .eq('product_slug', PROXY_SCRAPER_SLUG)
    .eq('owner_key', licenseKey)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ message: 'Erro ao buscar licenças.', error: error.message }, { status: 500 });
  }

  const licenses = (data || []).map((l: any) => ({
    key: l.key,
    plan: l.plan,
    plan_label: PLANS[l.plan as keyof typeof PLANS]?.label ?? l.plan,
    status: l.status,
    activated: !!l.hwid,
    resets: l.resets ?? 0,
    expires_at: l.expires_at,
    days_left: daysRemaining(l.expires_at),
    created_at: l.created_at,
  }));

  return NextResponse.json({ licenses });
}
