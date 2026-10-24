
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

type DadosDoacao = {
  item_id: number;
  donor_name: string;
  quantity: number;
};

export async function POST(request: Request) {
  try {
    let body: DadosDoacao;

    try {
      body = (await request.json()) as DadosDoacao;
    } catch {
      return NextResponse.json(
        { error: 'O corpo da requisição não contém JSON válido.' },
        { status: 400 }
      );
    }

    const itemId = Number(body.item_id);
    const nomeDoador =
      typeof body.donor_name === 'string' ? body.donor_name.trim() : '';
    const quantidade = Number(body.quantity);

    if (!Number.isInteger(itemId) || itemId <= 0) {
      return NextResponse.json(
        { error: 'Selecione um item válido.' },
        { status: 400 }
      );
    }

    if (!nomeDoador || nomeDoador.length > 120) {
      return NextResponse.json(
        { error: 'Informe um nome válido, com até 120 caracteres.' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      return NextResponse.json(
        { error: 'A quantidade deve ser um número inteiro maior que zero.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.rpc('register_donation', {
      p_item_id: itemId,
      p_donor_name: nomeDoador,
      p_quantity: quantidade,
    });

    if (error) {
      console.error('Erro ao registrar doação:', error);

      return NextResponse.json(
        { error: 'Não foi possível registrar a doação.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Doação registrada com sucesso.',
        data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro inesperado ao registrar doação:', error);

    return NextResponse.json(
      { error: 'Erro interno ao registrar a doação.' },
      { status: 500 }
    );
  }
}
