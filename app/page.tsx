'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

const CHAVE_NOME_SALVO = 'missao-nome-doador';

const ENDERECO = 'Tv. das Mercês, 304 - Belém, PA';
const DATA_EVENTO = '2026-11-05';
const FIM_EVENTO = Date.parse('2026-11-05T21:30:00-03:00');
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ENDERECO)}`;
const WAZE_URL = `https://waze.com/ul?q=${encodeURIComponent(ENDERECO)}&navigate=yes`;
const AGENDA_URL =
  'https://calendar.google.com/calendar/render?action=TEMPLATE' +
  `&text=${encodeURIComponent('Chá missionário do Elder Modesto')}` +
  '&dates=20261105T213000Z/20261106T003000Z' +
  `&location=${encodeURIComponent(ENDERECO)}`;

// "(PIX)" ou "(SE POSSÍVEL PIX)" no nome indica que o item é melhor via PIX.
const MARCA_PIX = /\s*\((SE POSS[IÍ]VEL\s+)?PIX\)\s*/i;

function tipoPix(nome: string) {
  const marca = nome.match(MARCA_PIX);
  if (!marca) return null;
  return marca[1] ? 'preferencia' : 'somente';
}

function nomeSemPix(nome: string) {
  return nome.replace(MARCA_PIX, ' ').replace(/[\s,]+$/, '').trim();
}

function assinarMinuto(aoMudar: () => void) {
  const timer = setInterval(aoMudar, 60_000);
  return () => clearInterval(timer);
}

function minutoAtual() {
  return Math.floor(Date.now() / 60_000);
}

function textoContagem(minuto: number) {
  const agora = minuto * 60_000;
  if (agora > FIM_EVENTO) return null;

  const hoje = new Date(agora).toLocaleDateString('en-CA', {
    timeZone: 'America/Belem',
  });
  const dias = Math.round(
    (Date.parse(DATA_EVENTO) - Date.parse(hoje)) / 86_400_000
  );

  if (dias <= 0) return 'É hoje, às 18:30!';
  if (dias === 1) return 'É amanhã, às 18:30!';
  return `Faltam ${dias} dias`;
}

function abrirAgenda(evento: React.MouseEvent<HTMLAnchorElement>) {
  // iPhone e Mac abrem melhor o arquivo .ics no calendário do próprio aparelho.
  if (/iPhone|iPad|Macintosh/.test(navigator.userAgent)) {
    evento.preventDefault();
    window.open('/cha-missionario.ics', '_self');
  }
}

function lerNomeSalvo() {
  try {
    return localStorage.getItem(CHAVE_NOME_SALVO) ?? '';
  } catch {
    return '';
  }
}

