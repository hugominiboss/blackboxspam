import { NextResponse } from 'next/server';
import { requireAdmin, getSupabaseAdmin } from '@/app/lib/license-guard';

export async function GET(req: Request) {
  // Apenas a Key Mestra (role: 'admin') pode listar licenças.
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ message: guard.message }, { status: 403 });
  }
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from('licenses')
    .select('key, status, role, credits, access_level, expires_at, created_at, updated_at');

  if (error) {
    console.error('Error fetching licenses:', error);
    return NextResponse.json({ message: 'Erro ao buscar licenças.', error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  // Apenas a Key Mestra (role: 'admin') pode criar licenças.
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ message: guard.message }, { status: 403 });
  }
  const supabaseAdmin = getSupabaseAdmin();

  const { key, status, role, credits, access_level, expires_at } = await req.json();

  // Validação básica
  if (!key || !role || !['user', 'admin'].includes(role)) {
    return NextResponse.json({ message: 'Key e Role (user/admin) são obrigatórios e válidos.' }, { status: 400 });
  }
  if (typeof status !== 'boolean') {
    return NextResponse.json({ message: 'Status deve ser um booleano.' }, { status: 400 });
  }
  if (typeof credits !== 'number' || credits < 0) {
    return NextResponse.json({ message: 'Credits deve ser um número não negativo.' }, { status: 400 });
  }
  if (typeof access_level !== 'number' || access_level < 1) {
    return NextResponse.json({ message: 'Access Level deve ser um número inteiro positivo.' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('licenses')
      .insert({
        key,
        status,
        role,
        credits,
        access_level,
        expires_at: expires_at || null, // Allow null for no expiration
      })
      .select();

    if (error) {
      if (error.code === '23505') { // Unique violation code for PostgreSQL
        return NextResponse.json({ message: 'License Key já existe.', error: error.message }, { status: 409 });
      }
      console.error('Error creating license:', error);
      return NextResponse.json({ message: 'Erro ao criar licença.', error: error.message }, { status: 500 });
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (err: any) {
    console.error('Unexpected error creating license:', err);
    return NextResponse.json({ message: 'Ocorreu um erro inesperado.', error: err.message }, { status: 500 });
  }
}