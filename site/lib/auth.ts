import {randomBytes,pbkdf2Sync,timingSafeEqual} from 'node:crypto';

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  area: string;
  role: 'customer' | 'admin';
  created: number;
}

export const AUTH_COOKIE_NAME = 'forma_auth_token';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const parts = stored.split(':');
    if (parts.length !== 2) return false;
    const [salt, expectedHash] = parts;
    const actualHash = pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
    return actualHash.length === expectedHash.length && timingSafeEqual(Buffer.from(actualHash), Buffer.from(expectedHash));
  } catch {
    return false;
  }
}

export function generateId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString('hex')}`;
}

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export async function createSession(userId: string): Promise<string> {
  const {db} = await import('./server');
  const {cookies, headers} = await import('next/headers');
  const token = generateToken();
  const id = generateId('ses');
  const now = Date.now();
  const expires = now + SESSION_MAX_AGE_SECONDS * 1000;

  await db()
    .prepare('INSERT INTO sessions (id, user_id, token, expires, created) VALUES (?, ?, ?, ?, ?)')
    .bind(id, userId, token, expires, now)
    .run();

  const jar = await cookies();
  const reqHeaders = await headers();
  const isHttps = reqHeaders.get('x-forwarded-proto') === 'https';

  jar.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return token;
}

export async function clearSessionCookie(): Promise<void> {
  const {db} = await import('./server');
  const {cookies} = await import('next/headers');
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE_NAME)?.value;
  if (token) {
    try {
      await db().prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    } catch {}
  }
  jar.delete(AUTH_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const {db} = await import('./server');
    const {cookies} = await import('next/headers');
    const jar = await cookies();
    const token = jar.get(AUTH_COOKIE_NAME)?.value;
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;

    const now = Date.now();
    const row = await db()
      .prepare(
        'SELECT u.id, u.email, u.name, u.phone, u.area, u.role, u.created FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires > ?'
      )
      .bind(token, now)
      .first<{
        id: string;
        email: string;
        name: string;
        phone: string;
        area: string;
        role: string;
        created: number;
      }>();

    if (!row) return null;

    const role: 'customer' | 'admin' = row.role === 'admin' ? 'admin' : 'customer';

    return {
      id: row.id,
      email: row.email,
      name: row.name,
      phone: row.phone ?? '',
      area: row.area ?? '',
      role,
      created: row.created,
    };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<User> {
  const {ApiError} = await import('./server');
  const user = await getCurrentUser();
  if (!user) {
    throw new ApiError('Please log in to continue.', 401);
  }
  return user;
}
