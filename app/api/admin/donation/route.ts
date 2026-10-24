
import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

type ItemRelacionado = {
  name: string;
};

type DoacaoBanco = {
  id: number;
  donor_name: string;
  quantity: number;
  created_at: string;
  item_id: number;
  items: ItemRelacionado | ItemRelacionado[] | null;
};

export async function GET() {
  try {
    // Verifica se o administrador está autenticado.
    const autenticado = await isAdminAuthenticated();

    if (!autenticado) {
      return NextResponse.json(
        { error: 'Não autorizado.' },
        { status: 401 }
      );
    }

    // Consulta o histórico de doações no Supabase.
    const { data, error } = await supabaseAdmin
      .from('donations')
      .select(
        'id, donor_name, quantity, created_at, item_id, items(name)'
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao consultar histórico de doações:', error);

      return NextResponse.json(
        {
          error: 'Não foi possível carregar o histórico de doações.',
        },
        { status: 500 }
      );
    }

    // Informa explicitamente ao TypeScript o formato esperado.
    const doacoesBanco = (data ?? []) as unknown as DoacaoBanco[];

    const doacoes = doacoesBanco.map((doacao) => {
      const relacionado = doacao.items;

      const item = Array.isArray(relacionado)
        ? relacionado[0]
        : relacionado;

      return {
        id: doacao.id,
        donor_name: doacao.donor_name,
        quantity: doacao.quantity,
        created_at: doacao.created_at,
        item_id: doacao.item_id,
        item_name: item?.name ?? 'Item não encontrado',
      };
    });

    return NextResponse.json(doacoes);
  } catch (error) {
    console.error('Erro inesperado ao carregar histórico:', error);

    return NextResponse.json(
      {
        error: 'Erro interno ao carregar o histórico de doações.',
      },
      { status: 500 }
    );
  }
}
