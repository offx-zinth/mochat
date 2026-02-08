import { cookies } from 'next/headers';
import crypto from 'crypto';
import { env } from './env';

const SESSION_COOKIE = 'mochat_session';

export type SessionPayload = {
  issuedAt: number;
  expiresAt: number;
};

export function setSessionCookie(response: Response, payload: SessionPayload) {
  const token = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', env.sessionSecret).update(token).digest('base64url');
  response.headers.append(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}.${signature}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor((payload.expiresAt - payload.issuedAt) / 1000)}; Secure`
  );
}

export function readSessionCookie() {
  const cookieStore = cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  if (!value) return null;
  const [data, signature] = value.split('.');
  if (!data || !signature) return null;
  const expected = crypto.createHmac('sha256', env.sessionSecret).update(data).digest('base64url');
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as SessionPayload;
  if (Date.now() > payload.expiresAt) return null;
  return payload;
}