function salvarNome(nome: string) {
  try {
    localStorage.setItem(CHAVE_NOME_SALVO, nome);
  } catch {
    // Sem armazenamento local: a pessoa só digita o nome de novo.
  }
}

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
  const [quantidade, setQuantidade] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState(false);
  const [itemSelecionadoId, setItemSelecionadoId] = useState<number | null>(
    null
  );
  const [erroModal, setErroModal] = useState('');

  const dialogRef = useRef<HTMLDialogElement>(null);
  const nomeInputRef = useRef<HTMLInputElement>(null);
  const timerMensagem = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [pixCopiado, setPixCopiado] = useState(false);
  const [erroPix, setErroPix] = useState('');

  const chavePix = '91999920857';
  const nomeBeneficiario = 'Vinicius Queiroz Modesto';

  // No servidor não há "agora": a contagem só aparece no navegador.
  const minuto = useSyncExternalStore(assinarMinuto, minutoAtual, () => null);
  const contagem = minuto === null ? null : textoContagem(minuto);

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

  // Itens pendentes primeiro; concluídos vão para o fim da lista.
  const listaFiltrada = itens
    .filter(item => {
      if (filtro === 'Pendentes') return item.remaining_quantity > 0;
      if (filtro === 'Concluídos') return item.remaining_quantity === 0;
      if (filtro !== 'Todos') return item.category === filtro;
      return true;
    })
    .sort(
      (a, b) =>
        Number(a.remaining_quantity === 0) - Number(b.remaining_quantity === 0)
    );

  const itemSelecionado =
    itens.find(item => item.id === itemSelecionadoId) ?? null;

  useEffect(() => {
    const dialog = dialogRef.current;

    if (itemSelecionadoId !== null && dialog && !dialog.open) {
      dialog.showModal();
    }
  }, [itemSelecionadoId]);

  function mostrarMensagem(texto: string, comErro: boolean) {
    clearTimeout(timerMensagem.current);
    setErro(comErro);
    setMensagem(texto);

    if (!comErro) {
      timerMensagem.current = setTimeout(() => setMensagem(''), 7000);
    }
  }

  function abrirContribuicao(item: Item) {
    setQuantidade(1);
    setErroModal('');
    setPixCopiado(false);
    setErroPix('');
    if (!nomeDoador) setNomeDoador(lerNomeSalvo());
    setItemSelecionadoId(item.id);
  }

  function fecharContribuicao() {
    dialogRef.current?.close();
  }

  function alterarQuantidade(delta: number) {
    if (!itemSelecionado) return;

    setQuantidade(atual =>
      Math.min(itemSelecionado.remaining_quantity, Math.max(1, atual + delta))
    );
  }

  async function registrarDoacao() {
    const item = itemSelecionado;
    if (!item) return;

    setErroModal('');

    const nome = nomeDoador.trim();

    if (nome.length < 2 || nome.length > 100) {
      setErroModal('Informe seu nome, com pelo menos 2 caracteres.');
      nomeInputRef.current?.focus();
      return;
    }

    if (quantidade < 1 || quantidade > item.remaining_quantity) {
      setErroModal(
        `Escolha uma quantidade entre 1 e ${item.remaining_quantity}.`
      );
      return;
    }

    setEnviando(true);

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

      salvarNome(nome);
      fecharContribuicao();
      mostrarMensagem(
        `Sua contribuição de ${quantidade} unidade(s) de "${nomeSemPix(item.name)}" foi registrada. Muito obrigado!`,
        false
      );

      await carregarItens();
    } catch (e) {
      setErroModal(
        e instanceof Error ? e.message : 'Erro ao registrar a doação.'
      );
      await carregarItens();
    } finally {
      setEnviando(false);
    }
  }

  async function copiarPix() {
    setPixCopiado(false);
    setErroPix('');

    try {
      await navigator.clipboard.writeText(chavePix);
      setPixCopiado(true);
    } catch {
      setErroPix(
        'Não foi possível copiar automaticamente. Copie a chave PIX manualmente.'
      );
    }
  }

  return (
    <main className="mission-page">
      <style jsx>{`
        .mission-board { display:grid; grid-template-columns: 0.92fr 1.08fr; gap:20px; width:100%; padding:24px; background:linear-gradient(135deg,#b68b53,#d1ad78 42%,#a87942); border:1px solid #8b6236; box-shadow:0 18px 36px rgba(30,20,10,.22), inset 0 1px 0 rgba(255,255,255,.35); border-radius:3px; }
        .mission-board-photo-area,.mission-board-right { min-width:0; display:flex; flex-direction:column; gap:16px; }
        .mission-board-photo { background:#e7e1d6; padding:8px; box-shadow:0 5px 12px rgba(0,0,0,.3); aspect-ratio:3/4; }
        .mission-board-photo img { width:100%; height:100%; object-fit:cover; display:block; }
        .mission-name-plaque,.mission-scripture-plaque,.mission-state-plaque { background:linear-gradient(145deg,#f4f4f1,#cfd1d2); color:#202124; padding:16px; box-shadow:0 5px 12px rgba(0,0,0,.28); border:1px solid #b7b9b9; }
        .mission-name-plaque { text-align:center; display:flex; flex-direction:column; gap:9px; font-size:clamp(11px,1.1vw,16px); font-weight:800; letter-spacing:.04em; }
       
        .mission-scripture-plaque strong { display:block; font-size:clamp(17px,1.8vw,26px); font-weight:900; margin-bottom:9px; letter-spacing:.03em; }
        .mission-scripture-plaque p { margin:0; font-size:clamp(12px,1.15vw,16px); line-height:1.45; font-weight:600; }
        .mission-scripture-plaque span { display:block; margin-top:9px; font-size:11px; font-weight:800; letter-spacing:.08em; }
        .mission-state-plaque { display:flex; align-items:center; justify-content:space-around; gap:10px; min-height:190px; flex:1; }
        .mission-state-shape { width:46%; max-height:210px; fill:#151515; flex-shrink:0; }
        .mission-state-star { fill:#f0f0ed; stroke:#f0f0ed; }
        .mission-state-label { display:flex; flex-direction:column; text-align:center; gap:5px; font-weight:900; font-size:clamp(13px,1.5vw,20px); }
        .mission-state-label small { margin-top:8px; font-size:11px; letter-spacing:.1em; }
        @media (max-width:640px) { .mission-board { grid-template-columns:1fr; padding:14px; gap:14px; } .mission-board-photo-area { display:grid; grid-template-columns:1fr .9fr; align-items:stretch; } .mission-board-photo { aspect-ratio:3/4; } .mission-name-plaque { justify-content:center; padding:10px; font-size:11px; } .mission-state-plaque { min-height:150px; } .mission-state-shape { max-height:150px; } }
      `}</style>

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
              Colaboração missionária
            </span>

            <h1>
              MISSÃO BRASIL
              <br />
              <span>SÃO BERNARDO</span>
            </h1>

            <a className="primary-link" href="#itens">
              Ver itens necessários <span aria-hidden="true">↓</span>
            </a>

            <div className="hero-note">
              <span aria-hidden="true">♡</span>
              Toda contribuição faz diferença.
            </div>
          </div>

          <div className="mission-board" aria-label="Convite missionário">
            <div className="mission-board-photo-area">
              <div className="mission-board-photo">
                <img src="/foto.png" alt="Foto do missionário" />
              </div>
                <div className="mission-name-plaque">
                  <strong className="mission-name">
                    <span>ELDER</span>
                    <span>MODESTO</span>
                  </strong>
                </div>
            </div>

<div className="mission-board-right">
  <div
    className="mission-scripture-plaque"
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      width: "100%",
      height: "100%",
      boxSizing: "border-box",
    }}
  >
    <strong style={{ width: "100%", textAlign: "center" }}>
      CONVITE MISSIONÁRIO
    </strong>

    <p style={{ width: "100%", textAlign: "center" }}>
      Tv. Das Mercês 304
    </p>

    <p style={{ width: "100%", textAlign: "center" }}>
      Data: 05/11
    </p>

    <p style={{ width: "100%", textAlign: "center" }}>
      Horário: 18:30
    </p>

    <span style={{ width: "100%", textAlign: "center" }}>
      Espero você lá
    </span>
  </div>
