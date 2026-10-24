import { NextResponse } from 'next/server';
import { supabasePublic } from '@/lib/supabase-public';

export async function POST(request: Request) {
  let body: {
    itemId?: unknown;
    donorName?: unknown;
    quantity?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Dados invÃ¡lidos.' },
      { status: 400 }
    );
  }

  if (
    !Number.isSafeInteger(body.itemId) ||
    (body.itemId as number) < 1 ||
    typeof body.donorName !== 'string' ||
    body.donorName.trim().length < 2 ||
    body.donorName.trim().length > 100 ||
    !Number.isSafeInteger(body.quantity) ||
    (body.quantity as number) < 1
  ) {
    return NextResponse.json(
      { error: 'Confira o nome e a quantidade informados.' },
      { status: 400 }
    );
  }

  const { data, error } = await supabasePublic.rpc('register_donation', {
    p_item_id: body.itemId,
    p_donor_name: body.donorName.trim(),
    p_quantity: body.quantity,
  });

  if (error) {
    const indisponivel =
      error.message.includes('Quantidade indisponÃ­vel') ||
      error.message.includes('Item nÃ£o encontrado');

    return NextResponse.json(
      {
        error: indisponivel
          ? error.message
          : 'NÃ£o foi possÃ­vel registrar a doaÃ§Ã£o.',
      },
      { status: indisponivel ? 409 : 500 }
    );
  }

  return NextResponse.json(data);
}
