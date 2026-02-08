import crypto from 'crypto';

export function hashSecret(input: string, salt: string) {
  return crypto.scryptSync(input, salt, 64).toString('hex');
}

export function timingSafeEqual(a: string, b: string) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufferA, bufferB);
}

export function signToken(payload: Record<string, unknown>, secret: string) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifyToken<T extends Record<string, unknown>>(token: string, secret: string) {
  const [data, signature] = token.split('.');
  if (!data || !signature) return null;
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  if (!timingSafeEqual(signature, expected)) return null;
  const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as T;
  return payload;
}
