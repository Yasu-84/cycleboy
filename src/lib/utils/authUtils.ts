import { timingSafeEqual } from 'crypto';

export function isApiKeyValid(apiKey: string): boolean {
    const expected = process.env.ADMIN_API_KEY;
    if (!expected) return false;
    const a = Buffer.from(apiKey);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
}
