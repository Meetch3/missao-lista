type Janela = {
  inicio: number;
  total: number;
};

const janelas = new Map<string, Janela>();

// Aceita somente requisições originadas no mesmo site.
export function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  if (!origin || !host) return true;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');

  return (
    forwarded?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'desconhecido'
  );
}

// Limite simples em memória: vale por instância do servidor.
export function isRateLimited(chave: string, limite: number, janelaMs: number) {
  const agora = Date.now();
  const atual = janelas.get(chave);

  if (!atual || agora - atual.inicio > janelaMs) {
    janelas.set(chave, { inicio: agora, total: 1 });

    if (janelas.size > 5000) {
      for (const [k, v] of janelas) {
        if (agora - v.inicio > janelaMs) janelas.delete(k);
      }
    }

    return false;
  }

  atual.total += 1;
  return atual.total > limite;
}
