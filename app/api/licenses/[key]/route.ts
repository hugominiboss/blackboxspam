import { NextResponse } from 'next/server';
import { requireAdmin, getSupabaseAdmin } from '@/app/lib/license-guard';

export async function PATCH(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ message: guard.message }, { status: 403 });
  }
  const supabaseAdmin = getSupabaseAdmin();

  const { key: licenseKeyToUpdate } = await params;
  const { status, role, credits, access_level, expires_at } = await req.json();

  if (!licenseKeyToUpdate) {
    return NextResponse.json({ message: 'License Key para atualização é obrigatória.' }, { status: 400 });
  }

  const updateData: { [key: string]: any } = {};
  if (status !== undefined) updateData.status = status;
  if (role) updateData.role = role;
  if (credits !== undefined) updateData.credits = credits;
  if (access_level !== undefined) updateData.access_level = access_level;
  if (expires_at !== undefined) updateData.expires_at = expires_at;
  
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ message: 'Nenhum dado fornecido para atualização.' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('licenses')
      .update(updateData)
      .eq('key', licenseKeyToUpdate)
      .select();

    if (error) {
      console.error('Error updating license:', error);
      return NextResponse.json({ message: 'Erro ao atualizar licença.', error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ message: 'License Key não encontrada para atualização.' }, { status: 404 });
    }

    return NextResponse.json(data[0]);
  } catch (err: any) {
    console.error('Unexpected error updating license:', err);
    return NextResponse.json({ message: 'Ocorreu um erro inesperado.', error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ message: guard.message }, { status: 403 });
  }
  const supabaseAdmin = getSupabaseAdmin();

  const { key: licenseKeyToDelete } = await params;

  if (!licenseKeyToDelete) {
    return NextResponse.json({ message: 'License Key para exclusão é obrigatória.' }, { status: 400 });
  }

  try {
    const { error } = await supabaseAdmin
      .from('licenses')
      .delete()
      .eq('key', licenseKeyToDelete);

    if (error) {
      console.error('Error deleting license:', error);
      return NextResponse.json({ message: 'Erro ao deletar licença.', error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'License Key deletada com sucesso.' }, { status: 200 });
  } catch (err: any) {
    console.error('Unexpected error deleting license:', err);
    return NextResponse.json({ message: 'Ocorreu um erro inesperado.', error: err.message }, { status: 500 });
  }
}