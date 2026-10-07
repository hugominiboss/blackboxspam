import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/app/lib/license-guard';

export async function POST(request: Request) {
  try {
  const { key } = await request.json();

  if (!key || typeof key !== 'string') {
    return NextResponse.json({ message: 'License Key é obrigatória' }, { status: 400 });
  }

  const normalizedKey = key.trim();
  if (!normalizedKey) {
    return NextResponse.json({ message: 'License Key é obrigatória' }, { status: 400 });
  }

  // Nunca confia na role enviada pelo cliente: revalida a key no banco
  // e deriva role/status/expiração da fonte oficial (service_role).
  const supabaseAdmin = getSupabaseAdmin();
  const { data: license, error } = await supabaseAdmin
    .from('licenses')
    .select('key, role, status, expires_at')
    .eq('key', normalizedKey)
    .single();

  if (error || !license) {
    return NextResponse.json({ message: 'License Key inválida ou não encontrada.' }, { status: 401 });
  }

  if (!license.status) {
    return NextResponse.json({ message: 'Sua License Key está inativa.' }, { status: 403 });
  }

  if (license.expires_at && new Date(license.expires_at) < new Date()) {
    return NextResponse.json({ message: 'Sua License Key expirou.' }, { status: 403 });
  }

  const role: string = license.role === 'admin' ? 'admin' : 'user';

  const cookieStore = await cookies();

  // Definir o cookie para a license key
  cookieStore.set('license_key', license.key, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    sameSite: 'lax',
  });

  // Definir o cookie para a role
  cookieStore.set('license_role', role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    sameSite: 'lax',
  });

  return NextResponse.json({ message: 'License Key processada com sucesso.', role }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { message: 'Erro interno ao definir cookies.', error: String(err?.message || err) },
      { status: 500 }
    );
  }
}