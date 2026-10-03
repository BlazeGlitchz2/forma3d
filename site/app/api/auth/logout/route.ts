import {sameOrigin,responseError} from '@/lib/server';
import {clearSessionCookie} from '@/lib/auth';

export async function POST(request: Request) {
  try {
    await sameOrigin(request);
    await clearSessionCookie();
    return Response.json({ ok: true });
  } catch (e) {
    return responseError(e);
  }
}
