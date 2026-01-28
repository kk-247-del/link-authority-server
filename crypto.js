import crypto from 'crypto';

const SECRET = process.env.LINK_SECRET;

if (!SECRET) {
  throw new Error('LINK_SECRET env var is required');
}

export function sign(payloadBase64) {
  return crypto
    .createHmac('sha256', SECRET)
    .update(payloadBase64)
    .digest('base64url');
}

export function verify(payloadBase64, sig) {
  const expected = sign(payloadBase64);
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(sig)
  );
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
