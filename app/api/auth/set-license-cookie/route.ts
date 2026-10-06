import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
  const { key, role } = await request.json();

  if (!key || !role) {
    return NextResponse.json({ message: 'License Key e Role são obrigatórios' }, { status: 400 });
  }

  const cookieStore = await cookies();

  // Definir o cookie para a license key
  cookieStore.set('license_key', key, {
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

  return NextResponse.json({ message: 'License Key processada com sucesso.' }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { message: 'Erro interno ao definir cookies.', error: String(err?.message || err) },
      { status: 500 }
    );
  }
}