import { NextResponse } from 'next/server';
import { supabasePublic } from '@/lib/supabase-public';


export async function GET() {
  const { data, error } = await supabasePublic
    .from('item_progress')
    .select('id, name, category, required_quantity, donated_quantity, remaining_quantity')
    .order('id', { ascending: true });

  if (error) {
    console.error('Erro ao carregar itens:', error.message);
    return NextResponse.json(
      { error: 'Não foi possível carregar a lista.' },
      { status: 500 }
    );
  }

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' },
  });
}






