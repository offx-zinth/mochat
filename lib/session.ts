import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import { env } from './env';
import { timingSafeEqual } from './security';

export function verifySessionFromRequest(req: NextRequest) {
  const value = req.cookies.get('mochat_session')?.value;
  if (!value) return false;
  const [data, signature] = value.split('.');
  if (!data || !signature) return false;
  const expected = crypto.createHmac('sha256', env.sessionSecret).update(data).digest('base64url');
  if (signature.length !== expected.length) return false;
  if (!timingSafeEqual(signature, expected)) return false;
  const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as {
    expiresAt: number;
  };
  return Date.now() <= payload.expiresAt;
}
