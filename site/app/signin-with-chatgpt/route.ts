import {NextResponse} from 'next/server';

function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/admin';
  }
  try {
    const url = new URL(value, 'https://forma3d.local');
    if (url.origin !== 'https://forma3d.local') return '/admin';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/admin';
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = safeReturnPath(url.searchParams.get('return_to'));
  const targetUrl = new URL(returnTo, url.origin);

  const response = NextResponse.redirect(targetUrl, 302);
  response.headers.set('Cache-Control', 'private, no-store');
  response.cookies.set('oai-sites-local-sign-in', '1', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: url.protocol === 'https:',
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}

export async function POST(request: Request) {
  return GET(request);
}
