
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE = 'missao_admin_session';

function getSessionKey(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      'ADMIN_SESSION_SECRET precisa ter pelo menos 32 caracteres.'
    );
  }

  return new TextEncoder().encode(secret);
}

export async function createAdminToken() {
  const { SignJWT } = await import('jose');

  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('missao-lista')
    .setAudience('missao-admin')
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSessionKey());
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;

  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, getSessionKey(), {
      issuer: 'missao-lista',
      audience: 'missao-admin',
      algorithms: ['HS256'],
    });

    return payload.role === 'admin';
  } catch {
    return false;
  }
}
