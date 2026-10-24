
'use client';

import { useEffect, useState, type FormEvent } from 'react';

type Item = {
  id: number;
  name: string;
  category: string;
  quantity: number;
};

export default function AdminPage() {
  const [autenticado, setAutenticado] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [senha, setSenha] = useState('');
  const [itens, setItens] = useState<Item[]>([]);
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('Geral');
  const [quantidade, setQuantidade] = useState('1');
  const [editando, setEditando] = useState<number | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(false);

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
    if (!resposta.ok) throw new Error('Falha ao carregar itens.');
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

  useEffect(() => {
    void verificarLogin();
  }, []);

  useEffect(() => {
    if (autenticado) {
      carregarItens().catch(() => setMensagem('Erro ao carregar a lista.'));
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
    if (!window.confirm('Excluir este item e as doações vinculadas a ele?')) {
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
      if (editando === id) limparFormulario();
      setMensagem('Item excluído.');
    } catch {
      setMensagem('Erro de conexão ao excluir.');
    } finally {
      setCarregando(false);
    }
  }

  async function sair() {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAutenticado(false);
    setItens([]);
    setMensagem('Você saiu do painel.');
  }

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
          <a href="/" style={estilos.link}>Voltar à lista pública</a>
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
          <button onClick={sair} style={estilos.botaoSecundario}>
            Sair
          </button>
        </header>

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
              {carregando ? 'Salvando...' : editando === null ? 'Cadastrar item' : 'Salvar alterações'}
            </button>
            {editando !== null && (
              <button type="button" onClick={limparFormulario} style={estilos.botaoSecundario}>
                Cancelar edição
              </button>
            )}
          </div>
        </form>

        {mensagem && <p role="status">{mensagem}</p>}

        <h2>Itens cadastrados ({itens.length})</h2>

        {itens.length === 0 && <p>Nenhum item cadastrado ainda.</p>}

        <div style={estilos.lista}>
          {itens.map((item) => (
            <article key={item.id} style={estilos.item}>
              <div>
                <strong>{item.name}</strong>
                <p>{item.category} · Necessários: {item.quantity}</p>
              </div>
              <div style={estilos.acoes}>
                <button
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

        <p><a href="/">Ver lista pública</a></p>
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
  conteudo: { maxWidth: 760, margin: '0 auto' },
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
  lista: { display: 'grid', gap: 12 },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    padding: 18,
    background: '#fff',
    borderRadius: 12,
  },
  link: { display: 'inline-block', marginTop: 16 },
};