</div>
          </div>
        </section>
        {/* CONFIRMAR PRESENÇA PELO WHATSAPP */}
<div className="attendance-whatsapp">
  {contagem && (
    <span className="event-countdown">
      <span className="live-dot" />
      {contagem}
    </span>
  )}

  <a
    href="https://wa.me/559199920857?text=Ol%C3%A1%20irei%20participar%20do%20ch%C3%A1%20mission%C3%A1rio"
    target="_blank"
    rel="noopener noreferrer"
    className="attendance-whatsapp-button"
  >
    <span>Clique aqui pra confirmar presença pelo WhatsApp</span>
    <span aria-hidden="true">↗</span>
  </a>

  <div className="event-links">
    <a href={MAPS_URL} target="_blank" rel="noopener noreferrer">
      <span aria-hidden="true">📍</span> Google Maps
    </a>
    <a href={WAZE_URL} target="_blank" rel="noopener noreferrer">
      <span aria-hidden="true">🚗</span> Waze
    </a>
    <a
      href={AGENDA_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={abrirAgenda}
    >
      <span aria-hidden="true">📅</span> Salvar na agenda
    </a>
  </div>
</div>

{/* CONTRIBUIÇÃO VIA PIX */}
        <section className="gratitude pix-section" id="pix">
          <span className="gratitude-heart" aria-hidden="true">
            ♡
          </span>

          <div className="pix-content">
            <span className="section-kicker">CONTRIBUA TAMBÉM</span>

            <h2>Ajude via PIX.</h2>

            <p>
            Meus irmãos, marquem cada item da lista conforme forem escolhendo o que desejam contribuir.❤️ 
            </p>
            <p>
            Se preferirem, vocês também podem contribuir via PIX.
            Fiquem à vontade! Já tenho lojas onde posso comprar os itens. Sou muito grato por cada gesto de carinho e apoio. Que Deus abençoe a vida de cada um de vocês!
            AMO VOCÊS!🫶🏽❤️🙏
            </p>

            <div className="pix-details">
              <div className="pix-info">
                <span>Beneficiário: </span>
                <strong>{nomeBeneficiario}</strong>
              </div>

              <div className="pix-info">
                <span>Chave PIX Celular: </span>
                <strong className="pix-key">{chavePix}</strong>
              </div>

              <button
                type="button"
                className="donate-button pix-copy-button"
                onClick={() => void copiarPix()}
              >
                {pixCopiado ? '✓ Chave PIX copiada!' : 'Copiar chave PIX'}
                {!pixCopiado && <span aria-hidden="true">↗</span>}
              </button>

              {pixCopiado && (
                <p className="pix-feedback" role="status" aria-live="polite">
                  Chave copiada. Agora é só abrir o aplicativo do seu banco.
                </p>
              )}

              {erroPix && (
                <p className="pix-feedback pix-feedback-error" role="alert">
                  {erroPix}
                </p>
              )}
            </div>
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
            className={`notice notice-toast ${
              erro ? 'notice-error' : 'notice-success'
            }`}
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
          ) : listaFiltrada.length > 0 && (
            <ul className="items-list">
              {listaFiltrada.map(item => {
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
                const pix = tipoPix(item.name);

                return (
                  <li
                    key={item.id}
                    className={`item-row ${concluido ? 'item-row-complete' : ''}`}
                  >
                    <div className="item-row-info">
                      <div className="item-row-tags">
                        <span className="category-label">{item.category}</span>
                        {pix && (
                          <span className="pix-badge">
                            {pix === 'somente' ? 'Via PIX' : 'PIX, se possível'}
                          </span>
                        )}
                      </div>
                      <h3>{nomeSemPix(item.name)}</h3>

                      <div className="item-row-progress">
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
                        <span>
                          {item.donated_quantity} de {item.required_quantity}
                          {!concluido && (
                            <strong> · faltam {item.remaining_quantity}</strong>
                          )}
                        </span>
                      </div>
                    </div>

                    {concluido ? (
                      <span className="complete-badge">✓ Concluído</span>
                    ) : (
                      <button
                        type="button"
                        className="contribute-button"
                        aria-label={`Contribuir com ${item.name}`}
                        onClick={() => abrirContribuicao(item)}
                      >
                        <span aria-hidden="true">+</span>
                        Contribuir
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
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

      <dialog
        ref={dialogRef}
        className="contribution-dialog"
        aria-labelledby="contribuicao-titulo"
        onClose={() => setItemSelecionadoId(null)}
        onCancel={e => {
          if (enviando) e.preventDefault();
        }}
        onClick={e => {
          // Clique fora da caixa (no fundo escuro) fecha a janela.
          if (e.target === e.currentTarget && !enviando) fecharContribuicao();
        }}
      >
        {itemSelecionado && (
          <form
            className="contribution-sheet"
            onSubmit={e => {
              e.preventDefault();
              void registrarDoacao();
            }}
          >
            <div className="contribution-header">
              <div>
                <span className="category-label">
                  {itemSelecionado.category}
                </span>
                <h3 id="contribuicao-titulo">
                  {nomeSemPix(itemSelecionado.name)}
                </h3>
              </div>
              <button
                type="button"
                className="notice-close"
                aria-label="Fechar"
                disabled={enviando}
                onClick={fecharContribuicao}
              >
                ×
              </button>
            </div>

            {itemSelecionado.remaining_quantity === 0 ? (
              <p className="contribution-done">
                ✓ Este item acabou de ser completado. Obrigado mesmo assim!
              </p>
            ) : (
              <>
                {tipoPix(itemSelecionado.name) && (
                  <div className="contribution-pix">
                    <p>
                      {tipoPix(itemSelecionado.name) === 'somente'
                        ? 'Este item é melhor via PIX: o Elder já tem lojas onde comprar.'
                        : 'Se puder, prefira contribuir com este item via PIX.'}{' '}
                      Faça o PIX e depois confirme aqui embaixo pra marcar na
                      lista.
                    </p>
                    <div className="contribution-pix-key">
                      <span>
                        Chave (celular): <strong>{chavePix}</strong>
                        <small>{nomeBeneficiario}</small>
                      </span>
                      <button type="button" onClick={() => void copiarPix()}>
                        {pixCopiado ? '✓ Copiada' : 'Copiar'}
                      </button>
                    </div>
                    {erroPix && <small role="alert">{erroPix}</small>}
                  </div>
                )}

                <div className="contribution-field">
                  <span>
                    Quantidade{' '}
                    <small>(faltam {itemSelecionado.remaining_quantity})</small>
                  </span>
                  <div className="quantity-stepper">
                    <button
                      type="button"
                      aria-label="Diminuir quantidade"
                      disabled={quantidade <= 1 || enviando}
                      onClick={() => alterarQuantidade(-1)}
                    >
                      –
                    </button>
                    <output aria-live="polite">{quantidade}</output>
                    <button
                      type="button"
                      aria-label="Aumentar quantidade"
                      disabled={
                        quantidade >= itemSelecionado.remaining_quantity ||
                        enviando
                      }
                      onClick={() => alterarQuantidade(1)}
                    >
                      +
                    </button>
                  </div>
                </div>

                <label className="contribution-field">
                  <span>Seu nome</span>
                  <input
                    ref={nomeInputRef}
                    value={nomeDoador}
                    onChange={e => setNomeDoador(e.target.value)}
                    placeholder="Como podemos te chamar?"
                    maxLength={100}
                    autoComplete="name"
                  />
                </label>

                {erroModal && (
                  <p className="contribution-error" role="alert">
                    {erroModal}
                  </p>
                )}

                <button
                  type="submit"
                  className="donate-button"
                  disabled={enviando}
                >
                  {enviando
                    ? 'Registrando contribuição...'
                    : 'Confirmar contribuição'}
                </button>
              </>
            )}
          </form>
        )}
      </dialog>
    </main>
  );
}