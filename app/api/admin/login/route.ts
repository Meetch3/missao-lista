
import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE,
  createAdminToken,
} from '@/lib/admin-auth';
import {
  getClientIp,
  isRateLimited,
  isSameOrigin,
} from '@/lib/request-guard';

function sameSecret(a: string, b: string) {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();

  return timingSafeEqual(hashA, hashB);
}

export async function POST(request: Request) {
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedPassword) {
    return NextResponse.json(
      { error: 'Senha administrativa não configurada.' },
      { status: 500 }
    );
  }

  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: 'Origem não permitida.' },
      { status: 403 }
    );
  }

  if (isRateLimited(`login:${getClientIp(request)}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Aguarde alguns minutos.' },
      { status: 429 }
    );
  }

  let body: { password?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Requisição inválida.' },
      { status: 400 }
    );
  }

  if (
    typeof body.password !== 'string' ||
    body.password.length > 1024 ||
    !sameSecret(body.password, expectedPassword)
  ) {
    return NextResponse.json(
      { error: 'Senha incorreta.' },
      { status: 401 }
    );
  }

  const token = await createAdminToken();
  const response = NextResponse.json({ success: true });

  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 8,
  });

  return response;
}

