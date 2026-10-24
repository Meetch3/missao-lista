
import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

function validText(value: unknown, max = 100): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.trim().length <= max
  );
}

function validQuantity(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'NÃ£o autorizado.' }, { status: 401 });
  }

  let body: { name?: unknown; category?: unknown; quantity?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dados invÃ¡lidos.' }, { status: 400 });
  }

  if (
    !validText(body.name) ||
    (body.category !== undefined && !validText(body.category, 60)) ||
    !validQuantity(body.quantity)
  ) {
    return NextResponse.json(
      { error: 'Informe nome, categoria vÃ¡lida e quantidade maior que zero.' },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('items')
    .insert({
      name: body.name.trim(),
      category:
        typeof body.category === 'string' ? body.category.trim() : 'Geral',
      quantity: body.quantity,
    })
    .select('id, name, category, quantity')
    .single();

  if (error) {
    console.error('Erro ao criar item:', error.message);
    return NextResponse.json(
      { error: 'NÃ£o foi possÃ­vel cadastrar o item.' },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'NÃ£o autorizado.' }, { status: 401 });
  }

  let body: {
    id?: unknown;
    name?: unknown;
    category?: unknown;
    quantity?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dados invÃ¡lidos.' }, { status: 400 });
  }

  if (
    !Number.isSafeInteger(body.id) ||
    (body.id as number) < 1 ||
    !validText(body.name) ||
    !validText(body.category, 60) ||
    !validQuantity(body.quantity)
  ) {
    return NextResponse.json(
      { error: 'Confira o ID, nome, categoria e quantidade.' },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('items')
    .update({
      name: body.name.trim(),
      category: body.category.trim(),
      quantity: body.quantity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.id as number)
    .select('id, name, category, quantity')
    .maybeSingle();

  if (error) {
    console.error('Erro ao atualizar item:', error.message);
    return NextResponse.json(
      { error: 'NÃ£o foi possÃ­vel atualizar o item.' },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ error: 'Item nÃ£o encontrado.' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'NÃ£o autorizado.' }, { status: 401 });
  }

  let body: { id?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dados invÃ¡lidos.' }, { status: 400 });
  }

  if (!Number.isSafeInteger(body.id) || (body.id as number) < 1) {
    return NextResponse.json({ error: 'ID invÃ¡lido.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('items')
    .delete()
    .eq('id', body.id as number)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('Erro ao excluir item:', error.message);
    return NextResponse.json(
      { error: 'NÃ£o foi possÃ­vel excluir o item.' },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ error: 'Item nÃ£o encontrado.' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

