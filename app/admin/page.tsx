
'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';

type Item = {
  id: number;
  name: string;
  category: string;
  quantity: number;
};

type Donation = {
  id: number;
  donor_name: string;
  quantity: number;
  created_at: string;
  item_id: number;
  item_name: string;
};

export default function AdminPage() {
  const [autenticado, setAutenticado] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [senha, setSenha] = useState('');
  const [itens, setItens] = useState<Item[]>([]);
  const [doacoes, setDoacoes] = useState<Donation[]>([]);
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('Geral');
  const [quantidade, setQuantidade] = useState('1');
  const [editando, setEditando] = useState<number | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [carregandoDoacoes, setCarregandoDoacoes] = useState(false);
  const [buscaDoador, setBuscaDoador] = useState('');
  const [filtroItem, setFiltroItem] = useState('Todos');

  async function verificarLogin() {
    try {
      const resposta = await fetch('/api/admin/me', { cache: 'no-store' });
      const dados = await resposta.json();
      setAutenticado(dados.authenticated === true);
    } catch {
      setMensagem('Não foi possível verificar o login.');
    } finally {
      setVerificando(false);
    }
  }

  async function carregarItens() {
    const resposta = await fetch('/api/items', { cache: 'no-store' });

    if (!resposta.ok) {
      throw new Error('Falha ao carregar itens.');
    }

    const dados = await resposta.json();

    setItens(
      dados.map((item: {
        id: number;
        name: string;
        category: string;
        required_quantity: number;
      }) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        quantity: item.required_quantity,
      }))
    );
  }

  async function carregarDoacoes() {
    setCarregandoDoacoes(true);

    try {
      const resposta = await fetch('/api/admin/donation', {
        cache: 'no-store',
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.error || 'Não foi possível carregar o histórico de doações.'
        );
      }

      setDoacoes(dados as Donation[]);
    } catch (e) {
      setMensagem(
        e instanceof Error
          ? e.message
          : 'Erro ao carregar o histórico de doações.'
      );
    } finally {
      setCarregandoDoacoes(false);
    }
  }

  useEffect(() => {
    void verificarLogin();
  }, []);

  useEffect(() => {
    if (autenticado) {
      carregarItens().catch(() => setMensagem('Erro ao carregar a lista.'));
      void carregarDoacoes();
    } else {
      setDoacoes([]);
    }
  }, [autenticado]);

  async function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCarregando(true);
    setMensagem('');

    try {
      const resposta = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: senha }),
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        setMensagem(dados.error || 'Não foi possível entrar.');
        return;
      }

      setSenha('');
      setAutenticado(true);
      setMensagem('Login realizado.');
    } catch {
      setMensagem('Erro de conexão ao entrar.');
    } finally {
      setCarregando(false);
    }
  }

  function limparFormulario() {
    setNome('');
    setCategoria('Geral');
    setQuantidade('1');
    setEditando(null);
  }

  async function salvarItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCarregando(true);
    setMensagem('');

    const corpo = {
      name: nome.trim(),
      category: categoria.trim(),
      quantity: Number(quantidade),
    };

    try {
      const resposta = await fetch('/api/admin/items', {
        method: editando === null ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editando === null ? corpo : { ...corpo, id: editando }
        ),
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        setMensagem(dados.error || 'Não foi possível salvar.');
        return;
      }

      await carregarItens();
      limparFormulario();
      setMensagem('Item salvo com sucesso.');
    } catch {
      setMensagem('Erro de conexão ao salvar o item.');
    } finally {
      setCarregando(false);
    }
  }

  async function excluirItem(id: number) {
    if (
      !window.confirm(
        'Excluir este item e as doações vinculadas a ele? O histórico dessas doações também poderá ser apagado.'
      )
    ) {
      return;
    }

    setCarregando(true);
    setMensagem('');

    try {
      const resposta = await fetch('/api/admin/items', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        setMensagem(dados.error || 'Não foi possível excluir.');
        return;
      }

      await carregarItens();
      await carregarDoacoes();

      if (editando === id) {
        limparFormulario();
      }

      setMensagem('Item excluído.');
    } catch {
      setMensagem('Erro de conexão ao excluir.');
    } finally {
      setCarregando(false);
    }
  }

  async function desfazerDoacao(doacao: Donation) {
    if (
      !window.confirm(
        `Desfazer a doação de ${doacao.quantity} unidade(s) de "${doacao.item_name}" feita por ${doacao.donor_name}? O item volta a aparecer como pendente na lista.`
      )
    ) {
      return;
    }

    setCarregando(true);
    setMensagem('');

    try {
      const resposta = await fetch('/api/admin/donation', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: doacao.id }),
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        setMensagem(dados.error || 'Não foi possível desfazer a doação.');
        return;
      }

      await carregarDoacoes();
      setMensagem('Doação desfeita.');
    } catch {
      setMensagem('Erro de conexão ao desfazer a doação.');
    } finally {
      setCarregando(false);
    }
  }

  async function sair() {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
      setAutenticado(false);
      setItens([]);
      setDoacoes([]);
      setMensagem('Você saiu do painel.');
    }
  }

  const doacoesFiltradas = useMemo(() => {
    const busca = buscaDoador.trim().toLocaleLowerCase('pt-BR');

    return doacoes.filter((doacao) => {
      const correspondeNome = doacao.donor_name
        .toLocaleLowerCase('pt-BR')
        .includes(busca);

      const correspondeItem =
        filtroItem === 'Todos' || String(doacao.item_id) === filtroItem;

      return correspondeNome && correspondeItem;
    });
  }, [doacoes, buscaDoador, filtroItem]);

  const totalUnidadesDoadas = useMemo(
    () => doacoes.reduce((total, doacao) => total + doacao.quantity, 0),
    [doacoes]
  );

  const totalDoadores = useMemo(
    () =>
      new Set(
        doacoes.map((doacao) =>
          doacao.donor_name.trim().toLocaleLowerCase('pt-BR')
        )
      ).size,
    [doacoes]
  );

  const opcoesItens = useMemo(
    () =>
      Array.from(
        new Map(
          doacoes.map((doacao) => [doacao.item_id, doacao.item_name])
        ).entries()
      ),
    [doacoes]
  );

  if (verificando) {
    return <main style={estilos.pagina}>Verificando acesso...</main>;
  }

  if (!autenticado) {
    return (
      <main style={estilos.pagina}>
        <section style={estilos.cartao}>
          <h1>Administração da missão</h1>
          <p>Entre com sua senha administrativa.</p>

          <form onSubmit={entrar} style={estilos.formulario}>
            <label>
              Senha
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                autoComplete="current-password"
                style={estilos.input}
              />
            </label>

            <button disabled={carregando} style={estilos.botao}>
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {mensagem && <p role="status">{mensagem}</p>}

          <a href="/" style={estilos.link}>
            Voltar à lista pública
          </a>
        </section>
      </main>
    );
  }

  return (
    <main style={estilos.pagina}>
      <section style={estilos.conteudo}>
        <header style={estilos.cabecalho}>
          <div>
            <h1>Painel da missão</h1>
            <p>Cadastre e organize os itens necessários.</p>
          </div>

          <button onClick={() => void sair()} style={estilos.botaoSecundario}>
            Sair
          </button>
        </header>

        {mensagem && (
          <div role="status" style={estilos.mensagem}>
            <span>{mensagem}</span>
            <button
              type="button"
              onClick={() => setMensagem('')}
              aria-label="Fechar mensagem"
              style={estilos.fecharMensagem}
            >
              ×
            </button>
          </div>
        )}

        <form onSubmit={salvarItem} style={estilos.formulario}>
          <h2>{editando === null ? 'Novo item' : 'Editar item'}</h2>

          <label>
            Nome do item
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={100}
              required
              style={estilos.input}
              placeholder="Ex.: Camisetas"
            />
          </label>

          <label>
            Categoria
            <input
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              maxLength={60}
              required
              style={estilos.input}
              placeholder="Ex.: Roupas"
            />
          </label>

          <label>
            Quantidade necessária
            <input
              type="number"
              min="1"
              step="1"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              required
              style={estilos.input}
            />
          </label>

          <div style={estilos.acoes}>
            <button disabled={carregando} style={estilos.botao}>
              {carregando
                ? 'Salvando...'
                : editando === null
                  ? 'Cadastrar item'
                  : 'Salvar alterações'}
            </button>

            {editando !== null && (
              <button
                type="button"
                onClick={limparFormulario}
                style={estilos.botaoSecundario}
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>

        <section style={estilos.secao}>
          <h2>Itens cadastrados ({itens.length})</h2>

          {itens.length === 0 && <p>Nenhum item cadastrado ainda.</p>}

          <div style={estilos.lista}>
            {itens.map((item) => (
              <article key={item.id} style={estilos.item}>
                <div style={estilos.detalhesItem}>
                  <strong>{item.name}</strong>
                  <p>
                    {item.category} · Necessários: {item.quantity}
                  </p>
                </div>

                <div style={estilos.acoes}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditando(item.id);
                      setNome(item.name);
                      setCategoria(item.category);
                      setQuantidade(String(item.quantity));
                    }}
                    style={estilos.botaoSecundario}
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => void excluirItem(item.id)}
                    disabled={carregando}
                    style={estilos.botaoExcluir}
                  >
                    Excluir
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section style={estilos.historico}>
          <header style={estilos.cabecalhoHistorico}>
            <div>
              <h2 style={estilos.tituloHistorico}>Histórico de doações</h2>
              <p style={estilos.subtituloHistorico}>
                Consulte quem contribuiu, quais itens foram doados e quando.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void carregarDoacoes()}
              disabled={carregandoDoacoes}
              style={estilos.botaoSecundario}
            >
              {carregandoDoacoes ? 'Atualizando...' : 'Atualizar histórico'}
            </button>
          </header>

          <div style={estilos.resumoDoacoes}>
            <article style={estilos.cartaoResumo}>
              <span style={estilos.rotuloResumo}>Registros de doação</span>
              <strong style={estilos.numeroResumo}>{doacoes.length}</strong>
            </article>

            <article style={estilos.cartaoResumo}>
              <span style={estilos.rotuloResumo}>Unidades doadas</span>
              <strong style={estilos.numeroResumo}>
                {totalUnidadesDoadas}
              </strong>
            </article>

            <article style={estilos.cartaoResumo}>
              <span style={estilos.rotuloResumo}>Doadores identificados</span>
              <strong style={estilos.numeroResumo}>{totalDoadores}</strong>
            </article>
          </div>

          <div style={estilos.filtrosDoacoes}>
            <label style={estilos.labelFiltro}>
              Buscar doador
              <input
                type="search"
                value={buscaDoador}
                onChange={(e) => setBuscaDoador(e.target.value)}
                placeholder="Digite o nome do doador..."
                aria-label="Buscar doador pelo nome"
                style={estilos.input}
              />
            </label>

            <label style={estilos.labelFiltro}>
              Filtrar por item
              <select
                value={filtroItem}
                onChange={(e) => setFiltroItem(e.target.value)}
                aria-label="Filtrar doações por item"
                style={estilos.input}
              >
                <option value="Todos">Todos os itens</option>
                {opcoesItens.map(([id, nomeItem]) => (
                  <option key={id} value={String(id)}>
                    {nomeItem}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {carregandoDoacoes ? (
            <p style={estilos.estadoHistorico}>Carregando histórico...</p>
          ) : doacoesFiltradas.length === 0 ? (
            <p style={estilos.estadoHistorico}>
              {doacoes.length === 0
                ? 'Ainda não há doações registradas.'
                : 'Nenhuma doação corresponde à sua busca.'}
            </p>
          ) : (
            <>
              <p style={estilos.contagemResultados}>
                Exibindo {doacoesFiltradas.length}{' '}
                {doacoesFiltradas.length === 1
                  ? 'registro'
                  : 'registros'}
              </p>

              <div style={estilos.tabelaResponsiva}>
                <table style={estilos.tabelaDoacoes}>
                  <thead>
                    <tr>
                      <th style={estilos.celulaCabecalho}>Doador</th>
                      <th style={estilos.celulaCabecalho}>Item</th>
                      <th style={estilos.celulaCabecalho}>Quantidade</th>
                      <th style={estilos.celulaCabecalho}>Data</th>
                      <th style={estilos.celulaCabecalho}>Ações</th>
                    </tr>
                  </thead>

                  <tbody>
                    {doacoesFiltradas.map((doacao) => (
                      <tr key={doacao.id}>
                        <td style={estilos.celula}>
                          <strong>{doacao.donor_name}</strong>
                        </td>
                        <td style={estilos.celula}>{doacao.item_name}</td>
                        <td style={estilos.celula}>{doacao.quantity}</td>
                        <td style={estilos.celula}>
                          {new Date(doacao.created_at).toLocaleString('pt-BR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td style={estilos.celula}>
                          <button
                            type="button"
                            style={estilos.botaoExcluir}
                            disabled={carregando}
                            onClick={() => void desfazerDoacao(doacao)}
                          >
                            Desfazer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <p style={estilos.linkFinal}>
          <a href="/">Ver lista pública</a>
        </p>
      </section>
    </main>
  );
}

const estilos: Record<string, React.CSSProperties> = {
  pagina: {
    minHeight: '100vh',
    padding: '32px 16px',
    background: '#f4f6f8',
    color: '#17202a',
    fontFamily: 'Arial, sans-serif',
  },
  conteudo: { maxWidth: 900, margin: '0 auto' },
  cartao: {
    maxWidth: 420,
    margin: '60px auto',
    padding: 28,
    background: '#fff',
    borderRadius: 14,
    boxShadow: '0 4px 20px #00000010',
  },
  cabecalho: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  formulario: {
    display: 'grid',
    gap: 16,
    padding: 22,
    background: '#fff',
    border: '1px solid #e1e8df',
    borderRadius: 14,
    marginBottom: 24,
  },
  input: {
    display: 'block',
    boxSizing: 'border-box',
    width: '100%',
    marginTop: 6,
    padding: 12,
    border: '1px solid #ccd2d8',
    borderRadius: 8,
    fontSize: 16,
    background: '#fff',
    color: '#17202a',
  },
  botao: {
    padding: '12px 16px',
    background: '#176b45',
    color: '#fff',
    border: 0,
    borderRadius: 8,
    cursor: 'pointer',
  },
  botaoSecundario: {
    padding: '10px 14px',
    background: '#e8edf1',
    color: '#17202a',
    border: 0,
    borderRadius: 8,
    cursor: 'pointer',
  },
  botaoExcluir: {
    padding: '10px 14px',
    background: '#a92727',
    color: '#fff',
    border: 0,
    borderRadius: 8,
    cursor: 'pointer',
  },
  acoes: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  secao: { marginBottom: 32 },
  lista: { display: 'grid', gap: 12 },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    padding: 18,
    background: '#fff',
    border: '1px solid #e1e8df',
    borderRadius: 12,
  },
  detalhesItem: { minWidth: 0, overflowWrap: 'anywhere' },
  mensagem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    marginBottom: 20,
    background: '#fff',
    border: '1px solid #dbe5dc',
    borderRadius: 10,
    overflowWrap: 'anywhere',
  },
  fecharMensagem: {
    flexShrink: 0,
    border: 0,
    background: 'transparent',
    fontSize: 22,
    cursor: 'pointer',
    color: '#617167',
  },
  historico: {
    padding: 22,
    marginTop: 32,
    marginBottom: 24,
    background: '#fff',
    border: '1px solid #e1e8df',
    borderRadius: 14,
    boxShadow: '0 4px 20px #20382b0a',
  },
  cabecalhoHistorico: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  tituloHistorico: { margin: 0 },
  subtituloHistorico: {
    marginTop: 8,
    marginBottom: 0,
    color: '#66736b',
    lineHeight: 1.5,
  },
  resumoDoacoes: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 12,
    marginBottom: 20,
  },
  cartaoResumo: {
    display: 'grid',
    gap: 8,
    padding: 16,
    background: '#f4f7f1',
    border: '1px solid #e1e8df',
    borderRadius: 10,
  },
  rotuloResumo: { color: '#617167', fontSize: 13 },
  numeroResumo: { color: '#286744', fontSize: 28 },
  filtrosDoacoes: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 12,
    marginBottom: 18,
  },
  labelFiltro: { minWidth: 0 },
  estadoHistorico: {
    padding: 22,
    textAlign: 'center',
    color: '#617167',
    background: '#f8faf7',
    borderRadius: 10,
    lineHeight: 1.5,
  },
  contagemResultados: {
    color: '#617167',
    fontSize: 13,
    marginBottom: 10,
  },
  tabelaResponsiva: {
    width: '100%',
    overflowX: 'auto',
  },
  tabelaDoacoes: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: 14,
  },
  celulaCabecalho: {
    padding: '12px 10px',
    background: '#f4f7f1',
    color: '#286744',
    borderBottom: '1px solid #dfe7dc',
    whiteSpace: 'nowrap',
  },
  celula: {
    padding: '13px 10px',
    borderBottom: '1px solid #edf0eb',
    color: '#28392f',
    verticalAlign: 'top',
  },
  link: { display: 'inline-block', marginTop: 16 },
  linkFinal: { marginTop: 24 },
};
