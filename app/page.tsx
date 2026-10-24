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

  const concluidos = itens.filter(
    item => item.remaining_quantity === 0
  ).length;

  const progresso =
    totalNecessario > 0
      ? Math.min(100, Math.round((totalDoado / totalNecessario) * 100))
      : 0;

  const categorias = [
    'Todos',
    'Pendentes',
    'Concluídos',
    ...new Set(itens.map(item => item.category)),
  ];

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
      setMensagem(
        `Informe uma quantidade entre 1 e ${item.remaining_quantity}.`
      );
      return;
    }

    setEnviando(item.id);

    try {
      const resposta = await fetch('/api/donation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: item.id,
          donor_name: nome,
          quantity: quantidade,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.error || 'Não foi possível registrar a doação.'
        );
      }

      setMensagem(
        `Sua contribuição de ${quantidade} unidade(s) de "${item.name}" foi registrada. Muito obrigado!`
      );
      setErro(false);
      setNomeDoador('');
      setQuantidades(anterior => ({
        ...anterior,
        [item.id]: '1',
      }));

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
    <main className="mission-page">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <div className="mission-container">
        <header className="topbar">
          <a href="#inicio" className="brand">
            <span className="brand-mark" aria-hidden="true">
              ✳
            </span>
            <span>
              <strong>Lista Vinicius Modesto</strong>
              <small>Uma missão, muitas mãos</small>
            </span>
          </a>

          <a className="admin-link" href="/admin">
            Área administrativa <span aria-hidden="true">↗</span>
          </a>
        </header>

        <section className="hero" id="inicio">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="live-dot" />
              JUNTOS POR UM PROPÓSITO
            </span>

            <h1>
              Pequenas atitudes.
              <br />
              <span>Uma grande missão.</span>
            </h1>

            <p>
              Cada contribuição nos aproxima do nosso objetivo.
              Veja o que precisamos, escolha como ajudar e acompanhe
              o progresso da missão.
            </p>

            <a className="primary-link" href="#itens">
              Ver itens necessários <span aria-hidden="true">↓</span>
            </a>

            <div className="hero-note">
              <span aria-hidden="true">♡</span>
              Toda contribuição faz diferença.
            </div>
          </div>

          <div className="hero-art" aria-label="Ilustração de mãos ajudando">
            <div className="art-circle art-circle-back" />
            <div className="art-circle art-circle-front" />
            <div className="art-spark spark-one">✦</div>
            <div className="art-spark spark-two">✳</div>
            <div className="art-card">
              <span className="art-icon">♡</span>
              <strong>Juntos fazemos mais</strong>
              <span>Cada gesto conta</span>
            </div>
            <div className="art-leaf leaf-one">❋</div>
            <div className="art-leaf leaf-two">❋</div>
          </div>
        </section>

        <section className="overview" aria-label="Resumo das doações">
          <div className="overview-heading">
            <div>
              <span className="section-kicker">NOSSO PROGRESSO</span>
              <h2>Cada ajuda nos aproxima.</h2>
            </div>
            <span className="overview-percent">{progresso}%</span>
          </div>

          <div
            className="progress-track progress-track-large"
            role="progressbar"
            aria-label="Progresso geral das doações"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progresso}
          >
            <div
              className="progress-fill"
              style={{ width: `${progresso}%` }}
            />
          </div>

          <div className="overview-bottom">
            <span>
              <strong>{totalDoado}</strong> de {totalNecessario} unidades doadas
            </span>
            <span>
              {Math.max(0, totalNecessario - totalDoado)} unidades restantes
            </span>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-icon stat-icon-green" aria-hidden="true">
                ▦
              </span>
              <div>
                <strong>{itens.length}</strong>
                <span>Itens na lista</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon stat-icon-yellow" aria-hidden="true">
                ♡
              </span>
              <div>
                <strong>{totalDoado}</strong>
                <span>Unidades doadas</span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon stat-icon-blue" aria-hidden="true">
                ✓
              </span>
              <div>
                <strong>{concluidos}</strong>
                <span>Objetivos concluídos</span>
              </div>
            </div>
          </div>
        </section>

        {mensagem && (
          <div
            role="status"
            aria-live="polite"
            className={`notice ${erro ? 'notice-error' : 'notice-success'}`}
          >
            <span aria-hidden="true">{erro ? '!' : '✓'}</span>
            <p>{mensagem}</p>
            <button
              type="button"
              className="notice-close"
              aria-label="Fechar mensagem"
              onClick={() => setMensagem('')}
            >
              ×
            </button>
          </div>
        )}

        <section className="items-section" id="itens">
          <div className="section-heading">
            <div>
              <span className="section-kicker">COMO VOCÊ PODE AJUDAR</span>
              <h2>Itens necessários</h2>
              <p>Escolha um item e a quantidade que deseja contribuir.</p>
            </div>
            <span className="items-count">{listaFiltrada.length} itens</span>
          </div>

          <div className="filter-list" aria-label="Filtrar itens">
            {categorias.map(categoria => (
              <button
                type="button"
                key={categoria}
                onClick={() => setFiltro(categoria)}
                className={`filter-chip ${
                  filtro === categoria ? 'filter-active' : ''
                }`}
                aria-pressed={filtro === categoria}
              >
                {categoria}
              </button>
            ))}
          </div>

          {carregando ? (
            <div className="empty-state">
              <span className="loading-spinner" />
              <p>Preparando a lista...</p>
            </div>
          ) : itens.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">♡</span>
              <h3>Estamos preparando a missão.</h3>
              <p>Os itens cadastrados aparecerão aqui em breve.</p>
            </div>
          ) : (
            <div className="items-grid">
              {listaFiltrada.map((item, index) => {
                const percentual =
                  item.required_quantity > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (item.donated_quantity / item.required_quantity) * 100
                        )
                      )
                    : 0;

                const concluido = item.remaining_quantity === 0;

                return (
                  <article
                    key={item.id}
                    className={`item-card ${
                      concluido ? 'item-card-complete' : ''
                    }`}
                    style={{
                      animationDelay: `${Math.min(index, 8) * 55}ms`,
                    }}
                  >
                    <div className="item-card-top">
                      <span className="category-label">{item.category}</span>
                      {concluido ? (
                        <span className="complete-badge">✓ Concluído</span>
                      ) : (
                        <span className="remaining-badge">
                          Faltam {item.remaining_quantity}
                        </span>
                      )}
                    </div>

                    <h3>{item.name}</h3>

                    <div className="item-numbers">
                      <div>
                        <strong>{item.donated_quantity}</strong>
                        <span>Já doados</span>
                      </div>
                      <div className="numbers-divider" />
                      <div>
                        <strong>{item.required_quantity}</strong>
                        <span>Meta total</span>
                      </div>
                      <strong className="item-percent">{percentual}%</strong>
                    </div>

                    <div
                      className="progress-track"
                      role="progressbar"
                      aria-label={`Progresso de ${item.name}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percentual}
                    >
                      <div
                        className="progress-fill"
                        style={{ width: `${percentual}%` }}
                      />
                    </div>

                    {concluido ? (
                      <div className="completed-message">
                        <span aria-hidden="true">✦</span>
                        Este objetivo foi alcançado. Obrigado!
                      </div>
                    ) : (
                      <div className="donation-form">
                        <label>
                          <span>Seu nome</span>
                          <input
                            value={nomeDoador}
                            onChange={e => setNomeDoador(e.target.value)}
                            placeholder="Como podemos te chamar?"
                            maxLength={100}
                            autoComplete="name"
                          />
                        </label>

                        <label>
                          <span>Quantidade para doar</span>
                          <input
                            type="number"
                            min="1"
                            max={item.remaining_quantity}
                            step="1"
                            value={quantidades[item.id] ?? '1'}
                            onChange={e =>
                              setQuantidades(anterior => ({
                                ...anterior,
                                [item.id]: e.target.value,
                              }))
                            }
                          />
                        </label>

                        <button
                          type="button"
                          className="donate-button"
                          disabled={enviando !== null}
                          onClick={() => void registrarDoacao(item)}
                        >
                          {enviando === item.id
                            ? 'Registrando contribuição...'
                            : 'Quero contribuir'}
                          {enviando !== item.id && (
                            <span aria-hidden="true">↗</span>
                          )}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {!carregando && itens.length > 0 && listaFiltrada.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon">⌕</span>
              <h3>Nenhum item por aqui.</h3>
              <p>Experimente selecionar outro filtro.</p>
            </div>
          )}
        </section>

        <section className="gratitude">
          <span className="gratitude-heart" aria-hidden="true">
            ♡
          </span>
          <div>
            <h2>Obrigado por fazer parte disso.</h2>
            <p>
              Sua generosidade ajuda a transformar um propósito em realidade.
              Cada contribuição importa.
            </p>
          </div>
        </section>

        <footer className="site-footer">
          <a href="#inicio" className="footer-brand">
            ✳ Lista Missionária
          </a>
          <p>Feita com propósito, cuidado e muitas mãos.</p>
          <p className="privacy-note">
            Os nomes dos doadores não são exibidos na página pública.
          </p>
        </footer>
      </div>
    </main>
  );
}