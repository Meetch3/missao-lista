
import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE,
  createAdminToken,
} from '@/lib/admin-auth';

function sameSecret(a: string, b: string) {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();

  return timingSafeEqual(hashA, hashB);
}

export async function POST(request: Request) {
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedPassword) {
    return NextResponse.json(
      { error: 'Senha administrativa nÃ£o configurada.' },
      { status: 500 }
    );
  }

  // Aceita somente requisiÃ§Ãµes originadas no mesmo site.
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json(
          { error: 'Origem nÃ£o permitida.' },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Origem invÃ¡lida.' },
        { status: 403 }
      );
    }
  }

  let body: { password?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'RequisiÃ§Ã£o invÃ¡lida.' },
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

