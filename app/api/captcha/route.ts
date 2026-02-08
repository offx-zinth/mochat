import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { env } from '../../../lib/env';

export const runtime = 'nodejs';

function signCaptcha(answer: string) {
  const data = Buffer.from(answer).toString('base64url');
  const signature = crypto.createHmac('sha256', env.captchaSecret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export async function GET() {
  const left = crypto.randomInt(2, 9);
  const right = crypto.randomInt(2, 9);
  const answer = String(left + right);
  const token = signCaptcha(answer);
  const response = NextResponse.json({ question: `${left} + ${right}` });
  response.cookies.set('mochat_captcha', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: true,
    path: '/',
    maxAge: 60 * 5
  });
  return response;
}
