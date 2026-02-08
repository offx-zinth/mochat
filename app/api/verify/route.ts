import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { env } from '../../../lib/env';
import { hashSecret, timingSafeEqual } from '../../../lib/security';
import { checkRateLimit } from '../../../lib/rateLimit';

export const runtime = 'nodejs';

function verifyCaptcha(answer: string, token: string | undefined) {
  if (!token) return false;
  const [data, signature] = token.split('.');
  if (!data || !signature) return false;
  const expected = crypto.createHmac('sha256', env.captchaSecret).update(data).digest('base64url');
  if (!timingSafeEqual(signature, expected)) return false;
  const decoded = Buffer.from(data, 'base64url').toString('utf8');
  return decoded === answer;
}

function getIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  const rate = checkRateLimit(ip, 6, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ ok: false, error: 'Too many attempts. Try again soon.' }, { status: 429 });
  }

  const body = (await req.json()) as { captcha?: string; code?: string };
  const captchaAnswer = body.captcha?.trim() ?? '';
  const code = body.code?.trim() ?? '';

  const captchaToken = req.cookies.get('mochat_captcha')?.value;
  if (!verifyCaptcha(captchaAnswer, captchaToken)) {
    return NextResponse.json({ ok: false, error: 'Captcha incorrect.' }, { status: 400 });
  }

  const candidateHash = hashSecret(code, env.secretCodeSalt);
  const valid = env.secretCodeHash && timingSafeEqual(candidateHash, env.secretCodeHash);

  if (!valid) {
    return NextResponse.json({ ok: false, redirectUrl: env.wrongCodeRedirect }, { status: 401 });
  }

  const payload = {
    issuedAt: Date.now(),
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', env.sessionSecret).update(data).digest('base64url');
  const response = NextResponse.json({ ok: true });
  response.cookies.set('mochat_session', `${data}.${signature}`, {
    httpOnly: true,
    sameSite: 'strict',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  });
  return response;
}
