
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type Item = {
  id: number;
  name: string;
  category: string;
  required_quantity: number;
  donated_quantity: number;
  remaining_quantity: number;
};

const campo = {
  width: '100%',
  boxSizing: 'border-box' as const,
  padding: '12px 14px',
  border: '1px solid #d8e2d6',
  borderRadius: 10,
  background: '#fff',
  color: '#20382b',
  fontSize: 15,
};

const botao = {
  width: '100%',
  padding: 13,
  border: 0,
  borderRadius: 10,
  background: '#286744',
  color: '#fff',
  fontWeight: 700,
  fontSize: 15,
  cursor: 'pointer',
};

export default function Home() {
  const [itens, setItens] = useState<Item[]>([]);
  const [filtro, setFiltro] = useState('Todos');
  const [nomeDoador, setNomeDoador] = useState('');
  const [quantidades, setQuantidades] = useState<Record<number, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState<number | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState(false);

  const carregarItens = useCallback(async () => {
    try {
      const resposta = await fetch('/api/items', { cache: 'no-store' });
      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.error || 'Não foi possível carregar a lista.');
      }

      setItens(dados as Item[]);
    } catch (e) {
      setErro(true);
      setMensagem(
        e instanceof Error ? e.message : 'Erro ao carregar os itens.'
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarItens();
  }, [carregarItens]);

  const totalNecessario = useMemo(
    () => itens.reduce((soma, item) => soma + item.required_quantity, 0),
    [itens]
  );

  const totalDoado = useMemo(
    () => itens.reduce((soma, item) => soma + item.donated_quantity, 0),
    [itens]
  );

  const progresso = totalNecessario > 0
    ? Math.min(100, Math.round((totalDoado / totalNecessario) * 100))
    : 0;

  const categorias = ['Todos', ...Array.from(
    new Set(itens.map(item => item.category))
  )];

  const listaFiltrada = itens.filter(item => {
    if (filtro === 'Pendentes') return item.remaining_quantity > 0;
    if (filtro === 'Concluídos') return item.remaining_quantity === 0;
    if (filtro !== 'Todos') return item.category === filtro;
    return true;
  });

  async function registrarDoacao(item: Item) {
    setMensagem('');
    setErro(false);

    const nome = nomeDoador.trim();
    const quantidade = Number(quantidades[item.id] ?? '1');

    if (nome.length < 2 || nome.length > 100) {
      setErro(true);
      setMensagem('Informe seu nome, com pelo menos 2 caracteres.');
      return;
    }

    if (
      !Number.isSafeInteger(quantidade) ||
      quantidade < 1 ||
      quantidade > item.remaining_quantity
    ) {
      setErro(true);
      setMensagem(`Informe uma quantidade entre 1 e ${item.remaining_quantity}.`);
      return;
    }

    setEnviando(item.id);

    try {
      const resposta = await fetch('/api/donation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          donorName: nome,
          quantity: quantidade,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.error || 'Não foi possível registrar a doação.');
      }

      setMensagem(`Doação de ${quantidade} unidade(s) de "${item.name}" registrada com sucesso. Obrigado!`);
      setErro(false);
      setNomeDoador('');
      setQuantidades(anterior => ({ ...anterior, [item.id]: '1' }));

      await carregarItens();
    } catch (e) {
      setErro(true);
      setMensagem(
        e instanceof Error ? e.message : 'Erro ao registrar a doação.'
      );
      await carregarItens();
    } finally {
      setEnviando(null);
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#f4f7f1',
      color: '#20382b',
      padding: '32px 18px',
      fontFamily: 'Arial, sans-serif',
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <header style={{ marginBottom: 28 }}>
          <p style={{
            color: '#39744e',
            fontWeight: 700,
            letterSpacing: 2,
            fontSize: 13,
          }}>
            LISTA MISSIONÁRIA
          </p>

          <h1 style={{
            fontSize: 'clamp(30px, 5vw, 46px)',
            lineHeight: 1.15,
            marginBottom: 12,
          }}>
            Uma missão, muitas mãos.
          </h1>

          <p style={{ color: '#617167', lineHeight: 1.7, maxWidth: 650 }}>
            Confira os itens necessários, escolha o que deseja doar e
            acompanhe o progresso. Cada contribuição faz diferença!
          </p>
        </header>

        <section style={{
          background: '#fff',
          borderRadius: 20,
          padding: 24,
          marginBottom: 24,
          boxShadow: '0 5px 24px #20382b0a',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}>
            <strong>Progresso geral das doações</strong>
            <strong style={{ color: '#286744', fontSize: 22 }}>
              {progresso}%
            </strong>
          </div>

          <div style={{
            height: 13,
            background: '#e4ebe2',
            borderRadius: 20,
            overflow: 'hidden',
            marginTop: 15,
          }}>
            <div style={{
              height: '100%',
              width: `${progresso}%`,
              background: '#398052',
              borderRadius: 20,
              transition: 'width .3s',
            }} />
          </div>

          <p style={{ color: '#617167', lineHeight: 1.6, marginBottom: 0 }}>
            {totalDoado} de {totalNecessario} unidades doadas.
            {' '}{Math.max(0, totalNecessario - totalDoado)} restantes.
          </p>
        </section>

        {mensagem && (
          <div role="status" aria-live="polite" style={{
            padding: 14,
            borderRadius: 12,
            marginBottom: 20,
            background: erro ? '#fff0ed' : '#e8f2e8',
            color: erro ? '#9d3024' : '#286744',
            lineHeight: 1.5,
          }}>
            {mensagem}
          </div>
        )}

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 18,
        }}>
          <h2 style={{ margin: 0 }}>Itens necessários</h2>

          <select
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            aria-label="Filtrar itens"
            style={{ ...campo, width: 'auto', maxWidth: '100%' }}
          >
            {categorias.map(categoria => (
              <option key={categoria} value={categoria}>{categoria}</option>
            ))}
            <option value="Pendentes">Somente pendentes</option>
            <option value="Concluídos">Somente concluídos</option>
          </select>
        </div>

        {carregando ? (
          <p style={{ padding: 24, textAlign: 'center', color: '#617167' }}>
            Carregando a lista...
          </p>
        ) : itens.length === 0 ? (
          <section style={{
            background: '#fff',
            borderRadius: 16,
            padding: 24,
            textAlign: 'center',
          }}>
            <h3>A lista ainda está vazia.</h3>
            <p style={{ color: '#617167', lineHeight: 1.6 }}>
              Os itens cadastrados pela administração aparecerão aqui.
            </p>
          </section>
        ) : (
          <section style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: 16,
          }}>
            {listaFiltrada.map(item => {
              const percentual = item.required_quantity > 0
                ? Math.min(100, Math.round(
                    item.donated_quantity / item.required_quantity * 100
                  ))
                : 0;
              const concluido = item.remaining_quantity === 0;

              return (
                <article key={item.id} style={{
                  background: '#fff',
                  border: '1px solid #e1e8df',
                  borderRadius: 16,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}>
                  <p style={{
                    color: '#39744e',
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    margin: 0,
                  }}>
                    {item.category}
                  </p>

                  <h3 style={{ fontSize: 21, margin: 0 }}>{item.name}</h3>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 8,
                    color: '#617167',
                    fontSize: 14,
                  }}>
                    <span>Doado: {item.donated_quantity}</span>
                    <span>Necessário: {item.required_quantity}</span>
                  </div>

                  <div style={{
                    height: 8,
                    background: '#e4ebe2',
                    borderRadius: 20,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${percentual}%`,
                      height: '100%',
                      background: '#398052',
                    }} />
                  </div>

                  <p style={{
                    margin: 0,
                    color: concluido ? '#286744' : '#617167',
                    fontWeight: concluido ? 700 : 400,
                    fontSize: 14,
                  }}>
                    {concluido
                      ? '✓ Quantidade completa!'
                      : `Faltam ${item.remaining_quantity} unidade(s)`}
                  </p>

                  {!concluido && (
                    <div style={{
                      borderTop: '1px solid #edf0eb',
                      paddingTop: 14,
                      display: 'grid',
                      gap: 10,
                      marginTop: 'auto',
                    }}>
                      <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
                        Seu nome
                        <input
                          value={nomeDoador}
                          onChange={e => setNomeDoador(e.target.value)}
                          placeholder="Digite seu nome"
                          maxLength={100}
                          autoComplete="name"
                          style={campo}
                        />
                      </label>

                      <label style={{ display: 'grid', gap: 6, fontSize: 14 }}>
                        Quantidade que deseja doar
                        <input
                          type="number"
                          min="1"
                          max={item.remaining_quantity}
                          step="1"
                          value={quantidades[item.id] ?? '1'}
                          onChange={e => setQuantidades(anterior => ({
                            ...anterior,
                            [item.id]: e.target.value,
                          }))}
                          style={campo}
                        />
                      </label>

                      <button
                        type="button"
                        disabled={enviando !== null}
                        onClick={() => void registrarDoacao(item)}
                        style={{
                          ...botao,
                          opacity: enviando !== null ? 0.65 : 1,
                          cursor: enviando !== null ? 'wait' : 'pointer',
                        }}
                      >
                        {enviando === item.id
                          ? 'Registrando...'
                          : 'Quero doar'}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}

        {!carregando && itens.length > 0 && listaFiltrada.length === 0 && (
          <p style={{ color: '#617167', textAlign: 'center', padding: 20 }}>
            Nenhum item encontrado neste filtro.
          </p>
        )}

        <footer style={{
          textAlign: 'center',
          color: '#718075',
          fontSize: 13,
          lineHeight: 1.6,
          marginTop: 32,
        }}>
          Obrigado por fazer parte desta missão.
          <br />
          Os nomes dos doadores não são exibidos nesta lista pública.
        </footer>
      </div>
    </main>
  );
}
