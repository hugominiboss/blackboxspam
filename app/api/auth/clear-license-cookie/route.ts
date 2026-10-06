import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const cookieStore = await cookies();

  // Clear the license key cookie
  cookieStore.delete('license_key');
  // Clear the license role cookie
  cookieStore.delete('license_role');

  return NextResponse.json({ message: 'Cookies de licença limpos com sucesso.' }, { status: 200 });
}